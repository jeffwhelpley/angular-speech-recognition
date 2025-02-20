declare global {
    interface Navigator {
        readonly gpu: any;
        readonly deviceMemory: any;
    }
}

class BrowserAdapter {
    isExecutingAiModelsSupported() {
        const isWebWorkerSupported = typeof Worker !== 'undefined';
        const isWebGpuAvailable = !!navigator.gpu;
        const isWasmCapable = typeof window.WebAssembly === 'object';
        const isEnoughMemory = navigator.deviceMemory >= 2; // 2GB
        return isWebWorkerSupported && isWebGpuAvailable && isWasmCapable && isEnoughMemory;
    }
}

export const browserAdapter = new BrowserAdapter();
