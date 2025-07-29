import { Transcriber, SpeechRecognitionType } from '../../models';
import { chromeTranscriber } from './transcriber-chrome.worker-thread';
import { cloudflareTranscriber } from './transcriber-cloudflare.worker-thread';
import { defaultTranscriber } from './transcriber-default.worker-thread';
import { transformersTranscriber } from './transcriber-transformers.worker-thread';
import { webSpeechTranscriber } from './transcriber-web-speech.worker-thread';

class TranscriberFactoryWorkerThread {
    getTranscriber(type?: SpeechRecognitionType): Transcriber {
        if (type === SpeechRecognitionType.CLOUDFLARE) {
            return cloudflareTranscriber;
        } else if (type === SpeechRecognitionType.TRANSFORMERS) {
            return transformersTranscriber;
        } else if (type === SpeechRecognitionType.CHROME) {
            return chromeTranscriber;
        } else if (type === SpeechRecognitionType.WEB_SPEECH) {
            return webSpeechTranscriber;
        } else {
            return defaultTranscriber;
        }
    }
}

export const transcriberFactory = new TranscriberFactoryWorkerThread();
