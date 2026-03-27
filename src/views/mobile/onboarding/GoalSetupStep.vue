<template>
    <div class="goal-step">
        <!-- Header -->
        <header class="goal-header">
            <button class="goal-back-btn" @click="$emit('back')">
                <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <button v-if="!isCurrencyVariant" class="goal-skip-btn" @click="$emit('skip')">
                {{ tt('Skip') }}
            </button>
        </header>

        <!-- Variant A: Savings Goal -->
        <template v-if="isGoalVariant">
            <!-- Phase 1: Goal selection grid -->
            <template v-if="!goalName">
                <section class="goal-brand">
                    <div class="goal-brand-icon">
                        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1; color: #fff">account_balance_wallet</span>
                    </div>
                    <h2 class="goal-brand-title">nicodAImus <span class="goal-brand-accent">oscar</span></h2>
                </section>

                <section class="goal-hero-text">
                    <h1 class="goal-headline">{{ tt('What are you saving for?') }}</h1>
                    <p class="goal-subtext">{{ tt('Pick a goal and start tracking in seconds. No account needed.') }}</p>
                </section>

                <div class="goal-preset-grid">
                    <button
                        v-for="preset in goalPresets"
                        :key="preset.key"
                        class="goal-preset-card"
                        @click="selectGoalPreset(preset.label)"
                    >
                        <div class="goal-preset-icon" :class="'goal-preset-' + preset.color">
                            <span class="material-symbols-outlined">{{ preset.icon }}</span>
                        </div>
                        <span class="goal-preset-label">{{ tt(preset.label) }}</span>
                    </button>
                </div>

                <button class="goal-skip-text" @click="$emit('skip')">{{ tt('Skip for now') }}</button>
            </template>

            <!-- Phase 2: Goal details form -->
            <template v-else>
                <section class="goal-detail-hero">
                    <div class="goal-detail-icon">
                        <span class="material-symbols-outlined">{{ selectedGoalIcon }}</span>
                    </div>
                    <h1 class="goal-headline">{{ goalName }}</h1>
                </section>

                <!-- Amount Input -->
                <section class="goal-amount-section">
                    <label class="goal-section-label">{{ tt('How much do you need?') }}</label>
                    <div class="goal-amount-box">
                        <div class="goal-amount-display">
                            <input
                                type="number"
                                inputmode="decimal"
                                class="goal-amount-input"
                                placeholder="0.00"
                                :value="goalAmountDisplay"
                                @input="onGoalAmountInput($event)"
                            />
                            <span class="goal-amount-currency">EUR</span>
                        </div>
                    </div>
                </section>

                <!-- Timeframe Selection -->
                <section class="goal-timeframe-section">
                    <label class="goal-section-label">{{ tt('When do you want it by?') }}</label>
                    <div class="goal-timeframe-grid">
                        <button
                            v-for="tf in timeframeOptions"
                            :key="tf.key"
                            class="goal-timeframe-btn"
                            :class="{ 'goal-timeframe-active': selectedTimeframe === tf.key }"
                            @click="selectTimeframe(tf.key)"
                        >{{ tt(tf.label) }}</button>
                    </div>
                    <input
                        v-if="selectedTimeframe === 'custom'"
                        type="date"
                        class="goal-date-input"
                        :value="goalDateStr"
                        @input="goalDateStr = ($event.target as HTMLInputElement).value"
                    />
                </section>

                <!-- Pace Card -->
                <section v-if="paceMessage" class="goal-pace-card">
                    <div class="goal-pace-ring">
                        <svg viewBox="0 0 64 64" class="goal-pace-svg">
                            <circle cx="32" cy="32" r="28" fill="transparent" stroke="#e2e8f0" stroke-width="4" />
                            <circle cx="32" cy="32" r="28" fill="transparent" stroke="#7C3AED" stroke-width="4"
                                stroke-dasharray="175.9" stroke-dashoffset="175.9" stroke-linecap="round"
                                class="goal-pace-ring-progress" />
                        </svg>
                        <span class="material-symbols-outlined goal-pace-ring-icon">flag</span>
                    </div>
                    <div class="goal-pace-info">
                        <span class="goal-pace-amount">{{ paceAmountText }}</span>
                        <span class="goal-pace-message">{{ paceMessage }}</span>
                    </div>
                </section>
            </template>
        </template>

        <!-- Variant B: Budget -->
        <template v-else-if="isBudgetVariant">
            <section class="goal-hero-text" style="padding-top: 32px">
                <h1 class="goal-headline">{{ tt('How much do you spend monthly?') }}</h1>
            </section>

            <section class="goal-amount-section">
                <div class="goal-amount-box">
                    <div class="goal-amount-display">
                        <input
                            type="number"
                            inputmode="decimal"
                            class="goal-amount-input"
                            placeholder="0.00"
                            :value="budgetAmountDisplay"
                            @input="onBudgetAmountInput($event)"
                        />
                        <span class="goal-amount-currency">EUR</span>
                    </div>
                </div>
            </section>

            <div class="goal-budget-chips">
                <button
                    v-for="amt in budgetPresets"
                    :key="amt"
                    class="goal-budget-chip"
                    :class="{ 'goal-budget-chip-active': budgetAmount === amt }"
                    @click="budgetAmount = amt"
                >{{ formatBudgetChip(amt) }}</button>
            </div>

            <p class="goal-info-text">{{ tt("We'll track your spending against this budget.") }}</p>
        </template>

        <!-- Variant C: Currency Picker -->
        <template v-else>
            <div class="currency-center">
                <section class="goal-hero-text">
                    <h1 class="goal-headline">{{ tt('Almost ready!') }}</h1>
                </section>

                <div class="currency-card">
                    <div class="currency-flag">{{ currencyFlag }}</div>
                    <div class="currency-name">{{ detectedCurrencyDisplay }}</div>
                    <div class="currency-detected">{{ tt('Detected from your browser') }}</div>
                    <button class="currency-change-link" @click="showCurrencyPicker = true">
                        {{ tt('Not your currency? Change') }}
                    </button>
                </div>
            </div>

            <!-- Currency picker popup (keep F7 popup for full-screen list) -->
            <f7-popup :opened="showCurrencyPicker" @popup:closed="showCurrencyPicker = false">
                <f7-page>
                    <f7-navbar :title="tt('Currency')">
                        <f7-nav-right>
                            <f7-link popup-close>{{ tt('Done') }}</f7-link>
                        </f7-nav-right>
                    </f7-navbar>
                    <f7-list>
                        <f7-list-item
                            v-for="currency in allCurrencies"
                            :key="currency.currencyCode"
                            :title="`${currency.currencyCode} - ${currency.displayName}`"
                            link="#"
                            no-chevron
                            :class="{ 'currency-list-selected': selectedCurrency === currency.currencyCode }"
                            @click="selectCurrency(currency.currencyCode)"
                        />
                    </f7-list>
                </f7-page>
            </f7-popup>
        </template>

        <!-- Sticky CTA Footer -->
        <div class="goal-sticky-footer">
            <button
                v-if="isGoalVariant && goalName"
                class="goal-cta-btn"
                :disabled="goalAmount <= 0"
                @click="saveGoal"
            >{{ tt('Start Tracking') }}</button>
            <button
                v-else-if="isBudgetVariant"
                class="goal-cta-btn"
                :disabled="budgetAmount <= 0"
                @click="saveBudget"
            >{{ tt('Continue') }}</button>
            <button
                v-else-if="isCurrencyVariant"
                class="goal-cta-btn"
                @click="saveCurrency"
            >{{ tt('Continue') }}</button>
            <p class="goal-cta-hint">{{ tt('You can change this anytime') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@/locales/helpers.ts';
import { useOnboardingStore } from '@/stores/onboarding.ts';
import { GoalType } from '@/lib/local-storage/types.ts';

const { tt, getAllCurrencies, getDefaultCurrency } = useI18n();
const store = useOnboardingStore();

const props = defineProps<{
    intent: string;
}>();

const emit = defineEmits<{
    (e: 'next'): void;
    (e: 'back'): void;
    (e: 'skip'): void;
}>();

const isGoalVariant = computed(() => props.intent === 'save_for_goal');
const isBudgetVariant = computed(() => props.intent === 'family_finances' || props.intent === 'create_budget');
const isCurrencyVariant = computed(() => props.intent === 'track_expenses' || props.intent === 'exploring');

// ---- Variant A: Savings Goal ----
const goalName = ref('');
const goalAmount = ref(0);
const goalAmountDisplay = ref('');
const goalDateStr = ref('');
const selectedTimeframe = ref('');

const goalPresets = [
    { key: 'vacation', label: 'Vacation', icon: 'beach_access', color: 'orange' },
    { key: 'emergency', label: 'Emergency Fund', icon: 'shield', color: 'green' },
    { key: 'car', label: 'New Car', icon: 'directions_car', color: 'blue' },
    { key: 'custom', label: 'Custom', icon: 'edit', color: 'purple' }
];

const timeframeOptions = [
    { key: '3m', label: '3 months' },
    { key: '6m', label: '6 months' },
    { key: '1y', label: '1 year' },
    { key: 'custom', label: 'Custom' }
];

const selectedGoalIcon = computed(() => {
    const match = goalPresets.find(p => p.label === goalName.value);
    return match?.icon || 'savings';
});

function selectGoalPreset(label: string): void {
    goalName.value = label;
}

function selectTimeframe(key: string): void {
    selectedTimeframe.value = key;
    const now = new Date();
    if (key === '3m') now.setMonth(now.getMonth() + 3);
    else if (key === '6m') now.setMonth(now.getMonth() + 6);
    else if (key === '1y') now.setFullYear(now.getFullYear() + 1);
    else return; // custom: user picks date manually
    goalDateStr.value = now.toISOString().split('T')[0] ?? '';
}

function onGoalAmountInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    goalAmountDisplay.value = val;
    goalAmount.value = Math.round(parseFloat(val || '0') * 100);
}

const monthsRemaining = computed(() => {
    if (!goalDateStr.value) return 0;
    const target = new Date(goalDateStr.value);
    const now = new Date();
    const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    return Math.max(months, 1);
});

const monthlyPace = computed(() => {
    if (goalAmount.value <= 0 || monthsRemaining.value <= 0) return 0;
    return Math.round(goalAmount.value / monthsRemaining.value);
});

const paceAmountText = computed(() => {
    if (monthlyPace.value <= 0) return '';
    return tt("That's about {amount}/month", { amount: `EUR ${(monthlyPace.value / 100).toFixed(0)}` });
});

const paceMessage = computed(() => {
    const pace = monthlyPace.value / 100;
    if (pace <= 0) return '';
    if (pace < 100) return tt('Easy peasy');
    if (pace <= 500) return tt('Totally doable');
    if (pace <= 1000) return tt("Ambitious - you've got this");
    return tt("That's aggressive - consider extending the date?");
});

async function saveGoal(): Promise<void> {
    const targetDate = goalDateStr.value ? Math.floor(new Date(goalDateStr.value).getTime() / 1000) : 0;

    await store.addGoal({
        name: goalName.value || 'Savings Goal',
        targetAmount: goalAmount.value,
        currentAmount: 0,
        targetDate,
        type: GoalType.Savings
    });

    emit('next');
}

// ---- Variant B: Budget ----
const budgetAmount = ref(0);
const budgetAmountDisplay = ref('');
const budgetPresets = [100000, 200000, 300000, 500000]; // in cents

function onBudgetAmountInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    budgetAmountDisplay.value = val;
    budgetAmount.value = Math.round(parseFloat(val || '0') * 100);
}

