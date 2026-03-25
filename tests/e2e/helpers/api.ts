/**
 * API helpers for E2E tests.
 * Registers users and authenticates via the oscar REST API directly,
 * bypassing the UI for faster test setup.
 */

import type { APIRequestContext } from '@playwright/test';

const API_BASE = process.env.OSCAR_TEST_URL || 'http://localhost:8081';

interface AuthResponse {
    success: boolean;
    result: {
        token: string;
        need2FA: boolean;
        hasVault: boolean;
        tier: string;
        user: {
            username: string;
            nickname: string;
            uid: number;
        };
    };
}

interface ApiResponse<T> {
    success: boolean;
    result: T;
}

let userCounter = 0;

/**
 * Generate a unique test username for this test run.
 */
export function uniqueUsername(prefix = 'e2etest'): string {
    userCounter++;
    return `${prefix}_${Date.now()}_${userCounter}`;
}

/**
 * Register a new user via the API and return the auth token.
 */
export async function registerUser(
    request: APIRequestContext,
    opts: { username?: string; password?: string } = {}
): Promise<{ token: string; username: string; password: string }> {
    const username = opts.username || uniqueUsername();
    const password = opts.password || 'TestPassword123!';

    const res = await request.post(`${API_BASE}/api/register.json`, {
        data: {
            username,
            password,
            email: `${username}@test.local`,
            nickname: username,
            language: 'en',
            defaultCurrency: 'EUR',
            firstDayOfWeek: 1,
            categories: [],
        },
    });

    if (!res.ok()) {
        const body = await res.text();
        throw new Error(`Registration failed (${res.status()}): ${body}`);
    }

    const data = (await res.json()) as AuthResponse;
    if (!data.success) {
        throw new Error(`Registration failed: ${JSON.stringify(data)}`);
    }

    return {
        token: data.result.token,
        username,
        password,
    };
}

/**
 * Login an existing user via the API and return the auth token.
 */
export async function loginUser(
    request: APIRequestContext,
    username: string,
    password: string
): Promise<{ token: string; hasVault: boolean }> {
    const res = await request.post(`${API_BASE}/api/authorize.json`, {
        data: { loginName: username, password },
    });

    if (!res.ok()) {
        const body = await res.text();
        throw new Error(`Login failed (${res.status()}): ${body}`);
    }

    const data = (await res.json()) as AuthResponse;
    if (!data.success) {
        throw new Error(`Login failed: ${JSON.stringify(data)}`);
    }

    return {
        token: data.result.token,
        hasVault: data.result.hasVault,
    };
}

/**
 * Get vault params for a user (requires auth token).
 */
export async function getVaultParams(
    request: APIRequestContext,
    token: string
): Promise<ApiResponse<any>> {
    const res = await request.get(`${API_BASE}/api/v1/vault/params.json`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return (await res.json()) as ApiResponse<any>;
}

/**
 * Crypto-shred a user's vault via API (requires auth token).
 */
export async function shredVault(
    request: APIRequestContext,
    token: string
): Promise<boolean> {
    const res = await request.delete(`${API_BASE}/api/v1/vault/shred.json`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const data = (await res.json()) as ApiResponse<boolean>;
    return data.success;
}

/**
 * Create a bank account for the user (requires auth token).
 * Returns the account ID needed for creating transactions.
 */
export async function createAccount(
    request: APIRequestContext,
    token: string,
    opts: { name?: string; currency?: string } = {}
): Promise<{ accountId: string }> {
    const res = await request.post(`${API_BASE}/api/v1/accounts/add.json`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
            name: opts.name || 'Test Checking',
            category: 1,       // Cash
            type: 1,           // Single account
            icon: 1,
            color: '7C3AED',
            currency: opts.currency || 'EUR',
            balance: 0,
        },
    });

    const data = (await res.json()) as ApiResponse<any>;
    if (!data.success) {
        throw new Error(`Account creation failed: ${JSON.stringify(data)}`);
    }

    return { accountId: data.result.id };
}

/**
 * Create an expense category for the user (requires auth token).
 * Returns the category ID needed for creating transactions.
 */
export async function createCategory(
    request: APIRequestContext,
    token: string,
    opts: { name?: string } = {}
): Promise<{ categoryId: string }> {
    const res = await request.post(`${API_BASE}/api/v1/transaction/categories/add.json`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
            name: opts.name || 'Test Expenses',
            type: 2,           // Expense category
            icon: 1,
            color: 'ef4444',
        },
    });

    const data = (await res.json()) as ApiResponse<any>;
    if (!data.success) {
        throw new Error(`Category creation failed: ${JSON.stringify(data)}`);
    }

    return { categoryId: data.result.id };
}

/**
 * Create a transaction via API (requires auth token).
 * The transaction data should already be encrypted by the caller.
 */
export async function createTransaction(
    request: APIRequestContext,
    token: string,
    txData: Record<string, any>
): Promise<ApiResponse<any>> {
    const res = await request.post(`${API_BASE}/api/v1/transactions/add.json`, {
        headers: { Authorization: `Bearer ${token}` },
        data: txData,
    });

    return (await res.json()) as ApiResponse<any>;
}

/**
 * List transactions via API (requires auth token).
 */
export async function listTransactions(
    request: APIRequestContext,
    token: string
): Promise<ApiResponse<any>> {
    const res = await request.get(`${API_BASE}/api/v1/transactions/list.json`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { count: 50 },
    });

    return (await res.json()) as ApiResponse<any>;
}
