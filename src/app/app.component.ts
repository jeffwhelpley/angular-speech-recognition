import { Component, signal } from '@angular/core';
import {
    AutoTokenizer,
    AutoProcessor,
    WhisperProcessor,
    WhisperForConditionalGeneration,
    TextStreamer,
    full,
    Tensor,
} from '@huggingface/transformers';

declare global {
    interface Navigator {
        readonly gpu: any;
    }
}

// (typeof window.WebAssembly === 'object') if browser has WASM support (which is needed for many models)
// navigator.deviceMemory tells you RAM in GB

const IS_WEBGPU_AVAILABLE = !!navigator.gpu;
const MAX_NEW_TOKENS = 64;
const WHISPER_SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 30; // seconds
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;

@Component({
    selector: 'app-root',
    template: `
        <button (click)="startRecording()">Start Recording</button>
        <button (click)="stopRecording()">Stop Recording</button>
        <p>{{ transcription() }}</p>
    `,
    styles: [],
})
export class AppComponent {
    transcription = signal('');
    mediaRecorder: MediaRecorder | null = null;

    constructor() {
        console.log(`IS_WEBGPU_AVAILABLE=${IS_WEBGPU_AVAILABLE}`);
    }

    async startRecording() {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext({ sampleRate: WHISPER_SAMPLING_RATE });
        const audioChunks: Blob[] = [];
        const mr = (this.mediaRecorder = new MediaRecorder(mediaStream));

        this.mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            } else {
                // Empty chunk received, so we request new data after a short timeout
                setTimeout(() => mr.requestData(), 25);
            }
        };

        this.mediaRecorder.onstop = async () => {
            const processingStartTime = Date.now();
            const fileReader = new FileReader();
            fileReader.onloadend = async () => {
                const arrayBuffer = fileReader.result as ArrayBuffer;
                const decoded = await audioContext.decodeAudioData(arrayBuffer);
                let audio = decoded.getChannelData(0);
                if (audio.length > MAX_SAMPLES) {
                    audio = audio.slice(-MAX_SAMPLES); // Get last MAX_SAMPLES
                }

                /*************************************** Start with onnx-community/whisper-base *******************************/
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
                    max_new_tokens: MAX_NEW_TOKENS,
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
            };

            const audioBlob = new Blob(audioChunks, { type: mr.mimeType });
            fileReader.readAsArrayBuffer(audioBlob);
        };

        this.mediaRecorder.start();
    }

    async stopRecording() {
        this.mediaRecorder?.stop();
    }
}
