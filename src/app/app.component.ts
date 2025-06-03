import { Component, OnInit, signal } from '@angular/core';
import { userMediaAdapter, browserAdapter } from '../libs/adapters';
import { MessageToWorkerType, MessageFromWorker, MessageFromWorkerType } from '../workers/transcribe-audio-stream.models';

@Component({
    selector: 'app-root',
    template: `
        <h1>Angular Speech Recognition Demos</h1>
        <div class="button-group">
            <button (click)="stopAudioCapture()">
                <img src="/assets/icons/hugging-face.svg" alt="Transformer.js icon" class="button-icon" />
                <span>Transformer.js</span>
            </button>
            <button (click)="startAudioCaptureWithLocalTranscription()">
                <img src="/assets/icons/chrome.svg" alt="Chrome icon" class="button-icon" />
                <span>Chrome Built-in AI</span>
            </button>
            <button (click)="startAudioCaptureWithRemoteTranscription()">
                <img src="/assets/icons/w3c.svg" alt="W3C icon" class="button-icon" />
                <span>Web Speech API</span>
            </button>
            <button (click)="downloadAiModel()">
                <img src="/assets/icons/cloudflare.svg" alt="Cloudflare icon" class="button-icon" />
                <span>Cloudflare</span>
            </button>
        </div>

        <!-- <p>Status: {{ status() }}</p>
        <pre>{{ transcription() }}</pre>
        <hr />
        <div>
            <div>Is Web Speech Supported?</div>
            <div>{{ isWebSpeechAvailable() }}</div>
        </div>
        <div>
            <div>Chrome Availability:</div>
            <div>{{ chromeAvailability() }}</div>
        </div> -->
    `,
    styles: [
        `
            :host {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh; /* Full viewport height for vertical centering */
                padding: var(--size-fluid-3); /* Responsive padding */
                text-align: center; /* Center align text for h1 */
            }

            h1 {
                font-size: var(--font-size-7); /* Large, Material-like heading */
                font-weight: var(--font-weight-3); /* Lighter weight for large headings */
                color: var(--text-1);
                margin-block-start: 0;
                margin-block-end: var(--size-fluid-5); /* Space below heading */
            }

            .button-group {
                display: flex;
                flex-direction: column; /* Stack buttons vertically */
                gap: var(--size-4); /* Space between buttons */
                width: 100%;
                max-width: var(--size-content-3); /* Max width for the button column (e.g., 60ch) */
            }

            button {
                display: flex; /* Align icon and text */
                align-items: center;
                justify-content: center;
                gap: var(--size-3); /* Space between icon and text */
                width: 100%; /* Make buttons take full width of .button-group */
                padding: var(--size-4) var(--size-3); /* Generous padding for a large feel */
                font-size: var(--font-size-3); /* Very big font */
                font-weight: var(--font-weight-6); /* Bold text */
                line-height: var(--font-lineheight-2);
                color: var(--indigo-6); /* Blue text */
                background-color: var(--surface-1); /* White background */
                border: var(--border-size-2) solid var(--indigo-6); /* Blue border */
                border-radius: var(--radius-2); /* Standard Material corner radius (4px) */
                box-shadow: var(--shadow-1); /* Lighter shadow for outlined buttons */
                text-transform: uppercase;
                letter-spacing: var(--font-letterspacing-2);
                cursor: pointer;
                transition:
                    background-color 0.2s var(--ease-out-3),
                    color 0.2s var(--ease-out-3),
                    border-color 0.2s var(--ease-out-3),
                    box-shadow 0.2s var(--ease-out-3);
            }

            button:hover,
            button:focus-visible {
                background-color: var(--indigo-1); /* Light blue tint on hover */
                color: var(--indigo-7);
                border-color: var(--indigo-7); /* Darker blue border on hover */
                box-shadow: var(--shadow-2); /* Increased elevation on hover/focus */
            }

            button:active {
                background-color: var(--indigo-2); /* Slightly darker blue tint on active */
                color: var(--indigo-8);
                border-color: var(--indigo-8);
                box-shadow: var(--shadow-1); /* Keep or remove shadow on active */
            }

            .button-icon {
                width: var(--font-size-5); /* Adjust icon size as needed */
                height: var(--font-size-5); /* Adjust icon size as needed */
                object-fit: contain; /* Ensures the image scales nicely within the dimensions */
            }
        `,
    ],
})
export class AppComponent implements OnInit {
    status = signal('');
    transcription = signal('');
    isAudioCaptureActive = signal(false);
    isLocalDeviceAbleToRunAiModels = signal(browserAdapter.isLocalDeviceAbleToRunAiModels());
    isWebSpeechAvailable = signal(browserAdapter.isWebSpeechAvailable());
    chromeAvailability = signal(false);

    chromeAiSession: any = null;
    transcriptionWorker: Worker | null = null;

    async ngOnInit() {
        const availability = await browserAdapter.getChromeBuiltInAiAvailability();
        this.chromeAvailability.set(availability);
    }

    public async downloadAiModel() {
        this.chromeAiSession = await browserAdapter.getChromeBuiltInAiSession();
    }

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

    private async handleMessageFromWorker(msg: MessageFromWorker) {
        if (msg.type === MessageFromWorkerType.TRANSCRIPTION) {
            this.transcription.set(this.transcription() + '\n' + msg.text);
        } else if (msg.type === MessageFromWorkerType.PROCESS_AUDIO_CHUNK) {
            const response = await this.chromeAiSession?.prompt([
                {
                    role: 'user',
                    content: [
                        { type: 'text', value: 'Transcribe this audio' },
                        { type: 'audio', value: msg.audioChunk },
                    ],
                },
            ]);
            this.transcription.set(this.transcription() + '\n' + response);
        } else {
            console.log('Message from worker: ' + JSON.stringify({ msg }));
        }
    }
}
