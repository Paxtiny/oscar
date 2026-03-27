<template>
    <div class="reg-step">
        <!-- ===== PRE-CREATION VIEW ===== -->
        <template v-if="phase === 'form'">
            <!-- Header -->
            <header class="reg-header">
                <button class="reg-back-btn" @click="$emit('back')">
                    <span class="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 class="reg-header-title">{{ tt('Create Account') }}</h1>
                <div style="width: 40px"></div>
            </header>

            <main class="reg-main">
                <!-- Heading -->
                <section class="reg-heading">
                    <h2 class="reg-headline">{{ tt('Keep your data safe') }}</h2>
                    <p class="reg-subtext">{{ tt('Create a free account to sync across devices and protect your expenses.') }}</p>
                </section>

                <!-- Checklist Card -->
                <div class="reg-checklist-card">
                    <h3 class="reg-checklist-title">{{ tt('Saved Progress') }}</h3>
                    <div class="reg-checklist-items">
                        <div v-if="store.localTransactionCount > 0" class="reg-checklist-item">
                            <span class="material-symbols-outlined reg-check-icon" style="font-variation-settings: 'FILL' 1">check_circle</span>
                            <span>{{ tt('{count} tracked expenses', { count: store.localTransactionCount }) }}</span>
                        </div>
                        <div v-if="store.localGoalCount > 0" class="reg-checklist-item">
                            <span class="material-symbols-outlined reg-check-icon" style="font-variation-settings: 'FILL' 1">check_circle</span>
                            <span>{{ goalName }}</span>
                        </div>
                        <div v-if="store.totalLocalSpending > 0" class="reg-checklist-item">
                            <span class="material-symbols-outlined reg-check-icon" style="font-variation-settings: 'FILL' 1">check_circle</span>
                            <span>{{ tt('Your spending insights') }}</span>
                        </div>
                    </div>
                </div>

                <!-- NO EMAIL badge -->
                <div class="reg-badge-row">
                    <span class="reg-no-email-badge">{{ tt('NO EMAIL REQUIRED') }}</span>
                </div>

                <!-- Create Anonymous Account -->
                <button class="reg-anon-btn" @click="handleCreate" :disabled="creating">
                    <span class="material-symbols-outlined">fingerprint</span>
                    {{ creating ? tt('Creating...') : tt('Create anonymous account') }}
                </button>
                <p class="reg-anon-hint">{{ tt('This generates a unique 16-digit account number that acts as your master key. No personal data required.') }}</p>

                <!-- Consent (inline text, not checkboxes) -->
                <p class="reg-consent-text">
                    {{ tt('By creating an account, you agree to the') }}
                    <a :href="tosUrl" target="_blank" class="reg-consent-link">{{ tt('Terms of Service') }}</a>
                    {{ tt('and') }}
                    <a :href="privacyUrl" target="_blank" class="reg-consent-link">{{ tt('Privacy Policy') }}</a>.
                </p>

                <!-- Error -->
                <p v-if="errorMessage" class="reg-error">{{ errorMessage }}</p>

                <!-- Existing account -->
                <div class="reg-existing">
                    <p class="reg-existing-text">{{ tt('Already have a nicodAImus account?') }}</p>
                    <button class="reg-existing-link" @click="$emit('login')">{{ tt('Log in') }}</button>
                </div>

                <!-- Privacy Card -->
                <div class="reg-privacy-card">
                    <div class="reg-privacy-icon-box">
                        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1">shield</span>
                    </div>
                    <div>
                        <h4 class="reg-privacy-title">{{ tt('Zero-knowledge encryption') }}</h4>
                        <p class="reg-privacy-desc">{{ tt('After setup, only you can read your data. We cannot see it even if we wanted to. Your privacy is hard-coded.') }}</p>
                    </div>
                </div>
            </main>

            <!-- Sticky footer -->
            <div class="reg-sticky-footer">
                <button class="reg-skip-btn" @click="$emit('skip')">
                    {{ tt('Skip for now - data stays on device') }}
                </button>
            </div>

            <!-- Decorative background -->
            <div class="reg-bg-decor" aria-hidden="true">
                <div class="reg-bg-blob-1"></div>
                <div class="reg-bg-blob-2"></div>
            </div>
        </template>

        <!-- ===== ACCOUNT NUMBER REVEAL VIEW ===== -->
        <template v-if="phase === 'reveal'">
            <main class="reg-main reg-reveal-main">
                <!-- Success icon -->
                <div class="reg-success-icon">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1; font-size: 48px; color: #10b981">check_circle</span>
                </div>

                <h2 class="reg-headline" style="text-align: center">{{ tt('Account created') }}</h2>

                <!-- Account number card -->
                <div class="reg-account-card">
                    <div class="reg-account-label">{{ tt('Your account number') }}</div>
                    <div class="reg-account-number">{{ formattedAccount }}</div>
                    <button class="reg-copy-btn" @click="copyToClipboard">
                        <span class="material-symbols-outlined" style="font-size: 16px">content_copy</span>
                        {{ copied ? tt('Copied') : tt('Copy to clipboard') }}
                    </button>
                </div>

                <!-- Warning -->
                <div class="reg-warning">
                    <div class="reg-warning-header">
                        <span class="material-symbols-outlined" style="font-size: 18px; color: #f59e0b; font-variation-settings: 'FILL' 1">warning</span>
                        <span class="reg-warning-title">{{ tt('SAVE THIS NUMBER') }}</span>
                    </div>
                    <p class="reg-warning-text">{{ tt('This is your login. There is no password recovery. If you lose this number, you lose access to your data.') }}</p>
                </div>

                <!-- Confirm button -->
                <button class="reg-confirm-btn" @click="handleConfirmSaved" :disabled="confirming">
                    {{ confirming ? tt('Setting up...') : tt("I've saved my number") }}
                </button>

                <p v-if="errorMessage" class="reg-error">{{ errorMessage }}</p>
            </main>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Router } from 'framework7/types';
