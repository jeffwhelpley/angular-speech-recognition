import { Injectable } from '@angular/core';
import { StateManager } from './state.manager';
import { AppStatus } from '../models';
import { BrowserAdapter, UserMediaAdapter } from '../adapters';
import { MessageFromWorker, MessageFromWorkerType, MessageToWorkerType, SpeechRecognitionType } from '../../worker';

@Injectable()
export class SpeechManager {
    transcriptionWorker: Worker | null = null;
    webSpeechRecognition: any | null = null;
    chromeAiSession: any | null = null;
    chromeAiAudioBlobQueue: Blob[] = [];
    isChromeAudioProcessorDaemonRunning = false;

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
        this.transcriptionWorker?.postMessage({
            type: MessageToWorkerType.INIT_MODEL,
            speechRecognitionType: SpeechRecognitionType.TRANSFORMERS,
        });
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

        this.addDebugOutput('Creating worker...');
        this.ensureWorkerCreated();
        this.addDebugOutput('Creating worker...done');
        this.transcriptionWorker?.postMessage({
            type: MessageToWorkerType.INIT_MODEL,
            speechRecognitionType: SpeechRecognitionType.CHROME,
        });

        this.addDebugOutput(`Starting to download Chrome Built-in AI model...`);
        const startTime = new Date().getTime();

        try {
            this.chromeAiSession = await this.browser.getChromeBuiltInAiSession();
        } catch (ex) {
            this.addDebugOutput(`Error downloading Chrome Built-in AI model: ${ex}`);
            return;
        }

        const endTime = new Date().getTime();
        const duration = endTime - startTime;
        this.addDebugOutput(`Starting to download Chrome Built-in AI model...done in ${duration}ms`);

        this.addDebugOutput('Requesting permission to user microphone...');

        try {
            this.userMedia.startMicrophoneAudioCapture(async (audioChunk: Float32Array<ArrayBufferLike>) => {
                this.transcriptionWorker?.postMessage({ type: MessageToWorkerType.AUDIO, audioChunk });
            });
        } catch (ex) {
            this.addDebugOutput(`Error getting access to user microphone: ${ex}`);
            return;
        }

        this.addDebugOutput('Requesting permission to user microphone...done.');
        this.addDebugOutput('Starting to transcribe user audio with Chrome Built-in AI model...');

        this.runChromeAudioProcessorDaemon();
        this.state.status.set(AppStatus.TRANSCRIBING);
    }

    async runChromeAudioProcessorDaemon() {
        if (this.isChromeAudioProcessorDaemonRunning) {
            return;
        }

        this.isChromeAudioProcessorDaemonRunning = true;
        while (this.isChromeAudioProcessorDaemonRunning) {
            const audioBlob = this.chromeAiAudioBlobQueue.shift();

            if (audioBlob) {
                console.log(`Attempting to transcribe audio blob...`);
                const result = await this.chromeAiSession.prompt([
                    {
                        role: 'user',
                        content: [
                            { type: 'text', value: 'Please transcribe the audio' },
                            { type: 'audio', value: audioBlob },
                        ],
                    },
                ]);
                console.log(`Attempting to transcribe audio blob...done`);
                console.log(result);
                this.addToTranscription(result);
            }

            const waitMs = this.chromeAiAudioBlobQueue.length > 0 ? 200 : 2000;
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }

    async startWebSpeechApiTranscription() {
        this.state.debugOutput.set('');
        this.state.type.set(SpeechRecognitionType.WEB_SPEECH);
        this.state.status.set(AppStatus.STARTING);

        this.addDebugOutput(`Checking Web Speech API availability...`);
        if (!this.browser.isWebSpeechAvailable()) {
            this.addDebugOutput('Web Speech API is not available in this browser.');
            return;
        }

        this.addDebugOutput(`Checking Web Speech API availability...done.`);

        // Get the correct SpeechRecognition object
        this.webSpeechRecognition = this.browser.getWebSpeechRecognition();

        this.webSpeechRecognition.continuous = true; // Keep listening
        this.webSpeechRecognition.interimResults = true; // Get results as they come
        this.webSpeechRecognition.lang = 'en-US'; // You can make this configurable

        this.addDebugOutput('Web Speech API configured. Starting recognition...');

        this.webSpeechRecognition.onstart = () => {
            this.addDebugOutput('Speech recognition service has started.');
            this.state.status.set(AppStatus.TRANSCRIBING);
        };

        this.webSpeechRecognition.onresult = (event: any) => {
            let interim_transcript = '';
            let final_transcript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }

            this.addToTranscription(final_transcript);
        };

        this.webSpeechRecognition.onerror = (event: any) => {
            const errStr = `Web Speech API Error: ${event.error} - ${event.message}`;
            console.error(errStr);
            this.addDebugOutput(errStr);
        };

        this.webSpeechRecognition.onend = () => {
            this.addToTranscription('\n\n-- end of transcription --');
            // If continuous, it might stop. You might want to restart it here if state is still TRANSCRIBING
            // For now, we'll let stopAndResetAll handle full cleanup.
        };

        this.webSpeechRecognition.start();
    }

    async startCloudflareTranscription() {
        this.state.debugOutput.set('');
        this.state.type.set(SpeechRecognitionType.CLOUDFLARE);
        this.state.status.set(AppStatus.STARTING);

        this.addDebugOutput('This is disabled temporarily. Come back soon.');
    }

    stopAndResetAll() {
        this.state.debugOutput.set('');
        this.state.transcription.set('');
        this.state.status.set(AppStatus.DEFAULT);
        this.state.type.set(SpeechRecognitionType.NONE);
        this.transcriptionWorker?.postMessage({ type: MessageToWorkerType.STOP });
        this.userMedia.stopMicrophoneAudioCapture();
        this.isChromeAudioProcessorDaemonRunning = false;
        this.chromeAiAudioBlobQueue = [];
        this.chromeAiSession = null;
        this.webSpeechRecognition = null;
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
        } else if (msg.type === MessageFromWorkerType.AUDIO_BLOB) {
            if (msg.audioBlob) {
                this.chromeAiAudioBlobQueue.push(msg.audioBlob);
            }
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
