<template>
    <div class="expense-step">
        <!-- Header -->
        <header class="expense-header">
            <button class="expense-back-btn" @click="$emit('back')">
                <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 class="expense-header-title">{{ tt('New Expense') }}</h1>
            <button class="expense-skip-btn" @click="$emit('skip')">{{ tt('Skip') }}</button>
        </header>

        <main class="expense-main">
            <!-- Hero Amount Card -->
            <section class="expense-amount-card" @click="showNumPad = true">
                <div class="expense-encrypted-badge">
                    <span class="material-symbols-outlined expense-encrypted-icon">lock</span>
                    <span class="expense-encrypted-text">{{ tt('Encrypted') }}</span>
                </div>
                <p class="expense-amount-label">{{ tt('Amount') }}</p>
                <div class="expense-amount-row">
                    <span class="expense-amount-value">{{ displayAmount }}</span>
                    <span class="expense-amount-currency">EUR</span>
                    <div class="expense-cursor-blink"></div>
                </div>
            </section>

            <!-- Category Chips (horizontal scroll) -->
            <section class="expense-categories-section">
                <h3 class="expense-section-label">{{ tt('Select Category') }}</h3>
                <div class="expense-categories-scroll">
                    <button
                        v-for="cat in categories"
                        :key="cat.key"
                        class="expense-cat-chip"
                        :class="[
                            'expense-cat-' + cat.colorKey,
                            { 'expense-cat-active': selectedCategory === cat.key }
                        ]"
                        @click="selectedCategory = cat.key"
                    >
                        <span class="material-symbols-outlined expense-cat-icon">{{ cat.icon }}</span>
                        <span class="expense-cat-label">{{ tt(cat.label) }}</span>
                    </button>
                </div>
            </section>

            <!-- Comment field -->
            <section class="expense-comment-section">
                <textarea
                    class="expense-comment"
                    :placeholder="tt('Add a note (optional)')"
                    :value="comment"
                    @input="comment = ($event.target as HTMLTextAreaElement).value"
                    rows="2"
                ></textarea>
            </section>

            <!-- Scan Receipt -->
            <section v-if="hasCamera" class="expense-scan-section">
                <button class="expense-scan-btn" @click="showScanner = true">
                    <span class="material-symbols-outlined">photo_camera</span>
                    {{ tt('Scan Receipt') }}
                </button>
                <div class="expense-scan-hint">
                    <span class="material-symbols-outlined expense-scan-hint-icon" style="font-variation-settings: 'FILL' 1">shield</span>
                    <span>{{ tt('Free on-device scanning - your image stays on your phone') }}</span>
                </div>
            </section>
        </main>

        <!-- Sticky CTA -->
        <div class="expense-sticky-footer">
            <button
                class="expense-cta-btn"
                :disabled="amount <= 0"
                @click="addExpense"
            >{{ tt('Add Expense') }}</button>
        </div>

        <!-- Number pad sheet -->
        <NumberPadSheet
            :model-value="amount"
            :show="showNumPad"
            :min-value="0"
            :max-value="99999999"
            currency="EUR"
            @update:model-value="onAmountUpdate"
            @update:show="showNumPad = $event"
        />

        <!-- Receipt scanner -->
        <AIImageRecognitionSheet
            :show="showScanner"
            :onboarding-mode="true"
            @update:show="showScanner = $event"
            @recognition:change="onReceiptRecognized"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@/locales/helpers.ts';
import { useOnboardingStore } from '@/stores/onboarding.ts';
import { TransactionType } from '@/core/transaction.ts';

import NumberPadSheet from '@/components/mobile/NumberPadSheet.vue';
import AIImageRecognitionSheet from '@/components/mobile/AIImageRecognitionSheet.vue';
import type { RecognizedReceiptImageResponse } from '@/models/large_language_model.ts';

const { tt } = useI18n();
const store = useOnboardingStore();

const emit = defineEmits<{
    (e: 'next'): void;
    (e: 'back'): void;
    (e: 'skip'): void;
}>();

const amount = ref(0);
const selectedCategory = ref('other');
const comment = ref('');
const showNumPad = ref(false);
const showScanner = ref(false);

const hasCamera = computed(() => {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices;
});

const categories = [
    { key: 'groceries', label: 'Groceries', icon: 'shopping_basket', color: '#10b981', colorKey: 'green' },
    { key: 'dining', label: 'Dining', icon: 'restaurant', color: '#f97316', colorKey: 'orange' },
    { key: 'transport', label: 'Transport', icon: 'directions_bus', color: '#3b82f6', colorKey: 'blue' },
    { key: 'shopping', label: 'Shopping', icon: 'shopping_bag', color: '#ec4899', colorKey: 'pink' },
    { key: 'coffee', label: 'Coffee', icon: 'coffee', color: '#92400e', colorKey: 'brown' },
    { key: 'other', label: 'Other', icon: 'more_horiz', color: '#6b7280', colorKey: 'gray' }
];

const displayAmount = computed(() => {
    return (amount.value / 100).toFixed(2);
});

function onAmountUpdate(value: number): void {
    amount.value = value;
}

function onReceiptRecognized(result: RecognizedReceiptImageResponse): void {
    if (result.sourceAmount && result.sourceAmount > 0) {
        amount.value = result.sourceAmount;
    }

    showScanner.value = false;
}

async function addExpense(): Promise<void> {
    const now = new Date();

    await store.addTransaction({
        type: TransactionType.Expense,
        categoryLocalId: getCategoryLocalId(selectedCategory.value),
        time: Math.floor(now.getTime() / 1000),
        utcOffset: -now.getTimezoneOffset(),
        sourceAmount: amount.value,
        destinationAmount: 0,
        hideAmount: false,
        comment: comment.value
    });

    // Reset for potential "Add Another" return
    amount.value = 0;
    comment.value = '';
    selectedCategory.value = 'other';

    emit('next');
}

