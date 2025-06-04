import { Injectable, signal } from '@angular/core';
import { AppStatus } from '../models';
import { SpeechRecognitionType } from '../../worker';

@Injectable()
export class StateManager {
    status = signal<AppStatus>(AppStatus.DEFAULT);
    type = signal<SpeechRecognitionType>(SpeechRecognitionType.NONE);
    debugOutput = signal('');
    transcription = signal('');
}
