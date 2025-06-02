import { Component, signal } from '@angular/core';
import { userMediaAdapter, browserAdapter } from '../libs/adapters';
import { MessageToWorkerType, MessageFromWorker, MessageFromWorkerType } from '../workers/transcribe-audio-stream.models';

@Component({
    selector: 'app-root',
    template: `
        @if (isAudioCaptureActive()) {
            <button (click)="stopAudioCapture()">Stop Audio Capture</button>
        } @else {
            @if (isLocalDeviceAbleToRunAiModels()) {
                <button (click)="startAudioCaptureWithLocalTranscription()">Start Audio Capture (local transcription)</button>
            }

            <button (click)="startAudioCaptureWithRemoteTranscription()">Start Audio Capture (remote transcription)</button>
        }

        <p>Status: {{ status() }}</p>
        <pre>{{ transcription() }}</pre>
    `,
    styles: [],
})
export class AppComponent {
    status = signal('');
    transcription = signal('');
    isAudioCaptureActive = signal(false);
    isLocalDeviceAbleToRunAiModels = signal(browserAdapter.isLocalDeviceAbleToRunAiModels());

    transcriptionWorker: Worker | null = null;

    public stopAudioCapture() {
        userMediaAdapter.stopMicrophoneAudioCapture();
        this.isAudioCaptureActive.set(false);
        this.transcriptionWorker?.postMessage({ type: MessageToWorkerType.STOP });
    }

    public async startAudioCaptureWithLocalTranscription() {
        this.startAudioCapture(MessageToWorkerType.INIT_MODEL_LOCAL);
    }

    public async startAudioCaptureWithRemoteTranscription() {
        this.startAudioCapture(MessageToWorkerType.INIT_MODEL_REMOTE);
    }

    private async startAudioCapture(initModelType: MessageToWorkerType) {
        this.ensureWorkerCreated();

        // have the worker initialize the model (either local or remote)
        this.transcriptionWorker?.postMessage({ type: initModelType });

        // stream audio from the user's microphone to the worker for transcriptions
        userMediaAdapter.startMicrophoneAudioCapture((audioChunk) => {
            this.transcriptionWorker?.postMessage({ type: MessageToWorkerType.AUDIO, audioChunk });
        });

        this.isAudioCaptureActive.set(true);
    }

    private ensureWorkerCreated() {
        if (!this.transcriptionWorker) {
            this.transcriptionWorker = new Worker(new URL('../workers/transcribe-audio-stream.worker', import.meta.url));
            this.transcriptionWorker.onmessage = ({ data }) => this.handleMessageFromWorker(data);
        }
    }

    private handleMessageFromWorker(msg: MessageFromWorker) {
        if (msg.type === MessageFromWorkerType.TRANSCRIPTION) {
            this.transcription.set(this.transcription() + '\n' + msg.text);
        } else {
            console.log('Message from worker: ' + JSON.stringify({ msg }));
        }
    }
}
