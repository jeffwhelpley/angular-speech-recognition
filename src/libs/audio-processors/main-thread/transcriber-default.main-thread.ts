import { Injectable } from '@angular/core';
import { AudioToProcess, Transcriber } from '../../models';

@Injectable()
export class TranscriberDefaultMainThread implements Transcriber {
    async init() {}

    async processAudio(audio: AudioToProcess) {
        console.log('DefaultAudioProcessor.processAudioChunk called');
    }
}
