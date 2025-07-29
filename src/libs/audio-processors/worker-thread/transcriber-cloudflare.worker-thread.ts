import { AudioToProcess, Transcriber } from '../../models';

class TranscriberCloudflareWorkerThread implements Transcriber {
    async init() {}

    async processAudio(audio: AudioToProcess) {
        console.log('Cloudflare not yet implemented');
        // const int16Audio = audioUtils.float32ToInt16(audioChunk); // Convert Float32Array to Int16Array (PCM 16-bit)
        // const wavBuffer = audioUtils.encodeWAV(int16Audio, AUDIO_SAMPLE_RATE); // encode as WAV
        // const wavUint8Array = new Uint8Array(wavBuffer); // Convert to Uint8Array for sending
        // try {
        //     const CLOUDFLARE_WORKER_URL = 'https://whisper-worker.gethuman.workers.dev';
        //     const response = await fetch(CLOUDFLARE_WORKER_URL, {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json',
        //             // Add any other headers your Cloudflare Worker might require (e.g., authentication)
        //         },
        //         body: JSON.stringify({
        //             sampleRate: AUDIO_SAMPLE_RATE,
        //             audioChunk: Array.from(wavUint8Array),
        //         }),
        //     });
        //     if (!response.ok) {
        //         // Handle non-2xx responses (e.g., 400, 500 errors)
        //         const errorText = await response.text(); // Get error message from response body
        //         console.error(`Error sending audio chunk: ${response.status} ${response.statusText}`, errorText);
        //         // Consider throwing an error or showing an error message to the user
        //         throw new Error(`Server responded with ${response.status}: ${errorText}`);
        //     }
        //     const responseData = await response.json(); // Assuming the worker returns JSON
        //     console.log('Remote transcription: ' + responseData.transcription);
        //     // return the transcribed text to the main thread
        //     postOutboundEvent({ type: MessageFromWorkerType.TRANSCRIPTION, text: responseData.transcription });
        // } catch (error) {
        //     console.error('Error sending audio chunk:', error);
        // }
    }
}

export const cloudflareTranscriber = new TranscriberCloudflareWorkerThread();
