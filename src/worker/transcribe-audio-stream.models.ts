export const AUDIO_SAMPLE_RATE = 16000; // 16,000 Hz (i.e. 16 kHz); number of audio samples captured per second

export interface MessageFromWorker {
    type: MessageFromWorkerType;
    text?: string;
    audioBlob?: Blob;
    error?: Error;
}

export enum MessageFromWorkerType {
    TRANSCRIPTION = 'transcription',
    READY = 'ready',
    ERROR = 'error',
    AUDIO_BLOB = 'audio_blob',
}

export interface MessageToWorker {
    type: MessageToWorkerType;
    speechRecognitionType?: SpeechRecognitionType;
    audioChunk?: Float32Array;
    text?: string;
}

export enum MessageToWorkerType {
    INIT_MODEL = 'init_model',
    AUDIO = 'audio',
    DESTROY = 'destroy',
    STOP = 'stop',
    START = 'start',
    LOG = 'log',
}

export enum SpeechRecognitionType {
    NONE = '',
    TRANSFORMERS = 'Transformers.js',
    CHROME = 'Chrome Built-in AI',
    WEB_SPEECH = 'Web Speech API',
    CLOUDFLARE = 'Cloudflare',
}
