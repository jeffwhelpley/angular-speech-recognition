import { TranscriberChromeMainThread } from './transcriber-chrome.main-thread';
import { TranscriberCloudflareMainThread } from './transcriber-cloudflare.main-thread';
import { TranscriberDefaultMainThread } from './transcriber-default.main-thread';
import { TranscriberFactoryMainThread } from './transcriber-factory.main-thread';
import { TranscriberTransformersMainThread } from './transcriber-transformers.main-thread';
import { TranscriberWebSpeechMainThread } from './transcriber-web-speech.main-thread';

export * from './transcriber-factory.main-thread';
export * from './transcriber-web-speech.main-thread';
export * from './transcriber-chrome.main-thread';

export const MAIN_THREAD_TRANSCRIBER_PROVIDERS = [
    TranscriberChromeMainThread,
    TranscriberCloudflareMainThread,
    TranscriberDefaultMainThread,
    TranscriberTransformersMainThread,
    TranscriberWebSpeechMainThread,
    TranscriberFactoryMainThread,
];
