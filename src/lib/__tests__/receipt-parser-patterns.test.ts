import { describe, test, expect } from '@jest/globals';
import { getLocaleConfig, extractAmounts, extractDate, detectTransactionType } from '@/lib/recognition/receipt-parser-patterns.ts';

describe('receipt-parser-patterns', () => {
    describe('getLocaleConfig', () => {
        test('returns config for all 6 supported locales', () => {
            for (const locale of ['en', 'de', 'pl', 'pt', 'nl', 'ru']) {
                const config = getLocaleConfig(locale);
                expect(config).toBeDefined();
                expect(config.tesseractLang).toBeDefined();
                expect(config.amountPatterns.length).toBeGreaterThan(0);
                expect(config.datePatterns.length).toBeGreaterThan(0);
            }
        });

        test('falls back to en for unknown locale', () => {
            const config = getLocaleConfig('xx');
            expect(config.tesseractLang).toBe('eng');
        });
    });

    describe('extractAmounts', () => {
        test('extracts EUR amount with comma decimal (DE)', () => {
            const amounts = extractAmounts('Summe: EUR 42,50', 'de');
            expect(amounts).toContainEqual(4250);
        });

        test('extracts USD amount with dot decimal (EN)', () => {
            const amounts = extractAmounts('Total: $42.50', 'en');
            expect(amounts).toContainEqual(4250);
        });

        test('extracts amount with thousands separator (DE)', () => {
            const amounts = extractAmounts('Gesamt: 1.234,56 EUR', 'de');
            expect(amounts).toContainEqual(123456);
        });

        test('extracts amount with thousands separator (EN)', () => {
            const amounts = extractAmounts('Total: 1,234.56', 'en');
            expect(amounts).toContainEqual(123456);
        });

        test('extracts plain number amount', () => {
            const amounts = extractAmounts('42.50', 'en');
            expect(amounts).toContainEqual(4250);
        });

        test('extracts amount with currency symbol after (PL)', () => {
            const amounts = extractAmounts('Razem: 42,50 PLN', 'pl');
            expect(amounts).toContainEqual(4250);
        });

        test('extracts amount with ruble sign (RU)', () => {
            const amounts = extractAmounts('Итого: 1 234,56 ₽', 'ru');
            expect(amounts).toContainEqual(123456);
        });

        test('extracts whole number amount (no decimals)', () => {
            const amounts = extractAmounts('Total: 100', 'en');
            expect(amounts).toContainEqual(10000);
        });

        test('returns empty array for text with no amounts', () => {
            const amounts = extractAmounts('Hello world', 'en');
            expect(amounts).toEqual([]);
        });

        test('extracts multiple amounts from multiline text', () => {
            const text = 'Item 1: 5.99\nItem 2: 3.50\nTotal: 9.49';
            const amounts = extractAmounts(text, 'en');
            expect(amounts.length).toBeGreaterThanOrEqual(3);
            expect(amounts).toContainEqual(599);
            expect(amounts).toContainEqual(350);
            expect(amounts).toContainEqual(949);
        });
    });

    describe('extractDate', () => {
        test('extracts DD.MM.YYYY date (DE)', () => {
            const timestamp = extractDate('Datum: 15.03.2026', 'de');
            expect(timestamp).toBeDefined();
            const date = new Date(timestamp! * 1000);
            expect(date.getFullYear()).toBe(2026);
            expect(date.getMonth()).toBe(2); // March = 2
            expect(date.getDate()).toBe(15);
        });

        test('extracts MM/DD/YYYY date (EN)', () => {
            const timestamp = extractDate('Date: 03/15/2026', 'en');
            expect(timestamp).toBeDefined();
            const date = new Date(timestamp! * 1000);
            expect(date.getFullYear()).toBe(2026);
            expect(date.getMonth()).toBe(2);
            expect(date.getDate()).toBe(15);
        });

        test('extracts YYYY-MM-DD date (ISO)', () => {
            const timestamp = extractDate('2026-03-15', 'en');
            expect(timestamp).toBeDefined();
            const date = new Date(timestamp! * 1000);
            expect(date.getFullYear()).toBe(2026);
            expect(date.getMonth()).toBe(2);
            expect(date.getDate()).toBe(15);
        });

        test('extracts DD/MM/YYYY date (PT)', () => {
            const timestamp = extractDate('Data: 15/03/2026', 'pt');
            expect(timestamp).toBeDefined();
            const date = new Date(timestamp! * 1000);
            expect(date.getFullYear()).toBe(2026);
            expect(date.getMonth()).toBe(2);
            expect(date.getDate()).toBe(15);
        });

        test('returns undefined for text with no date', () => {
            const timestamp = extractDate('Hello world', 'en');
            expect(timestamp).toBeUndefined();
        });
    });

    describe('detectTransactionType', () => {
        test('defaults to Expense (3) for normal receipt text', () => {
            const type = detectTransactionType('Total: $42.50\nThank you', 'en');
            expect(type).toBe(3); // TransactionType.Expense
        });

        test('detects Income (2) from refund keyword (EN)', () => {
            const type = detectTransactionType('Refund: $42.50', 'en');
            expect(type).toBe(2); // TransactionType.Income
        });

        test('detects Income (2) from Erstattung keyword (DE)', () => {
            const type = detectTransactionType('Erstattung: EUR 42,50', 'de');
            expect(type).toBe(2);
        });

        test('detects Income (2) from zwrot keyword (PL)', () => {
            const type = detectTransactionType('Zwrot: 42,50 PLN', 'pl');
            expect(type).toBe(2);
        });
    });
});
