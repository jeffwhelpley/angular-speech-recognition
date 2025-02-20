import {
    AutoTokenizer,
    AutoProcessor,
    WhisperForConditionalGeneration,
    TextStreamer,
    Tensor,
    PreTrainedTokenizer,
    Processor,
    PreTrainedModel,
    DataArray,
} from '@huggingface/transformers';

const AUDIO_SAMPLING_RATE = 16_000; // 16,000 Hz (16 kHz); number of audio samples captured per second
const AUDIO_PROCESSING_TIME = 2000; // 2 seconds
const OVERLAP_TIME = 500; // 500ms overlap between iterations of processing
const MODEL_NAME = 'onnx-community/whisper-base'; // best model for the web I've found so far
const MODEL_DEVICE = 'webgpu';
const MODEL_FORMAT = 'fp32'; // single-precision floating-point format
const TARGET_LANGUAGE = 'en'; // english

// buffer audio chunks as they come in to the web worker
let audioChunkBuffer = new Float32Array(0);
let isWorkerRunning = true;

// These are the HuggingFace model objects used to do the heavy lifting for transcribing audio
let processor: Processor | null = null;
let tokenizer: PreTrainedTokenizer | null = null;
let model: PreTrainedModel | null = null;

// Used while processing audio chunks to keep track of previous output tokens and the audio chunk buffer
let previousOutputTokens: DataArray = [];

// inbound event handler from the main thread to this worker process
addEventListener('message', (event) => {
    const eventData: InboundEventData = event.data || {};

    if (eventData.type === InboundEventDataType.INIT) {
        initializeModel();
    } else if (eventData.type === InboundEventDataType.AUDIO) {
        audioChunkBuffer = concatenateFloat32Arrays(audioChunkBuffer, eventData.audioChunk);
    } else if (eventData.type === InboundEventDataType.DESTROY) {
        isWorkerRunning = false;
    } else if (eventData.type === InboundEventDataType.LOG) {
        console.log(eventData.text);
    } else {
        console.error(`Invalid inbound worker message=${JSON.stringify({ eventData })}`);
    }
});

/**
 * Post data outbound back to the main thread from this worker process
 */
function postOutboundEvent(eventData: OutboundEventData) {
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
async function initializeModel() {
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
        postOutboundEvent({ type: OutboundEventDataType.READY, text: `Finished in ${duration}ms` });

        // now that model is initialized, start processing audio chunks
        runAudioProcessorDaemon();
    } catch (ex) {
        console.error(ex);
        postOutboundEvent({ type: OutboundEventDataType.ERROR, text: 'Error occurred while initializing model', error: ex as Error });
    }
}

/**
 * Audio will continue to get added to the audioChunkBuffer as it comes in from the main thread.
 * This function is in charge of simply monitoring the audioChunkBuffer for when there is enough
 * audio to process and then sending that chunk off to the processAudioChunk function.
 */
async function runAudioProcessorDaemon() {
    const audioProcessingLength = AUDIO_SAMPLING_RATE * AUDIO_PROCESSING_TIME;
    const audioOverlapLength = AUDIO_SAMPLING_RATE * OVERLAP_TIME;

    while (isWorkerRunning) {
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

    if (!tokenizer || !processor || !model) {
        console.error('processAudioChunk called before model initialized');
        return;
    }

    // const MAX_AUDIO_LENGTH = 30; // seconds
    // const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;
    // Pad with zeros if shorter than MAX_SAMPLES...why?
    // if (audioChunk.length < MAX_SAMPLES) {
    //     const padding = new Float32Array(MAX_SAMPLES - audioChunk.length);
    //     audioChunk = new Float32Array([...padding, ...audioChunk]); // Prepend padding
    // } else if (audioChunk.length > MAX_SAMPLES) {
    //     audioChunk = audioChunk.slice(-MAX_SAMPLES); // still get the last MAX_SAMPLES
    // }

    const inputs = await processor(audioChunk);

    const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
    });

    // Add decoder_input_ids for continuous transcription
    const generationConfig: any = {
        ...inputs,
        max_new_tokens: 64, // Why not?
        language: TARGET_LANGUAGE,
        streamer,
    };

    if (previousOutputTokens.length > 0) {
        generationConfig.decoder_input_ids = new Tensor(
            'int64',
            [].concat(...previousOutputTokens), // Flatten the previous tokens
            [1, previousOutputTokens.length]
        );
    }

    const outputs = (await model.generate(generationConfig)) as Tensor;
    const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: true })[0];
    previousOutputTokens = outputs.data.slice(); // Important: Update previousOutputTokens

    postOutboundEvent({ type: OutboundEventDataType.TRANSCRIPTION, text: outputText });
}

// **** models below ****

interface InboundEventData {
    type: InboundEventDataType;
    audioChunk?: Float32Array;
    text?: string;
}

enum InboundEventDataType {
    AUDIO = 'audio',
    INIT = 'init',
    DESTROY = 'destroy',
    LOG = 'log',
}

interface OutboundEventData {
    type: OutboundEventDataType;
    text?: string;
    error?: Error;
}

enum OutboundEventDataType {
    TRANSCRIPTION = 'transcription',
    READY = 'ready',
    ERROR = 'error',
}
