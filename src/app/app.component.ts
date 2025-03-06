import { Component, signal } from '@angular/core';
import { userMediaAdapter, browserAdapter } from '../libs/adapters';

@Component({
    selector: 'app-root',
    template: `
        <button (click)="startAudioCapture()">Start Audio Capture (local model)</button>
        <button (click)="startAudioCapture(true)">Start Audio Capture (remote model)</button>
        <button (click)="stopAudioCapture()">Stop Audio Capture</button>
        <p>Status: {{ status() }}</p>
        <pre>{{ transcription() }}</pre>
    `,
    styles: [],
})
export class AppComponent {
    status = signal('');
    transcription = signal('');
    mediaRecorder: MediaRecorder | null = null;
    worker: Worker | null = null;

    createWorker() {
        this.worker = new Worker(new URL('../workers/transcribe-audio-stream.worker', import.meta.url));

        this.worker.onmessage = ({ data }) => {
            switch (data.type) {
                case 'transcription':
                    this.transcription.set(this.transcription + '\n' + data.transcription);
                    break;
                case 'ready':
                    console.log(data.text);
                    break;
                case 'error':
                    console.log(data.text);
                    break;
                default:
                    console.log('Unknown message from worker: ' + JSON.stringify({ data }));
            }
        };
    }

    async startAudioCapture(forceRemote = false) {
        // if the worker doesn't already exist, create it
        if (!this.worker) {
            this.createWorker();
        }

        // if we are NOT forcing remote and browser supports it, we initialize models locally
        if (!forceRemote && browserAdapter.isExecutingAiModelsSupported()) {
            this.worker?.postMessage({ type: 'init_model_local' });
        } else {
            this.worker?.postMessage({ type: 'init_model_remote' });
        }

        // finally start the microphone audio capture and send audio chunks to the worker for processing
        userMediaAdapter.startMicrophoneAudioCapture({
            audioChunkCallback: async (audioChunk: Float32Array) => {
                this.worker?.postMessage({ type: 'audio', audioChunk });
            },
        });
    }

    stopAudioCapture() {
        userMediaAdapter.stopMicrophoneAudioCapture();
    }
}
