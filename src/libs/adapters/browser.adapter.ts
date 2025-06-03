declare global {
    interface Navigator {
        readonly gpu: any;
        readonly deviceMemory: any;
    }
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
        LanguageModel: any;
    }
}

class BrowserAdapter {
    isLocalDeviceAbleToRunAiModels() {
        const isEnoughMemory = this.getDeviceMemory() >= 2;
        return this.isWebWorkerAvailable() && this.isWebGpuAvailable() && this.isWebAssemblyAvailable() && isEnoughMemory;
    }

    isWebWorkerAvailable() {
        return typeof Worker !== 'undefined';
    }

    isWebCacheAvailable() {
        return typeof self !== 'undefined' && 'caches' in self;
    }

    isWebGpuAvailable() {
        return typeof navigator !== 'undefined' && 'gpu' in navigator;
    }

    isWebNnAvailable() {
        return typeof navigator !== 'undefined' && 'ml' in navigator;
    }

    isWebAssemblyAvailable() {
        return typeof window.WebAssembly === 'object';
    }

    isWebSpeechAvailable() {
        return typeof window.SpeechRecognition !== 'undefined' || typeof window.webkitSpeechRecognition !== 'undefined';
    }

    async getChromeBuiltInAiAvailability() {
        if (typeof window.LanguageModel === 'undefined') {
            return 'Not Available';
        } else {
            const availability = await window.LanguageModel.availability({
                expectedInputs: [{ type: 'audio', languages: ['en'] }],
            });
            return availability;
        }
    }

    async getChromeBuiltInAiSession() {
        console.log(`Starting to download model`);
        const startTime = new Date().getTime();
        const session = await window.LanguageModel.create({
            // monitor(m: any) {
            //     m.addEventListener('downloadprogress', (e: any) => {
            //         console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
            //     });
            // },
            expectedInputs: [{ type: 'audio' }],
        });
        const endTime = new Date().getTime();
        const duration = endTime - startTime;
        console.log(`Finished in ${duration}ms`);
        return session;
    }

    getDeviceMemory() {
        return navigator.deviceMemory;
    }
}

export const browserAdapter = new BrowserAdapter();
