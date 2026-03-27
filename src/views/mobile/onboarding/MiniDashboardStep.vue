<template>
    <div class="dashboard-step">
        <!-- Has transactions -->
        <template v-if="transactions.length > 0">
            <!-- Header -->
            <section class="dashboard-header-section">
                <h2 class="dashboard-title">{{ tt('Your Mini Dashboard') }}</h2>
                <p class="dashboard-subtitle">{{ tt("Here's a glimpse of your financial health.") }}</p>
            </section>

            <!-- Savings Goal Card -->
            <div v-if="showGoalCard && store.localGoals.length > 0" class="dashboard-card dashboard-goal-card">
                <div class="dashboard-goal-top">
                    <div class="dashboard-goal-info">
                        <div class="dashboard-goal-icon-box">
                            <span class="material-symbols-outlined">beach_access</span>
                        </div>
                        <div>
                            <h3 class="dashboard-goal-name">{{ goalTitle }}</h3>
                            <span class="dashboard-goal-badge" :class="'dashboard-badge-' + badgeColor">{{ badgeLabel }}</span>
                        </div>
                    </div>
                    <!-- Progress Ring -->
                    <div class="dashboard-progress-ring">
                        <svg viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="transparent" stroke="#f1f5f9" stroke-width="4" />
                            <circle cx="24" cy="24" r="20" fill="transparent" stroke="#7C3AED" stroke-width="4"
                                :stroke-dasharray="125.6"
                                :stroke-dashoffset="125.6 - (progressPercent / 100 * 125.6)"
                                stroke-linecap="round"
                                class="dashboard-ring-track" />
                        </svg>
                        <span class="dashboard-ring-label">{{ progressPercent }}%</span>
                    </div>
                </div>
                <div class="dashboard-goal-bottom">
                    <span class="dashboard-goal-amount">{{ progressText }}</span>
                </div>
            </div>

            <!-- Budget Progress Card -->
            <div v-else-if="showGoalCard && store.budgetAmount > 0" class="dashboard-card">
                <div class="dashboard-budget-header">
                    <h3 class="dashboard-budget-title">{{ goalTitle }}</h3>
                    <span class="dashboard-goal-badge" :class="'dashboard-badge-' + badgeColor">{{ badgeLabel }}</span>
                </div>
                <div class="dashboard-budget-bar-container">
                    <div class="dashboard-budget-bar" :style="{ width: progressPercent + '%', background: progressColor }"></div>
                </div>
                <span class="dashboard-goal-amount">{{ progressText }}</span>
            </div>

            <!-- Weekly Spending Bar Chart -->
            <div class="dashboard-card">
                <h3 class="dashboard-card-title">{{ tt('This Week') }}</h3>
                <div class="dashboard-bars">
                    <div v-for="cat in spendingByCategory" :key="cat.key" class="dashboard-bar-col">
                        <div class="dashboard-bar-track">
                            <div class="dashboard-bar-fill" :style="{ height: cat.heightPct + '%', background: cat.color }"></div>
                        </div>
                        <span class="dashboard-bar-label">{{ tt(cat.label) }}</span>
                    </div>
                </div>
                <div class="dashboard-week-total">
                    {{ tt('Total:') }} <strong>EUR {{ totalFormatted }}</strong> {{ tt('this week') }}
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">{{ tt('Recent Transactions') }}</h3>
                </div>
                <div class="dashboard-tx-list">
                    <div v-for="tx in transactions" :key="tx.localId" class="dashboard-tx-item">
                        <div class="dashboard-tx-left">
                            <div class="dashboard-tx-icon" :style="{ background: getCategoryBg(tx.categoryLocalId), color: getCategoryColor(tx.categoryLocalId) }">
                                <span class="material-symbols-outlined">{{ getCategoryIcon(tx.categoryLocalId) }}</span>
                            </div>
                            <div>
                                <p class="dashboard-tx-name">{{ getCategoryLabel(tx.categoryLocalId) }}</p>
                                <p v-if="tx.comment" class="dashboard-tx-comment">{{ tx.comment }}</p>
                                <p v-else class="dashboard-tx-date">{{ tt('Today') }}</p>
                            </div>
                        </div>
                        <p class="dashboard-tx-amount">EUR {{ (tx.sourceAmount / 100).toFixed(2) }}</p>
                    </div>
                </div>
            </div>

            <!-- Conversion Nudge -->
            <div class="dashboard-nudge-wrapper">
                <div class="dashboard-nudge">
                    <div class="dashboard-nudge-icon">
                        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">lock</span>
                    </div>
                    <h3 class="dashboard-nudge-title">{{ tt('Your data is only on this device') }}</h3>
                    <p class="dashboard-nudge-text">{{ tt('Create a free account to sync and protect it across all your devices.') }}</p>
                    <div class="dashboard-nudge-actions">
                        <button class="dashboard-nudge-cta" @click="$emit('next')">{{ tt('Get Started') }}</button>
                        <button class="dashboard-nudge-skip" @click="$emit('next')">{{ tt('Maybe later') }}</button>
                    </div>
                    <div class="dashboard-nudge-footer">
                        <span class="material-symbols-outlined dashboard-nudge-footer-icon">shield</span>
                        <span class="dashboard-nudge-footer-text">{{ tt('Only you can read your data') }}</span>
                    </div>
                </div>
            </div>
        </template>

        <!-- Empty state -->
        <template v-else>
            <div class="dashboard-empty">
                <span class="material-symbols-outlined dashboard-empty-icon">receipt_long</span>
                <h3 class="dashboard-empty-title">{{ tt('No expenses yet') }}</h3>
                <p class="dashboard-empty-text">{{ tt('Add your first expense to see your dashboard') }}</p>
            </div>
        </template>

        <!-- Action Buttons (sticky) -->
        <div class="dashboard-actions">
            <button class="dashboard-add-btn" @click="$emit('add-more')">{{ tt('Add Another Expense') }}</button>
            <button class="dashboard-continue-btn" @click="$emit('next')">{{ tt('Continue') }}</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/locales/helpers.ts';
