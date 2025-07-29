import { Injectable, signal } from '@angular/core';
import { AppStatus, SpeechRecognitionType } from '../models';

@Injectable()
export class StateManager {
    status = signal<AppStatus>(AppStatus.DEFAULT);
    type = signal<SpeechRecognitionType>(SpeechRecognitionType.NONE);
    debugOutput = signal('');
    transcription = signal('');

    addDebugOutput(msg?: string) {
        if (msg) {
            this.debugOutput.set(this.debugOutput() + '\n' + msg);
        }
    }

    addToTranscription(msg?: string) {
        if (msg) {
            this.transcription.set(this.transcription() + '\n' + msg);
        }
    }
}