function formatBudgetChip(amountCents: number): string {
    return `EUR ${(amountCents / 100).toLocaleString()}`;
}

async function saveBudget(): Promise<void> {
    await store.setBudget(budgetAmount.value, 'EUR');
    emit('next');
}

// ---- Variant C: Currency Picker ----
const LOCALE_CURRENCY_MAP: Record<string, string> = {
    de: 'EUR', en: 'USD', pl: 'PLN', pt: 'BRL', nl: 'EUR', ru: 'RUB', fr: 'EUR',
    es: 'EUR', it: 'EUR', ja: 'JPY', ko: 'KRW', th: 'THB', tr: 'TRY', vi: 'VND'
};

const CURRENCY_FLAG_MAP: Record<string, string> = {
    EUR: '\u{1F1EA}\u{1F1FA}', USD: '\u{1F1FA}\u{1F1F8}', GBP: '\u{1F1EC}\u{1F1E7}',
    PLN: '\u{1F1F5}\u{1F1F1}', BRL: '\u{1F1E7}\u{1F1F7}', RUB: '\u{1F1F7}\u{1F1FA}',
    JPY: '\u{1F1EF}\u{1F1F5}', KRW: '\u{1F1F0}\u{1F1F7}', THB: '\u{1F1F9}\u{1F1ED}',
    TRY: '\u{1F1F9}\u{1F1F7}', VND: '\u{1F1FB}\u{1F1F3}'
};

