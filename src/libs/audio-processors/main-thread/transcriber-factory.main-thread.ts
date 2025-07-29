import { Injectable } from '@angular/core';
import { Transcriber, SpeechRecognitionType } from '../../models';
import { TranscriberChromeMainThread } from './transcriber-chrome.main-thread';
import { TranscriberCloudflareMainThread } from './transcriber-cloudflare.main-thread';
import { TranscriberDefaultMainThread } from './transcriber-default.main-thread';
import { TranscriberTransformersMainThread } from './transcriber-transformers.main-thread';
import { TranscriberWebSpeechMainThread } from './transcriber-web-speech.main-thread';

@Injectable()
export class TranscriberFactoryMainThread {
    constructor(
        private chromeTranscriber: TranscriberChromeMainThread,
        private cloudflareTranscriber: TranscriberCloudflareMainThread,
        private defaultTranscriber: TranscriberDefaultMainThread,
        private transformersTranscriber: TranscriberTransformersMainThread,
        private webSpeechTranscriber: TranscriberWebSpeechMainThread
    ) {}

    getTranscriber(type?: SpeechRecognitionType | null): Transcriber {
        if (type === SpeechRecognitionType.CLOUDFLARE) {
            return this.cloudflareTranscriber;
        } else if (type === SpeechRecognitionType.TRANSFORMERS) {
            return this.transformersTranscriber;
        } else if (type === SpeechRecognitionType.CHROME) {
            return this.chromeTranscriber;
        } else if (type === SpeechRecognitionType.WEB_SPEECH) {
            return this.webSpeechTranscriber;
        } else {
            return this.defaultTranscriber;
        }
    }
}
