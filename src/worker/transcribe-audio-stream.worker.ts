import {
    AutoTokenizer,
    AutoProcessor,
    WhisperForConditionalGeneration,
    TextStreamer,
    Tensor,
    PreTrainedTokenizer,
    Processor,
    PreTrainedModel,
} from '@huggingface/transformers';
import {
    MessageFromWorker,
    MessageFromWorkerType,
    MessageToWorker,
    MessageToWorkerType,
    AUDIO_SAMPLE_RATE,
    SpeechRecognitionType,
} from './transcribe-audio-stream.models';
import { float32ToInt16, encodeWAV } from './transcribe-audio-stream.utils';

const AUDIO_PROCESSING_TIME = 2000; // 2 seconds
const OVERLAP_TIME = 200; // 200ms overlap between iterations of processing
const MODEL_NAME = 'onnx-community/whisper-base'; // best model for the web I've found so far
const MODEL_DEVICE = 'webgpu';
const MODEL_FORMAT = 'fp32'; // single-precision floating-point 32-bit format
const TARGET_LANGUAGE = 'en'; // english
const MAX_OUTPUT_TOKENS = 64;
const CLOUDFLARE_WORKER_URL = 'https://whisper-worker.gethuman.workers.dev';

// buffer audio chunks as they come in to the web worker
let audioChunkBuffer = new Float32Array(0);
let speechRecognitionType: SpeechRecognitionType = SpeechRecognitionType.NONE;
let isAudioProcessorDaemonRunning = false;

// These are the HuggingFace model objects used to do the heavy lifting for transcribing audio
let processor: Processor | null = null;
let tokenizer: PreTrainedTokenizer | null = null;
let model: PreTrainedModel | null = null;

/**
 * inbound event handler for messages from the main thread to this worker process
 */
addEventListener('message', (event) => {
    const msg: MessageToWorker = event.data || {};

    if (msg.type === MessageToWorkerType.INIT_MODEL) {
        speechRecognitionType = msg.speechRecognitionType || SpeechRecognitionType.NONE;

        if (speechRecognitionType === SpeechRecognitionType.TRANSFORMERS) {
            initializeTransformersModel();
        }

        if (!isAudioProcessorDaemonRunning) {
            runAudioProcessorDaemon();
        }
    } else if (msg.type === MessageToWorkerType.AUDIO) {
        audioChunkBuffer = concatenateFloat32Arrays(audioChunkBuffer, msg.audioChunk);
    } else if (msg.type === MessageToWorkerType.STOP) {
        isAudioProcessorDaemonRunning = false;
    } else if (msg.type === MessageToWorkerType.LOG) {
        console.log(msg.text);
    } else {
        console.error(`Invalid inbound worker message=${JSON.stringify({ eventData: msg })}`);
    }
});

/**
 * Post data outbound back to the main thread from this worker process
 */
function postOutboundEvent(eventData: MessageFromWorker) {
    postMessage(eventData);
}

/**
 * Helper function to concatenate Float32Arrays
 */
function concatenateFloat32Arrays(buffer1: Float32Array, buffer2: Float32Array = new Float32Array(0)): Float32Array {
    const tmp = new Float32Array(buffer1.length + buffer2.length);
    tmp.set(buffer1, 0);
    tmp.set(buffer2, buffer1.length);
    return tmp;
}

/**
 * Initialize the HuggingFace model objects and (if successful) start the audio processing daemon
 */
async function initializeTransformersModel() {
    // no need to initialize again if already initialized
    if (processor && tokenizer && model) {
        return;
    }

    try {
        const startTime = Date.now();
        const modelOpts: any = {
            dtype: {
                encoder_model: MODEL_FORMAT,
                decoder_model_merged: MODEL_FORMAT,
            },
            device: MODEL_DEVICE,
        };

        const resp = await Promise.all([
            AutoProcessor.from_pretrained(MODEL_NAME, {}),
            AutoTokenizer.from_pretrained(MODEL_NAME, {}),
            WhisperForConditionalGeneration.from_pretrained(MODEL_NAME, modelOpts),
        ]);
        processor = resp[0];
        tokenizer = resp[1];
        model = resp[2];
        const endTime = Date.now();
        const duration = endTime - startTime;
        postOutboundEvent({ type: MessageFromWorkerType.READY, text: `Finished in ${duration}ms` });
    } catch (ex) {
        console.error(ex);
        postOutboundEvent({ type: MessageFromWorkerType.ERROR, text: 'Error occurred while initializing model', error: ex as Error });
    }
}

/**
 * Audio will continue to get added to the audioChunkBuffer as it comes in from the main thread.
 * This function is in charge of simply monitoring the audioChunkBuffer for when there is enough
 * audio to process and then sending that chunk off to the processAudioChunk function.
 */
