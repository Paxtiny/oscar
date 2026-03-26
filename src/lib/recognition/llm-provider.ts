import type { RecognizedReceiptImageResponse } from '@/models/large_language_model.ts';
import { type RecognitionProvider, type RecognitionProgress, RecognitionProviderType } from './types.ts';
import services from '@/lib/services.ts';
import { generateRandomUUID } from '@/lib/misc.ts';

/**
 * LLM-based receipt recognition provider.
 * Wraps the existing services.recognizeReceiptImage() endpoint.
 * Converts AbortSignal to the internal cancelableUuid mechanism.
 */
export class LlmProvider implements RecognitionProvider {
    readonly type = RecognitionProviderType.LLM;

    isAvailable(): boolean {
        // LLM is available when the server has it configured.
        // We assume available and let the server return an error if not.
        return true;
    }

    async recognize(
        imageFile: File,
        _language: string,
        onProgress?: (progress: RecognitionProgress) => void,
        signal?: AbortSignal
    ): Promise<RecognizedReceiptImageResponse> {
        const cancelableUuid = generateRandomUUID();

        // Wire AbortSignal to the internal cancellation mechanism
        if (signal) {
            signal.addEventListener('abort', () => {
                services.cancelRequest(cancelableUuid);
            }, { once: true });
        }

        onProgress?.({
            provider: RecognitionProviderType.LLM,
            phase: 'recognizing',
            progress: 0,
        });

        const response = await services.recognizeReceiptImage({
            imageFile,
            cancelableUuid,
        });

        const data = response.data;

        if (!data || !data.success || !data.result) {
            throw new Error('Unable to recognize image');
        }

        onProgress?.({
            provider: RecognitionProviderType.LLM,
            phase: 'recognizing',
            progress: 1.0,
        });

        return data.result;
    }
}
