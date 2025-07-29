import { MAIN_THREAD_TRANSCRIBER_PROVIDERS } from './main-thread';
import { MainThreadAudioProcessor } from './main-thread.audio-processor';

export * from './main-thread.audio-processor';

export const AUDIO_PROCESSOR_PROVIDERS = [...MAIN_THREAD_TRANSCRIBER_PROVIDERS, MainThreadAudioProcessor];