async function runAudioProcessorDaemon() {
    const audioProcessingLength = AUDIO_SAMPLE_RATE * (AUDIO_PROCESSING_TIME / 1000);
    const audioOverlapLength = AUDIO_SAMPLE_RATE * (OVERLAP_TIME / 1000);

    // if daemon already running, return and don't do anything; else set it to running and get it going
    if (isAudioProcessorDaemonRunning) {
        return;
    } else {
        isAudioProcessorDaemonRunning = true;
    }

    while (isAudioProcessorDaemonRunning) {
        if (audioChunkBuffer.length >= audioProcessingLength) {
            // get the audio chunk to process
            const audioToProcess = audioChunkBuffer.slice(0, audioProcessingLength);

            // modify the buffer to remove the audio we're about to process minus some overlap
            // we do this to try and avoid cutting off a word in the middle
            audioChunkBuffer = audioChunkBuffer.slice(audioProcessingLength - audioOverlapLength);

            // process the audio chunk
            await processAudioChunk(audioToProcess);
        }

        // if not enough audio to process, wait a bit before checking again
        if (audioChunkBuffer.length < audioProcessingLength) {
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
}

/**
 * This is the primary function for using the models to transcribe one audio chunk
 */
async function processAudioChunk(audioChunk?: Float32Array) {
    if (!audioChunk?.length) {
        return;
    }

    if (speechRecognitionType === SpeechRecognitionType.CLOUDFLARE) {
        await processAudioChunkWithCloudflare(audioChunk);
    } else if (speechRecognitionType === SpeechRecognitionType.TRANSFORMERS) {
        await processAudioChunkWithTransformers(audioChunk);
    } else if (speechRecognitionType === SpeechRecognitionType.CHROME) {
        await processAudioChunkWithChromeBuiltInAi(audioChunk);
    }
}

async function processAudioChunkWithChromeBuiltInAi(audioChunk: Float32Array) {
    const int16Audio = float32ToInt16(audioChunk);
    const wavBuffer = encodeWAV(int16Audio, AUDIO_SAMPLE_RATE);
    const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    postOutboundEvent({ type: MessageFromWorkerType.AUDIO_BLOB, audioBlob });
}

async function processAudioChunkWithTransformers(audioChunk: Float32Array) {
    if (!tokenizer || !processor || !model) {
        console.error('processAudioChunk called before model initialized');
        return;
    }

    // audio proprocessing which includes:
    //      - feature extraction: converting raw audio into log-Mel spectrogram
    //      - normalization: scaling the audio features to a specific range
    const inputs = await processor(audioChunk);

    const modelGenerationConfig: any = {
        ...inputs,
        max_new_tokens: MAX_OUTPUT_TOKENS, // can be small because we only process 2 seconds of audio at a time
        language: TARGET_LANGUAGE,
        streamer: new TextStreamer(tokenizer, {
            skip_prompt: true,
            skip_special_tokens: true,
        }),
    };

    // model generates output tokens based on the input tokens (NOTE: tokens !== words)
    const outputs = (await model.generate(modelGenerationConfig)) as Tensor;

    // finally we need the tokenizer to conver the tokens to actual english words
    const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: true })[0];

    // ignore blank audio
    if (outputText.indexOf('BLANK_AUDIO') >= 0) {
        return;
    }

    console.log('Local transcription: ' + outputText);

    // return the transcribed text to the main thread
    postOutboundEvent({ type: MessageFromWorkerType.TRANSCRIPTION, text: outputText });
}

async function processAudioChunkWithCloudflare(audioChunk: Float32Array) {
    const int16Audio = float32ToInt16(audioChunk); // Convert Float32Array to Int16Array (PCM 16-bit)
    const wavBuffer = encodeWAV(int16Audio, AUDIO_SAMPLE_RATE); // encode as WAV
    const wavUint8Array = new Uint8Array(wavBuffer); // Convert to Uint8Array for sending

    try {
        const response = await fetch(CLOUDFLARE_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any other headers your Cloudflare Worker might require (e.g., authentication)
            },
            body: JSON.stringify({
                sampleRate: AUDIO_SAMPLE_RATE,
                audioChunk: Array.from(wavUint8Array),
            }),
        });

        if (!response.ok) {
            // Handle non-2xx responses (e.g., 400, 500 errors)
            const errorText = await response.text(); // Get error message from response body
            console.error(`Error sending audio chunk: ${response.status} ${response.statusText}`, errorText);
            // Consider throwing an error or showing an error message to the user
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const responseData = await response.json(); // Assuming the worker returns JSON

        console.log('Remote transcription: ' + responseData.transcription);

        // return the transcribed text to the main thread
        postOutboundEvent({ type: MessageFromWorkerType.TRANSCRIPTION, text: responseData.transcription });
    } catch (error) {
        console.error('Error sending audio chunk:', error);
    }
}
