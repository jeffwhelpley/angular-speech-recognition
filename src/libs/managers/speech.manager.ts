import { Injectable } from '@angular/core';
import { StateManager } from './state.manager';
import { AppStatus, SpeechRecognitionType } from '../models';
import { BrowserAdapter, UserMediaAdapter } from '../adapters';
import { MessageFromWorker, MessageFromWorkerType, MessageToWorkerType } from '../../worker';

@Injectable()
export class SpeechManager {
    transcriptionWorker: Worker | null = null;

    constructor(
        private state: StateManager,
        private browser: BrowserAdapter,
        private userMedia: UserMediaAdapter
    ) {}

    async startTransformersJsTranscription() {
        this.state.debugOutput.set('');
        this.state.type.set(SpeechRecognitionType.TRANSFORMERS);
        this.state.status.set(AppStatus.STARTING);

        this.addDebugOutput(`isWebWorkerAvailable: ${this.browser.isWebWorkerAvailable()}`);
        this.addDebugOutput(`isWebCacheAvailable: ${this.browser.isWebCacheAvailable()}`);
        this.addDebugOutput(`isWebGpuAvailable: ${this.browser.isWebGpuAvailable()}`);
        this.addDebugOutput(`isWebNnAvailable: ${this.browser.isWebNnAvailable()}`);
        this.addDebugOutput(`isWebAssemblyAvailable: ${this.browser.isWebAssemblyAvailable()}`);

        if (!this.browser.isLocalDeviceAbleToRunAiModels()) {
            this.addDebugOutput(`Your browser cannot support running local AI models`);
            return;
        }

        this.addDebugOutput('Creating worker...');
        this.ensureWorkerCreated();
        this.addDebugOutput('Creating worker...done');
        this.addDebugOutput('Starting to download Transformers.js model...');
        this.transcriptionWorker?.postMessage({ type: MessageToWorkerType.INIT_MODEL_LOCAL });
    }

    finishStartingTransformersJsTranscription() {
        this.addDebugOutput('Starting to download Transformers.js model...done.');

        this.addDebugOutput('Requesting permission to user microphone...');

        try {
            this.userMedia.startMicrophoneAudioCapture((audioChunk) => {
                this.transcriptionWorker?.postMessage({ type: MessageToWorkerType.AUDIO, audioChunk });
            });
        } catch (ex) {
            this.addDebugOutput(`Error getting access to user microphone: ${ex}`);
            return;
        }

        this.addDebugOutput('Requesting permission to user microphone...done.');
        this.addDebugOutput('Starting to transcribe user audio with Transformer.js model...');
        this.state.status.set(AppStatus.TRANSCRIBING);
    }

    async startChromeBuiltInAiTranscription() {
        this.state.debugOutput.set('');
        this.state.type.set(SpeechRecognitionType.CHROME);
        this.state.status.set(AppStatus.STARTING);

        this.addDebugOutput(`Is this browser Chrome? ${this.browser.isChrome()}`);

        const availability = await this.browser.getChromeBuiltInAiAvailability();
        this.addDebugOutput(`Chrome Built-in AI Availability: ${availability}`);

        this.addDebugOutput(`Starting to download Chrome Built-in AI model...`);
        const startTime = new Date().getTime();

        try {
            const session = await this.browser.getChromeBuiltInAiSession();

            // now that we have session, do prompt...
            this.addDebugOutput('got model but need code to do something with it');
        } catch (ex) {
            this.addDebugOutput(`Error downloading Chrome Built-in AI model: ${ex}`);
            return;
        }

        const endTime = new Date().getTime();
        const duration = endTime - startTime;
        this.addDebugOutput(`Starting to download Chrome Built-in AI model...done in ${duration}ms`);
    }

    async startWebSpeechApiTranscription() {
        this.state.debugOutput.set('');
        this.state.type.set(SpeechRecognitionType.WEB_SPEECH);
        this.state.status.set(AppStatus.STARTING);
    }

    async startCloudflareTranscription() {
        this.state.debugOutput.set('');
        this.state.type.set(SpeechRecognitionType.CLOUDFLARE);
        this.state.status.set(AppStatus.STARTING);
    }

    stopAndResetAll() {
        this.state.debugOutput.set('');
        this.state.transcription.set('');
        this.state.status.set(AppStatus.DEFAULT);
        this.state.type.set(SpeechRecognitionType.NONE);
        this.transcriptionWorker?.postMessage({ type: MessageToWorkerType.STOP });
        this.userMedia.stopMicrophoneAudioCapture();
    }

    addDebugOutput(msg: string) {
        if (msg) {
            this.state.debugOutput.set(this.state.debugOutput() + '\n' + msg);
        }
    }

    addToTranscription(msg: string) {
        if (msg) {
            this.state.transcription.set(this.state.transcription() + '\n' + msg);
        }
    }

    ensureWorkerCreated() {
        if (!this.transcriptionWorker) {
            this.transcriptionWorker = new Worker(new URL('../../worker/transcribe-audio-stream.worker', import.meta.url));
            this.transcriptionWorker.onmessage = ({ data }) => this.handleMessageFromWorker(data);
        }
    }

    handleMessageFromWorker(msg: MessageFromWorker) {
        if (msg.type === MessageFromWorkerType.TRANSCRIPTION) {
            this.addToTranscription(msg.text || '');
        } else if (msg.type === MessageFromWorkerType.READY) {
            if (this.state.type() === SpeechRecognitionType.TRANSFORMERS) {
                this.finishStartingTransformersJsTranscription();
            }
        } else if (msg.type === MessageFromWorkerType.ERROR) {
            this.addDebugOutput(`Error from worker: ${msg.error}`);
        } else {
            this.addDebugOutput(`Unknown message from worker: ${JSON.stringify({ msg })}`);
        }
    }
}
