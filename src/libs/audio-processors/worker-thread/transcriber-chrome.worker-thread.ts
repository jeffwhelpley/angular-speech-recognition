import { AudioToProcess, MessageFromWorkerType, Transcriber } from '../../models';
import { AUDIO_SAMPLE_RATE } from '../../models/audio-sample-rate';
import { audioUtils } from './audio-utils';

class TranscriberChromeWorkerThread implements Transcriber {
    async init() {
        // currently chrome built-in ai doesn't work in worker thread, so no init needed
    }

    async processAudio(audio: AudioToProcess) {
        const audioChunk = audio?.audioChunk;
        if (!audioChunk) {
            return;
        }

        // we need to convert the raw audioChunk bits to a wave file snippet
        const int16Audio = audioUtils.float32ToInt16(audioChunk);
        const wavBuffer = audioUtils.encodeWAV(int16Audio, AUDIO_SAMPLE_RATE);
        const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });

        // send the wave file blob back to the main thread to be used by the chrome built in ai model
        postMessage({ type: MessageFromWorkerType.AUDIO, audioBlob });
    }
}

export const chromeTranscriber = new TranscriberChromeWorkerThread();
