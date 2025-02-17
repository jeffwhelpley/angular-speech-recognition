const DEFAULT_SAMPLE_RATE = 16_000;

class MicrophoneAdapter {
    mediaStream: MediaStream | null = null;
    audioContext: AudioContext | null = null;

    async enableUserMic(sampleRate = DEFAULT_SAMPLE_RATE) {
        if (!this.mediaStream?.active) {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            this.audioContext = new AudioContext({ sampleRate });
        }
    }

    // need to get stream of audio using mediarecorder
    // ???? how to determine when to send a chunk of audio to model to translate ???
}

export const microphoneAdapter = new MicrophoneAdapter();
