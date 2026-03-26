<template>
    <f7-sheet swipe-to-close swipe-handler=".swipe-handler" style="height:auto"
              :opened="show" @sheet:open="onSheetOpen" @sheet:closed="onSheetClosed">
        <f7-toolbar class="toolbar-with-swipe-handler">
            <div class="swipe-handler"></div>
            <div class="left">
                <f7-link icon-f7="xmark" :class="{ 'disabled': loading || recognizing }"
                         @click="cancel"></f7-link>
            </div>
            <div class="right">
                <f7-button round fill icon-f7="checkmark_alt"
                           :class="{ 'disabled': loading || recognizing || !imageFile }"
                           @click="confirm"></f7-button>
            </div>
        </f7-toolbar>
        <f7-page-content class="no-margin-vertical no-padding-vertical">
            <div class="recognition-provider-toggle padding-horizontal padding-vertical-half">
                <f7-segmented strong>
                    <f7-button :active="selectedProvider === RecognitionProviderType.OCR" @click="selectProvider(RecognitionProviderType.OCR)">
                        {{ tt('On-device OCR') }}
                    </f7-button>
                    <f7-button :active="selectedProvider === RecognitionProviderType.LLM" @click="selectProvider(RecognitionProviderType.LLM)">
                        {{ tt('AI Recognition') }}
                    </f7-button>
                </f7-segmented>
                <div class="display-flex align-items-center margin-top-half" v-if="selectedProvider === RecognitionProviderType.OCR">
                    <small class="margin-right-half">{{ tt('Receipt language') }}:</small>
                    <select v-model="selectedLanguage" class="ocr-language-select">
                        <option v-for="lang in ocrLanguages" :key="lang.code" :value="lang.code">
                            {{ lang.displayName }}
                        </option>
                    </select>
                </div>
            </div>
            <div class="image-container display-flex justify-content-center" @click="showOpenImage">
                <img :src="imageSrc" v-if="imageSrc && !recognizing" />
                <div v-if="imageSrc && recognizing" class="image-container-background display-flex flex-direction-column justify-content-center align-items-center padding-horizontal">
                    <f7-progressbar :progress="recognitionProgress * 100" />
                    <span class="margin-top-half">{{ recognitionMessage }}</span>
                    <f7-button class="margin-top" small outline color="red" @click="cancelRecognize">
                        {{ tt('Cancel Recognition') }}
                    </f7-button>
                </div>
                <div class="image-container-background display-flex justify-content-center align-items-center text-align-center padding-horizontal" v-if="!imageSrc">
                    <div class="display-inline-flex flex-direction-column" v-if="!loading">
                        <span>{{ tt('Click here to select a receipt or transaction image') }}</span>
                        <small class="margin-top-half" v-if="selectedProvider === 'llm'">{{ tt('Uploaded image and personal data will be sent to the large language model, please be aware of potential privacy risks.') }}</small>
                        <small class="margin-top-half" v-else>{{ tt('Recognition runs entirely on your device. Your image is never uploaded.') }}</small>
                    </div>
                    <span v-else-if="loading">{{ tt('Loading image...') }}</span>
                </div>
            </div>
        </f7-page-content>

        <input ref="imageInput" type="file" style="display: none" :accept="`${SUPPORTED_IMAGE_EXTENSIONS};capture=camera`" @change="openImage($event)" />
    </f7-sheet>
</template>


<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';

import { useI18n } from '@/locales/helpers.ts';
import { useI18nUIComponents, closeAllDialog } from '@/lib/ui/mobile.ts';

import { useTransactionsStore } from '@/stores/transaction.ts';

import { KnownFileType } from '@/core/file.ts';
import { SUPPORTED_IMAGE_EXTENSIONS } from '@/consts/file.ts';

import type { RecognizedReceiptImageResponse } from '@/models/large_language_model.ts';
import { RecognitionProviderType } from '@/lib/recognition/types.ts';
import type { RecognitionProgress } from '@/lib/recognition/types.ts';

import { generateRandomUUID } from '@/lib/misc.ts';
import { compressJpgImage } from '@/lib/ui/common.ts';
import { getSessionCurrentLanguageKey } from '@/lib/settings.ts';
import { getOcrLanguageOptions, getDefaultOcrLanguage } from '@/lib/recognition/language-map.ts';
import logger from '@/lib/logger.ts';

const ocrLanguages = getOcrLanguageOptions();

defineProps<{
    show: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'recognition:change', value: RecognizedReceiptImageResponse): void;
}>();

const { tt } = useI18n();
const { showCancelableLoading, showToast } = useI18nUIComponents();

const transactionsStore = useTransactionsStore();

const imageInput = useTemplateRef<HTMLInputElement>('imageInput');

const loading = ref<boolean>(false);
const recognizing = ref<boolean>(false);
const cancelRecognizingUuid = ref<string | undefined>(undefined);
const imageFile = ref<File | null>(null);
const imageSrc = ref<string | undefined>(undefined);
const selectedProvider = ref<RecognitionProviderType>(RecognitionProviderType.OCR);
const selectedLanguage = ref<string>(getDefaultOcrLanguage(getSessionCurrentLanguageKey() || 'en'));
const recognitionProgress = ref<number>(0);
const recognitionMessage = ref<string>('');

