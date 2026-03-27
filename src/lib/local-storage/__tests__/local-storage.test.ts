import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import 'fake-indexeddb/auto';

import { TransactionType } from '@/core/transaction.ts';

import {
    openDb,
    closeDb,
    deleteDb,
    DB_NAME,
    STORE_TRANSACTIONS,
    STORE_GOALS,
    STORE_CATEGORIES,
    STORE_SETTINGS
} from '../db.ts';

import {
    addLocalTransaction,
    getLocalTransaction,
    getAllLocalTransactions,
    updateLocalTransaction,
    deleteLocalTransaction,
    countLocalTransactions,
    clearLocalTransactions
} from '../local-transaction-store.ts';

import {
    addLocalGoal,
    getLocalGoal,
    getAllLocalGoals,
    updateLocalGoal,
    deleteLocalGoal,
    countLocalGoals,
    clearLocalGoals
} from '../local-goal-store.ts';

import {
    getOnboardingSettings,
    saveOnboardingSettings,
    updateOnboardingSetting,
    clearOnboardingSettings
} from '../local-settings-store.ts';

import { GoalType, DEFAULT_ONBOARDING_SETTINGS } from '../types.ts';
import type { LocalTransactionInput, LocalGoalInput, OnboardingSettings } from '../types.ts';

beforeEach(() => {
    // fake-indexeddb/auto provides a fresh indexedDB global
    closeDb();
});

afterEach(async () => {
    await deleteDb();
});

// ======================= DB SETUP =======================

describe('db', () => {
    test('openDb creates the database with expected object stores', async () => {
        const db = await openDb();
        expect(db.name).toBe(DB_NAME);
        expect(db.objectStoreNames.contains(STORE_TRANSACTIONS)).toBe(true);
        expect(db.objectStoreNames.contains(STORE_GOALS)).toBe(true);
        expect(db.objectStoreNames.contains(STORE_CATEGORIES)).toBe(true);
        expect(db.objectStoreNames.contains(STORE_SETTINGS)).toBe(true);
    });

    test('openDb returns same instance on second call', async () => {
        const db1 = await openDb();
        const db2 = await openDb();
        expect(db1).toBe(db2);
    });

    test('deleteDb removes the database', async () => {
        await openDb();
        await deleteDb();
        // After delete, opening again should create a fresh DB
        const db = await openDb();
        expect(db.objectStoreNames.contains(STORE_TRANSACTIONS)).toBe(true);
    });
});

// ======================= TRANSACTIONS =======================

describe('local-transaction-store', () => {
    const sampleTxn: LocalTransactionInput = {
        type: TransactionType.Expense,
        categoryLocalId: 0,
        time: 1711000000,
        utcOffset: 60,
        sourceAmount: 1599,
        destinationAmount: 0,
        hideAmount: false,
        comment: 'Coffee'
    };

    test('addLocalTransaction creates a record with auto-generated localId', async () => {
        const result = await addLocalTransaction(sampleTxn);
        expect(result.localId).toBeDefined();
        expect(typeof result.localId).toBe('number');
        expect(result.comment).toBe('Coffee');
        expect(result.sourceAmount).toBe(1599);
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
    });

    test('getLocalTransaction returns the correct record', async () => {
        const created = await addLocalTransaction(sampleTxn);
        const fetched = await getLocalTransaction(created.localId!);
        expect(fetched).toBeDefined();
        expect(fetched!.localId).toBe(created.localId);
        expect(fetched!.comment).toBe('Coffee');
    });

    test('getLocalTransaction returns undefined for missing id', async () => {
        const result = await getLocalTransaction(99999);
        expect(result).toBeUndefined();
    });

    test('getAllLocalTransactions returns all records', async () => {
        await addLocalTransaction(sampleTxn);
        await addLocalTransaction({ ...sampleTxn, comment: 'Lunch' });
        const all = await getAllLocalTransactions();
        expect(all.length).toBe(2);
    });

    test('updateLocalTransaction modifies the record', async () => {
        const created = await addLocalTransaction(sampleTxn);
        // Wait briefly to ensure different timestamp
        await new Promise(r => setTimeout(r, 10));
        const updated = await updateLocalTransaction(created.localId!, { comment: 'Latte' });
        expect(updated.comment).toBe('Latte');
        expect(updated.sourceAmount).toBe(1599); // unchanged field preserved
        // updatedAt should be at least as recent
        expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(created.updatedAt).getTime());
    });

    test('updateLocalTransaction throws for missing id', async () => {
        await expect(updateLocalTransaction(99999, { comment: 'X' })).rejects.toThrow('not found');
    });

    test('deleteLocalTransaction removes the record', async () => {
        const created = await addLocalTransaction(sampleTxn);
        await deleteLocalTransaction(created.localId!);
        const fetched = await getLocalTransaction(created.localId!);
        expect(fetched).toBeUndefined();
    });

    test('countLocalTransactions returns correct count', async () => {
        expect(await countLocalTransactions()).toBe(0);
        await addLocalTransaction(sampleTxn);
        expect(await countLocalTransactions()).toBe(1);
        await addLocalTransaction(sampleTxn);
        expect(await countLocalTransactions()).toBe(2);
    });

    test('clearLocalTransactions removes all records', async () => {
        await addLocalTransaction(sampleTxn);
        await addLocalTransaction(sampleTxn);
        await clearLocalTransactions();
        expect(await countLocalTransactions()).toBe(0);
    });
});

