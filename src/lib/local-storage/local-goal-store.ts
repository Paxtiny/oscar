/**
 * CRUD operations for local savings goals / budgets in IndexedDB.
 */

import { openDb, STORE_GOALS } from './db.ts';
import type { LocalGoal, LocalGoalInput } from './types.ts';

function nowIso(): string {
    return new Date().toISOString();
}

export async function addLocalGoal(input: LocalGoalInput): Promise<LocalGoal> {
    const db = await openDb();
    const now = nowIso();
    const record: LocalGoal = {
        ...input,
        createdAt: now,
        updatedAt: now
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GOALS, 'readwrite');
        const store = tx.objectStore(STORE_GOALS);
        const request = store.add(record);

        request.onsuccess = () => {
            record.localId = request.result as number;
            resolve(record);
        };

        request.onerror = () => reject(request.error);
    });
}

export async function getLocalGoal(localId: number): Promise<LocalGoal | undefined> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GOALS, 'readonly');
        const store = tx.objectStore(STORE_GOALS);
        const request = store.get(localId);

        request.onsuccess = () => resolve(request.result as LocalGoal | undefined);
        request.onerror = () => reject(request.error);
    });
}

export async function getAllLocalGoals(): Promise<LocalGoal[]> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GOALS, 'readonly');
        const store = tx.objectStore(STORE_GOALS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result as LocalGoal[]);
        request.onerror = () => reject(request.error);
    });
}

export async function updateLocalGoal(localId: number, updates: Partial<LocalGoalInput>): Promise<LocalGoal> {
    const db = await openDb();
    const existing = await getLocalGoal(localId);

    if (!existing) {
        throw new Error(`Local goal ${localId} not found`);
    }

    const updated: LocalGoal = {
        ...existing,
        ...updates,
        localId,
        updatedAt: nowIso()
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GOALS, 'readwrite');
        const store = tx.objectStore(STORE_GOALS);
        const request = store.put(updated);

        request.onsuccess = () => resolve(updated);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteLocalGoal(localId: number): Promise<void> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GOALS, 'readwrite');
        const store = tx.objectStore(STORE_GOALS);
        const request = store.delete(localId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function countLocalGoals(): Promise<number> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GOALS, 'readonly');
        const store = tx.objectStore(STORE_GOALS);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function clearLocalGoals(): Promise<void> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GOALS, 'readwrite');
        const store = tx.objectStore(STORE_GOALS);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
