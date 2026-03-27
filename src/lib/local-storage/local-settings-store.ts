/**
 * Read/write onboarding state and preferences to IndexedDB settings store.
 */

import { openDb, STORE_SETTINGS } from './db.ts';
import { type OnboardingSettings, DEFAULT_ONBOARDING_SETTINGS } from './types.ts';

const ONBOARDING_KEY = 'onboarding';

interface SettingsRecord {
    key: string;
    value: OnboardingSettings;
}

export async function getOnboardingSettings(): Promise<OnboardingSettings> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, 'readonly');
        const store = tx.objectStore(STORE_SETTINGS);
        const request = store.get(ONBOARDING_KEY);

        request.onsuccess = () => {
            const record = request.result as SettingsRecord | undefined;
            resolve(record ? record.value : { ...DEFAULT_ONBOARDING_SETTINGS });
        };

        request.onerror = () => reject(request.error);
    });
}

export async function saveOnboardingSettings(settings: OnboardingSettings): Promise<void> {
    const db = await openDb();
    // Spread to create a plain object - Vue reactive Proxies fail IDB's structured clone.
    const record: SettingsRecord = { key: ONBOARDING_KEY, value: { ...settings } };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, 'readwrite');
        const store = tx.objectStore(STORE_SETTINGS);
        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function updateOnboardingSetting<K extends keyof OnboardingSettings>(
    key: K,
    value: OnboardingSettings[K]
): Promise<OnboardingSettings> {
    const current = await getOnboardingSettings();
    const updated = { ...current, [key]: value };
    await saveOnboardingSettings(updated);
    return updated;
}

export async function clearOnboardingSettings(): Promise<void> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, 'readwrite');
        const store = tx.objectStore(STORE_SETTINGS);
        const request = store.delete(ONBOARDING_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