function detectCurrencyFromLocale(): string {
    const browserLang = navigator.language?.split('-')[0] ?? 'en';
    return LOCALE_CURRENCY_MAP[browserLang] || getDefaultCurrency() || 'EUR';
}

const selectedCurrency = ref(detectCurrencyFromLocale());
const showCurrencyPicker = ref(false);
const allCurrencies = computed(() => getAllCurrencies());

const currencyFlag = computed(() => CURRENCY_FLAG_MAP[selectedCurrency.value] || '\u{1F4B0}');

const detectedCurrencyDisplay = computed(() => {
    const match = allCurrencies.value.find(c => c.currencyCode === selectedCurrency.value);
    return match ? `${match.displayName} (${selectedCurrency.value})` : selectedCurrency.value;
});

function selectCurrency(code: string): void {
    selectedCurrency.value = code;
    showCurrencyPicker.value = false;
}

function saveCurrency(): void {
    store.setLocale(selectedCurrency.value);
    emit('next');
}
</script>

<style scoped>
.goal-step {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 160px;
}

/* Header */
.goal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    height: 56px;
}

.goal-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #7C3AED;
    cursor: pointer;
    transition: background 150ms ease;
    -webkit-tap-highlight-color: transparent;
}

.goal-back-btn:hover {
    background: rgba(0, 0, 0, 0.04);
}

