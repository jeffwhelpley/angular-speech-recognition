declare global {
    interface Navigator {
        readonly gpu: any;
        readonly deviceMemory: any;
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

    getDeviceMemory() {
        return navigator.deviceMemory;
    }
}

export const browserAdapter = new BrowserAdapter();
