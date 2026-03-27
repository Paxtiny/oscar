<template>
    <div class="welcome-step">
        <main class="welcome-main">
            <!-- Logo -->
            <div class="welcome-logo-box">
                <span class="material-symbols-outlined welcome-logo-icon">shield</span>
            </div>

            <!-- Header -->
            <div class="welcome-header">
                <h1 class="welcome-headline">{{ tt('What brings you here?') }}</h1>
                <p class="welcome-subtitle">{{ tt('No account needed. Start tracking right away.') }}</p>
            </div>

            <!-- Intent Cards -->
            <div class="welcome-intents">
                <button
                    v-for="intent in intents"
                    :key="intent.key"
                    class="welcome-intent-card"
                    :class="{ 'welcome-intent-selected': selectedIntent === intent.key }"
                    @click="selectIntent(intent.key)"
                >
                    <div class="welcome-intent-icon-box">
                        <span class="material-symbols-outlined">{{ intent.icon }}</span>
                    </div>
                    <span class="welcome-intent-label">{{ tt(intent.label) }}</span>
                </button>
            </div>
        </main>

        <!-- Login Link -->
        <div class="welcome-footer">
            <a class="welcome-login-link" @click.prevent="$emit('login')">
                {{ tt('Already have an account?') }}
                <span class="welcome-login-highlight">{{ tt('Log in') }}</span>
            </a>
        </div>

        <!-- Decorative background blobs -->
        <div class="welcome-bg-decor" aria-hidden="true">
            <div class="welcome-bg-blob welcome-bg-blob-1"></div>
            <div class="welcome-bg-blob welcome-bg-blob-2"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@/locales/helpers.ts';

const { tt } = useI18n();

const emit = defineEmits<{
    (e: 'next', intent: string): void;
    (e: 'login'): void;
}>();

const selectedIntent = ref<string>('');

const intents = [
    { key: 'track_expenses', label: 'Track personal expenses', icon: 'shopping_cart' },
    { key: 'family_finances', label: 'Manage family finances', icon: 'family_restroom' },
    { key: 'save_for_goal', label: 'Save for a goal', icon: 'savings' },
    { key: 'create_budget', label: 'Create a budget', icon: 'account_balance_wallet' },
    { key: 'exploring', label: 'Just exploring', icon: 'more_horiz' }
];

function selectIntent(key: string): void {
    selectedIntent.value = key;

    setTimeout(() => {
        emit('next', key);
    }, 300);
}
</script>

<style scoped>
.welcome-step {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

.welcome-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 448px;
    width: 100%;
    margin: 0 auto;
    padding: 48px 24px 24px;
}

/* Logo box */
.welcome-logo-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    margin-bottom: 32px;
}

.welcome-logo-icon {
    color: #7C3AED;
    font-size: 30px;
}

/* Header */
.welcome-header {
    text-align: center;
    margin-bottom: 40px;
}

.welcome-headline {
    font-family: 'Inter', sans-serif;
    font-size: 30px;
    line-height: 36px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: #0f172a;
    margin: 0 0 8px;
}

.welcome-subtitle {
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 500;
    color: #7A767B;
    margin: 0;
}

/* Intent Cards */
.welcome-intents {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 48px;
}

.welcome-intent-card {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 16px;
    background: #fff;
    border: 2px solid transparent;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 200ms ease;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
    font-family: inherit;
    outline: none;
}

.welcome-intent-card:hover {
    border-color: rgba(124, 58, 237, 0.3);
}

.welcome-intent-card:active {
    transform: scale(0.95);
}

.welcome-intent-selected {
    border-color: #7C3AED;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
}

.welcome-intent-selected .welcome-intent-icon-box {
    background: rgba(124, 58, 237, 0.1);
}

.welcome-intent-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    min-width: 48px;
    background: rgba(124, 58, 237, 0.05);
    border-radius: 8px;
    margin-right: 16px;
    transition: background 200ms ease;
}

.welcome-intent-card:hover .welcome-intent-icon-box {
    background: rgba(124, 58, 237, 0.1);
}

.welcome-intent-icon-box .material-symbols-outlined {
    color: #7C3AED;
    font-size: 24px;
}

.welcome-intent-label {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
}

/* Footer */
.welcome-footer {
    text-align: center;
    padding: 0 24px 8px;
}

.welcome-login-link {
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #7A767B;
    cursor: pointer;
    transition: color 200ms ease;
    text-decoration: none;
}

.welcome-login-link:hover {
    color: #7C3AED;
}

.welcome-login-highlight {
    color: #7C3AED;
    font-weight: 700;
}

/* Decorative background blobs */
.welcome-bg-decor {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
}

.welcome-bg-blob {
    position: absolute;
    border-radius: 50%;
}

.welcome-bg-blob-1 {
    top: -10%;
    right: -10%;
    width: 400px;
    height: 400px;
    background: rgba(124, 58, 237, 0.05);
    filter: blur(100px);
}

.welcome-bg-blob-2 {
    bottom: -10%;
    left: -10%;
    width: 300px;
    height: 300px;
    background: rgba(79, 70, 229, 0.05);
    filter: blur(80px);
}

/* Dark mode */
.dark .welcome-logo-box {
    background: #1a1721;
    box-shadow: none;
    border: 1px solid #2a2533;
}

.dark .welcome-headline {
    color: #e9eaee;
}

.dark .welcome-subtitle {
    color: #9aa0a6;
}

.dark .welcome-intent-card {
    background: #1a1721;
    box-shadow: none;
    border-color: #2a2533;
}

.dark .welcome-intent-card:hover {
    border-color: rgba(124, 58, 237, 0.4);
}

.dark .welcome-intent-selected {
    border-color: #7C3AED;
    background: rgba(124, 58, 237, 0.08);
}

.dark .welcome-intent-label {
    color: #e9eaee;
}

.dark .welcome-login-link {
    color: #9aa0a6;
}

.dark .welcome-bg-blob-1 {
    background: rgba(124, 58, 237, 0.03);
}

.dark .welcome-bg-blob-2 {
    background: rgba(79, 70, 229, 0.03);
}
</style>
