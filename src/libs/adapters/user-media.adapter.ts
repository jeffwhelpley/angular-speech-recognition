import { Injectable } from '@angular/core';
import { AUDIO_SAMPLE_RATE } from '../models/audio-sample-rate';

const AUDIO_WORKLET_PROCESSOR_NAME = 'audio-processor';

@Injectable()
export class UserMediaAdapter {
    mediaStream: MediaStream | null = null;
    audioContext: AudioContext | null = null;
    isMicrophoneAudioCaptureActive = false;

    /**
     * This will start audio streaming from the user's microphone to the audioChunkCallback callback function
     *
     * @param audioChunkCallback Callback function passed in that will receive audio chunks
     */
    async startMicrophoneAudioCapture(audioChunkCallback: (chunk: Float32Array) => void) {
        if (this.isMicrophoneAudioCaptureActive) {
            return;
        } else {
            this.isMicrophoneAudioCaptureActive = true;
        }

        // this will prompt the user to get permission to their microphone
        // error thrown if not supported or user denies permission
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });

        // create AudioContext which manages the streaming audio data
        this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });

        // AudioWorklet used to process the audio data in real-time in a separate thread
        await this.audioContext.audioWorklet.addModule(this.getWorkletUrl());
        const audioProcessor = new AudioWorkletNode(this.audioContext, AUDIO_WORKLET_PROCESSOR_NAME);
        audioProcessor.port.onmessage = (event) => audioChunkCallback(event.data);

        // connect the microphone audio stream to the AudioWorkletNode
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(audioProcessor);
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
     * I couldn't get it working as a separate URL with the Angular build system so a future ToDo.
     */
    private getWorkletUrl() {
        const workletCode = `
            class AudioProcessor extends AudioWorkletProcessor {
                process(inputs, outputs, parameters) {
                    const input = inputs[0]; // assume only one input (i.e. one microphone)

                    if (input.length > 0) {
                        const channelData = input[0]; // assume mono (i.e. not stereo with multiple channels)
                        this.port.postMessage(channelData); // send Float32Array of audio samples back to main thread
                    }

                    return true; // keep processor running (if false, would stop the processor)
                }
            }
            registerProcessor('${AUDIO_WORKLET_PROCESSOR_NAME}', AudioProcessor);
        `;

        // Create a Blob and convert it to a URL
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }
}
