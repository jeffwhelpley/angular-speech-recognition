export interface MessageFromWorker {
    type: MessageFromWorkerType;
    text?: string;
    audioChunk?: Float32Array;
    audioBlob?: Blob;
    error?: Error;
}

export enum MessageFromWorkerType {
    TRANSCRIPTION = 'transcription',
    READY = 'ready',
    ERROR = 'error',
    AUDIO = 'audio',
    LOG = 'log',
}
