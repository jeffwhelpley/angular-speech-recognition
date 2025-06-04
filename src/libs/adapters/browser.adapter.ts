import { Injectable } from '@angular/core';

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

@Injectable()
export class BrowserAdapter {
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

    isChrome() {
        return navigator.userAgent.indexOf('Chrome') > -1;
    }

    getWebSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        return new SpeechRecognition();
    }

    async getChromeBuiltInAiAvailability() {
        if (typeof window.LanguageModel === 'undefined') {
            return 'Not Available';
        } else {
            return window.LanguageModel.availability({ expectedInputs: [{ type: 'audio' }] });
        }
    }

    async getChromeBuiltInAiSession() {
        return window.LanguageModel.create({ expectedInputs: [{ type: 'audio' }] });
    }

    getDeviceMemory() {
        return navigator.deviceMemory;
    }
}
