import { Injectable } from '@angular/core';
import { AudioToProcess, Transcriber } from '../../models';

@Injectable()
export class TranscriberTransformersMainThread implements Transcriber {
    async init() {
        // todo
    }
    async processAudio(audio: AudioToProcess) {
        // todo
    }
}

// async startTransformersJsTranscription() {
//     this.state.debugOutput.set('');
//     this.state.type.set(SpeechRecognitionType.TRANSFORMERS);
//     this.state.status.set(AppStatus.STARTING);

//     this.addDebugOutput(`isWebWorkerAvailable: ${this.browser.isWebWorkerAvailable()}`);
//     this.addDebugOutput(`isWebCacheAvailable: ${this.browser.isWebCacheAvailable()}`);
//     this.addDebugOutput(`isWebGpuAvailable: ${this.browser.isWebGpuAvailable()}`);
//     this.addDebugOutput(`isWebNnAvailable: ${this.browser.isWebNnAvailable()}`);
//     this.addDebugOutput(`isWebAssemblyAvailable: ${this.browser.isWebAssemblyAvailable()}`);

//     if (!this.browser.isLocalDeviceAbleToRunAiModels()) {
//         this.addDebugOutput(`Your browser cannot support running local AI models`);
//         return;
//     }

//     this.addDebugOutput('Creating worker...');
//     this.ensureWorkerCreated();
//     this.addDebugOutput('Creating worker...done');
//     this.addDebugOutput('Starting to download Transformers.js model...');
//     this.transcriptionWorker?.postMessage({
//         type: MessageToWorkerType.START,
//         speechRecognitionType: SpeechRecognitionType.TRANSFORMERS,
//     });
// }

// finishStartingTransformersJsTranscription() {
//     this.addDebugOutput('Starting to download Transformers.js model...done.');

//     this.addDebugOutput('Requesting permission to user microphone...');

//     try {
//         this.userMedia.startMicrophoneAudioCapture((audioChunk) => {
//             this.transcriptionWorker?.postMessage({ type: MessageToWorkerType.AUDIO, audioChunk });
//         });
//     } catch (ex) {
//         this.addDebugOutput(`Error getting access to user microphone: ${ex}`);
//         return;
//     }

//     this.addDebugOutput('Requesting permission to user microphone...done.');
//     this.addDebugOutput('Starting to transcribe user audio with Transformer.js model...');
//     this.state.status.set(AppStatus.TRANSCRIBING);
// }
