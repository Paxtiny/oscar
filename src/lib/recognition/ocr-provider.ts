import type { RecognizedReceiptImageResponse } from '@/models/large_language_model.ts';
import { type RecognitionProvider, type RecognitionProgress, RecognitionProviderType } from './types.ts';
import { parseReceiptText } from './receipt-parser.ts';
import { getTesseractLanguage } from './language-map.ts';
import logger from '@/lib/logger.ts';

/**
 * On-device OCR receipt recognition provider using Tesseract.js.
 * Runs entirely client-side - no server communication, no API key needed.
 *
 * Tesseract.js is lazy-loaded (dynamic import) to avoid bloating the
 * initial bundle. Language data files are fetched from CDN on first use
 * and cached by the service worker for offline support.
 */
export class OcrProvider implements RecognitionProvider {
    readonly type = RecognitionProviderType.OCR;

    isAvailable(): boolean {
        // OCR is always available on the client (no server dependency)
        return true;
    }

    async recognize(
        imageFile: File,
        language: string,
        onProgress?: (progress: RecognitionProgress) => void,
        signal?: AbortSignal
    ): Promise<RecognizedReceiptImageResponse> {
        onProgress?.({
            provider: RecognitionProviderType.OCR,
            phase: 'loading',
            progress: 0,
            message: 'Loading OCR engine...',
        });

        // Lazy-load tesseract.js to keep it out of the main bundle
        const Tesseract = await import('tesseract.js');

        if (signal?.aborted) {
            throw { canceled: true };
        }

        const tesseractLang = getTesseractLanguage(language);

        onProgress?.({
            provider: RecognitionProviderType.OCR,
            phase: 'loading',
            progress: 0.1,
            message: 'Loading language data...',
        });

        const worker = await Tesseract.createWorker(tesseractLang, undefined, {
            logger: (m: { status: string; progress: number }) => {
                if (signal?.aborted) {
                    return;
                }

                let phase: RecognitionProgress['phase'] = 'recognizing';
                let progress = m.progress;

                if (m.status.includes('loading') || m.status.includes('initializing')) {
                    phase = 'loading';
                    progress = 0.1 + m.progress * 0.2; // 10-30%
                } else if (m.status.includes('recognizing')) {
                    phase = 'recognizing';
                    progress = 0.3 + m.progress * 0.6; // 30-90%
                }

                onProgress?.({
                    provider: RecognitionProviderType.OCR,
                    phase,
                    progress,
                });
            },
        });

        if (signal?.aborted) {
            await worker.terminate();
            throw { canceled: true };
        }

        try {
            const result = await worker.recognize(imageFile);

            if (signal?.aborted) {
                throw { canceled: true };
            }

            onProgress?.({
                provider: RecognitionProviderType.OCR,
                phase: 'parsing',
                progress: 0.95,
                message: 'Extracting receipt data...',
            });

            const ocrText = result.data.text;

            logger.debug('OCR raw text:', ocrText);

            const parsed = parseReceiptText(ocrText, language);

            onProgress?.({
                provider: RecognitionProviderType.OCR,
                phase: 'parsing',
                progress: 1.0,
            });

            return parsed;
        } finally {
            await worker.terminate();
        }
    }
}
