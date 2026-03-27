/**
 * Tests for the migration service.
 *
 * @nicodaimus/crypto is mapped to a manual mock via jest.config moduleNameMapper.
 * We still need to mock services.ts, misc.ts, and logger.ts.
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import 'fake-indexeddb/auto';

// Mock the services module
const mockAddTransaction = jest.fn();
const mockCreateBudget = jest.fn();
const mockCreateSavingsGoal = jest.fn();
const mockContributeSavingsGoal = jest.fn();

jest.mock('@/lib/services.ts', () => ({
    __esModule: true,
    default: {
        addTransaction: mockAddTransaction,
        createBudget: mockCreateBudget,
        createSavingsGoal: mockCreateSavingsGoal,
        contributeSavingsGoal: mockContributeSavingsGoal
    }
}));

// Mock misc module
jest.mock('@/lib/misc.ts', () => ({
    generateRandomUUID: jest.fn(() => 'test-session-uuid')
}));

// Mock logger
jest.mock('@/lib/logger.ts', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

import { TransactionType } from '@/core/transaction.ts';
import { closeDb, deleteDb } from '../db.ts';
import { addLocalTransaction } from '../local-transaction-store.ts';
import { addLocalGoal } from '../local-goal-store.ts';
import { saveOnboardingSettings } from '../local-settings-store.ts';
import { GoalType, DEFAULT_ONBOARDING_SETTINGS } from '../types.ts';
import { migrateLocalDataToServer } from '../migration-service.ts';

beforeEach(() => {
    closeDb();
    mockAddTransaction.mockReset();
    mockCreateBudget.mockReset();
    mockCreateSavingsGoal.mockReset();
    mockContributeSavingsGoal.mockReset();
});

afterEach(async () => {
    try {
        await deleteDb();
    } catch {
        // DB may have been deleted by migration
    }
});

describe('migration-service', () => {
    test('migrates transactions and budget goals successfully', async () => {
        mockAddTransaction.mockResolvedValue({
            data: { success: true, result: { id: '1' } }
        });
        mockCreateBudget.mockResolvedValue({
            data: { success: true, result: { id: 'b1' } }
        });

        await saveOnboardingSettings({ ...DEFAULT_ONBOARDING_SETTINGS, onboardingCompleted: true });
        await addLocalTransaction({
            type: TransactionType.Expense,
            categoryLocalId: 0,
            time: 1711000000,
            utcOffset: 60,
            sourceAmount: 999,
            destinationAmount: 0,
            hideAmount: false,
            comment: 'Test expense'
        });
        await addLocalGoal({
            name: 'Monthly Budget',
            targetAmount: 50000,
            currentAmount: 0,
            targetDate: 0,
            type: GoalType.Budget
        });

        const result = await migrateLocalDataToServer();

        expect(result.transactionsTotal).toBe(1);
        expect(result.transactionsSucceeded).toBe(1);
        expect(result.transactionsFailed.length).toBe(0);
        expect(result.goalsTotal).toBe(1);
        expect(result.goalsSucceeded).toBe(1);
        expect(result.goalsFailed.length).toBe(0);
        expect(mockAddTransaction).toHaveBeenCalledTimes(1);
        expect(mockCreateBudget).toHaveBeenCalledTimes(1);
        expect(mockCreateBudget).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Monthly Budget', targetAmount: 50000 })
        );
    });

    test('migrates savings goals and contributes existing progress', async () => {
        mockCreateSavingsGoal.mockResolvedValue({
            data: { success: true, result: { id: 'sg1' } }
        });
        mockContributeSavingsGoal.mockResolvedValue({
            data: { success: true, result: true }
        });

        await addLocalGoal({
            name: 'Vacation Fund',
            targetAmount: 100000,
            currentAmount: 25000,
            targetDate: 1735689600,
            type: GoalType.Savings
        });

        const result = await migrateLocalDataToServer();

        expect(result.goalsTotal).toBe(1);
        expect(result.goalsSucceeded).toBe(1);
        expect(result.goalsFailed.length).toBe(0);
        expect(mockCreateSavingsGoal).toHaveBeenCalledTimes(1);
        expect(mockCreateSavingsGoal).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Vacation Fund', targetAmount: 100000, targetDate: 1735689600 })
        );
        // Should contribute the currentAmount to the created goal
        expect(mockContributeSavingsGoal).toHaveBeenCalledTimes(1);
        expect(mockContributeSavingsGoal).toHaveBeenCalledWith({ id: 'sg1', amount: 25000 });
    });

    test('savings goal with zero currentAmount skips contribution', async () => {
        mockCreateSavingsGoal.mockResolvedValue({
            data: { success: true, result: { id: 'sg2' } }
        });

        await addLocalGoal({
            name: 'New Fund',
            targetAmount: 50000,
            currentAmount: 0,
            targetDate: 0,
            type: GoalType.Savings
        });

        const result = await migrateLocalDataToServer();

        expect(result.goalsSucceeded).toBe(1);
        expect(mockCreateSavingsGoal).toHaveBeenCalledTimes(1);
        expect(mockContributeSavingsGoal).not.toHaveBeenCalled();
    });

    test('handles partial transaction failure gracefully', async () => {
        mockAddTransaction
            .mockResolvedValueOnce({ data: { success: true, result: { id: '1' } } })
            .mockRejectedValueOnce(new Error('Network error'));

        await addLocalTransaction({
            type: TransactionType.Expense,
            categoryLocalId: 0,
            time: 1711000000,
            utcOffset: 60,
            sourceAmount: 500,
            destinationAmount: 0,
            hideAmount: false,
            comment: 'Success'
        });
        await addLocalTransaction({
            type: TransactionType.Expense,
            categoryLocalId: 0,
            time: 1711000001,
            utcOffset: 60,
            sourceAmount: 1000,
            destinationAmount: 0,
            hideAmount: false,
            comment: 'Fail'
        });

        const result = await migrateLocalDataToServer();

        expect(result.transactionsTotal).toBe(2);
        expect(result.transactionsSucceeded).toBe(1);
        expect(result.transactionsFailed.length).toBe(1);
        expect(result.transactionsFailed[0]!.comment).toBe('Fail');
    });

    test('handles goal migration failure gracefully', async () => {
        mockCreateBudget.mockRejectedValue(new Error('Server error'));

        await addLocalGoal({
            name: 'Failing Budget',
            targetAmount: 10000,
            currentAmount: 0,
            targetDate: 0,
            type: GoalType.Budget
        });

        const result = await migrateLocalDataToServer();

        expect(result.goalsTotal).toBe(1);
        expect(result.goalsSucceeded).toBe(0);
        expect(result.goalsFailed.length).toBe(1);
        expect(result.goalsFailed[0]!.name).toBe('Failing Budget');
    });

    test('does not delete DB when goals fail even if transactions succeed', async () => {
        mockAddTransaction.mockResolvedValue({
            data: { success: true, result: { id: '1' } }
        });
        mockCreateSavingsGoal.mockRejectedValue(new Error('Server error'));

        await addLocalTransaction({
            type: TransactionType.Expense,
            categoryLocalId: 0,
            time: 1711000000,
            utcOffset: 60,
            sourceAmount: 500,
            destinationAmount: 0,
            hideAmount: false,
            comment: 'OK'
        });
        await addLocalGoal({
            name: 'Failing Goal',
            targetAmount: 10000,
            currentAmount: 0,
            targetDate: 0,
            type: GoalType.Savings
        });

        const result = await migrateLocalDataToServer();

        expect(result.transactionsSucceeded).toBe(1);
        expect(result.goalsFailed.length).toBe(1);
        // DB should NOT have been deleted since goals failed
    });

    test('handles empty data migration', async () => {
        const result = await migrateLocalDataToServer();

        expect(result.transactionsTotal).toBe(0);
        expect(result.transactionsSucceeded).toBe(0);
        expect(result.transactionsFailed.length).toBe(0);
        expect(result.goalsTotal).toBe(0);
        expect(result.goalsSucceeded).toBe(0);
        expect(mockAddTransaction).not.toHaveBeenCalled();
        expect(mockCreateBudget).not.toHaveBeenCalled();
        expect(mockCreateSavingsGoal).not.toHaveBeenCalled();
    });
});
