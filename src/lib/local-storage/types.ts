/**
 * Type definitions for local-first storage.
 * Shapes mirror server models where possible to simplify migration.
 */

import { TransactionType } from '@/core/transaction.ts';

/** A transaction stored locally in IndexedDB before account creation. */
export interface LocalTransaction {
    /** Auto-incremented by IndexedDB. Undefined when creating a new record. */
    localId?: number;
    type: TransactionType;
    /** Category local ID (reference to local categories store). 0 = uncategorized. */
    categoryLocalId: number;
    /** Unix timestamp in seconds. */
    time: number;
    /** UTC offset in minutes. */
    utcOffset: number;
    /** Amount in cents (minor currency unit). */
    sourceAmount: number;
    /** For transfers only. */
    destinationAmount: number;
    hideAmount: boolean;
    comment: string;
    /** ISO 8601 created timestamp. */
    createdAt: string;
    /** ISO 8601 updated timestamp. */
    updatedAt: string;
}

export type LocalTransactionInput = Omit<LocalTransaction, 'localId' | 'createdAt' | 'updatedAt'>;

export enum GoalType {
    Savings = 'savings',
    Budget = 'budget'
}

/** A savings goal or budget stored locally. */
export interface LocalGoal {
    localId?: number;
    name: string;
    /** Target amount in cents. */
    targetAmount: number;
    /** Current progress in cents. */
    currentAmount: number;
    /** Unix timestamp of the target date, or 0 if none. */
    targetDate: number;
    type: GoalType;
    createdAt: string;
    updatedAt: string;
}

export type LocalGoalInput = Omit<LocalGoal, 'localId' | 'createdAt' | 'updatedAt'>;

/** Onboarding state and preferences stored in the settings store. */
export interface OnboardingSettings {
    onboardingCompleted: boolean;
    /** What the user chose in onboarding step 1 (e.g. "track-spending", "save-money"). */
    onboardingIntent: string;
    hasLocalData: boolean;
    locale: string;
    /** Whether local data has been migrated to the server. */
    migrated: boolean;
    /** Current onboarding step index (0-5) for resume on browser reopen. */
    currentStep: number;
    /** Monthly budget amount in cents, if user chose budget intent. */
    budgetAmount: number;
    /** Budget currency code. */
    budgetCurrency: string;
    /** Free AI scans remaining during onboarding (default 2). */
    freeAiScansRemaining: number;
}

export const DEFAULT_ONBOARDING_SETTINGS: OnboardingSettings = {
    onboardingCompleted: false,
    onboardingIntent: '',
    hasLocalData: false,
    locale: '',
    migrated: false,
    currentStep: 0,
    budgetAmount: 0,
    budgetCurrency: 'EUR',
    freeAiScansRemaining: 2
};
