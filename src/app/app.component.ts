import { Component, ViewChild, ElementRef, effect } from '@angular/core';
import { AppStatus, SpeechRecognitionType } from '../libs/models';
import { BrowserAdapter, UserMediaAdapter } from '../libs/adapters';
import { StateManager } from '../libs/managers';
import { AUDIO_PROCESSOR_PROVIDERS, MainThreadAudioProcessor } from '../libs/audio-processors';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    providers: [...AUDIO_PROCESSOR_PROVIDERS, StateManager, BrowserAdapter, UserMediaAdapter],
    standalone: true,
})
export class AppComponent {
    SpeechRecognitionType = SpeechRecognitionType;
    AppStatus = AppStatus;
    @ViewChild('outputArea', { static: false }) outputAreaRef?: ElementRef<HTMLDivElement>;

    constructor(
        public state: StateManager,
        public audioProcessor: MainThreadAudioProcessor
    ) {
        effect(() => {
            // Access the signals to make them dependencies of this effect
            this.state.debugOutput();
            this.state.transcription();

            // Defer the scroll operation to the next microtask.
            // This ensures that the DOM has been updated with the new content
            // before we try to calculate scrollHeight and scroll.
            Promise.resolve().then(() => {
                if (this.outputAreaRef?.nativeElement) {
                    const element = this.outputAreaRef.nativeElement;
                    element.scrollTop = element.scrollHeight;
                }
            });
        });
    }

    startTranscription(speechRecognitionType: SpeechRecognitionType) {
        this.state.debugOutput.set('');
        this.state.transcription.set('');
        this.state.type.set(speechRecognitionType);
        this.state.status.set(AppStatus.STARTING);

        this.audioProcessor.startTranscription(speechRecognitionType);

        this.state.status.set(AppStatus.TRANSCRIBING);
    }

    stopTranscription() {
        this.state.debugOutput.set('');
        this.state.transcription.set('');

        this.state.status.set(AppStatus.DEFAULT);
        this.state.type.set(SpeechRecognitionType.NONE);

        this.audioProcessor.stopTranscription();
    }
}