// ======================= GOALS =======================

describe('local-goal-store', () => {
    const sampleGoal: LocalGoalInput = {
        name: 'Emergency Fund',
        targetAmount: 100000,
        currentAmount: 25000,
        targetDate: 1735689600,
        type: GoalType.Savings
    };

    test('addLocalGoal creates a record with auto-generated localId', async () => {
        const result = await addLocalGoal(sampleGoal);
        expect(result.localId).toBeDefined();
        expect(result.name).toBe('Emergency Fund');
        expect(result.targetAmount).toBe(100000);
    });

    test('getLocalGoal returns the correct record', async () => {
        const created = await addLocalGoal(sampleGoal);
        const fetched = await getLocalGoal(created.localId!);
        expect(fetched).toBeDefined();
        expect(fetched!.name).toBe('Emergency Fund');
    });

    test('getAllLocalGoals returns all records', async () => {
        await addLocalGoal(sampleGoal);
        await addLocalGoal({ ...sampleGoal, name: 'Vacation' });
        const all = await getAllLocalGoals();
        expect(all.length).toBe(2);
    });

    test('updateLocalGoal modifies the record', async () => {
        const created = await addLocalGoal(sampleGoal);
        const updated = await updateLocalGoal(created.localId!, { currentAmount: 50000 });
        expect(updated.currentAmount).toBe(50000);
        expect(updated.name).toBe('Emergency Fund'); // unchanged
    });

    test('updateLocalGoal throws for missing id', async () => {
        await expect(updateLocalGoal(99999, { name: 'X' })).rejects.toThrow('not found');
    });

    test('deleteLocalGoal removes the record', async () => {
        const created = await addLocalGoal(sampleGoal);
        await deleteLocalGoal(created.localId!);
        const fetched = await getLocalGoal(created.localId!);
        expect(fetched).toBeUndefined();
    });

    test('countLocalGoals returns correct count', async () => {
        expect(await countLocalGoals()).toBe(0);
        await addLocalGoal(sampleGoal);
        expect(await countLocalGoals()).toBe(1);
    });

    test('clearLocalGoals removes all records', async () => {
        await addLocalGoal(sampleGoal);
        await addLocalGoal(sampleGoal);
        await clearLocalGoals();
        expect(await countLocalGoals()).toBe(0);
    });
});

// ======================= SETTINGS =======================

describe('local-settings-store', () => {
    test('getOnboardingSettings returns defaults when empty', async () => {
        const settings = await getOnboardingSettings();
        expect(settings).toEqual(DEFAULT_ONBOARDING_SETTINGS);
    });

    test('saveOnboardingSettings persists and getOnboardingSettings reads back', async () => {
        const custom: OnboardingSettings = {
            onboardingCompleted: true,
            onboardingIntent: 'track-spending',
            hasLocalData: true,
            locale: 'de',
            migrated: false,
            currentStep: 3,
            budgetAmount: 200000,
            budgetCurrency: 'EUR',
            freeAiScansRemaining: 1
        };
        await saveOnboardingSettings(custom);
        const read = await getOnboardingSettings();
        expect(read).toEqual(custom);
    });

    test('updateOnboardingSetting updates a single field', async () => {
        const updated = await updateOnboardingSetting('onboardingIntent', 'save-money');
        expect(updated.onboardingIntent).toBe('save-money');
        expect(updated.onboardingCompleted).toBe(false); // default preserved
    });

    test('clearOnboardingSettings resets to defaults', async () => {
        await saveOnboardingSettings({
            onboardingCompleted: true,
            onboardingIntent: 'test',
            hasLocalData: true,
            locale: 'en',
            migrated: true,
            currentStep: 5,
            budgetAmount: 0,
            budgetCurrency: 'EUR',
            freeAiScansRemaining: 0
        });
        await clearOnboardingSettings();
        const settings = await getOnboardingSettings();
        expect(settings).toEqual(DEFAULT_ONBOARDING_SETTINGS);
    });
});
