import { type RecognitionProvider, RecognitionProviderType } from './types.ts';
import { LlmProvider } from './llm-provider.ts';
import { OcrProvider } from './ocr-provider.ts';

const providers: Map<RecognitionProviderType, RecognitionProvider> = new Map();

// Register built-in providers
providers.set(RecognitionProviderType.LLM, new LlmProvider());
providers.set(RecognitionProviderType.OCR, new OcrProvider());

/**
 * Register a recognition provider (used by ocr-provider.ts in PR 3).
 */
export function registerProvider(provider: RecognitionProvider): void {
    providers.set(provider.type, provider);
}

/**
 * Get a provider by type. Throws if not registered.
 */
export function getProvider(type: RecognitionProviderType): RecognitionProvider {
    const provider = providers.get(type);

    if (!provider) {
        throw new Error(`Recognition provider "${type}" is not registered`);
    }

    return provider;
}

/**
 * Get the default provider. Returns LLM for now (preserves existing behavior).
 * Will be changed to OCR once Tesseract.js is integrated.
 */
export function getDefaultProviderType(): RecognitionProviderType {
    return RecognitionProviderType.LLM;
}

/**
 * List all registered provider types.
 */
export function getAvailableProviderTypes(): RecognitionProviderType[] {
    return Array.from(providers.keys());
}
