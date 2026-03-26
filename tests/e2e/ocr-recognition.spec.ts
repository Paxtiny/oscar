/**
 * OCR Recognition E2E tests.
 *
 * Verifies the on-device Tesseract.js OCR flow:
 * - Provider toggle (OCR vs AI) is visible
 * - Language selector appears for OCR provider
 * - OCR processes a test receipt image and prefills the transaction form
 *
 * These tests are slow because Tesseract.js downloads WASM + language
 * data from CDN on first use (~4MB). Marked with test.slow().
 */

import { test, expect } from '@playwright/test';
import { registerUser, createAccount, createCategory } from './helpers/api';
import { injectAuthState, attachDebugListeners } from './helpers/auth';
import path from 'path';

const TEST_RECEIPT = path.resolve(__dirname, 'testdata/test-receipt-en.png');
const BASE = process.env.OSCAR_TEST_URL || 'http://localhost:8081';

test.describe('oscar.e2e.ocr-recognition', () => {
    let token: string;
    let username: string;
    let password: string;

    test.beforeAll(async ({ request }) => {
        const user = await registerUser(request);
        token = user.token;
        username = user.username;
        password = user.password;

        await createAccount(request, token, { name: 'OCR Test Account' });
        await createCategory(request, token, { name: 'OCR Test Category' });
    });

    test.beforeEach(async ({ page }) => {
        attachDebugListeners(page);
    });

    /**
     * Helper: navigate to desktop transaction list and open AI Image Recognition dialog.
     */
    async function openAIRecognitionDialog(page: import('@playwright/test').Page): Promise<void> {
        await injectAuthState(page, { token, hasVault: false });

        // Navigate directly to desktop transaction list via hash routing
        await page.goto(`${BASE}/desktop.html#/transaction/list`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // The "Add" button is in the transaction list header - hover to open dropdown
        const addBtn = page.locator('.v-btn:has-text("Add")').first();
        await expect(addBtn).toBeVisible({ timeout: 10_000 });
        await addBtn.hover();
        await page.waitForTimeout(500);

        // Click AI Image Recognition menu item
        const aiMenuItem = page.locator('.v-list-item:has-text("AI Image Recognition")');
        await expect(aiMenuItem).toBeVisible({ timeout: 5_000 });
        await aiMenuItem.click();
        await page.waitForTimeout(500);
    }

    test('desktop: AI Image Recognition dialog shows provider toggle', async ({ page }) => {
        await openAIRecognitionDialog(page);

        // Verify provider toggle is visible
        await expect(page.locator('.v-btn:has-text("On-device OCR")')).toBeVisible();
        await expect(page.locator('.v-btn:has-text("AI Recognition")')).toBeVisible();

        // Verify language selector is visible (OCR is default)
        await expect(page.locator('.v-select:has-text("Receipt language"), .v-label:has-text("Receipt language")')).toBeVisible();
    });

    test('desktop: OCR processes test receipt and prefills amount', async ({ page }) => {
        test.slow(); // Tesseract downloads WASM + language data from CDN

        await openAIRecognitionDialog(page);

        // Upload the test receipt via file input
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(TEST_RECEIPT);
        await page.waitForTimeout(2000); // Wait for image compression

        // Click Recognize button
        const recognizeBtn = page.locator('.v-btn:has-text("Recognize")');
        await expect(recognizeBtn).toBeEnabled({ timeout: 5_000 });
        await recognizeBtn.click();

        // Wait for OCR to complete - the "Add Transaction" dialog should appear
        // Tesseract takes 10-30s on first run (WASM + language download)
        const addTransactionTitle = page.locator('h4:has-text("Add Transaction"), .text-h4:has-text("Add Transaction")');
        await expect(addTransactionTitle).toBeVisible({ timeout: 120_000 });

        // Verify the transaction form appeared with Expense type selected
        await expect(page.locator('.v-btn:has-text("Expense")')).toBeVisible();
    });

    test('desktop: language selector hidden when AI provider selected', async ({ page }) => {
        await openAIRecognitionDialog(page);

        // OCR selected by default - language selector visible
        const langLabel = page.locator('.v-label:has-text("Receipt language"), .v-select:has-text("Receipt language")');
        await expect(langLabel).toBeVisible();

        // Switch to AI Recognition
        await page.locator('.v-btn:has-text("AI Recognition")').click();
        await page.waitForTimeout(300);

        // Language selector should be hidden
        await expect(langLabel).not.toBeVisible();

        // Switch back to OCR
        await page.locator('.v-btn:has-text("On-device OCR")').click();
        await page.waitForTimeout(300);

        // Language selector should reappear
        await expect(langLabel).toBeVisible();
    });
});
