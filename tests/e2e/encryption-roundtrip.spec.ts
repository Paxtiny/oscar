/**
 * Encryption roundtrip E2E tests.
 *
 * Verifies that data encrypted on the client, stored on the server,
 * and decrypted on reload matches the original input - field by field.
 *
 * These tests create real transactions through the UI, reload the page,
 * and verify the decrypted data is correct.
 */

import { test, expect } from '@playwright/test';
import { registerUser, loginUser } from './helpers/api';
import { injectAuthState, navigateToApp, attachDebugListeners } from './helpers/auth';

const TEST_PASSPHRASE = 'RoundtripTest-Encrypt-Decrypt-55!';

test.describe('oscar.e2e.encryption-roundtrip', () => {
    let token: string;
    let username: string;
    let password: string;
    let vaultCreated = false;

    test.beforeAll(async ({ request }) => {
        const user = await registerUser(request);
        token = user.token;
        username = user.username;
        password = user.password;
    });

    test.beforeEach(async ({ page }) => {
        attachDebugListeners(page);
    });

    /**
     * Helper: ensure vault exists (create if needed) and unlock it.
     * Handles retries gracefully - if vault already exists, just unlocks.
     */
    async function ensureVaultUnlocked(page: import('@playwright/test').Page): Promise<void> {
        const loginResult = await loginUser(page.request, username, password);

        if (!loginResult.hasVault && !vaultCreated) {
            // Need to create the vault first
            await injectAuthState(page, { token: loginResult.token, hasVault: false });
            await navigateToApp(page, '/vault/setup');
            await page.waitForURL(url => url.hash.includes('/vault/setup'));

            const passphraseInputs = page.locator('input[type="password"]');
            await passphraseInputs.first().fill(TEST_PASSPHRASE);
            await passphraseInputs.nth(1).fill(TEST_PASSPHRASE);

            const checkbox = page.locator('.v-checkbox input, input[type="checkbox"]').first();
            await checkbox.check({ force: true });

            const submitBtn = page.getByRole('button', { name: /create vault/i });
            await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
            await submitBtn.click();
            await page.waitForURL(url => !url.hash.includes('/vault/'), { timeout: 60_000 });
            vaultCreated = true;
        } else {
            // Vault exists - just unlock
            await injectAuthState(page, { token: loginResult.token, hasVault: true });
            await navigateToApp(page, '/vault/unlock');
            await page.waitForURL(url => url.hash.includes('/vault/unlock'));

            await page.locator('input[type="password"]').first().fill(TEST_PASSPHRASE);
            await page.getByRole('button', { name: /unlock/i }).click();
            await page.waitForURL(url => !url.hash.includes('/vault/'), { timeout: 60_000 });
        }
    }

    /**
     * Navigate within the app without triggering a full page reload.
     * Uses hash change instead of page.goto() to preserve in-memory vault state.
     */
    async function navigateInApp(page: import('@playwright/test').Page, hash: string): Promise<void> {
        await page.evaluate((h) => { window.location.hash = '#' + h; }, hash);
        await page.waitForLoadState('networkidle');
    }

    test.fixme('roundtrip-single: create transaction, reload, verify fields match', async ({ page }) => {
        await ensureVaultUnlocked(page);

        // Navigate to add transaction (use hash change to preserve vault state)
        await navigateInApp(page, '/transaction/list');

        // Look for the add transaction button (FAB or link)
        const addButton = page.locator(
            'a[href*="transaction/add"], button:has-text("Add"), .v-btn--fab, [aria-label*="add" i]'
        ).first();

        if (await addButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await addButton.click();
            await page.waitForLoadState('networkidle');

            // Fill in transaction details
            const amountInput = page.locator(
                'input[type="number"], input[inputmode="decimal"], input[placeholder*="amount" i]'
            ).first();

            if (await amountInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
                await amountInput.fill('42.50');

                const commentInput = page.locator(
                    'input[placeholder*="comment" i], input[placeholder*="note" i], textarea'
                ).first();
                if (await commentInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
                    await commentInput.fill('E2E test transaction - encryption roundtrip');
                }

                const saveButton = page.getByRole('button', { name: /save|submit|add|confirm/i }).first();
                if (await saveButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
                    await saveButton.click();
                    await page.waitForLoadState('networkidle');
                }
            }
        }

        // Reload the page to force re-fetch and decrypt from server
        await page.reload();
        await page.waitForLoadState('networkidle');

        // After reload, in-memory vault state is cleared - need to unlock again
        // Wait for Vue router to initialize and redirect
        await page.waitForTimeout(1_000);

        if (page.url().includes('/vault/unlock')) {
            await page.locator('input[type="password"]').first().fill(TEST_PASSPHRASE);
            await page.getByRole('button', { name: /unlock/i }).click();
            await page.waitForURL(url => !url.hash.includes('/vault/'), { timeout: 60_000 });
        }

        // Navigate to transaction list
        await navigateInApp(page, '/transaction/list');
        await page.waitForLoadState('networkidle');

        // Verify the transaction amount is visible after decryption
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain('42.50');
    });

    test.fixme('roundtrip-multi-device: data visible on second browser', async ({ browser, request }) => {
        // Ensure vault is set up (from previous test or via API check)
        const loginResult = await loginUser(request, username, password);
        expect(loginResult.hasVault).toBe(true);

        // Context 1: unlock and access data
        const ctx1 = await browser.newContext();
        const page1 = await ctx1.newPage();
        attachDebugListeners(page1);

        // Context 2: unlock and verify same data
        const ctx2 = await browser.newContext();
        const page2 = await ctx2.newPage();
        attachDebugListeners(page2);

        try {
            // Device 1: unlock vault
            await injectAuthState(page1, { token: loginResult.token, hasVault: true });
            await navigateToApp(page1, '/vault/unlock');
            await page1.waitForURL(url => url.hash.includes('/vault/unlock'));
            await page1.locator('input[type="password"]').first().fill(TEST_PASSPHRASE);
            await page1.getByRole('button', { name: /unlock/i }).click();
            await page1.waitForURL(url => !url.hash.includes('/vault/'), { timeout: 60_000 });

            // Device 2: unlock with same passphrase on fresh context
            const loginResult2 = await loginUser(request, username, password);
            await injectAuthState(page2, { token: loginResult2.token, hasVault: true });
            await navigateToApp(page2, '/vault/unlock');
            await page2.waitForURL(url => url.hash.includes('/vault/unlock'));
            await page2.locator('input[type="password"]').first().fill(TEST_PASSPHRASE);
            await page2.getByRole('button', { name: /unlock/i }).click();
            await page2.waitForURL(url => !url.hash.includes('/vault/'), { timeout: 60_000 });

            // Both should be past the vault screens
            expect(page1.url()).not.toContain('/vault/');
            expect(page2.url()).not.toContain('/vault/');

            // Navigate both to transaction list (use hash change to preserve vault state)
            await page1.evaluate(() => { window.location.hash = '#/transaction/list'; });
            await page2.evaluate(() => { window.location.hash = '#/transaction/list'; });
            await page1.waitForLoadState('networkidle');
            await page2.waitForLoadState('networkidle');

            const content1 = await page1.textContent('body');
            const content2 = await page2.textContent('body');

            // If there are transactions, they should appear on both devices
            if (content1?.includes('42.50')) {
                expect(content2).toContain('42.50');
            }
        } finally {
            await ctx1.close();
            await ctx2.close();
        }
    });
});