import { useOnboardingStore } from '@/stores/onboarding.ts';
import type { LocalTransaction } from '@/lib/local-storage/types.ts';

const { tt } = useI18n();
const store = useOnboardingStore();

defineEmits<{
    (e: 'next'): void;
    (e: 'add-more'): void;
}>();

const CATEGORIES = [
    { id: 1, key: 'groceries', label: 'Groceries', color: '#10b981', bg: '#ecfdf5', icon: 'shopping_cart' },
    { id: 2, key: 'dining', label: 'Dining', color: '#f97316', bg: '#fff7ed', icon: 'restaurant' },
    { id: 3, key: 'transport', label: 'Transport', color: '#3b82f6', bg: '#eff6ff', icon: 'train' },
    { id: 4, key: 'shopping', label: 'Shopping', color: '#ec4899', bg: '#fdf2f8', icon: 'shopping_bag' },
    { id: 5, key: 'coffee', label: 'Coffee', color: '#92400e', bg: 'rgba(146,64,14,0.08)', icon: 'coffee' },
    { id: 6, key: 'health', label: 'Health', color: '#14b8a6', bg: '#f0fdfa', icon: 'favorite' },
    { id: 7, key: 'other', label: 'Other', color: '#6b7280', bg: '#f9fafb', icon: 'more_horiz' }
];

const transactions = computed<LocalTransaction[]>(() => store.localTransactions);

const totalSpending = computed(() => store.totalLocalSpending);
const totalFormatted = computed(() => (totalSpending.value / 100).toFixed(2));

function getCategoryLabel(localId: number): string {
    const cat = CATEGORIES.find(c => c.id === localId);
    return cat ? tt(cat.label) : tt('Other');
}

function getCategoryColor(localId: number): string {
    const cat = CATEGORIES.find(c => c.id === localId);
    return cat ? cat.color : '#6b7280';
}

function getCategoryBg(localId: number): string {
    const cat = CATEGORIES.find(c => c.id === localId);
    return cat ? cat.bg : '#f9fafb';
}

function getCategoryIcon(localId: number): string {
    const cat = CATEGORIES.find(c => c.id === localId);
    return cat ? cat.icon : 'more_horiz';
}

