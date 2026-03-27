/**
 * Migrate local IndexedDB data to the server after account creation + vault setup.
 * Idempotent: safe to retry on partial failure.
 */

import { TransactionType } from '@/core/transaction.ts';
import type { TransactionCreateRequest } from '@/models/transaction.ts';
import services from '@/lib/services.ts';
import { generateRandomUUID } from '@/lib/misc.ts';
import logger from '@/lib/logger.ts';

import { getAllLocalTransactions } from './local-transaction-store.ts';
import { getAllLocalGoals } from './local-goal-store.ts';
import { updateOnboardingSetting } from './local-settings-store.ts';
import { deleteDb } from './db.ts';
import type { LocalTransaction, LocalGoal } from './types.ts';
import { GoalType } from './types.ts';

export interface MigrationResult {
    transactionsTotal: number;
    transactionsSucceeded: number;
    transactionsFailed: LocalTransaction[];
    goalsTotal: number;
    goalsSucceeded: number;
    goalsFailed: LocalGoal[];
}

function localTransactionToCreateRequest(t: LocalTransaction, clientSessionId: string): TransactionCreateRequest {
    // Map the local categoryLocalId to '0' (uncategorized) since server categories
    // are created during registration, not locally.
    const categoryId = '0';

    return {
        type: t.type,
        categoryId,
        time: t.time,
        utcOffset: t.utcOffset,
        sourceAccountId: '0',
        destinationAccountId: t.type === TransactionType.Transfer ? '0' : '0',
        sourceAmount: t.sourceAmount,
        destinationAmount: t.type === TransactionType.Transfer ? t.destinationAmount : 0,
        hideAmount: t.hideAmount,
        tagIds: [],
        pictureIds: [],
        comment: t.comment,
        clientSessionId
    };
}

function localGoalToServerRequest(g: LocalGoal): Record<string, unknown> {
    return {
        name: g.name,
        targetAmount: g.targetAmount,
        targetDate: g.targetDate > 0 ? g.targetDate : undefined
    };
}

/**
 * Migrate a single local goal to the appropriate server API.
 * Budget type -> services.createBudget, Savings type -> services.createSavingsGoal.
 * If the goal has currentAmount > 0 and is a savings goal, also contributes that amount.
 */
async function migrateGoal(g: LocalGoal): Promise<boolean> {
    if (g.type === GoalType.Budget) {
        const response = await services.createBudget(localGoalToServerRequest(g));
        return !!(response.data && response.data.success && response.data.result);
    } else {
        const response = await services.createSavingsGoal(localGoalToServerRequest(g));
        const data = response.data;

        if (!data || !data.success || !data.result) {
            return false;
        }

        // If there's existing progress, contribute it to the newly created goal
        if (g.currentAmount > 0 && data.result.id) {
            const contribResponse = await services.contributeSavingsGoal({
                id: data.result.id as string,
                amount: g.currentAmount
            });
            // Contribution failure is non-fatal; the goal was still created
            if (!contribResponse.data || !contribResponse.data.success) {
                logger.warn(`Goal "${g.name}" created but contribution of ${g.currentAmount} failed`);
            }
        }

        return true;
    }
}

/**
 * Migrate all local data to the server.
 * Processes each item individually so partial failures don't block the rest.
 */
export async function migrateLocalDataToServer(): Promise<MigrationResult> {
    const clientSessionId = generateRandomUUID();
    const transactions = await getAllLocalTransactions();
    const goals = await getAllLocalGoals();

    const result: MigrationResult = {
        transactionsTotal: transactions.length,
        transactionsSucceeded: 0,
        transactionsFailed: [],
        goalsTotal: goals.length,
        goalsSucceeded: 0,
        goalsFailed: []
    };

    // Migrate transactions one at a time
    for (const t of transactions) {
        try {
            const req = localTransactionToCreateRequest(t, clientSessionId);
            const response = await services.addTransaction(req);
            const data = response.data;

            if (data && data.success && data.result) {
                result.transactionsSucceeded++;
            } else {
                result.transactionsFailed.push(t);
            }
        } catch (error) {
            logger.error('Failed to migrate local transaction', error);
            result.transactionsFailed.push(t);
        }
    }

    // Migrate goals via budget/savings-goals APIs
    for (const g of goals) {
        try {
            const ok = await migrateGoal(g);
            if (ok) {
                result.goalsSucceeded++;
            } else {
                result.goalsFailed.push(g);
            }
        } catch (error) {
            logger.error(`Failed to migrate local goal "${g.name}"`, error);
            result.goalsFailed.push(g);
        }
    }

    const allOk = result.transactionsFailed.length === 0 && result.goalsFailed.length === 0;

    if (allOk) {
        await updateOnboardingSetting('migrated', true);
        await deleteDb();
        logger.info('Local data migration complete, IndexedDB deleted');
    } else {
        const failedTxns = result.transactionsFailed.length;
        const failedGoals = result.goalsFailed.length;
        logger.warn(`Migration partially failed: ${failedTxns}/${result.transactionsTotal} transactions, ${failedGoals}/${result.goalsTotal} goals`);
    }

    return result;
}
