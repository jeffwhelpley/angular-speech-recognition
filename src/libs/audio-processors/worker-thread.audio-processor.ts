import { MessageToWorker, MessageToWorkerType } from '../models';
import { audioBuffer, audioProcessorDaemon } from './worker-thread';

class WorkerThreadAudioProcessor {
    handleMessagesFromMainThreadToWorker() {
        addEventListener('message', async (event) => {
            const msg: MessageToWorker = event.data || {};

            if (msg.type === MessageToWorkerType.START) {
                audioProcessorDaemon.start(msg.speechRecognitionType);
            } else if (msg.type === MessageToWorkerType.STOP) {
                audioProcessorDaemon.stop();
            } else if (msg.type === MessageToWorkerType.AUDIO) {
                audioBuffer.add(msg.audioChunk);
            } else if (msg.type === MessageToWorkerType.LOG) {
                console.log(msg.text);
            } else {
                console.error(`Invalid inbound worker message=${JSON.stringify({ eventData: msg })}`);
            }
        });
    }
}

const workerThreadAudioProcessor = new WorkerThreadAudioProcessor();
workerThreadAudioProcessor.handleMessagesFromMainThreadToWorker();
