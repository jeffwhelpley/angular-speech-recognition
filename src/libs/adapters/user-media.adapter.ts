const DEFAULT_SAMPLE_RATE = 16_000; // 16,000 Hz (i.e. 16 kHz); number of audio samples captured per second

class UserMediaAdapter {
    mediaStream: MediaStream | null = null;
    audioContext: AudioContext | null = null;
    isMicrophoneAudioCaptureActive = false;

    /**
     * This will start audio streaming from the user's microphone to the audioChunkCallback function
     */
    async startMicrophoneAudioCapture({ sampleRate = DEFAULT_SAMPLE_RATE, audioChunkCallback }: MicrophoneAudioCaptureConfig) {
        // make sure we only have one active audio capture at a time
        if (this.isMicrophoneAudioCaptureActive) return;
        this.isMicrophoneAudioCaptureActive = true;

        try {
            // this will prompt the user to get permission to their microphone; error thrown if they don't allow it
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });

            // Create AudioContext which manages the streaming audio data
            this.audioContext = new AudioContext({ sampleRate });

            // We will use an AudioWorklet to process the audio data in real-time
            await this.audioContext.audioWorklet.addModule(this.getWorkletUrl());
            const audioProcessor = new AudioWorkletNode(this.audioContext, 'audio-processor');
            audioProcessor.port.onmessage = (event) => audioChunkCallback(event.data);

            // Connect the microphone audio stream to the AudioWorkletNode
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(audioProcessor);
        } catch (ex) {
            console.error(ex);
            this.stopMicrophoneAudioCapture();
        }
    }

    /**
     * Stop the audio streaming from the user's microphone and destroy the AudioContext
     */
    stopMicrophoneAudioCapture() {
        try {
            this.audioContext?.close();
            this.mediaStream?.getTracks().forEach((track) => track.stop());
        } catch (ex) {
            console.error(ex); // TODO: better error handling if using this code in production
        } finally {
            this.audioContext = null;
            this.mediaStream = null;
            this.isMicrophoneAudioCaptureActive = false;
        }
    }

    /**
     * This needs to be in a separate URL or as a string like this in order to run as a Worklet.
     * I couldn't get it working as a separate URL with the Angular build system.
     */
    private getWorkletUrl() {
        const workletCode = `
            class AudioProcessor extends AudioWorkletProcessor {
                process(inputs, outputs, parameters) {
                    const input = inputs[0];
                    if (input.length > 0) {
                        const channelData = input[0]; // Float32Array of audio samples
                        this.port.postMessage(channelData);
                    }
                    return true; // Keep processor running
                }
            }
            registerProcessor('audio-processor', AudioProcessor);
        `;

        // Create a Blob and convert it to a URL
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }
}

export const userMediaAdapter = new UserMediaAdapter();

// ***** models for this adapter below *****

interface MicrophoneAudioCaptureConfig {
    sampleRate?: number;
    timeslice?: number;
    audioChunkCallback: AudioChunkCallback;
}

type AudioChunkCallback = (chunk: Float32Array) => void;

/**
 * TODOs:
 *
 * - Use WebAssembly for Audio Processing to improve speed
 * - More research into AudioWorklet https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet
 */
