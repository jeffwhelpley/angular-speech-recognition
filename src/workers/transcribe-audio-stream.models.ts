export const AUDIO_SAMPLE_RATE = 16000; // 16,000 Hz (i.e. 16 kHz); number of audio samples captured per second

export interface MessageFromWorker {
    type: MessageFromWorkerType;
    text?: string;
    audioChunk?: Float32Array;
    error?: Error;
}

export enum MessageFromWorkerType {
    PROCESS_AUDIO_CHUNK = 'process_audio_chunk',
    TRANSCRIPTION = 'transcription',
    READY = 'ready',
    ERROR = 'error',
}

export interface MessageToWorker {
    type: MessageToWorkerType;
    audioChunk?: Float32Array;
    text?: string;
}

export enum MessageToWorkerType {
    INIT_MODEL_REMOTE = 'init_model_remote',
    INIT_MODEL_LOCAL = 'init_model_local',
    AUDIO = 'audio',
    DESTROY = 'destroy',
    STOP = 'stop',
    START = 'start',
    LOG = 'log',
}
