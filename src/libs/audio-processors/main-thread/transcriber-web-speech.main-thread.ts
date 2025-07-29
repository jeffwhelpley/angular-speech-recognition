import { Injectable } from '@angular/core';
import { AudioToProcess, Transcriber } from '../../models';
import { BrowserAdapter } from '../../adapters';
import { StateManager } from '../../managers';

@Injectable()
export class TranscriberWebSpeechMainThread implements Transcriber {
    webSpeechRecognition: any = null;

    constructor(
        private browser: BrowserAdapter,
        private state: StateManager
    ) {}

    async init() {
        this.webSpeechRecognition = this.browser.getWebSpeechRecognition();
        this.webSpeechRecognition.continuous = true;
        this.webSpeechRecognition.interimResults = false; // Set to true to get partial results as they come in
        this.webSpeechRecognition.lang = 'en-US'; // we will hard code to english for now

        this.webSpeechRecognition.onerror = (event: any) => {
            this.state.addDebugOutput(`Loading Web Speech API error: ${event.error}`);

            if (event.error === 'not-allowed') {
                console.error('Microphone access denied. Please allow microphone access for this page.');
            } else if (event.error === 'no-speech') {
                console.warn('No speech detected. Still listening...');
            }
        };

        // Event handler for when speech recognition ends
        this.webSpeechRecognition.onend = () => {
            console.log('Speech recognition ended. Restarting...');
            // Automatically restart recognition if it ends (e.g., due to silence timeout)
            this.webSpeechRecognition.start();
        };

        this.webSpeechRecognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            // Loop through the results to distinguish final and interim
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (interimTranscript) {
                console.log('INTERIM: ' + interimTranscript);
            }

            if (finalTranscript) {
                this.state.addToTranscription(finalTranscript);
            }
        };

        this.state.addDebugOutput(`Loading Web Speech API...`);
        return new Promise<void>((resolve) => {
            this.webSpeechRecognition.onstart = () => {
                this.state.addDebugOutput(`Loading Web Speech API...done`);
                resolve();
            };
            this.webSpeechRecognition.start();
        });
    }

    async processAudio(audio: AudioToProcess) {
        // for this transcriber, we don't process audio in chunks from the worker thread like the others
    }

    stop() {
        this.webSpeechRecognition.stop();
        this.webSpeechRecognition = null;
    }
}
