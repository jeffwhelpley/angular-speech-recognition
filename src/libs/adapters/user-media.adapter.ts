const DEFAULT_SAMPLE_RATE = 16_000; // 16,000 Hz (16 kHz); number of audio samples captured per second
const DEFAULT_TIMESLICE = 500; // 500ms time interval for when data emitted to ondatavailable event

class UserMediaAdapter {
    mediaStream: MediaStream | null = null;
    audioContext: AudioContext | null = null;
    mediaRecorder: MediaRecorder | null = null;
    isMicrophoneAudioCaptureActive = false;

    async startMicrophoneAudioCapture({
        sampleRate = DEFAULT_SAMPLE_RATE,
        timeslice = DEFAULT_TIMESLICE,
        audioChunkCallback,
    }: MicrophoneAudioCaptureConfig) {
        if (this.isMicrophoneAudioCaptureActive) {
            return;
        }

        this.isMicrophoneAudioCaptureActive = true;

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            this.audioContext = new AudioContext({ sampleRate });
            this.mediaRecorder = new MediaRecorder(this.mediaStream);
            this.mediaRecorder.ondataavailable = this.getRawAudioBlobHandler(audioChunkCallback);
            this.mediaRecorder.start(timeslice);
        } catch (ex) {
            console.error(ex); // TODO: better error handling if using this code in production
            this.stopMicrophoneAudioCapture();
        }
    }

    getRawAudioBlobHandler(audioChunkCallback: AudioChunkCallback) {
        return async (event: BlobEvent) => {
            if (!event?.data?.size) {
                return; // no need to do anything if no data
            }

            if (!this.audioContext) {
                console.error('Cannot process audio data without an AudioContext. Stop the capture and try again.');
                return;
            }

            try {
                const arrayBuffer = await event.data.arrayBuffer(); // Blob to ArrayBuffer (binary data)
                const decoded = await this.audioContext.decodeAudioData(arrayBuffer); // ArrayBuffer to AudioBuffer (from Web Audio API)
                const newAudio = decoded.getChannelData(0); // AudioBuffer to Float32Array (audio samples)

                audioChunkCallback(newAudio);
            } catch (ex) {
                console.error(ex); // TODO: better error handling if using this code in production
            }
        };
    }

    stopMicrophoneAudioCapture() {
        try {
            this.mediaRecorder?.stop();
            this.mediaStream?.getTracks().forEach((track) => track.stop());
        } catch (ex) {
            console.error(ex); // TODO: better error handling if using this code in production
        } finally {
            this.mediaRecorder = null;
            this.mediaStream = null;
            this.audioContext = null;
            this.isMicrophoneAudioCaptureActive = false;
        }
    }
}

export const userMediaAdapter = new UserMediaAdapter();

interface MicrophoneAudioCaptureConfig {
    sampleRate?: number;
    timeslice?: number;
    audioChunkCallback: AudioChunkCallback;
}

type AudioChunkCallback = (chunk: Float32Array) => void;
