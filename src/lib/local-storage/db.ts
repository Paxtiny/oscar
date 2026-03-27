/**
 * IndexedDB database setup for oscar local-first storage.
 * Used during onboarding to persist data before account creation.
 */

const DB_NAME = 'oscar-local';
const DB_VERSION = 1;

const STORE_TRANSACTIONS = 'transactions';
const STORE_GOALS = 'goals';
const STORE_CATEGORIES = 'categories';
const STORE_SETTINGS = 'settings';

export {
    DB_NAME,
    DB_VERSION,
    STORE_TRANSACTIONS,
    STORE_GOALS,
    STORE_CATEGORIES,
    STORE_SETTINGS
};

let dbInstance: IDBDatabase | null = null;

function upgradeDb(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        const txnStore = db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'localId', autoIncrement: true });
        txnStore.createIndex('by-time', 'time');
        txnStore.createIndex('by-type', 'type');
    }

    if (!db.objectStoreNames.contains(STORE_GOALS)) {
        db.createObjectStore(STORE_GOALS, { keyPath: 'localId', autoIncrement: true });
    }

    if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'localId', autoIncrement: true });
    }

    if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
    }
}

export function openDb(): Promise<IDBDatabase> {
    if (dbInstance) {
        return Promise.resolve(dbInstance);
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            upgradeDb(request.result);
        };

        request.onsuccess = () => {
            dbInstance = request.result;

            dbInstance.onclose = () => {
                dbInstance = null;
            };

            resolve(dbInstance);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

export function closeDb(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

/** Delete the entire database. Used after successful migration. */
export function deleteDb(): Promise<void> {
    closeDb();

    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}
