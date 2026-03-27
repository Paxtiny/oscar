import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

import { TransactionType } from '@/core/transaction.ts';
import logger from '@/lib/logger.ts';

import {
    type LocalTransaction,
    type LocalTransactionInput,
    type LocalGoal,
    type LocalGoalInput,
    type OnboardingSettings,
    DEFAULT_ONBOARDING_SETTINGS,
    addLocalTransaction,
    getAllLocalTransactions,
    deleteLocalTransaction as deleteLocalTxn,
    addLocalGoal,
    getAllLocalGoals,
    deleteLocalGoal as deleteLocalGl,
    getOnboardingSettings,
    saveOnboardingSettings,
    migrateLocalDataToServer,
    type MigrationResult
} from '@/lib/local-storage/index.ts';

export const useOnboardingStore = defineStore('onboarding', () => {
    // Reactive state
    const settings = ref<OnboardingSettings>({ ...DEFAULT_ONBOARDING_SETTINGS });
    const localTransactions = ref<LocalTransaction[]>([]);
    const localGoals = ref<LocalGoal[]>([]);
    const initialized = ref(false);
    const migrating = ref(false);
    const lastMigrationResult = ref<MigrationResult | null>(null);

    // Getters
    const hasLocalData = computed(() => localTransactions.value.length > 0 || localGoals.value.length > 0);
    const localTransactionCount = computed(() => localTransactions.value.length);
    const localGoalCount = computed(() => localGoals.value.length);

    const totalLocalSpending = computed(() => {
        let total = 0;
        for (const t of localTransactions.value) {
            if (t.type === TransactionType.Expense) {
                total += t.sourceAmount;
            }
        }
        return total;
    });

    const totalLocalIncome = computed(() => {
        let total = 0;
        for (const t of localTransactions.value) {
            if (t.type === TransactionType.Income) {
                total += t.sourceAmount;
            }
        }
        return total;
    });

    const onboardingCompleted = computed(() => settings.value.onboardingCompleted);
    const onboardingIntent = computed(() => settings.value.onboardingIntent);
    const migrated = computed(() => settings.value.migrated);
    const currentStep = computed(() => settings.value.currentStep);
    const budgetAmount = computed(() => settings.value.budgetAmount);
    const budgetCurrency = computed(() => settings.value.budgetCurrency);
    const freeAiScansRemaining = computed(() => settings.value.freeAiScansRemaining);

    // Actions
    async function init(): Promise<void> {
        if (initialized.value) {
            return;
        }

        try {
            settings.value = await getOnboardingSettings();
            localTransactions.value = await getAllLocalTransactions();
            localGoals.value = await getAllLocalGoals();
            initialized.value = true;
        } catch (error) {
            logger.error('Failed to initialize onboarding store', error);
        }
    }

    async function addTransaction(input: LocalTransactionInput): Promise<LocalTransaction> {
        const record = await addLocalTransaction(input);
        localTransactions.value.push(record);

        if (!settings.value.hasLocalData) {
            settings.value.hasLocalData = true;
            await saveOnboardingSettings(settings.value);
        }

        return record;
    }

    async function deleteTransaction(localId: number): Promise<void> {
        await deleteLocalTxn(localId);
        localTransactions.value = localTransactions.value.filter(t => t.localId !== localId);
    }

    async function addGoal(input: LocalGoalInput): Promise<LocalGoal> {
        const record = await addLocalGoal(input);
        localGoals.value.push(record);

        if (!settings.value.hasLocalData) {
            settings.value.hasLocalData = true;
            await saveOnboardingSettings(settings.value);
        }

        return record;
    }

    async function deleteGoal(localId: number): Promise<void> {
        await deleteLocalGl(localId);
        localGoals.value = localGoals.value.filter(g => g.localId !== localId);
    }

    async function setOnboardingIntent(intent: string): Promise<void> {
        settings.value.onboardingIntent = intent;
        await saveOnboardingSettings(settings.value);
    }

    async function setLocale(locale: string): Promise<void> {
        settings.value.locale = locale;
        await saveOnboardingSettings(settings.value);
    }

    async function setCurrentStep(step: number): Promise<void> {
        settings.value.currentStep = step;
        await saveOnboardingSettings(settings.value);
    }

    async function setBudget(amount: number, currency: string): Promise<void> {
        settings.value.budgetAmount = amount;
        settings.value.budgetCurrency = currency;
        await saveOnboardingSettings(settings.value);
    }

    async function useAiScan(): Promise<boolean> {
        if (settings.value.freeAiScansRemaining <= 0) {
            return false;
        }
        settings.value.freeAiScansRemaining--;
        await saveOnboardingSettings(settings.value);
        return true;
    }

    async function completeOnboarding(): Promise<void> {
        settings.value.onboardingCompleted = true;
        await saveOnboardingSettings(settings.value);
    }

    async function migrateToServer(): Promise<MigrationResult> {
        migrating.value = true;

        try {
            const result = await migrateLocalDataToServer();
            lastMigrationResult.value = result;

            if (result.transactionsFailed.length === 0) {
                localTransactions.value = [];
                localGoals.value = [];
                settings.value.migrated = true;
            }

            return result;
        } finally {
            migrating.value = false;
        }
    }

    return {
        // State
        settings,
        localTransactions,
        localGoals,
        initialized,
        migrating,
        lastMigrationResult,
        // Getters
        hasLocalData,
        localTransactionCount,
        localGoalCount,
        totalLocalSpending,
        totalLocalIncome,
        onboardingCompleted,
        onboardingIntent,
        migrated,
        currentStep,
        budgetAmount,
        budgetCurrency,
        freeAiScansRemaining,
        // Actions
        init,
        addTransaction,
        deleteTransaction,
        addGoal,
        deleteGoal,
        setOnboardingIntent,
        setCurrentStep,
        setBudget,
        setLocale,
        useAiScan,
        completeOnboarding,
        migrateToServer
    };
});
