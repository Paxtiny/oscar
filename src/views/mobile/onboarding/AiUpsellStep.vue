<template>
    <div class="upsell-step">
        <!-- Header -->
        <header class="upsell-header">
            <button class="upsell-back-btn" @click="$emit('back')">
                <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 class="upsell-header-title">{{ tt('Receipt Scan Results') }}</h1>
            <div style="width: 40px"></div>
        </header>

        <main class="upsell-main">
            <!-- Scan CTA (if user has free scans and hasn't scanned yet) -->
            <section v-if="canScanAi && !hasAiResult" class="upsell-scan-cta">
                <button class="upsell-scan-btn" @click="openCamera" :disabled="scanning">
                    <span class="material-symbols-outlined">photo_camera</span>
                    {{ scanning ? tt('Scanning...') : tt('Try a free AI scan') }}
                </button>
                <span class="upsell-scans-remaining">
                    {{ tt('{count} free scans remaining', { count: store.freeAiScansRemaining }) }}
                </span>
            </section>

            <!-- Rate limit message -->
            <p v-if="rateLimited" class="upsell-rate-limit">{{ tt("You've used all your free AI scans.") }}</p>

            <!-- Scan error -->
            <p v-if="scanError && !rateLimited" class="upsell-error">{{ scanError }}</p>

            <!-- Comparison Card (Bento Grid) -->
            <div class="upsell-comparison">
                <div class="upsell-compare-grid">
                    <!-- Free Side -->
                    <div class="upsell-col upsell-col-free">
                        <div class="upsell-col-header upsell-col-header-free">
                            <span>{{ tt('FREE - TESSERACT') }}</span>
                        </div>
                        <div class="upsell-col-body">
                            <div class="upsell-field">
                                <p class="upsell-field-label">{{ tt('Amount') }}</p>
                                <div class="upsell-field-value">
                                    <span :class="ocrAmount ? '' : 'upsell-field-warn'">{{ ocrAmount || 'EUR ?.??' }}</span>
                                    <span v-if="!ocrAmount" class="material-symbols-outlined upsell-icon-warn">warning</span>
                                </div>
                            </div>
                            <div class="upsell-field">
                                <p class="upsell-field-label">{{ tt('Store') }}</p>
                                <p class="upsell-field-value">-</p>
                            </div>
                            <div class="upsell-field">
                                <p class="upsell-field-label">{{ tt('Date') }}</p>
                                <p class="upsell-field-value">-</p>
                            </div>
                            <div class="upsell-field">
                                <p class="upsell-field-label">{{ tt('Items') }}</p>
                                <div class="upsell-field-value">
                                    <span class="upsell-field-warn">{{ tt('Not available') }}</span>
                                    <span class="material-symbols-outlined upsell-icon-warn">error</span>
                                </div>
                            </div>
                            <div class="upsell-field">
                                <p class="upsell-field-label">{{ tt('Category') }}</p>
                                <span class="upsell-badge-warn">{{ tt('Not detected') }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- AI Side -->
                    <div class="upsell-col upsell-col-ai">
                        <div class="upsell-col-header upsell-col-header-ai">
                            <span>{{ tt('AI - ALFRED') }}</span>
                            <span class="material-symbols-outlined upsell-sparkle" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
                        </div>
                        <div class="upsell-col-body">
                            <div class="upsell-field">
                                <p class="upsell-field-label upsell-label-ai">{{ tt('Amount') }}</p>
                                <div class="upsell-field-value">
                                    <span class="upsell-field-success">{{ aiResultData.amount || 'EUR 47.89' }}</span>
                                    <span class="material-symbols-outlined upsell-icon-success" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                </div>
                            </div>
                            <div class="upsell-field">
                                <p class="upsell-field-label upsell-label-ai">{{ tt('Store') }}</p>
                                <div class="upsell-field-value">
                                    <span>{{ aiResultData.vendor || 'REWE Markt GmbH' }}</span>
                                    <span class="material-symbols-outlined upsell-icon-success" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                </div>
                            </div>
                            <div class="upsell-field">
                                <p class="upsell-field-label upsell-label-ai">{{ tt('Date') }}</p>
                                <div class="upsell-field-value">
                                    <span>{{ aiResultData.date || 'March 25, 2026' }}</span>
                                    <span class="material-symbols-outlined upsell-icon-success" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                </div>
                            </div>
                            <div class="upsell-field">
                                <p class="upsell-field-label upsell-label-ai">{{ tt('Items') }}</p>
                                <div class="upsell-field-value">
                                    <span class="upsell-field-success">{{ aiResultData.items ? tt('{n} items detected', { n: aiResultData.items }) : tt('3 items detected') }}</span>
                                    <span class="material-symbols-outlined upsell-icon-success" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                </div>
                            </div>
                            <div class="upsell-field">
                                <p class="upsell-field-label upsell-label-ai">{{ tt('Category') }}</p>
                                <div class="upsell-field-value">
                                    <span class="upsell-badge-ai">{{ aiResultData.category || tt('Groceries') }}</span>
                                    <span class="material-symbols-outlined upsell-icon-success" style="font-variation-settings: 'FILL' 1">check_circle</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Conversion Card -->
            <div class="upsell-conversion">
                <div class="upsell-conversion-badge">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1; font-size: 14px">bolt</span>
                    {{ tt('ALFRED TIER') }}
                </div>
                <h2 class="upsell-conversion-title">{{ tt('Unlock AI scanning with alfred') }}</h2>
                <p class="upsell-conversion-price">{{ tt('EUR 6.99/month - Smart categorization, invoice extraction, email forwarding') }}</p>
                <div class="upsell-conversion-actions">
                    <button class="upsell-conversion-cta" @click="$emit('done')">
                        {{ tt('Get Started') }}
                        <span class="material-symbols-outlined" style="font-size: 16px">arrow_forward</span>
                    </button>
                    <button class="upsell-conversion-skip" @click="$emit('done')">{{ tt('Continue with basic scan') }}</button>
                </div>
            </div>

            <!-- Footer -->
            <div class="upsell-footer-text">
                <p class="upsell-later">{{ tt('You can always upgrade later') }}</p>
                <div class="upsell-privacy-line">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1; font-size: 14px">enhanced_encryption</span>
                    <span>{{ tt('Only you can read your data') }}</span>
                </div>
            </div>
        </main>

        <!-- Hidden file input for camera/gallery -->
        <input
            ref="imageInput"
            type="file"
            style="display: none"
            :accept="SUPPORTED_IMAGE_EXTENSIONS + ';capture=camera'"
            @change="onImageSelected"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, useTemplateRef } from 'vue';
import { useI18n } from '@/locales/helpers.ts';
import { useOnboardingStore } from '@/stores/onboarding.ts';
import { compressJpgImage } from '@/lib/ui/common.ts';
import { SUPPORTED_IMAGE_EXTENSIONS } from '@/consts/file.ts';
import { KnownFileType } from '@/core/file.ts';
import { getBasePath } from '@/lib/web.ts';
import { BASE_API_URL_PATH, DEFAULT_LLM_API_TIMEOUT } from '@/consts/api.ts';
import type { RecognizedReceiptImageResponse } from '@/models/large_language_model.ts';
import logger from '@/lib/logger.ts';

const { tt } = useI18n();
const store = useOnboardingStore();

defineEmits<{
    (e: 'done'): void;
    (e: 'back'): void;
}>();

const imageInput = useTemplateRef<HTMLInputElement>('imageInput');

const scanning = ref(false);
const hasAiResult = ref(false);
const rateLimited = ref(false);
const scanError = ref('');

const canScanAi = computed(() => store.freeAiScansRemaining > 0 && !rateLimited.value);

// Real AI results (populated after scan)
const aiResultData = reactive<{
    amount: string;
    vendor: string;
    date: string;
    items: string;
    category: string;
}>({
    amount: '',
    vendor: '',
    date: '',
    items: '',
    category: ''
});

// OCR amount from Screen 3 (if user scanned a receipt)
const ocrAmount = computed(() => {
    if (store.localTransactions.length > 0) {
        const last = store.localTransactions[store.localTransactions.length - 1];
        if (last) {
            return `EUR ${(last.sourceAmount / 100).toFixed(2)}`;
        }
    }
    return '';
});

function openCamera(): void {
    if (scanning.value) return;
    imageInput.value?.click();
}

async function onImageSelected(event: Event): Promise<void> {
    const el = event.target as HTMLInputElement;
    if (!el.files || !el.files.length || !el.files[0]) return;

    const rawImage = el.files[0] as File;
    el.value = '';

    // Decrement free scan counter first
    const allowed = await store.useAiScan();
    if (!allowed) {
        rateLimited.value = true;
        return;
    }

    scanning.value = true;
    scanError.value = '';

    try {
        // Compress image before upload
        const compressed = await compressJpgImage(rawImage, 1280, 1280, 0.8);
        const imageFile = KnownFileType.JPG.createFileFromBlob(compressed, 'image');

        // Call anonymous recognition endpoint
        const result = await anonymousRecognizeReceipt(imageFile);
        applyAiResult(result);
        hasAiResult.value = true;
    } catch (e: unknown) {
        if (e instanceof RateLimitError) {
            rateLimited.value = true;
        } else {
            const msg = e instanceof Error ? e.message : 'AI scan failed';
            scanError.value = msg;
            logger.error('Anonymous AI scan failed: ' + msg);
        }
    } finally {
        scanning.value = false;
    }
}

// --- Anonymous recognition API ---

class RateLimitError extends Error {
    constructor() {
        super('Rate limited');
        this.name = 'RateLimitError';
    }
}

async function anonymousRecognizeReceipt(imageFile: File): Promise<RecognizedReceiptImageResponse> {
    const url = getBasePath() + BASE_API_URL_PATH + '/onboarding/recognize_receipt.json';
    const locale = navigator.language?.split('-')[0] ?? 'en';

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('locale', locale);

    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, DEFAULT_LLM_API_TIMEOUT);

    try {
        const res = await fetch(url, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timer);

        if (res.status === 429) {
            throw new RateLimitError();
        }

        if (!res.ok) {
            throw new Error('AI scan failed (' + res.status + ')');
        }

        const json = await res.json();

        if (!json.success || !json.result) {
            throw new Error(json.errorMessage || 'AI scan returned no result');
        }

        return json.result as RecognizedReceiptImageResponse;
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

// --- Apply AI result to comparison card ---

function applyAiResult(result: RecognizedReceiptImageResponse): void {
    if (result.sourceAmount && result.sourceAmount > 0) {
        aiResultData.amount = `EUR ${(result.sourceAmount / 100).toFixed(2)}`;
    }

    if (result.comment) {
        aiResultData.vendor = result.comment.split('\n')[0] ?? '';
    }

    if (result.time && result.time > 0) {
        const d = new Date(result.time * 1000);
        aiResultData.date = d.toISOString().split('T')[0] ?? '';
    }

    if (result.sourceAmount && result.sourceAmount > 0) {
        aiResultData.items = 'detected';
    }

    if (result.categoryId) {
        aiResultData.category = result.categoryId;
    }
}
</script>

<style scoped>
.upsell-step {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

/* Header */
.upsell-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 56px;
    position: sticky;
    top: 0;
    z-index: 20;
    background: #f8f7fa;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dark .upsell-header {
    background: #0f0d13;
    border-color: #2a2533;
}

.upsell-back-btn {
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

.upsell-back-btn:active { transform: scale(0.95); }

.upsell-header-title {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
}

.dark .upsell-header-title { color: #e9eaee; }

/* Main */
.upsell-main {
    padding: 24px 16px 120px;
    max-width: 448px;
    margin: 0 auto;
    width: 100%;
}

/* Scan CTA */
.upsell-scan-cta {
    text-align: center;
    margin-bottom: 24px;
}

.upsell-scan-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px;
    background: #7C3AED;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
    -webkit-tap-highlight-color: transparent;
}

.upsell-scan-btn:active { transform: scale(0.98); }
.upsell-scan-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.upsell-scans-remaining {
    display: block;
    font-size: 12px;
    color: #94a3b8;
    margin-top: 8px;
}

.upsell-rate-limit {
    text-align: center;
    color: #f59e0b;
    font-size: 14px;
    margin: 0 0 16px;
}

.upsell-error {
    text-align: center;
    color: #ef4444;
    font-size: 14px;
    margin: 0 0 16px;
}

/* Comparison Card */
.upsell-comparison {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    border: 1px solid #f1f5f9;
    overflow: hidden;
    margin-bottom: 24px;
}

.dark .upsell-comparison {
    background: #1a1721;
    border-color: #2a2533;
}

.upsell-compare-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
}

.upsell-col-free {
    border-right: 1px solid #f1f5f9;
}

.dark .upsell-col-free {
    border-color: #2a2533;
}

/* Column Headers */
.upsell-col-header {
    padding: 8px 12px;
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1px solid;
}

.upsell-col-header-free {
    background: #f9fafb;
    color: #64748b;
    border-color: #e5e7eb;
}

.dark .upsell-col-header-free {
    background: #141118;
    color: #9aa0a6;
    border-color: #2a2533;
}

.upsell-col-header-ai {
    background: #ede9fe;
    color: #6d28d9;
    border-color: #c4b5fd;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

.dark .upsell-col-header-ai {
    background: rgba(124, 58, 237, 0.15);
    border-color: rgba(124, 58, 237, 0.3);
}

.upsell-sparkle {
    font-size: 12px;
    color: #7C3AED;
}

/* Column Body */
.upsell-col-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.upsell-field-label {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    margin: 0 0 2px;
}

.upsell-label-ai {
    color: #a78bfa;
}

.upsell-field-value {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    color: #0f172a;
}

.dark .upsell-field-value { color: #e9eaee; }

.upsell-field-warn {
    color: #f59e0b;
    font-style: italic;
}

.upsell-icon-warn {
    font-size: 14px;
    color: #f59e0b;
}

.upsell-field-success {
    color: #10b981;
    font-weight: 600;
}

.upsell-icon-success {
    font-size: 14px;
    color: #10b981;
}

.upsell-badge-warn {
    display: inline-block;
    font-size: 12px;
    font-weight: 500;
    color: #f59e0b;
    background: #fffbeb;
    padding: 2px 8px;
    border-radius: 4px;
}

.upsell-badge-ai {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    background: #7C3AED;
    padding: 2px 8px;
    border-radius: 4px;
}

/* Conversion Card */
.upsell-conversion {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(124, 58, 237, 0.12);
    padding: 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
    margin-bottom: 24px;
}

.dark .upsell-conversion {
    background: #1a1721;
    border-color: rgba(124, 58, 237, 0.2);
}

.upsell-conversion-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ede9fe;
    color: #7C3AED;
    padding: 4px 12px;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 16px;
}

.upsell-conversion-title {
    font-family: 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.3;
    margin: 0 0 12px;
}

.dark .upsell-conversion-title { color: #e9eaee; }

.upsell-conversion-price {
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
    margin: 0 0 16px;
    padding: 0 8px;
}

.upsell-conversion-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.upsell-conversion-cta {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    background: #7C3AED;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
}

.upsell-conversion-cta:active { transform: scale(0.98); }

.upsell-conversion-skip {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 8px;
    font-family: inherit;
}

.upsell-conversion-skip:hover { color: #64748b; }

/* Footer */
.upsell-footer-text {
    text-align: center;
    padding: 16px 0;
}

.upsell-later {
    font-size: 12px;
    color: #94a3b8;
    font-style: italic;
    margin: 0 0 24px;
}

.upsell-privacy-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #64748b;
    opacity: 0.6;
}

.upsell-privacy-line span:last-child {
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
</style>
