import type { RecognizedReceiptImageResponse } from '@/models/large_language_model.ts';
import { extractAmounts, extractDate, detectTransactionType } from './receipt-parser-patterns.ts';

/**
 * Extracts the merchant name from OCR text.
 * Strategy: first non-empty line that is not purely numeric, a date, or very short.
 */
function extractMerchant(lines: string[]): string | undefined {
    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.length < 2) {
            continue;
        }

        // Skip lines that are purely numeric or look like dates
        if (/^\d+[./-]\d+[./-]\d+$/.test(trimmed)) {
            continue;
        }

        if (/^\d+$/.test(trimmed)) {
            continue;
        }

        // Skip lines that are just a price/amount
        if (/^[$\u20AC\u00A3\u20BD]?\s*\d+[.,]\d{1,2}\s*[$\u20AC\u00A3\u20BD]?$/.test(trimmed)) {
            continue;
        }

        return trimmed;
    }

    return undefined;
}

/**
 * Parses raw OCR text into a RecognizedReceiptImageResponse.
 *
 * Extraction strategy:
 * 1. Find all amounts, select the largest (likely the total)
 * 2. Find the first date
 * 3. Extract merchant from the first meaningful line
 * 4. Detect transaction type from keywords
 *
 * Fields left undefined for future LLM passthrough:
 * categoryId, sourceAccountId, destinationAccountId, tagIds
 */
export function parseReceiptText(text: string, locale: string): RecognizedReceiptImageResponse {
    if (!text || !text.trim()) {
        return { type: 3 }; // Expense with no data
    }

    const lines = text.split('\n');
    const amounts = extractAmounts(text, locale);
    const time = extractDate(text, locale);
    const merchant = extractMerchant(lines);
    const type = detectTransactionType(text, locale);

    // Select the largest amount as the total
    const sourceAmount = amounts.length > 0
        ? Math.max(...amounts)
        : undefined;

    return {
        type,
        time,
        sourceAmount,
        comment: merchant,
        categoryId: undefined,
        sourceAccountId: undefined,
        destinationAccountId: undefined,
        destinationAmount: undefined,
        tagIds: undefined,
    };
}
