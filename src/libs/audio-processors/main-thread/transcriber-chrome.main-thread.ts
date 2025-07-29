import { Injectable } from '@angular/core';
import { AudioToProcess, Transcriber } from '../../models';
import { BrowserAdapter } from '../../adapters';
import { StateManager } from '../../managers';

@Injectable()
export class TranscriberChromeMainThread implements Transcriber {
    chromeAiSession: any = null;

    constructor(
        private browser: BrowserAdapter,
        private state: StateManager
    ) {}

    async init() {
        if (!this.chromeAiSession) {
            await this.checkCompatibility();
            await this.downloadModel();
        }
    }

    async processAudio(audio: AudioToProcess) {
        const audioBlob = audio?.audioBlob;
        if (!audioBlob) {
            return;
        }

        const result = await this.chromeAiSession.prompt([
            {
                role: 'user',
                content: [
                    { type: 'text', value: 'Please transcribe the audio' },
                    { type: 'audio', value: audioBlob },
                ],
            },
        ]);

        this.state.addToTranscription(result);
    }

    async checkCompatibility() {
        const availability = await this.browser.getChromeBuiltInAiAvailability();
        this.state.addDebugOutput(`Chrome Built-in AI Availability: ${availability}`);
    }

    async downloadModel() {
        if (this.chromeAiSession) {
            return;
        }

        this.state.addDebugOutput(`Starting to download Chrome Built-in AI model...`);
        const startTime = new Date().getTime();
        try {
            this.chromeAiSession = await this.browser.getChromeBuiltInAiSession();
        } catch (ex) {
            this.state.addDebugOutput(`Error downloading Chrome Built-in AI model: ${ex}`);
            return;
        }
        const endTime = new Date().getTime();
        const duration = endTime - startTime;
        this.state.addDebugOutput(`Starting to download Chrome Built-in AI model...done in ${duration}ms`);
    }

    stop() {
        this.chromeAiSession = null;
    }
}
