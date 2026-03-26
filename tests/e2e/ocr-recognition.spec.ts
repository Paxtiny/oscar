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
import { registerUser, createAccount, createCategory, loginUser } from './helpers/api';
import { injectAuthState, attachDebugListeners } from './helpers/auth';
import path from 'path';

const TEST_RECEIPT = path.resolve(__dirname, 'testdata/test-receipt-en.png');
const TEST_PASSPHRASE = 'OcrTest-Passphrase-2026!';

test.describe('oscar.e2e.ocr-recognition', () => {
    let token: string;
    let username: string;
    let password: string;
    let vaultCreated = false;

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
     * Ensure the vault is created and unlocked.
     * Adapted from encryption-roundtrip.spec.ts.
     */
    async function ensureVaultUnlocked(page: import('@playwright/test').Page): Promise<void> {
        const loginResult = await loginUser(page.request, username, password);
        token = loginResult.token;

        if (!loginResult.hasVault && !vaultCreated) {
            await injectAuthState(page, { token, hasVault: false });
            await page.goto('/desktop.html');
            await page.waitForURL(url => url.hash.includes('/vault/setup'), { timeout: 10_000 });

            const passphraseInputs = page.locator('input[type="password"]');
            await passphraseInputs.first().fill(TEST_PASSPHRASE);
            await passphraseInputs.nth(1).fill(TEST_PASSPHRASE);

            const checkbox = page.locator('.v-checkbox input, input[type="checkbox"]').first();
            await checkbox.check({ force: true });

            const submitBtn = page.getByRole('button', { name: /create vault/i });
            await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
            await submitBtn.click();

            // Wait for vault creation (Argon2id key derivation - can take 30s+ in CI)
            await page.waitForURL(url => !url.hash.includes('/vault/'), { timeout: 90_000 });
            vaultCreated = true;
        } else {
            await injectAuthState(page, { token, hasVault: true });
            await page.goto('/desktop.html');
            await page.waitForURL(url => url.hash.includes('/vault/unlock'), { timeout: 10_000 });

            const passphraseInput = page.locator('input[type="password"]').first();
            await passphraseInput.fill(TEST_PASSPHRASE);

            const unlockBtn = page.getByRole('button', { name: /unlock/i });
            await expect(unlockBtn).toBeEnabled({ timeout: 10_000 });
            await unlockBtn.click();

            await page.waitForURL(url => !url.hash.includes('/vault/'), { timeout: 90_000 });
        }
    }

    /**
     * Navigate to transaction list and open AI Image Recognition dialog.
     */
    async function openAIRecognitionDialog(page: import('@playwright/test').Page): Promise<void> {
        await ensureVaultUnlocked(page);

        // Navigate to transaction list
        await page.goto('/desktop.html#/transaction/list');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Find and hover the Add button to reveal the dropdown
        const addBtn = page.locator('button', { hasText: 'Add' }).first();
        await expect(addBtn).toBeVisible({ timeout: 10_000 });
        await addBtn.hover();
        await page.waitForTimeout(500);

        // Click AI Image Recognition
        const aiItem = page.getByText('AI Image Recognition');
        await expect(aiItem).toBeVisible({ timeout: 5_000 });
        await aiItem.click();
        await page.waitForTimeout(500);
    }

    test('desktop: AI Image Recognition dialog shows provider toggle', async ({ page }) => {
        await openAIRecognitionDialog(page);

        // Verify provider toggle buttons
        const dialog = page.locator('.v-dialog');
        await expect(dialog.getByText('On-device OCR')).toBeVisible();
        await expect(dialog.getByText('AI Recognition')).toBeVisible();

        // Verify language selector is present (v-select with English as default)
        await expect(dialog.locator('.v-select')).toBeVisible();
        await expect(dialog.getByText('English')).toBeVisible();
    });

    test('desktop: language selector hidden when AI provider selected', async ({ page }) => {
        await openAIRecognitionDialog(page);

        const dialog = page.locator('.v-dialog');

        // OCR default - language selector visible
        await expect(dialog.locator('.v-select')).toBeVisible();

        // Switch to AI
        await dialog.getByText('AI Recognition').click();
        await page.waitForTimeout(300);

        // Language selector should be gone, privacy text should change
        await expect(dialog.locator('.v-select')).not.toBeVisible();
        await expect(dialog.getByText('large language model')).toBeVisible();

        // Switch back to OCR
        await dialog.getByText('On-device OCR').click();
        await page.waitForTimeout(300);
        await expect(dialog.locator('.v-select')).toBeVisible();
    });

    test('desktop: OCR processes test receipt and prefills form', async ({ page }) => {
        test.slow(); // Tesseract downloads WASM + language data from CDN

        await openAIRecognitionDialog(page);

        // Upload test receipt by clicking the image area (triggers file chooser)
        const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.locator('.v-dialog .v-img').click(),
        ]);
        await fileChooser.setFiles(TEST_RECEIPT);
        await page.waitForTimeout(2000);

        // Click Recognize
        const recognizeBtn = page.getByRole('button', { name: /recognize/i });
        await expect(recognizeBtn).toBeEnabled({ timeout: 5_000 });
        await recognizeBtn.click();

        // Wait for OCR + transaction form to appear (up to 2 minutes for Tesseract first run)
        // The AI recognition dialog closes and the Add Transaction dialog opens
        await expect(page.locator('.v-dialog .text-h4, .v-dialog h4').getByText('Add Transaction')).toBeVisible({ timeout: 120_000 });

        // Verify expense type is selected (the form prefilled from OCR)
        await expect(page.locator('.v-dialog').getByText('Expense').first()).toBeVisible();
    });
});
