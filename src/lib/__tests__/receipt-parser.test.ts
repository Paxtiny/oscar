import { describe, test, expect } from '@jest/globals';
import { parseReceiptText } from '@/lib/recognition/receipt-parser.ts';

describe('receipt-parser', () => {
    describe('parseReceiptText', () => {
        test('parses a simple English receipt', () => {
            const text = [
                'WALMART SUPERCENTER',
                'Store #1234',
                '03/15/2026',
                'Milk         3.99',
                'Bread        2.50',
                'TOTAL        6.49',
            ].join('\n');

            const result = parseReceiptText(text, 'en');
            expect(result.type).toBe(3); // Expense
            expect(result.sourceAmount).toBe(649); // largest amount = total
            expect(result.comment).toBe('WALMART SUPERCENTER');
            expect(result.time).toBeDefined();
        });

        test('parses a German receipt with comma decimals', () => {
            const text = [
                'REWE Markt GmbH',
                'Filiale 1234',
                '15.03.2026',
                'Milch        1,99',
                'Brot         2,50',
                'SUMME        4,49',
            ].join('\n');

            const result = parseReceiptText(text, 'de');
            expect(result.type).toBe(3);
            expect(result.sourceAmount).toBe(449);
            expect(result.comment).toBe('REWE Markt GmbH');
            expect(result.time).toBeDefined();
        });

        test('parses a Polish receipt', () => {
            const text = [
                'BIEDRONKA',
                'NIP: 123-456-78-90',
                '15.03.2026',
                'Mleko        4,99',
                'Chleb        3,50',
                'RAZEM        8,49 PLN',
            ].join('\n');

            const result = parseReceiptText(text, 'pl');
            expect(result.type).toBe(3);
            expect(result.sourceAmount).toBe(849);
            expect(result.comment).toBe('BIEDRONKA');
        });

        test('parses a Russian receipt with space thousands', () => {
            const text = [
                'ПЯТЕРОЧКА',
                '15.03.2026',
                'Молоко       89,90',
                'Хлеб         45,00',
                'ИТОГО     1 234,90 ₽',
            ].join('\n');

            const result = parseReceiptText(text, 'ru');
            expect(result.type).toBe(3);
            expect(result.sourceAmount).toBe(123490);
            expect(result.comment).toBe('ПЯТЕРОЧКА');
        });

        test('selects the largest amount as the total', () => {
            const text = [
                'Store',
                'Item A     10.00',
                'Item B     20.00',
                'Subtotal   30.00',
                'Tax         2.40',
                'Total      32.40',
            ].join('\n');

            const result = parseReceiptText(text, 'en');
            expect(result.sourceAmount).toBe(3240);
        });

        test('detects refund as Income type', () => {
            const text = [
                'REFUND',
                'Store Name',
                '03/15/2026',
                'Amount: $25.00',
            ].join('\n');

            const result = parseReceiptText(text, 'en');
            expect(result.type).toBe(2); // Income
            expect(result.sourceAmount).toBe(2500);
        });

        test('returns Expense type with no amount when text is empty', () => {
            const result = parseReceiptText('', 'en');
            expect(result.type).toBe(3);
            expect(result.sourceAmount).toBeUndefined();
            expect(result.time).toBeUndefined();
            expect(result.comment).toBeUndefined();
        });

        test('handles garbled OCR text gracefully', () => {
            const text = 'x#@! 2o.5O I1l1 ###';
            const result = parseReceiptText(text, 'en');
            expect(result.type).toBe(3); // still defaults to Expense
            // may or may not extract an amount - should not throw
        });

        test('extracts date from Dutch receipt', () => {
            const text = [
                'Albert Heijn',
                '15-03-2026',
                'Melk         1,99',
                'Brood        2,50',
                'TOTAAL       4,49',
            ].join('\n');

            const result = parseReceiptText(text, 'nl');
            expect(result.time).toBeDefined();
            expect(result.sourceAmount).toBe(449);
            expect(result.comment).toBe('Albert Heijn');
        });

        test('extracts date from Portuguese receipt', () => {
            const text = [
                'Pingo Doce',
                '15/03/2026',
                'Leite        1,99',
                'Pao          2,50',
                'TOTAL        4,49',
            ].join('\n');

            const result = parseReceiptText(text, 'pt');
            expect(result.time).toBeDefined();
            expect(result.sourceAmount).toBe(449);
        });

        test('categoryId is undefined (no category inference in OCR)', () => {
            const text = 'Store\n03/15/2026\nTotal: 42.50';
            const result = parseReceiptText(text, 'en');
            expect(result.categoryId).toBeUndefined();
        });

        test('tagIds is undefined', () => {
            const text = 'Store\n03/15/2026\nTotal: 42.50';
            const result = parseReceiptText(text, 'en');
            expect(result.tagIds).toBeUndefined();
        });

        test('accountIds are undefined', () => {
            const text = 'Store\n03/15/2026\nTotal: 42.50';
            const result = parseReceiptText(text, 'en');
            expect(result.sourceAccountId).toBeUndefined();
            expect(result.destinationAccountId).toBeUndefined();
        });
    });
});
