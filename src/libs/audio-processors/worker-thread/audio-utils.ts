class AudioUtils {
    concatenateFloat32Arrays(buffer1: Float32Array, buffer2: Float32Array = new Float32Array(0)): Float32Array {
        const tmp = new Float32Array(buffer1.length + buffer2.length);
        tmp.set(buffer1, 0);
        tmp.set(buffer2, buffer1.length);
        return tmp;
    }

    /**
     * Converts a Float32Array (assumed to be in the range -1.0 to +1.0) to an Int16Array.
     * This function performs clamping to avoid overflow.
     */
    float32ToInt16(float32Array: Float32Array): Int16Array {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const sample = float32Array[i] || 0;
            // Clamp the sample to the range -1.0 to +1.0, then scale and convert to int16.
            const scaledSample = Math.max(-1, Math.min(1, sample)) * 32767;
            int16Array[i] = Math.round(scaledSample); // Round to nearest integer
        }
        return int16Array;
    }

    encodeWAV(samples: Int16Array, sampleRate: number): ArrayBuffer {
        const numChannels = 1; // Mono
        const bitsPerSample = 16;
        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const dataSize = samples.length * 2; // Each sample is 2 bytes (16-bit)

        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true); // File size
        this.writeString(view, 8, 'WAVE');

        // fmt sub-chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
        view.setUint16(22, numChannels, true); // NumChannels
        view.setUint32(24, sampleRate, true); // SampleRate
        view.setUint32(28, byteRate, true); // ByteRate
        view.setUint16(32, blockAlign, true); // BlockAlign
        view.setUint16(34, bitsPerSample, true); // BitsPerSample

        // data sub-chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true); // Data size

        // Write the PCM samples
        let offset = 44;
        for (let i = 0; i < samples.length; i++, offset += 2) {
            view.setInt16(offset, samples[i], true);
        }

        return buffer;
    }

    // Helper function to write ASCII strings to a DataView
    writeString(view: DataView, offset: number, text: string) {
        for (let i = 0; i < text.length; i++) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
    }
}

export const audioUtils = new AudioUtils();
