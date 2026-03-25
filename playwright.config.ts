import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.OSCAR_TEST_URL || 'http://localhost:8081';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false, // encryption tests have state dependencies
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1, // sequential - vault state is per-user
    timeout: 90_000, // Argon2id key derivation is intentionally slow (30s+ in CI)
    reporter: [
        ['list'],
        ['junit', { outputFile: 'test-results/playwright.xml' }],
    ],
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Start oscar dev server if not running in CI (CI uses Docker Compose stack)
    webServer: process.env.CI ? undefined : {
        command: 'npm run serve',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 30_000,
    },
});