.goal-back-btn:active {
    transform: scale(0.95);
}

.goal-skip-btn {
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 12px;
    font-family: inherit;
}

.goal-skip-btn:hover {
    color: #7C3AED;
}

/* Brand (Variant A phase 1) */
.goal-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 48px;
    padding-top: 16px;
}

.goal-brand-icon {
    width: 48px;
    height: 48px;
    background: #7C3AED;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
}

.goal-brand-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: #0f172a;
    margin: 0;
}

.goal-brand-accent {
    color: #7C3AED;
}

/* Hero Text */
.goal-hero-text {
    text-align: center;
    margin-bottom: 40px;
    padding: 0 24px;
}

.goal-headline {
    font-family: 'Inter', sans-serif;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: #0f172a;
    margin: 0 0 12px;
}

.goal-subtext {
    font-size: 15px;
    color: #64748b;
    line-height: 1.5;
    padding: 0 16px;
    margin: 0;
}

/* Goal Preset Grid (2x2) */
.goal-preset-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 0 24px;
    margin-bottom: 24px;
}

.goal-preset-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 12px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.04);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 200ms ease;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
}

.goal-preset-card:hover {
    border-color: rgba(124, 58, 237, 0.2);
}

.goal-preset-card:active {
    transform: scale(0.95);
}

.goal-preset-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    transition: transform 200ms ease;
}

.goal-preset-card:hover .goal-preset-icon {
    transform: scale(1.1);
}

.goal-preset-orange {
    background: #ffedd5;
    color: #ea580c;
}

.goal-preset-green {
    background: #d1fae5;
    color: #10b981;
}

.goal-preset-blue {
    background: #dbeafe;
    color: #3b82f6;
}

.goal-preset-purple {
    background: #ede9fe;
    color: #7C3AED;
}

.goal-preset-label {
    font-size: 15px;
    font-weight: 600;
    color: #1e293b;
}

.goal-skip-text {
    display: block;
    margin: 0 auto;
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
}

.goal-skip-text:hover {
    color: #64748b;
}

/* Goal Detail Hero */
.goal-detail-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 24px 40px;
}

.goal-detail-icon {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ede9fe, #ddd6fe);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.goal-detail-icon .material-symbols-outlined {
    font-size: 48px;
    color: #7c3aed;
}

/* Section Label */
.goal-section-label {
    display: block;
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 16px;
}

/* Amount Input */
.goal-amount-section {
    padding: 0 24px;
    margin-bottom: 40px;
}

.goal-amount-box {
    background: rgba(139, 92, 246, 0.04);
    border: 1px solid rgba(139, 92, 246, 0.15);
    border-radius: 24px;
    padding: 32px;
    display: flex;
    justify-content: center;
    transition: box-shadow 200ms ease;
}