import { useI18n } from '@/locales/helpers.ts';
import { useOnboardingStore } from '@/stores/onboarding.ts';
import { useRootStore } from '@/stores/index.ts';
import { markOnboardingCompleted } from '@/router/onboarding-guard.ts';
import { useI18nUIComponents } from '@/lib/ui/mobile.ts';
import { formatAccount16 } from '@/lib/account-number.ts';
import logger from '@/lib/logger.ts';

const { tt } = useI18n();
const { showToast } = useI18nUIComponents();
const store = useOnboardingStore();
const rootStore = useRootStore();

const props = defineProps<{
    f7router: Router.Router;
}>();

const emit = defineEmits<{
    (e: 'next'): void;
    (e: 'skip'): void;
    (e: 'back'): void;
    (e: 'login'): void;
}>();

// Phase: 'form' -> 'reveal'
const phase = ref<'form' | 'reveal'>('form');

// Form state
const creating = ref(false);
const errorMessage = ref('');

// Reveal state
const createdAccountNumber = ref('');
const copied = ref(false);
const confirming = ref(false);

// URLs
const tosUrl = 'https://nicodaimus.com/terms.html';
const privacyUrl = 'https://nicodaimus.com/datenschutz.html';

const formattedAccount = computed(() => formatAccount16(createdAccountNumber.value));

const goalName = computed(() => {
    if (store.localGoals.length > 0) return store.localGoals[0]!.name + ' ' + tt('goal');
    return '';
});

// --- ALTCHA Solver (Web Crypto SHA-256 brute-force) ---

function getApiBase(): string {
    const host = window.location.hostname || '';
    if (host === 'nicodaimus.com' || host === 'www.nicodaimus.com') return 'https://chat.nicodaimus.com';
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:18080';
    return '';
}

// Yield to main thread using MessageChannel (not throttled in background tabs)
function yieldToMain(): Promise<void> {
    return new Promise((resolve) => {
        if (typeof MessageChannel !== 'undefined') {
            const ch = new MessageChannel();
            ch.port1.onmessage = () => { resolve(); };
            ch.port2.postMessage(null);
        } else {
            setTimeout(resolve, 0);
        }
    });
}

interface AltchaChallenge {
    algorithm: string;
    challenge: string;
    salt: string;
    signature: string;
    maxnumber?: number;
}

async function solveSHA256(ch: AltchaChallenge): Promise<string> {
    const encoder = new TextEncoder();
    const max = ch.maxnumber || 500000;

    for (let n = 0; n <= max; n++) {
        const data = encoder.encode(ch.salt + String(n));
        const buf = await crypto.subtle.digest('SHA-256', data);
        const arr = new Uint8Array(buf);
        let hex = '';
        for (let i = 0; i < arr.length; i++) {
            hex += (arr[i]! < 16 ? '0' : '') + arr[i]!.toString(16);
        }
        if (hex === ch.challenge) {
            return btoa(JSON.stringify({
                algorithm: ch.algorithm,
                challenge: ch.challenge,
                number: n,
                salt: ch.salt,
                signature: ch.signature
            }));
        }
        if (n > 0 && n % 5000 === 0) {
            await yieldToMain();
        }
    }
    throw new Error('Could not solve ALTCHA challenge');
}

