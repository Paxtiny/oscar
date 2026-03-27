/**
 * CRUD operations for local transactions in IndexedDB.
 */

import { openDb, STORE_TRANSACTIONS } from './db.ts';
import type { LocalTransaction, LocalTransactionInput } from './types.ts';

function nowIso(): string {
    return new Date().toISOString();
}

export async function addLocalTransaction(input: LocalTransactionInput): Promise<LocalTransaction> {
    const db = await openDb();
    const now = nowIso();
    const record: LocalTransaction = {
        ...input,
        createdAt: now,
        updatedAt: now
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
        const store = tx.objectStore(STORE_TRANSACTIONS);
        const request = store.add(record);

        request.onsuccess = () => {
            record.localId = request.result as number;
            resolve(record);
        };

        request.onerror = () => reject(request.error);
    });
}

export async function getLocalTransaction(localId: number): Promise<LocalTransaction | undefined> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
        const store = tx.objectStore(STORE_TRANSACTIONS);
        const request = store.get(localId);

        request.onsuccess = () => resolve(request.result as LocalTransaction | undefined);
        request.onerror = () => reject(request.error);
    });
}

export async function getAllLocalTransactions(): Promise<LocalTransaction[]> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
        const store = tx.objectStore(STORE_TRANSACTIONS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result as LocalTransaction[]);
        request.onerror = () => reject(request.error);
    });
}

export async function updateLocalTransaction(localId: number, updates: Partial<LocalTransactionInput>): Promise<LocalTransaction> {
    const db = await openDb();
    const existing = await getLocalTransaction(localId);

    if (!existing) {
        throw new Error(`Local transaction ${localId} not found`);
    }

    const updated: LocalTransaction = {
        ...existing,
        ...updates,
        localId,
        updatedAt: nowIso()
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
        const store = tx.objectStore(STORE_TRANSACTIONS);
        const request = store.put(updated);

        request.onsuccess = () => resolve(updated);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteLocalTransaction(localId: number): Promise<void> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
        const store = tx.objectStore(STORE_TRANSACTIONS);
        const request = store.delete(localId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function countLocalTransactions(): Promise<number> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TRANSACTIONS, 'readonly');
        const store = tx.objectStore(STORE_TRANSACTIONS);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function clearLocalTransactions(): Promise<void> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
        const store = tx.objectStore(STORE_TRANSACTIONS);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
