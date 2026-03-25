/**
 * Browser-level auth helpers for Playwright E2E tests.
 * Sets localStorage/sessionStorage to simulate a logged-in user,
 * bypassing the login UI for faster test setup.
 */

import type { Page } from '@playwright/test';

/**
 * Inject auth token into the browser so the app treats the user as logged in.
 * Must be called BEFORE navigating to the app.
 */
export async function injectAuthState(
    page: Page,
    opts: {
        token: string;
        hasVault: boolean;
        tier?: string;
    }
): Promise<void> {
    // Navigate to the app origin first to set storage on the correct domain
    await page.goto('/');

    await page.evaluate(({ token, hasVault, tier }) => {
        localStorage.setItem('ebk_user_token', token);
        localStorage.setItem('oscar_has_vault', hasVault ? 'true' : 'false');
        localStorage.setItem('oscar_tier', tier || 'free');
        // Set session token to bypass app lock
        sessionStorage.setItem('ebk_user_session_token', token);
    }, opts);
}

/**
 * Clear all auth state from the browser.
 */
export async function clearAuthState(page: Page): Promise<void> {
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
}

/**
 * Navigate to the app and wait for it to settle.
 * The app uses hash-based routing, so we check the hash.
 */
export async function navigateToApp(page: Page, hash = '/'): Promise<void> {
    await page.goto(`/#${hash}`);
    await page.waitForLoadState('networkidle');
}

/**
 * Attach console and error listeners to a page for CI debugging.
 * Call once per page/context at test start.
 */
export function attachDebugListeners(page: Page): void {
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`[browser ${msg.type()}] ${msg.text()}`);
        }
    });
    page.on('pageerror', err => {
        console.log(`[browser CRASH] ${err.message}`);
    });
}