// Bar chart data
const spendingByCategory = computed(() => {
    const grouped: Record<number, number> = {};
    for (const tx of transactions.value) {
        grouped[tx.categoryLocalId] = (grouped[tx.categoryLocalId] || 0) + tx.sourceAmount;
    }

    const maxAmount = Math.max(...Object.values(grouped), 1);

    return Object.entries(grouped).map(([catId, amt]) => {
        const cat = CATEGORIES.find(c => c.id === Number(catId));
        return {
            key: cat?.key || 'other',
            label: cat?.label || 'Other',
            color: cat?.color || '#6b7280',
            amount: amt as number,
            heightPct: Math.max(10, Math.round(((amt as number) / maxAmount) * 100))
        };
    }).slice(0, 4); // Show max 4 bars like Stitch
});

// Goal / Budget progress
const showGoalCard = computed(() => store.localGoals.length > 0 || store.budgetAmount > 0);

const goalTitle = computed(() => {
    if (store.localGoals.length > 0) {
        return store.localGoals[0]!.name;
    }
    return tt('Monthly Budget');
});

const progressPercent = computed(() => {
    if (store.localGoals.length > 0) {
        return 0; // No contributions yet
    }
    if (store.budgetAmount > 0) {
        return Math.min(100, Math.round((totalSpending.value / store.budgetAmount) * 100));
    }
    return 0;
});

const progressColor = computed(() => {
    const pct = progressPercent.value;
    if (pct > 90) return '#ef4444';
    if (pct > 75) return '#f59e0b';
    return '#10b981';
});

const badgeColor = computed(() => {
    const pct = progressPercent.value;
    if (pct > 90) return 'red';
    if (pct > 75) return 'amber';
    return 'green';
});

const badgeLabel = computed(() => {
    const pct = progressPercent.value;
    if (pct > 90) return tt('Over Budget');
    if (pct > 75) return tt('Needs Attention');
    return tt('On Track');
});

const progressText = computed(() => {
    if (store.localGoals.length > 0) {
        const goal = store.localGoals[0]!;
        return `EUR 0 / EUR ${(goal.targetAmount / 100).toFixed(0)}`;
    }
    if (store.budgetAmount > 0) {
        return `EUR ${(totalSpending.value / 100).toFixed(2)} / EUR ${(store.budgetAmount / 100).toFixed(0)}`;
    }
    return '';
});
</script>

<style scoped>
.dashboard-step {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 24px 16px 180px;
}

/* Header */
.dashboard-header-section {
    margin-bottom: 24px;
}

.dashboard-title {
    font-family: 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: #1e293b;
    margin: 0 0 4px;
}

.dashboard-subtitle {
    font-size: 14px;
    color: #64748b;
    margin: 0;
}

/* Shared Card */
.dashboard-card {
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    border: 1px solid #f1f5f9;
    margin-bottom: 16px;
}

.dashboard-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.dashboard-card-title {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 16px;
}

/* Goal Card */
.dashboard-goal-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
}

.dashboard-goal-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.dashboard-goal-icon-box {
    width: 40px;
    height: 40px;
    background: #ede9fe;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dashboard-goal-icon-box .material-symbols-outlined {
    color: #7C3AED;
}

.dashboard-goal-name {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 4px;
}

.dashboard-goal-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 8px;
    border-radius: 20px;
}

.dashboard-badge-green { background: #ecfdf5; color: #059669; }
.dashboard-badge-amber { background: #fffbeb; color: #d97706; }
.dashboard-badge-red { background: #fef2f2; color: #dc2626; }

/* Progress Ring */
.dashboard-progress-ring {
    position: relative;
    width: 48px;
    height: 48px;
}

.dashboard-progress-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
}

.dashboard-ring-track {
    transition: stroke-dashoffset 600ms ease;
}

.dashboard-ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: #6d28d9;
}

.dashboard-goal-bottom {
    border-top: 1px solid #f8f7fa;
    padding-top: 12px;
}

.dashboard-goal-amount {
    font-size: 13px;
    color: #64748b;
}

/* Budget Bar */
.dashboard-budget-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.dashboard-budget-title {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}

.dashboard-budget-bar-container {
    height: 8px;
    background: #f1f5f9;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
}

.dashboard-budget-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 600ms ease-out;
}

/* Bar Chart */
.dashboard-bars {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 96px;
    gap: 12px;
    margin-bottom: 16px;
}

.dashboard-bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    height: 100%;
}

.dashboard-bar-track {
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}

.dashboard-bar-fill {
    width: 100%;
    border-radius: 6px 6px 0 0;
    transition: height 600ms ease-out;
    min-height: 4px;
}

