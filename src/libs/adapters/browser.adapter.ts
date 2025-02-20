class BrowserAdapter {
    isExecutingAiModelsSupported() {
        const isWebGpuAvailable = !!navigator.gpu;
        const isWasmCapable = typeof window.WebAssembly === 'object';
        const isEnoughMemory = navigator.deviceMemory >= 2; // 2GB
        return isWebGpuAvailable && isWasmCapable && isEnoughMemory;
    }
}

export const browserAdapter = new BrowserAdapter();
