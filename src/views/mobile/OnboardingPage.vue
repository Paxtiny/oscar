<template>
    <f7-page no-navbar no-swipeback class="onboarding-page">
        <swiper-container
            ref="swiperEl"
            :pagination="false"
            :allow-touch-move="false"
            :speed="300"
            class="onboarding-swiper"
        >
            <swiper-slide>
                <WelcomeStep @next="onWelcomeNext" @login="onLogin" />
            </swiper-slide>
            <swiper-slide>
                <GoalSetupStep
                    :intent="store.onboardingIntent"
                    @next="goNext"
                    @back="goBack"
                    @skip="goNext"
                />
            </swiper-slide>
            <swiper-slide>
                <FirstExpenseStep @next="goNext" @back="goBack" @skip="goNext" />
            </swiper-slide>
            <swiper-slide>
                <MiniDashboardStep @next="goNext" @add-more="slideTo(2)" />
            </swiper-slide>
            <swiper-slide>
                <LazyRegistrationStep
                    @next="goNext"
                    @skip="goNext"
                    @back="goBack"
                    @login="onLogin"
                    :f7router="f7router"
                />
            </swiper-slide>
            <swiper-slide>
                <AiUpsellStep @done="finishOnboarding" @back="goBack" />
            </swiper-slide>
        </swiper-container>

        <footer class="onboarding-footer">
            <div class="onboarding-pagination">
                <span
                    v-for="i in 6"
                    :key="i"
                    class="onboarding-dot"
                    :class="{ 'onboarding-dot-active': (i - 1) <= activeSlide }"
                ></span>
            </div>
            <div class="onboarding-privacy">
                <span class="material-symbols-outlined onboarding-privacy-icon">lock</span>
                <span class="onboarding-privacy-text">{{ tt('Only you can read your data') }}</span>
            </div>
        </footer>
    </f7-page>
</template>

<script setup lang="ts">
import type { Router } from 'framework7/types';
import { ref, onMounted, nextTick } from 'vue';

import { useI18n } from '@/locales/helpers.ts';
import { useOnboardingStore } from '@/stores/onboarding.ts';
import { markOnboardingCompleted } from '@/router/onboarding-guard.ts';

import WelcomeStep from './onboarding/WelcomeStep.vue';
import GoalSetupStep from './onboarding/GoalSetupStep.vue';
import FirstExpenseStep from './onboarding/FirstExpenseStep.vue';
import MiniDashboardStep from './onboarding/MiniDashboardStep.vue';
import LazyRegistrationStep from './onboarding/LazyRegistrationStep.vue';
import AiUpsellStep from './onboarding/AiUpsellStep.vue';

const props = defineProps<{
    f7router: Router.Router;
}>();

const { tt } = useI18n();
const store = useOnboardingStore();
const swiperEl = ref<HTMLElement | null>(null);
const activeSlide = ref(0);

onMounted(async () => {
    await store.init();

    // Resume at saved step if mid-flow
    if (store.currentStep > 0) {
        await nextTick();
        slideTo(store.currentStep, false);
    }
});

function getSwiperInstance(): { slideTo: (index: number, speed?: number) => void } | null {
    const el = swiperEl.value as unknown as { swiper?: { slideTo: (index: number, speed?: number) => void } };
    return el?.swiper ?? null;
}

function slideTo(index: number, animate = true): void {
    const swiper = getSwiperInstance();
    if (swiper) {
        swiper.slideTo(index, animate ? 300 : 0);
    }
    activeSlide.value = index;
    store.setCurrentStep(index);
}

function goNext(): void {
    slideTo(activeSlide.value + 1);
}

function goBack(): void {
    if (activeSlide.value > 0) {
        slideTo(activeSlide.value - 1);
    }
}

function onWelcomeNext(intent: string): void {
    store.setOnboardingIntent(intent);
    // All intents now go through Screen 2 (goal/budget/currency picker)
    slideTo(1);
}

function onLogin(): void {
    markOnboardingCompleted();
    props.f7router.navigate('/login', { clearPreviousHistory: true });
}

function finishOnboarding(): void {
    store.completeOnboarding();
    markOnboardingCompleted();
    props.f7router.navigate('/', { clearPreviousHistory: true });
}
</script>

<style>
.onboarding-page {
    --f7-page-bg-color: #f8f7fa;
    --f7-text-color: #0f172a;
}

.dark .onboarding-page {
    --f7-page-bg-color: #0f0d13;
    --f7-text-color: #e9eaee;
}

/* Global F7 list card overrides for all onboarding screens */
.onboarding-page .list {
    --f7-list-bg-color: #ffffff;
    --f7-list-border-color: #e2e8f0;
    --f7-list-item-border-color: #e2e8f0;
}

.dark .onboarding-page .list {
    --f7-list-bg-color: #1a1721;
    --f7-list-border-color: #2a2533;
    --f7-list-item-border-color: #2a2533;
}

.onboarding-swiper {
    height: calc(100% - 72px);
}

.onboarding-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 24px 16px;
    background: rgba(248, 247, 250, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

.dark .onboarding-footer {
    background: rgba(15, 13, 19, 0.8);
}

.onboarding-pagination {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
}

.onboarding-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #d1d5db;
    transition: background 200ms ease;
}

.onboarding-dot-active {
    background: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
}

.dark .onboarding-dot {
    background: #3a3344;
}

.dark .onboarding-dot-active {
    background: #7C3AED;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3);
}

.onboarding-privacy {
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0.6;
}

.onboarding-privacy-icon {
    font-size: 12px;
    font-variation-settings: 'FILL' 1;
}

.onboarding-privacy-text {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
}
</style>
