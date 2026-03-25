/**
 * Budget E2E tests.
 *
 * Verifies budget CRUD operations work end-to-end:
 * API create -> UI list display -> API delete.
 */

import { test, expect } from '@playwright/test';
import { registerUser, loginUser } from './helpers/api';
import { injectAuthState, navigateToApp, attachDebugListeners } from './helpers/auth';

const TEST_PASSPHRASE = 'BudgetTest-Track-Spending-77!';
const API_BASE = process.env.OSCAR_TEST_URL || 'http://localhost:8081';

test.describe('oscar.e2e.budget', () => {
    let token: string;
    let username: string;
    let password: string;

    test.beforeAll(async ({ request }) => {
        const user = await registerUser(request);
        token = user.token;
        username = user.username;
        password = user.password;
    });

    test.beforeEach(async ({ page }) => {
        attachDebugListeners(page);
    });

    async function ensureVaultAndLogin(page: import('@playwright/test').Page): Promise<void> {
        const loginResult = await loginUser(page.request, username, password);

        if (!loginResult.hasVault) {
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
        } else {
            await injectAuthState(page, { token: loginResult.token, hasVault: true });
            await navigateToApp(page, '/vault/unlock');
            await page.waitForURL(url => url.hash.includes('/vault/unlock'));

            await page.locator('input[type="password"]').first().fill(TEST_PASSPHRASE);
            await page.getByRole('button', { name: /unlock/i }).click();
            await page.waitForURL(url => !url.hash.includes('/vault/'), { timeout: 60_000 });
        }
    }

    test('budget-crud: create budget via API, verify in UI, delete', async ({ page }) => {
        await ensureVaultAndLogin(page);

        // Create budget via API
        const loginResult = await loginUser(page.request, username, password);
        const createRes = await page.request.post(`${API_BASE}/api/v1/budgets/add.json`, {
            headers: {
                Authorization: `Bearer ${loginResult.token}`,
                'X-Timezone-Offset': '-60',
            },
            data: {
                name: 'E2E Groceries Budget',
                amount: 40000,  // 400.00
                currency: 'EUR',
                period: 2,      // Monthly
                rollover: false,
                alertPercent: 80,
                categoryId: '0',
                accountId: '0',
                startDate: 0,
            },
        });

        const createData = await createRes.json();
        expect(createData.success).toBe(true);
        const budgetId = createData.result.id;

        // Navigate to budget list
        await page.evaluate(() => { window.location.hash = '#/budget/list'; });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1_000);

        // Verify budget name appears in the page
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain('E2E Groceries Budget');
        expect(pageContent).toContain('400.00');

        // Delete budget via API
        const deleteRes = await page.request.post(`${API_BASE}/api/v1/budgets/delete.json`, {
            headers: {
                Authorization: `Bearer ${loginResult.token}`,
                'X-Timezone-Offset': '-60',
            },
            data: { id: budgetId },
        });

        const deleteData = await deleteRes.json();
        expect(deleteData.success).toBe(true);
    });
});
