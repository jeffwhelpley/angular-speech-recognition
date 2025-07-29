import { AudioToProcess, Transcriber } from '../../models';

class TranscriberWebSpeechWorkerThread implements Transcriber {
    async init() {}
    async processAudio(audio: AudioToProcess) {
        console.log('Web Speech API not yet implemented');
    }
}

export const webSpeechTranscriber = new TranscriberWebSpeechWorkerThread();