.goal-amount-box:focus-within {
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.goal-amount-display {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.goal-amount-input {
    border: none;
    background: transparent;
    font-size: 48px;
    font-weight: 800;
    color: #0f172a;
    width: 200px;
    text-align: right;
    outline: none;
    font-family: 'Inter', sans-serif;
    -moz-appearance: textfield;
}

.goal-amount-input::-webkit-outer-spin-button,
.goal-amount-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
}

.goal-amount-input::placeholder {
    color: #cbd5e1;
}

.goal-amount-currency {
    font-size: 20px;
    font-weight: 700;
    color: #a78bfa;
}

/* Timeframe Grid */
.goal-timeframe-section {
    padding: 0 24px;
    margin-bottom: 32px;
}

.goal-timeframe-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.goal-timeframe-btn {
    padding: 16px 8px;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #475569;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 200ms ease;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
}

.goal-timeframe-btn:hover {
    border-color: rgba(139, 92, 246, 0.3);
}

.goal-timeframe-btn:active {
    transform: scale(0.95);
}

.goal-timeframe-active {
    background: #7C3AED;
    color: #fff;
    border-color: #7C3AED;
    box-shadow: 0 4px 8px rgba(139, 92, 246, 0.2);
}

.goal-date-input {
    display: block;
    width: 100%;
    margin-top: 12px;
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px;
    font-family: inherit;
    color: #0f172a;
    background: #fff;
}

/* Pace Card */
.goal-pace-card {
    display: flex;
    align-items: center;
    gap: 24px;
    margin: 0 24px 32px;
    padding: 24px;
    background: #fff;
    border-radius: 24px;
    border: 1px solid #f1f5f9;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.goal-pace-ring {
    position: relative;
    width: 64px;
    height: 64px;
    min-width: 64px;
}

.goal-pace-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
}

.goal-pace-ring-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a78bfa;
    font-size: 20px;
}

.goal-pace-info {
    display: flex;
    flex-direction: column;
}

.goal-pace-amount {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
}

.goal-pace-message {
    font-size: 14px;
    font-weight: 500;
    color: #7C3AED;
    margin-top: 4px;
}

/* Budget Chips */
.goal-budget-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 0 24px;
    margin-bottom: 16px;
}

.goal-budget-chip {
    padding: 10px 20px;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #475569;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 200ms ease;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
}

.goal-budget-chip:active {
    transform: scale(0.95);
}

.goal-budget-chip-active {
    background: #7C3AED;
    color: #fff;
    border-color: #7C3AED;
}

.goal-info-text {
    font-size: 13px;
    color: #94a3b8;
    text-align: center;
    padding: 0 24px;
    margin: 0;
}

/* Currency (Variant C) */
.currency-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 24px 0;
}

.currency-card {
    background: #fff;
    border-radius: 16px;
    padding: 32px 24px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
    width: 100%;
    max-width: 400px;
}

.currency-flag {
    font-size: 56px;
    line-height: 1;
    margin-bottom: 16px;
}

.currency-name {
    font-size: 22px;
    font-weight: 600;
    color: #0f172a;
}

.currency-detected {
    font-size: 13px;
    color: #94a3b8;
    margin-top: 6px;
}

.currency-change-link {
    display: inline-block;
    margin-top: 16px;
    font-size: 14px;
    font-weight: 500;
    color: #7C3AED;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
}

.currency-list-selected {
    background: #faf5ff;
}

/* Sticky CTA Footer */
.goal-sticky-footer {
    position: fixed;
    bottom: 72px; /* above onboarding pagination */
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 16px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 10;
}

.goal-cta-btn {
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
    transition: all 200ms ease;
    font-family: inherit;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
    -webkit-tap-highlight-color: transparent;
}

.goal-cta-btn:active {
    transform: scale(0.95);
}

.goal-cta-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.goal-cta-hint {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
    margin: 0;
}

/* Dark Mode */
.dark .goal-headline { color: #e9eaee; }
.dark .goal-subtext { color: #9aa0a6; }
.dark .goal-preset-card { background: #1a1721; border-color: #2a2533; box-shadow: none; }
.dark .goal-preset-label { color: #e9eaee; }
.dark .goal-brand-title { color: #e9eaee; }
.dark .goal-amount-box { background: rgba(139, 92, 246, 0.06); border-color: rgba(139, 92, 246, 0.2); }
.dark .goal-amount-input { color: #e9eaee; }
.dark .goal-amount-input::placeholder { color: #3a3344; }
.dark .goal-timeframe-btn { background: #1a1721; border-color: #2a2533; color: #9aa0a6; }
.dark .goal-pace-card { background: #1a1721; border-color: #2a2533; box-shadow: none; }
.dark .goal-pace-amount { color: #e9eaee; }
.dark .goal-budget-chip { background: #1a1721; border-color: #2a2533; color: #9aa0a6; }
.dark .goal-sticky-footer { background: rgba(15, 13, 19, 0.8); }
.dark .currency-card { background: #1a1721; border-color: #2a2533; box-shadow: none; }
.dark .currency-name { color: #e9eaee; }
.dark .currency-detected { color: #9aa0a6; }
.dark .currency-list-selected { background: rgba(124, 58, 237, 0.1); }
.dark .goal-date-input { background: #1a1721; border-color: #2a2533; color: #e9eaee; }
</style>
