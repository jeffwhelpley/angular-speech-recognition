import { Component, signal } from '@angular/core';
import {
    AutoTokenizer,
    AutoProcessor,
    WhisperProcessor,
    WhisperForConditionalGeneration,
    TextStreamer,
    full,
    Tensor,
    pipeline,
} from '@huggingface/transformers';

declare global {
    interface Navigator {
        readonly gpu: any;
        readonly deviceMemory: any;
    }
}

/**
 * TODOs:
 *
 * 1. Get openai/whisper-base working (i.e. to see the diff of two models)
 * 2. Create docs with detailed info about how each line of code works
 * 3. Create streaming version where translations on continuous basis
 * 4. Componentize and clean up code so super easy to understand/use
 *          - Adapter/utility for dealing with audio streaming
 *          - Adapter for HuggingFace Transformers (and each model?)
 * 5. Also get HuggingFace model working running on CloudFlare
 *
 * ** Important: become expert in implementing HuggingFace model **
 *
 * Later stuff:
 *      - Connect transcribed text to one of the other models (like Chrome Built in)
 *      - Training models in browser and on server to customize base models
 *      - Using other cloud services and how to decide where/how to run your models
 *      - Ultimate Web App AI Architecture
 */

@Component({
    selector: 'app-root',
    template: `
        <button (click)="createWorker()">Create Worker</button>
        <button (click)="talkToWorker()">Talk to Worker</button>
        <button (click)="initializeModels()">Initialize Models</button>
        <button (click)="startRecording()">Start Recording</button>
        <button (click)="stopRecording()">Stop Recording</button>
        <p>{{ transcription() }}</p>
    `,
    styles: [],
})
export class AppComponent {
    transcription = signal('');
    mediaRecorder: MediaRecorder | null = null;
    worker: Worker | null = null;

    constructor() {
        console.log(`isWebGpuEnabled=${!!navigator.gpu}`);
        console.log(`isWasmCapable=${typeof window.WebAssembly === 'object'}`);
        console.log(`deviceMemory=${navigator.deviceMemory}`);
    }

    createWorker() {
        if (typeof Worker === 'undefined') {
            console.log(`Sorry, your browser does not support Web Workers...`);
            return;
        }
        this.worker = new Worker(new URL('../workers/transcribe-audio-stream.worker', import.meta.url));
        this.worker.onmessage = ({ data }) => {
            console.log(`main thread got message: ${JSON.stringify({ data })}`);
        };
        console.log(`Worker created.`);
    }

    talkToWorker() {
        this.worker?.postMessage({ type: 'log', text: 'Hello, Worker!' });
    }

    initializeModels() {
        this.worker?.postMessage({ type: 'init' });
    }

    async startRecording() {
        const WHISPER_SAMPLING_RATE = 16_000;
        const MAX_AUDIO_LENGTH = 30; // seconds
        const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;

        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext({ sampleRate: WHISPER_SAMPLING_RATE });
        let audioChunks: Blob[] = [];
        const mr = (this.mediaRecorder = new MediaRecorder(mediaStream));

        this.mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = async () => {
            const processingStartTime = Date.now();

            const audioBlob = new Blob(audioChunks, { type: mr.mimeType });
            const arrayBuffer = await audioBlob.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(arrayBuffer);

            let audio = decoded.getChannelData(0);
            if (audio.length > MAX_SAMPLES) {
                audio = audio.slice(-MAX_SAMPLES); // Get last MAX_SAMPLES
            }

            const modelName = 'onnx-community/whisper-base';
            const initializationOne = Date.now();
            console.log(`Initializing tokenizer...`);
            const tokenizer = await AutoTokenizer.from_pretrained(modelName, {});
            const initializationTwo = Date.now();
            console.log(`Initializing tokenizer...done...now processor...`);
            const processor = await AutoProcessor.from_pretrained(modelName, {});
            const initializationThree = Date.now();
            console.log(`Initializing tokenizer...done...now processor...done...now model...`);
            const model = await WhisperForConditionalGeneration.from_pretrained(modelName, {
                dtype: {
                    encoder_model: 'fp32', // 'fp16' works too
                    decoder_model_merged: 'fp32', // or 'q4' 'fp32' ('fp16' is broken)
                },
                device: 'webgpu',
            });
            const initializationFour = Date.now();
            console.log(`
                    Tokenizer: ${initializationTwo - initializationOne}ms
                    Processor: ${initializationThree - initializationTwo}ms
                    Model: ${initializationFour - initializationThree}ms
                `);
            let startTime: DOMHighResTimeStamp;
            let numTokens = 0;
            const streamer = new TextStreamer(tokenizer, {
                skip_prompt: true,
                skip_special_tokens: true,
                callback_function: (output) => {
                    startTime = startTime || performance.now();
                    let tps;
                    if (numTokens++ > 0) {
                        tps = (numTokens / (performance.now() - startTime)) * 1000;
                    }
                },
            });
            console.log(`Running processor...`);
            const processorStartTime = Date.now();
            const inputs = await processor(audio);
            const processorEndTime = Date.now();
            console.log(`Running processor...done in ${processorEndTime - processorStartTime}ms`);
            console.log(`Running model...`);
            const modelStartTime = Date.now();
            const outputs = (await model.generate({
                ...inputs,
                max_new_tokens: 64, // why is this??
                language: 'en',
                streamer,
            })) as Tensor;
            const modelEndTime = Date.now();
            console.log(`Running model...done in ${modelEndTime - modelStartTime}ms`);
            console.log(`Running tokenizer...`);
            const tokenizerStartTime = Date.now();
            const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: true });
            const tokenizerEndTime = Date.now();
            console.log(`Running tokenizer...done in ${tokenizerEndTime - tokenizerStartTime}ms`);
            const processingEndTime = Date.now();
            const elapsed = processingEndTime - processingStartTime;
            console.log(`DONE in ${elapsed}ms outputText=${outputText}`);
        };

        this.mediaRecorder.start();
    }

    async stopRecording() {
        this.mediaRecorder?.stop();
    }
}

/*************************************** Start with openai/whisper-base *******************************/
// const modelName = 'openai/whisper-base';
// const processor = await WhisperProcessor.from_pretrained(modelName, {});
// const model = await WhisperForConditionalGeneration.from_pretrained(modelName, {});

// // model.config['forced_decoder_ids'] = None;

// const inputs = await processor(audio);
// const outputs = (await model.generate(inputs)) as Tensor;
// const outputText = processor.batch_decode(outputs, { skip_special_tokens: true });
// const processingEndTime = Date.now();
// const elapsed = processingEndTime - processingStartTime;
// console.log(`DONE in ${elapsed}ms outputText=${outputText}`);
