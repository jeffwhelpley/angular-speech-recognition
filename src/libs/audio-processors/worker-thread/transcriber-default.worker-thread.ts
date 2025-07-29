import { AudioToProcess, Transcriber } from '../../models';

class TranscriberDefaultWorkerThread implements Transcriber {
    async init() {}

    async processAudio(audio: AudioToProcess) {
        console.log('processAudioChunk for default transcriber called');
    }
}

export const defaultTranscriber = new TranscriberDefaultWorkerThread();
