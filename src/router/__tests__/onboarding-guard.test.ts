import { describe, test, expect, beforeEach } from '@jest/globals';

import {
    markOnboardingCompleted,
    isOnboardingCompleted,
    clearOnboardingCompleted,
    shouldRedirectToOnboarding
} from '../onboarding-guard.ts';

// Minimal localStorage polyfill for Node test environment
const storage: Record<string, string> = {};

beforeEach(() => {
    for (const key of Object.keys(storage)) {
        delete storage[key];
    }

    if (typeof globalThis.localStorage === 'undefined') {
        Object.defineProperty(globalThis, 'localStorage', {
            value: {
                getItem: (key: string) => storage[key] ?? null,
                setItem: (key: string, value: string) => { storage[key] = value; },
                removeItem: (key: string) => { delete storage[key]; },
                clear: () => { for (const k of Object.keys(storage)) { delete storage[k]; } }
            },
            writable: true,
            configurable: true
        });
    } else {
        localStorage.clear();
    }
});

// Mock isUserLogined - we control it via localStorage
// The real function checks for 'ebk_user_token' in localStorage
function setLoggedIn(loggedIn: boolean): void {
    if (loggedIn) {
        localStorage.setItem('ebk_user_token', 'test-token');
    } else {
        localStorage.removeItem('ebk_user_token');
    }
}

describe('onboarding-guard', () => {
    test('isOnboardingCompleted returns false initially', () => {
        expect(isOnboardingCompleted()).toBe(false);
    });

    test('markOnboardingCompleted sets the flag', () => {
        markOnboardingCompleted();
        expect(isOnboardingCompleted()).toBe(true);
    });

    test('clearOnboardingCompleted removes the flag', () => {
        markOnboardingCompleted();
        clearOnboardingCompleted();
        expect(isOnboardingCompleted()).toBe(false);
    });

    test('shouldRedirectToOnboarding returns true for fresh user', () => {
        setLoggedIn(false);
        expect(shouldRedirectToOnboarding()).toBe(true);
    });

    test('shouldRedirectToOnboarding returns false when logged in', () => {
        setLoggedIn(true);
        expect(shouldRedirectToOnboarding()).toBe(false);
    });

    test('shouldRedirectToOnboarding returns false when onboarding completed', () => {
        setLoggedIn(false);
        markOnboardingCompleted();
        expect(shouldRedirectToOnboarding()).toBe(false);
    });

    test('shouldRedirectToOnboarding returns false when both logged in and completed', () => {
        setLoggedIn(true);
        markOnboardingCompleted();
        expect(shouldRedirectToOnboarding()).toBe(false);
    });
});
