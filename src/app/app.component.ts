import { Component, ViewChild, ElementRef, effect } from '@angular/core';
import { AppStatus } from '../libs/models';
import { SpeechManager, StateManager } from '../libs/managers';
import { BrowserAdapter, UserMediaAdapter } from '../libs/adapters';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
    providers: [SpeechManager, StateManager, BrowserAdapter, UserMediaAdapter],
    standalone: true,
})
export class AppComponent {
    AppStatus = AppStatus;
    @ViewChild('outputArea', { static: false }) outputAreaRef?: ElementRef<HTMLDivElement>;

    constructor(
        public state: StateManager,
        public speech: SpeechManager
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
}
