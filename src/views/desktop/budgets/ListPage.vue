<template>
    <v-row no-gutters>
        <v-col cols="12">
            <v-card variant="flat">
                <template #title>
                    <div class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center">
                            <h4 class="text-h4">{{ tt('Budgets') }}</h4>
                        </div>
                        <v-btn color="primary" variant="flat" @click="showCreateDialog = true"
                               :disabled="loading">
                            {{ tt('Create Budget') }}
                        </v-btn>
                    </div>
                </template>

                <v-card-text>
                    <v-progress-linear indeterminate v-if="loading" class="mb-4" />

                    <div v-if="!loading && budgets.length === 0" class="text-center py-12 text-medium-emphasis">
                        <v-icon :icon="mdiChartBoxOutline" size="64" class="mb-4" />
                        <p class="text-h6">{{ tt('No budgets yet') }}</p>
                        <p class="text-body-2">{{ tt('Create a budget to start tracking your spending against targets.') }}</p>
                    </div>

                    <v-row v-if="!loading && budgets.length > 0">
                        <v-col cols="12" md="6" lg="4" v-for="budget in budgets" :key="budget.id">
                            <v-card variant="outlined" class="pa-4" rounded="lg">
                                <div class="d-flex align-center justify-space-between mb-3">
                                    <div class="d-flex align-center ga-2">
                                        <span class="text-subtitle-1 font-weight-bold">{{ budget.name }}</span>
                                    </div>
                                    <v-chip size="x-small" variant="tonal" :color="periodColor(budget.period)">
                                        {{ periodLabel(budget.period) }}
                                    </v-chip>
                                </div>

                                <div class="mb-2">
                                    <div class="d-flex justify-space-between align-center mb-1">
                                        <span class="text-body-2 text-medium-emphasis">
                                            {{ formatAmount(budget.spent) }} / {{ formatAmount(budget.amount) }} {{ budget.currency }}
                                        </span>
                                        <span class="text-body-2 font-weight-bold" :class="progressTextColor(budget.spentPercent)">
                                            {{ budget.spentPercent }}%
                                        </span>
                                    </div>
                                    <v-progress-linear
                                        :model-value="Math.min(budget.spentPercent, 100)"
                                        :color="progressColor(budget.spentPercent)"
                                        height="8"
                                        rounded
                                    />
                                </div>

                                <div class="d-flex justify-end mt-3">
                                    <v-btn size="small" variant="text" color="error"
                                           @click="deleteBudget(budget.id)">
                                        {{ tt('Delete') }}
                                    </v-btn>
                                </div>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </v-col>

        <!-- Create Budget Dialog -->
        <v-dialog v-model="showCreateDialog" max-width="480" persistent>
            <v-card>
                <v-card-title>{{ tt('Create Budget') }}</v-card-title>
                <v-card-text>
                    <v-form @submit.prevent="createBudget">
                        <v-row>
                            <v-col cols="12">
                                <v-text-field
                                    :label="tt('Budget Name')"
                                    :placeholder="tt('e.g. Groceries, Transport')"
                                    v-model="newBudget.name"
                                    :rules="[v => !!v || tt('Name is required')]"
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-text-field
                                    type="number"
                                    inputmode="decimal"
                                    :label="tt('Amount')"
                                    :placeholder="tt('Monthly budget amount')"
                                    :suffix="defaultCurrency"
                                    v-model.number="newBudgetDisplayAmount"
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-btn-toggle v-model="newBudget.period" mandatory color="primary" variant="outlined" divided>
                                    <v-btn :value="1">{{ tt('Weekly') }}</v-btn>
                                    <v-btn :value="2">{{ tt('Monthly') }}</v-btn>
                                    <v-btn :value="3">{{ tt('Yearly') }}</v-btn>
                                </v-btn-toggle>
                            </v-col>
                            <v-col cols="12">
                                <v-switch
                                    :label="tt('Rollover unused budget')"
                                    v-model="newBudget.rollover"
                                    color="primary"
                                    hide-details
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-switch
                                    :label="tt('Alert at 80% spent')"
                                    v-model="alertEnabled"
                                    color="primary"
                                    hide-details
                                />
                            </v-col>
                        </v-row>
                    </v-form>
                </v-card-text>
                <v-card-actions class="justify-end px-6 pb-4">
                    <v-btn variant="text" @click="showCreateDialog = false">{{ tt('Cancel') }}</v-btn>
                    <v-btn color="primary" variant="flat"
                           :disabled="!newBudget.name || !newBudgetDisplayAmount"
                           :loading="creating"
                           @click="createBudget">
                        {{ tt('Create Budget') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <snack-bar ref="snackbar" />
    </v-row>
</template>

<script setup lang="ts">
import SnackBar from '@/components/desktop/SnackBar.vue';

import { ref, computed, onMounted, useTemplateRef } from 'vue';

import { useI18n } from '@/locales/helpers.ts';
import { useUserStore } from '@/stores/user.ts';
import services from '@/lib/services.ts';

import { mdiChartBoxOutline } from '@mdi/js';

type SnackBarType = InstanceType<typeof SnackBar>;

const { tt } = useI18n();
const userStore = useUserStore();
const snackbar = useTemplateRef<SnackBarType>('snackbar');

const loading = ref(true);
const creating = ref(false);
const budgets = ref<any[]>([]);
const showCreateDialog = ref(false);
const alertEnabled = ref(true);

const defaultCurrency = computed(() => userStore.currentUserDefaultCurrency || 'EUR');

const newBudget = ref({
    name: '',
    period: 2, // Monthly
    rollover: false,
});

const newBudgetDisplayAmount = ref<number | null>(null);

function formatAmount(cents: number): string {
    return (cents / 100).toFixed(2);
}

function periodLabel(period: number): string {
    if (period === 1) return tt('Weekly');
    if (period === 2) return tt('Monthly');
    if (period === 3) return tt('Yearly');
    return '';
}

function periodColor(period: number): string {
    if (period === 1) return 'info';
    if (period === 2) return 'primary';
    return 'secondary';
}

function progressColor(percent: number): string {
    if (percent >= 90) return '#ef4444';
    if (percent >= 75) return '#f59e0b';
    return '#10b981';
}

function progressTextColor(percent: number): string {
    if (percent >= 90) return 'text-error';
    if (percent >= 75) return 'text-warning';
    return 'text-success';
}

async function loadBudgets(): Promise<void> {
    loading.value = true;
    try {
        const response = await services.getBudgets();
        if (response.data?.success) {
            budgets.value = response.data.result || [];
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    } finally {
        loading.value = false;
    }
}

async function createBudget(): Promise<void> {
    if (!newBudget.value.name || !newBudgetDisplayAmount.value) return;

    creating.value = true;
    try {
        const response = await services.createBudget({
            name: newBudget.value.name,
            amount: Math.round(newBudgetDisplayAmount.value * 100),
            currency: defaultCurrency.value,
            period: newBudget.value.period,
            rollover: newBudget.value.rollover,
            alertPercent: alertEnabled.value ? 80 : 0,
            categoryId: '0',
            accountId: '0',
            startDate: 0,
        });

        if (response.data?.success) {
            showCreateDialog.value = false;
            newBudget.value = { name: '', period: 2, rollover: false };
            newBudgetDisplayAmount.value = null;
            await loadBudgets();
            snackbar.value?.showMessage(tt('Budget created'));
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    } finally {
        creating.value = false;
    }
}

async function deleteBudget(id: string): Promise<void> {
    try {
        const response = await services.deleteBudget({ id });
        if (response.data?.success) {
            await loadBudgets();
            snackbar.value?.showMessage(tt('Budget deleted'));
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    }
}

onMounted(() => {
    loadBudgets();
});
</script>
