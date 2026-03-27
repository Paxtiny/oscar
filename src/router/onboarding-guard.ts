/**
 * Shared onboarding detection logic used by both mobile and desktop routers.
 *
 * Returns true if the user should be redirected to onboarding:
 * - Not logged in AND onboarding not yet completed.
 *
 * This is a synchronous check based on localStorage/sessionStorage.
 * The full onboarding state lives in IndexedDB but we check a lightweight
 * localStorage flag to avoid async in route guards.
 */

import { isUserLogined } from '@/lib/userstate.ts';

const ONBOARDING_COMPLETED_KEY = 'oscar_onboarding_completed';

/** Call after onboarding wizard finishes. Persists a lightweight flag in localStorage. */
export function markOnboardingCompleted(): void {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
}

/** Check whether onboarding was previously completed. */
export function isOnboardingCompleted(): boolean {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
}

/** Clear the onboarding flag (e.g. when clearing all data). */
export function clearOnboardingCompleted(): void {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
}

// --- Guest banner helpers (sessionStorage - resets on app close) ---
const GUEST_BANNER_DISMISSED_KEY = 'oscar_guest_banner_dismissed';

/** Dismiss the guest banner for this session. */
export function dismissGuestBanner(): void {
    sessionStorage.setItem(GUEST_BANNER_DISMISSED_KEY, 'true');
}

/** Check if the guest banner was dismissed this session. */
export function isGuestBannerDismissed(): boolean {
    return sessionStorage.getItem(GUEST_BANNER_DISMISSED_KEY) === 'true';
}

/** Returns true if the guest banner should be shown (local-only user, not dismissed this session). */
export function shouldShowGuestBanner(): boolean {
    if (isUserLogined()) {
        return false;
    }
    if (!isOnboardingCompleted()) {
        return false;
    }
    return !isGuestBannerDismissed();
}

/**
 * Returns true when the user should be sent to `/onboarding`.
 * Condition: not logged in AND onboarding not yet completed.
 */
export function shouldRedirectToOnboarding(): boolean {
    if (isUserLogined()) {
        return false;
    }

    if (isOnboardingCompleted()) {
        return false;
    }

    return true;
}
