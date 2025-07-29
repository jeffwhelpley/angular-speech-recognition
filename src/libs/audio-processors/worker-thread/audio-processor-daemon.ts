import { MessageFromWorkerType, SpeechRecognitionType } from '../../models';
import { audioBuffer } from './audio-buffer';
import { transcriberFactory } from './transcriber-factory.worker-thread';

class AudioProcessorDaemon {
    isRunning = false;

    async start(speechRecognitionType?: SpeechRecognitionType) {
        this.isRunning = true;
        audioBuffer.reset();

        const transcriber = transcriberFactory.getTranscriber(speechRecognitionType);
        await transcriber.init();
        postMessage({ type: MessageFromWorkerType.READY });

        while (this.isRunning) {
            await transcriber.processAudio({ audioChunk: audioBuffer.getNextChunk() });

            if (!audioBuffer.isNextChunkAvailable()) {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }
    }

    stop() {
        this.isRunning = false;
    }
}

export const audioProcessorDaemon = new AudioProcessorDaemon();