async function solveAltcha(): Promise<string> {
    const apiBase = getApiBase();
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, 10000);

    try {
        const res = await fetch(apiBase + '/account-api/challenge', {
            signal: controller.signal
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error('Challenge fetch failed: ' + res.status);
        const ch: AltchaChallenge = await res.json();
        return await solveSHA256(ch);
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

// --- Account Creation ---

async function handleCreate(): Promise<void> {
    if (creating.value) return;

    creating.value = true;
    errorMessage.value = '';

    try {
        // Solve ALTCHA proof-of-work
        const altchaPayload = await solveAltcha();

        // Call nicodAImus account-api/create
        const apiBase = getApiBase();
        const res = await fetch(apiBase + '/account-api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tosAccepted: true,
                privacyAccepted: true,
                altchaPayload
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success || !data.account) {
            const msg = data.errorMessage || data.message || 'Account creation failed';
            throw new Error(msg);
        }

        createdAccountNumber.value = data.account;
        phase.value = 'reveal';
        logger.info('Account created successfully');
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Account creation failed. Please try again.';
        errorMessage.value = msg;
        logger.error('Account creation failed: ' + msg);
    } finally {
        creating.value = false;
    }
}

// --- Post-creation: login, vault setup, migration ---

async function handleConfirmSaved(): Promise<void> {
    confirming.value = true;
    errorMessage.value = '';

    try {
        // Log in with the new account number
        await rootStore.authorizeByAccount({ accountNumber: createdAccountNumber.value });

        // Navigate to vault setup - after vault setup, proceed to migration and next step
        props.f7router.navigate('/vault/setup', {
            props: {
                onSuccess: async () => {
                    try {
                        await store.migrateToServer();
                    } catch {
                        showToast(tt('Account created, but we could not save your local data. You can re-enter it manually.'));
                    }

                    markOnboardingCompleted();
                    emit('next');
                }
            }
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Login failed. Please try again.';
        errorMessage.value = msg;
        logger.error('Post-creation login failed: ' + msg);
    } finally {
        confirming.value = false;
    }
}

function copyToClipboard(): void {
    navigator.clipboard.writeText(createdAccountNumber.value).then(() => {
        copied.value = true;
        setTimeout(() => { copied.value = false; }, 2000);
    }).catch(() => {
        showToast(tt('Could not copy to clipboard'));
    });
}
</script>

<style scoped>
.reg-step {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    position: relative;
}

/* Header */
.reg-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 56px;
    position: sticky;
    top: 0;
    z-index: 20;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid #f1f5f9;
}

.dark .reg-header {
    background: rgba(15, 13, 19, 0.8);
    border-color: #2a2533;
}

.reg-back-btn {
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

.reg-back-btn:active { transform: scale(0.95); }

.reg-header-title {
    font-size: 18px;
    font-weight: 700;
    color: #6d28d9;
    margin: 0;
}

/* Main */
.reg-main {
    padding: 24px 24px 160px;
    max-width: 448px;
    margin: 0 auto;
    width: 100%;
}

.reg-reveal-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 48px;
}

/* Heading */
.reg-heading {
    margin-bottom: 32px;
}

.reg-headline {
    font-family: 'Inter', sans-serif;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.025em;
    color: #0f172a;
    margin: 0 0 8px;
}

.reg-subtext {
    font-size: 15px;
    color: #64748b;
    line-height: 1.5;
    margin: 0;
}

/* Checklist Card */
.reg-checklist-card {
    background: #fff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    border: 1px solid #f1f5f9;
    margin-bottom: 32px;
}

.dark .reg-checklist-card {
    background: #1a1721;
    border-color: #2a2533;
    box-shadow: none;
}

.reg-checklist-title {
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 16px;
}

.reg-checklist-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.reg-checklist-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 500;
    color: #475569;
}

.reg-check-icon {
    color: #7C3AED;
    font-size: 24px;
}

/* Badge */
.reg-badge-row {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
}

.reg-no-email-badge {
    background: #faf5ff;
    color: #6d28d9;
    padding: 6px 16px;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    border: 1px solid #e9d5ff;
}

/* Anonymous Account Button */
.reg-anon-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px;
    background: #fff;
    border: 2px solid #7C3AED;
    color: #6d28d9;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 200ms ease;
    -webkit-tap-highlight-color: transparent;
    margin-bottom: 12px;
}

.reg-anon-btn:hover { background: #faf5ff; }
.reg-anon-btn:active { transform: scale(0.98); }
.reg-anon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.reg-anon-hint {
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    padding: 0 16px;
    margin: 0 0 24px;
}

/* Consent */
.reg-consent-text {
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
    line-height: 1.5;
    margin: 0 0 32px;
}

.reg-consent-link {
    color: #7C3AED;
    font-weight: 600;
    text-decoration: none;
}

/* Error */
.reg-error {
    text-align: center;
    color: #ef4444;
    font-size: 14px;
    margin: 0 0 16px;
}

/* Existing account */
.reg-existing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
}

.reg-existing-text {
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
    margin: 0;
}

.reg-existing-link {
    background: none;
    border: none;
    color: #7C3AED;
    font-size: 14px;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 4px;
    cursor: pointer;
    font-family: inherit;
}

/* Privacy Card */
.reg-privacy-card {
    display: flex;
    gap: 16px;
    background: rgba(124, 58, 237, 0.04);
    border: 1px solid rgba(124, 58, 237, 0.12);
    padding: 20px;
    border-radius: 12px;
}

.reg-privacy-icon-box {
    background: #fff;
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    height: fit-content;
}

.reg-privacy-icon-box .material-symbols-outlined {
    color: #7C3AED;
    font-size: 24px;
}

.reg-privacy-title {
    font-size: 14px;
    font-weight: 700;
    color: #3b0764;
    margin: 0 0 4px;
}

.reg-privacy-desc {
    font-size: 12px;
    color: rgba(59, 7, 100, 0.7);
    line-height: 1.5;
    margin: 0;
}

/* Sticky Footer */
.reg-sticky-footer {
    position: fixed;
    bottom: 72px;
    left: 0;
    right: 0;
    padding: 12px 24px;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 10;
    text-align: center;
}

.dark .reg-sticky-footer {
    background: rgba(15, 13, 19, 0.8);
}

.reg-skip-btn {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 16px;
    font-family: inherit;
}

.reg-skip-btn:hover { color: #64748b; }

/* Background decoration */
.reg-bg-decor {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 256px;
    z-index: -1;
    opacity: 0.3;
    pointer-events: none;
    overflow: hidden;
}

.reg-bg-blob-1 {
    position: absolute;
    top: -128px;
    right: -128px;
    width: 384px;
    height: 384px;
    border-radius: 50%;
    background: #c4b5fd;
    filter: blur(60px);
}

.reg-bg-blob-2 {
    position: absolute;
    top: 40px;
    left: -80px;
    width: 288px;
    height: 288px;
    border-radius: 50%;
    background: #c7d2fe;
    filter: blur(60px);
}

/* ===== Reveal Phase ===== */
.reg-success-icon {
    margin-bottom: 24px;
}

.reg-account-card {
    background: #fff;
    border: 2px solid #7C3AED;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    width: 100%;
    margin-bottom: 24px;
}

.dark .reg-account-card {
    background: #1a1721;
}

.reg-account-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin-bottom: 8px;
}

.reg-account-number {
    font-size: 28px;
    font-weight: 700;
    font-family: 'Courier New', Courier, monospace;
    letter-spacing: 0.1em;
    color: #0f172a;
    word-break: break-all;
    margin-bottom: 16px;
}

.dark .reg-account-number { color: #e9eaee; }

.reg-copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: 1px solid #7C3AED;
    border-radius: 8px;
    background: transparent;
    color: #7C3AED;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
}

.reg-copy-btn:active { transform: scale(0.95); }

/* Warning */
.reg-warning {
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 12px;
    padding: 16px;
    width: 100%;
    margin-bottom: 32px;
}

.reg-warning-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.reg-warning-title {
    font-size: 14px;
    font-weight: 700;
    color: #f59e0b;
}

.reg-warning-text {
    font-size: 13px;
    color: #0f172a;
    line-height: 1.5;
    margin: 0;
}

.dark .reg-warning-text { color: #e9eaee; }

.reg-confirm-btn {
    width: 100%;
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

.reg-confirm-btn:active { transform: scale(0.95); }
.reg-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Dark mode */
.dark .reg-headline { color: #e9eaee; }
.dark .reg-subtext { color: #9aa0a6; }
.dark .reg-checklist-item { color: #e9eaee; }
.dark .reg-no-email-badge { background: rgba(124, 58, 237, 0.15); border-color: rgba(124, 58, 237, 0.3); }
.dark .reg-anon-btn { background: #1a1721; }
.dark .reg-privacy-card { background: rgba(124, 58, 237, 0.06); border-color: rgba(124, 58, 237, 0.15); }
.dark .reg-privacy-title { color: #c4b5fd; }
.dark .reg-privacy-desc { color: #9aa0a6; }
.dark .reg-privacy-icon-box { background: #1a1721; }
</style>
