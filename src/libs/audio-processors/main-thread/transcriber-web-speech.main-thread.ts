import { Inject, Injectable } from '@angular/core';
import { AudioToProcess, Transcriber } from '../../models';

@Injectable()
export class TranscriberWebSpeechMainThread implements Transcriber {
    async init() {}
    async processAudio(audio: AudioToProcess) {
        // todo here
    }
}

// async startWebSpeechApiTranscription() {
//     this.state.debugOutput.set('');
//     this.state.type.set(SpeechRecognitionType.WEB_SPEECH);
//     this.state.status.set(AppStatus.STARTING);

//     this.addDebugOutput(`Checking Web Speech API availability...`);
//     if (!this.browser.isWebSpeechAvailable()) {
//         this.addDebugOutput('Web Speech API is not available in this browser.');
//         return;
//     }

//     this.addDebugOutput(`Checking Web Speech API availability...done.`);

//     // Get the correct SpeechRecognition object
//     this.webSpeechRecognition = this.browser.getWebSpeechRecognition();

//     this.webSpeechRecognition.continuous = true; // Keep listening
//     this.webSpeechRecognition.interimResults = true; // Get results as they come
//     this.webSpeechRecognition.lang = 'en-US'; // You can make this configurable

//     this.addDebugOutput('Web Speech API configured. Starting recognition...');

//     this.webSpeechRecognition.onstart = () => {
//         this.addDebugOutput('Speech recognition service has started.');
//         this.state.status.set(AppStatus.TRANSCRIBING);
//     };

//     this.webSpeechRecognition.onresult = (event: any) => {
//         let interim_transcript = '';
//         let final_transcript = '';

//         for (let i = event.resultIndex; i < event.results.length; ++i) {
//             if (event.results[i].isFinal) {
//                 final_transcript += event.results[i][0].transcript;
//             } else {
//                 interim_transcript += event.results[i][0].transcript;
//             }
//         }

//         this.addToTranscription(final_transcript);
//     };

//     this.webSpeechRecognition.onerror = (event: any) => {
//         const errStr = `Web Speech API Error: ${event.error} - ${event.message}`;
//         console.error(errStr);
//         this.addDebugOutput(errStr);
//     };

//     this.webSpeechRecognition.onend = () => {
//         this.addToTranscription('\n\n-- end of transcription --');
//         // If continuous, it might stop. You might want to restart it here if state is still TRANSCRIBING
//         // For now, we'll let stopAndResetAll handle full cleanup.
//     };

//     this.webSpeechRecognition.start();
// }