// Simple category ID mapping (just index-based for local storage)
function getCategoryLocalId(key: string): number {
    const idx = categories.findIndex(c => c.key === key);
    return idx >= 0 ? idx + 1 : 7; // 1-based, default to Other (7)
}
</script>

<style scoped>
.expense-step {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 160px;
}

/* Header */
.expense-header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 56px;
    background: #fff;
    border-bottom: 1px solid #f1f5f9;
}

.dark .expense-header {
    background: #0f0d13;
    border-color: #2a2533;
}

.expense-back-btn {
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
    -webkit-tap-highlight-color: transparent;
}

.expense-back-btn:active { transform: scale(0.95); }

.expense-header-title {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
}

.dark .expense-header-title { color: #e9eaee; }

.expense-skip-btn {
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 12px;
    cursor: pointer;
    font-family: inherit;
}

.expense-skip-btn:hover { color: #7C3AED; }

/* Main */
.expense-main {
    padding: 16px 24px 0;
    max-width: 448px;
    margin: 0 auto;
    width: 100%;
}

/* Amount Card */
.expense-amount-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    border: 1px solid #f1f5f9;
    padding: 40px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    margin-bottom: 24px;
    -webkit-tap-highlight-color: transparent;
}

.dark .expense-amount-card {
    background: #1a1721;
    border-color: #2a2533;
    box-shadow: none;
}

.expense-encrypted-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    background: #faf5ff;
    padding: 4px 8px;
    border-radius: 20px;
}

.dark .expense-encrypted-badge {
    background: rgba(124, 58, 237, 0.15);
}

.expense-encrypted-icon {
    font-size: 14px;
    color: #7C3AED;
    font-variation-settings: 'FILL' 1;
}

.expense-encrypted-text {
    font-size: 10px;
    font-weight: 700;
    color: #6d28d9;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.dark .expense-encrypted-text { color: #a78bfa; }

.expense-amount-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 8px;
}

.expense-amount-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

.expense-amount-value {
    font-family: 'Inter', sans-serif;
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: #0f172a;
}

.dark .expense-amount-value { color: #e9eaee; }

.expense-amount-currency {
    font-size: 24px;
    font-weight: 700;
    color: #94a3b8;
    align-self: flex-end;
    margin-bottom: 4px;
    margin-left: 4px;
}

.expense-cursor-blink {
    width: 2px;
    height: 40px;
    background: #7C3AED;
    margin-left: 4px;
    animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
    from, to { border-color: transparent; opacity: 0; }
    50% { border-color: #7C3AED; opacity: 1; }
}

/* Category Chips */
.expense-categories-section {
    margin-bottom: 24px;
}

.expense-section-label {
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 12px 4px;
}

.expense-categories-scroll {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 8px;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.expense-categories-scroll::-webkit-scrollbar {
    display: none;
}

.expense-cat-chip {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 50px;
    border: 1px solid;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 150ms ease;
    -webkit-tap-highlight-color: transparent;
}

.expense-cat-chip:active { transform: scale(0.95); }

.expense-cat-icon { font-size: 18px; }

/* Color variants */
.expense-cat-green { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
.expense-cat-orange { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
.expense-cat-blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.expense-cat-pink { background: #fdf2f8; color: #be185d; border-color: #fbcfe8; }
.expense-cat-brown { background: rgba(146, 64, 14, 0.08); color: #92400e; border-color: rgba(146, 64, 14, 0.2); }
.expense-cat-gray { background: #f9fafb; color: #4b5563; border-color: #e5e7eb; }

.expense-cat-active {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: scale(1.02);
}

/* Comment */
.expense-comment-section {
    margin-bottom: 24px;
}

.expense-comment {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px;
    font-family: inherit;
    color: #0f172a;
    background: #fff;
    resize: none;
    outline: none;
    transition: border-color 200ms ease;
    box-sizing: border-box;
}

.expense-comment:focus {
    border-color: rgba(124, 58, 237, 0.4);
}

.dark .expense-comment {
    background: #1a1721;
    border-color: #2a2533;
    color: #e9eaee;
}

/* Scan Receipt */
.expense-scan-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.expense-scan-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    border: 2px solid #c4b5fd;
    border-radius: 12px;
    background: rgba(124, 58, 237, 0.03);
    color: #6d28d9;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: background 200ms ease;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
}

.expense-scan-btn:hover { background: rgba(124, 58, 237, 0.06); }
.expense-scan-btn:active { transform: scale(0.98); }

.expense-scan-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #64748b;
    font-weight: 500;
}

.expense-scan-hint-icon {
    font-size: 14px;
    color: #a78bfa;
}

/* Sticky CTA */
.expense-sticky-footer {
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
    justify-content: center;
}

.dark .expense-sticky-footer {
    background: rgba(15, 13, 19, 0.8);
}

.expense-cta-btn {
    width: 100%;
    max-width: 448px;
    padding: 16px;
    background: #7C3AED;
    color: #fff;
    border: none;
    border-radius: 16px;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
}

.expense-cta-btn:active { transform: scale(0.95); }

.expense-cta-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* Dark mode for categories */
.dark .expense-cat-green { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); }
.dark .expense-cat-orange { background: rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.2); }
.dark .expense-cat-blue { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); }
.dark .expense-cat-pink { background: rgba(236, 72, 153, 0.1); border-color: rgba(236, 72, 153, 0.2); }
.dark .expense-cat-brown { background: rgba(146, 64, 14, 0.1); border-color: rgba(146, 64, 14, 0.2); }
.dark .expense-cat-gray { background: rgba(107, 114, 128, 0.1); border-color: rgba(107, 114, 128, 0.2); }
</style>
