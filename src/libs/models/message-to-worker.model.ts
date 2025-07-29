export interface MessageToWorker {
    type: MessageToWorkerType;
    speechRecognitionType?: SpeechRecognitionType;
    audioChunk?: Float32Array;
    text?: string;
}

export enum MessageToWorkerType {
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
