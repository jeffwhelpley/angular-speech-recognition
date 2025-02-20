import { Component, signal } from '@angular/core';
import { userMediaAdapter, browserAdapter } from '../libs/adapters';

@Component({
    selector: 'app-root',
    template: `
        <button (click)="createWorker()">Create Worker</button>
        <button (click)="initializeModels()">Initialize Models</button>
        <button (click)="startAudioCapture()">Start Audio Capture</button>
        <button (click)="stopWorkerProcessing()">Stop Worker Processing</button>
        <p>{{ transcription() }}</p>
    `,
    styles: [],
})
export class AppComponent {
    transcription = signal('');
    mediaRecorder: MediaRecorder | null = null;
    worker: Worker | null = null;

    constructor() {
        if (!browserAdapter.isExecutingAiModelsSupported()) {
            console.error('This browser does not support the required features for this application.');
            return;
        }
    }

    createWorker() {
        this.worker = new Worker(new URL('../workers/transcribe-audio-stream.worker', import.meta.url));
        this.worker.onmessage = ({ data }) => console.log(JSON.stringify({ data }));
        console.log(`Worker created.`);
    }

    initializeModels() {
        this.worker?.postMessage({ type: 'init' });
    }

    async startAudioCapture() {
        userMediaAdapter.startMicrophoneAudioCapture({
            audioChunkCallback: async (audioChunk: Float32Array) => {
                this.worker?.postMessage({ type: 'audio', audioChunk });
            },
        });
    }

    stopWorkerProcessing() {
        this.worker?.postMessage({ type: 'stop' });
    }
}