function selectProvider(provider: RecognitionProviderType): void {
    selectedProvider.value = provider;
}

function loadImage(image: Blob): void {
    loading.value = true;
    imageFile.value = null;
    imageSrc.value = undefined;

    compressJpgImage(image, 1280, 1280, 0.8).then(blob => {
        imageFile.value = KnownFileType.JPG.createFileFromBlob(blob, "image");
        imageSrc.value = URL.createObjectURL(blob);
        loading.value = false;
    }).catch(error => {
        imageFile.value = null;
        imageSrc.value = undefined;
        loading.value = false;
        logger.error('failed to compress image', error);
        showToast('Unable to load image');
    });
}

function showOpenImage(): void {
    if (loading.value || recognizing.value) {
        return;
    }

    imageInput.value?.click();
}

function openImage(event: Event): void {
    if (!event || !event.target) {
        return;
    }

    const el = event.target as HTMLInputElement;

    if (!el.files || !el.files.length || !el.files[0]) {
        return;
    }

    const image = el.files[0] as File;

    el.value = '';

    loadImage(image);
}

function onProgressUpdate(progress: RecognitionProgress): void {
    recognitionProgress.value = progress.progress;

    if (progress.message) {
        recognitionMessage.value = tt(progress.message);
    } else if (progress.phase === 'loading') {
        recognitionMessage.value = tt('Loading OCR engine...');
    } else if (progress.phase === 'recognizing') {
        recognitionMessage.value = tt('Recognizing...');
    } else if (progress.phase === 'parsing') {
        recognitionMessage.value = tt('Extracting receipt data...');
    }
}

function confirm(): void {
    if (loading.value || recognizing.value || !imageFile.value) {
        return;
    }

    cancelRecognizingUuid.value = generateRandomUUID();
    recognizing.value = true;
    recognitionProgress.value = 0;
    recognitionMessage.value = '';

    const isLlm = selectedProvider.value === RecognitionProviderType.LLM;

    // For LLM, use the original modal loading dialog (indeterminate progress)
    if (isLlm) {
        showCancelableLoading('Recognizing', 'AI can make mistakes. Check important info.', 'Cancel Recognition', cancelRecognize);
    }

    const language = selectedProvider.value === RecognitionProviderType.OCR
        ? selectedLanguage.value
        : getSessionCurrentLanguageKey() || 'en';

    transactionsStore.recognizeReceiptImage({
        imageFile: imageFile.value,
        cancelableUuid: cancelRecognizingUuid.value,
        providerType: selectedProvider.value,
        language,
        onProgress: isLlm ? undefined : onProgressUpdate,
    }).then(response => {
        recognizing.value = false;
        cancelRecognizingUuid.value = undefined;

        if (isLlm) {
            closeAllDialog();
        }

        emit('update:show', false);
        emit('recognition:change', response);
    }).catch(error => {
        if (error.canceled) {
            return;
        }

        recognizing.value = false;
        cancelRecognizingUuid.value = undefined;

        if (isLlm) {
            closeAllDialog();
        }

        if (!error.processed) {
            showToast(error.message || error);
        }
    });
}

function cancelRecognize(): void {
    if (!cancelRecognizingUuid.value) {
        return;
    }

    transactionsStore.cancelRecognizeReceiptImage(cancelRecognizingUuid.value);
    recognizing.value = false;
    cancelRecognizingUuid.value = undefined;
    closeAllDialog();

    showToast('User Canceled');
}

function cancel(): void {
    close();
}

function close(): void {
    emit('update:show', false);
    loading.value = false;
    recognizing.value = false;
    cancelRecognizingUuid.value = undefined;
    imageFile.value = null;
    imageSrc.value = undefined;
    recognitionProgress.value = 0;
    recognitionMessage.value = '';
}

function onSheetOpen(): void {
    loading.value = false;
    recognizing.value = false;
    cancelRecognizingUuid.value = undefined;
    imageFile.value = null;
    imageSrc.value = undefined;
    recognitionProgress.value = 0;
    recognitionMessage.value = '';
}

function onSheetClosed(): void {
    close();
}

defineExpose({
    loadImage
});
</script>

<style>
.image-container {
    --ebk-ai-image-recognition-height: 310px;
    height: var(--ebk-ai-image-recognition-height);
    border: 1px solid var(--f7-page-master-border-color);

    > img {
        height: var(--ebk-ai-image-recognition-height);
    }

    @media (min-height: 630px) {
        --ebk-ai-image-recognition-height: 525px;
    }
}

.image-container-background {
    width: 100%;
    height: 100%;

    > div {
        font-size: var(--f7-input-font-size);
    }
}

.recognition-provider-toggle {
    border-bottom: 1px solid var(--f7-page-master-border-color);
}

.ocr-language-select {
    background: transparent;
    border: 1px solid var(--f7-page-master-border-color);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: var(--f7-input-font-size);
    color: inherit;
}
</style>
