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
import { Transcriber, MessageFromWorkerType, AudioToProcess } from '../../models';

class TranscriberTransformersWorkerThread implements Transcriber {
    processor: Processor | null = null;
    tokenizer: PreTrainedTokenizer | null = null;
    model: PreTrainedModel | null = null;

    async init() {
        // no need to initialize again if already initialized
        if (this.processor && this.tokenizer && this.model) {
            postMessage({ type: MessageFromWorkerType.LOG, text: `Transformers model already loaded` });
            return;
        }

        try {
            const startTime = Date.now();
            const modelOpts: any = {
                dtype: {
                    encoder_model: 'fp32', // single-precision floating-point 32-bit format
                    decoder_model_merged: 'fp32',
                },
                device: 'webgpu',
            };
            const MODEL_NAME = 'onnx-community/whisper-base'; // best model for the web I've found so far

            postMessage({ type: MessageFromWorkerType.LOG, text: `Loading transformers.js model...` });

            const resp = await Promise.all([
                AutoProcessor.from_pretrained(MODEL_NAME, {}),
                AutoTokenizer.from_pretrained(MODEL_NAME, {}),
                WhisperForConditionalGeneration.from_pretrained(MODEL_NAME, modelOpts),
            ]);

            postMessage({ type: MessageFromWorkerType.LOG, text: `Loading transformers.js model...done.` });

            this.processor = resp[0];
            this.tokenizer = resp[1];
            this.model = resp[2];

            const endTime = Date.now();
            const duration = endTime - startTime;

            postMessage({ type: MessageFromWorkerType.READY, text: `Model loaded in ${duration}ms` });
        } catch (ex) {
            console.error(ex);
            postMessage({ type: MessageFromWorkerType.ERROR, text: 'Error occurred while initializing model', error: ex as Error });
        }
    }

    async processAudio(audio: AudioToProcess) {
        if (!this.tokenizer || !this.processor || !this.model) {
            console.error('processAudioChunk called before model initialized');
            return;
        }

        // ignore blank audio
        const audioChunk = audio?.audioChunk;
        if (!audioChunk) {
            return;
        }

        // audio proprocessing which includes:
        //      - feature extraction: converting raw audio into log-Mel spectrogram
        //      - normalization: scaling the audio features to a specific range
        const inputs = await this.processor(audioChunk);

        const TARGET_LANGUAGE = 'en'; // english
        const MAX_OUTPUT_TOKENS = 64;

        const modelGenerationConfig: any = {
            ...inputs,
            max_new_tokens: MAX_OUTPUT_TOKENS, // can be small because we only process 2 seconds of audio at a time
            language: TARGET_LANGUAGE,
            streamer: new TextStreamer(this.tokenizer, {
                skip_prompt: true,
                skip_special_tokens: true,
            }),
        };

        // model generates output tokens based on the input tokens (NOTE: tokens !== words)
        const outputs = (await this.model.generate(modelGenerationConfig)) as Tensor;

        // finally we need the tokenizer to conver the tokens to actual english words
        const outputText = this.tokenizer.batch_decode(outputs, { skip_special_tokens: true })[0];

        // ignore blank audio
        if (outputText.indexOf('BLANK_AUDIO') >= 0) {
            return;
        }

        console.log('Local transcription: ' + outputText);

        // return the transcribed text to the main thread
        postMessage({ type: MessageFromWorkerType.TRANSCRIPTION, text: outputText });
    }
}

export const transformersTranscriber = new TranscriberTransformersWorkerThread();
