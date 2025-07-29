export interface Transcriber {
    init: () => Promise<void>;
    processAudio: (audio: AudioToProcess) => Promise<void>;
}

export interface AudioToProcess {
    audioChunk?: Float32Array | null;
    audioBlob?: Blob | null;
}