.dashboard-bar-label {
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
}

.dashboard-week-total {
    text-align: center;
    font-size: 14px;
    color: #475569;
    padding-top: 16px;
    border-top: 1px solid #f8f7fa;
}

.dashboard-week-total strong {
    color: #0f172a;
    font-weight: 700;
}

/* Transaction List */
.dashboard-tx-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.dashboard-tx-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.dashboard-tx-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.dashboard-tx-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.dashboard-tx-icon .material-symbols-outlined {
    font-size: 20px;
}

.dashboard-tx-name {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
}

.dashboard-tx-comment,
.dashboard-tx-date {
    font-size: 10px;
    color: #94a3b8;
    font-weight: 500;
    margin: 2px 0 0;
}

.dashboard-tx-amount {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
}

/* Conversion Nudge */
.dashboard-nudge-wrapper {
    padding: 2px;
    border-radius: 18px;
    background: linear-gradient(135deg, #8b5cf6, #d946ef, #7c3aed);
    margin: 32px 0 48px;
}

.dashboard-nudge {
    background: #fff;
    border-radius: 16px;
    padding: 24px;
    text-align: center;
}

.dashboard-nudge-icon {
    width: 48px;
    height: 48px;
    background: #ede9fe;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
}

.dashboard-nudge-icon .material-symbols-outlined {
    color: #7C3AED;
}

.dashboard-nudge-title {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.3;
    margin: 0 0 8px;
}

.dashboard-nudge-text {
    font-size: 14px;
    color: #64748b;
    margin: 0 0 24px;
    padding: 0 16px;
}

.dashboard-nudge-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.dashboard-nudge-cta {
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 2px solid #7C3AED;
    color: #7C3AED;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
}

.dashboard-nudge-cta:active { transform: scale(0.95); }

.dashboard-nudge-skip {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 8px;
    font-family: inherit;
}

.dashboard-nudge-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #f8f7fa;
}

.dashboard-nudge-footer-icon {
    font-size: 14px;
    color: #cbd5e1;
}

.dashboard-nudge-footer-text {
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

/* Empty State */
.dashboard-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60%;
    padding: 32px;
    text-align: center;
}

.dashboard-empty-icon {
    font-size: 64px;
    color: #cbd5e1;
    margin-bottom: 16px;
}

.dashboard-empty-title {
    font-size: 18px;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 8px;
}

.dashboard-empty-text {
    font-size: 14px;
    color: #64748b;
    margin: 0;
}

/* Action Buttons (sticky) */
.dashboard-actions {
    position: fixed;
    bottom: 72px;
    left: 0;
    right: 0;
    padding: 12px 24px;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
}

.dashboard-add-btn {
    width: 100%;
    max-width: 448px;
    padding: 12px;
    background: transparent;
    border: 2px solid #7C3AED;
    color: #7C3AED;
    border-radius: 16px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
}

.dashboard-add-btn:active { transform: scale(0.95); }

.dashboard-continue-btn {
    width: 100%;
    max-width: 448px;
    padding: 16px;
    background: #7C3AED;
    color: #fff;
    border: none;
    border-radius: 16px;
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
}

.dashboard-continue-btn:active { transform: scale(0.95); }

/* Dark mode */
.dark .dashboard-title { color: #e9eaee; }
.dark .dashboard-subtitle { color: #9aa0a6; }
.dark .dashboard-card { background: #1a1721; border-color: #2a2533; box-shadow: none; }
.dark .dashboard-card-title { color: #e9eaee; }
.dark .dashboard-goal-name { color: #e9eaee; }
.dark .dashboard-tx-name { color: #e9eaee; }
.dark .dashboard-tx-amount { color: #e9eaee; }
.dark .dashboard-week-total strong { color: #e9eaee; }
.dark .dashboard-nudge { background: #1a1721; }
.dark .dashboard-nudge-title { color: #e9eaee; }
.dark .dashboard-nudge-text { color: #9aa0a6; }
.dark .dashboard-empty-title { color: #e9eaee; }
.dark .dashboard-empty-text { color: #9aa0a6; }
.dark .dashboard-empty-icon { color: #3a3344; }
.dark .dashboard-actions { background: rgba(15, 13, 19, 0.8); }
.dark .dashboard-budget-bar-container { background: #2a2533; }
</style>
