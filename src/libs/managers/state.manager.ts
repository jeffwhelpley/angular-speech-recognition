import { Injectable, signal } from '@angular/core';
import { AppStatus, SpeechRecognitionType } from '../models';

@Injectable()
export class StateManager {
    status = signal<AppStatus>(AppStatus.DEFAULT);
    type = signal<SpeechRecognitionType>(SpeechRecognitionType.NONE);
    debugOutput = signal('');
    transcription = signal('');
}
