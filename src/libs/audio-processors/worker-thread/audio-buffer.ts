import { AUDIO_SAMPLE_RATE } from '../../models/audio-sample-rate';
import { audioUtils } from './audio-utils';

const AUDIO_PROCESSING_TIME = 2000; // 2 seconds
const OVERLAP_TIME = 200; // 200ms overlap between iterations of processing
const AUDIO_PROCESSING_LENGTH = AUDIO_SAMPLE_RATE * (AUDIO_PROCESSING_TIME / 1000);
const AUDIO_OVERLAP_LENGTH = AUDIO_SAMPLE_RATE * (OVERLAP_TIME / 1000);

class AudioBuffer {
    private _buffer: Float32Array<ArrayBuffer | ArrayBufferLike> = new Float32Array(0);

    reset() {
        this._buffer = new Float32Array(0);
    }

    add(audioChunk?: Float32Array<ArrayBufferLike>) {
        if (audioChunk) {
            this._buffer = audioUtils.concatenateFloat32Arrays(this._buffer, audioChunk);
        }
    }

    getNextChunk() {
        if (this._buffer.length < AUDIO_PROCESSING_LENGTH) {
            return null;
        }

        // get the 2 seconds of audio to return
        const chunk = this._buffer.slice(0, AUDIO_PROCESSING_LENGTH);

        // remove those 2 seconds from the buffer (minus 200ms of overlap)
        this._buffer = this._buffer.slice(AUDIO_PROCESSING_LENGTH - AUDIO_OVERLAP_LENGTH);

        return chunk;
    }

    isNextChunkAvailable() {
        return this._buffer.length >= AUDIO_PROCESSING_LENGTH;
    }
}

export const audioBuffer = new AudioBuffer();
