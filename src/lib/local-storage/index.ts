export { openDb, closeDb, deleteDb } from './db.ts';

export type { LocalTransaction, LocalTransactionInput, LocalGoal, LocalGoalInput, OnboardingSettings } from './types.ts';
export { GoalType, DEFAULT_ONBOARDING_SETTINGS } from './types.ts';

export {
    addLocalTransaction,
    getLocalTransaction,
    getAllLocalTransactions,
    updateLocalTransaction,
    deleteLocalTransaction,
    countLocalTransactions,
    clearLocalTransactions
} from './local-transaction-store.ts';

export {
    addLocalGoal,
    getLocalGoal,
    getAllLocalGoals,
    updateLocalGoal,
    deleteLocalGoal,
    countLocalGoals,
    clearLocalGoals
} from './local-goal-store.ts';

export {
    getOnboardingSettings,
    saveOnboardingSettings,
    updateOnboardingSetting,
    clearOnboardingSettings
} from './local-settings-store.ts';

export { migrateLocalDataToServer } from './migration-service.ts';
export type { MigrationResult } from './migration-service.ts';
