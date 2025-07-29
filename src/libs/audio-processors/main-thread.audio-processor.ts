import { Injectable } from '@angular/core';
import { StateManager } from '../managers/state.manager';
import { UserMediaAdapter } from '../adapters';
import { AudioToProcess, MessageFromWorker, MessageFromWorkerType, MessageToWorkerType, SpeechRecognitionType } from '../models';
import { TranscriberChromeMainThread, TranscriberFactoryMainThread, TranscriberWebSpeechMainThread } from './main-thread';

@Injectable()
export class MainThreadAudioProcessor {
    workerThreadAudioProcessor: Worker | null = null;
    speechRecognitionType: SpeechRecognitionType | null = null;

    constructor(
        private state: StateManager,
        private userMedia: UserMediaAdapter,
        private transcriberFactory: TranscriberFactoryMainThread,
        private webSpeechTranscriber: TranscriberWebSpeechMainThread,
        private chromeTranscriber: TranscriberChromeMainThread
    ) {}

    async startTranscription(speechRecognitionType: SpeechRecognitionType) {
        if (speechRecognitionType === SpeechRecognitionType.WEB_SPEECH) {
            await this.webSpeechTranscriber.init();
        } else {
            this.ensureWorkerThreadCreated();
            this.startWorkerThreadProcessingDaemon(speechRecognitionType);
            this.startStreamingAudioFromUserMicToWorkerThread();
        }
    }

    stopTranscription() {
        if (this.speechRecognitionType === SpeechRecognitionType.WEB_SPEECH) {
            this.webSpeechTranscriber.stop();
            return;
        }

        this.stopWorkerThreadProcessingDaemon();
        this.stopStreamingAudio();

        if (this.speechRecognitionType === SpeechRecognitionType.CHROME) {
            this.chromeTranscriber.stop();
        }
    }

    ensureWorkerThreadCreated() {
        if (this.workerThreadAudioProcessor) {
            this.state.addDebugOutput('Worker thread already created.');
        } else {
            this.state.addDebugOutput('Creating worker thread...');
            this.workerThreadAudioProcessor = new Worker(new URL('./worker-thread.audio-processor', import.meta.url));
            this.workerThreadAudioProcessor.onmessage = ({ data }) => this.handleMessageFromWorkerToMainThread(data);
            this.state.addDebugOutput('Creating worker thread...done.');
        }
    }

    handleMessageFromWorkerToMainThread(msg: MessageFromWorker) {
        if (msg.type === MessageFromWorkerType.TRANSCRIPTION) {
            this.state.addToTranscription(msg.text);
        } else if (msg.type === MessageFromWorkerType.AUDIO) {
            this.sendAudioToMainThreadTranscriber(msg);
        } else if (msg.type === MessageFromWorkerType.LOG) {
            this.state.addDebugOutput(`Message from worker: ${msg.text}`);
        } else if (msg.type === MessageFromWorkerType.READY) {
            this.state.addDebugOutput(`Worker ready ${msg.text || ''}`);
        } else if (msg.type === MessageFromWorkerType.ERROR) {
            this.state.addDebugOutput(`Error from worker: ${msg.error}`);
        } else {
            this.state.addDebugOutput(`Message from worker: ${JSON.stringify({ msg })}`);
        }
    }

    startWorkerThreadProcessingDaemon(speechRecognitionType: SpeechRecognitionType) {
        this.state.addDebugOutput('Sending start message to worker thread...');
        this.speechRecognitionType = speechRecognitionType;
        this.workerThreadAudioProcessor?.postMessage({ type: MessageToWorkerType.START, speechRecognitionType });
        this.state.addDebugOutput('Sending start message to worker thread...done.');
    }

    stopWorkerThreadProcessingDaemon() {
        this.workerThreadAudioProcessor?.postMessage({ type: MessageToWorkerType.STOP });
    }

    startStreamingAudioFromUserMicToWorkerThread() {
        this.state.addDebugOutput('Starting to stream audio from user mic to worker thread...');

        try {
            this.userMedia.startMicrophoneAudioCapture((audioChunk) => {
                this.workerThreadAudioProcessor?.postMessage({ type: MessageToWorkerType.AUDIO, audioChunk });
            });
            this.state.addDebugOutput('Starting to stream audio from user mic to worker thread...done.');
        } catch (ex) {
            this.state.addDebugOutput(`Error getting access to user microphone: ${ex}`);
        }
    }

    async sendAudioToMainThreadTranscriber(audio: AudioToProcess) {
        if (audio?.audioBlob || audio?.audioChunk) {
            const transcriber = this.transcriberFactory.getTranscriber(this.speechRecognitionType);
            await transcriber.init();
            transcriber.processAudio(audio);
        }
    }

    stopStreamingAudio() {
        this.userMedia.stopMicrophoneAudioCapture();
    }
}
