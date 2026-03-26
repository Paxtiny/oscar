import type { RecognizedReceiptImageResponse } from '@/models/large_language_model.ts';

export enum RecognitionProviderType {
    OCR = 'ocr',
    LLM = 'llm',
}

export interface RecognitionProgress {
    readonly provider: RecognitionProviderType;
    readonly phase: 'loading' | 'recognizing' | 'parsing';
    readonly progress: number; // 0.0 - 1.0
    readonly message?: string;
}

export interface RecognitionProvider {
    readonly type: RecognitionProviderType;
    recognize(
        imageFile: File,
        language: string,
        onProgress?: (progress: RecognitionProgress) => void,
        signal?: AbortSignal
    ): Promise<RecognizedReceiptImageResponse>;
    isAvailable(): boolean;
}
