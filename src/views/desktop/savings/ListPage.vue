<template>
    <v-row no-gutters>
        <v-col cols="12">
            <v-card variant="flat">
                <template #title>
                    <div class="d-flex align-center justify-space-between">
                        <h4 class="text-h4">{{ tt('Savings Goals') }}</h4>
                        <v-btn color="primary" variant="flat" @click="showCreateDialog = true"
                               :disabled="loading">
                            {{ tt('Create Goal') }}
                        </v-btn>
                    </div>
                </template>

                <v-card-text>
                    <v-progress-linear indeterminate v-if="loading" class="mb-4" />

                    <div v-if="!loading && goals.length === 0" class="text-center py-12 text-medium-emphasis">
                        <v-icon :icon="mdiPiggyBankOutline" size="64" class="mb-4" />
                        <p class="text-h6">{{ tt('No savings goals yet') }}</p>
                        <p class="text-body-2">{{ tt('Set a goal and start tracking your progress.') }}</p>
                    </div>

                    <!-- Summary card -->
                    <v-card variant="tonal" color="primary" class="mb-6 pa-4" rounded="lg"
                            v-if="!loading && goals.length > 0">
                        <div class="d-flex justify-space-between align-center">
                            <div>
                                <span class="text-body-2">{{ tt('Total Saved') }}</span>
                                <div class="text-h5 font-weight-bold">{{ formatAmount(totalSaved) }} {{ defaultCurrency }}</div>
                            </div>
                            <div class="text-right">
                                <span class="text-body-2">{{ tt('Total Target') }}</span>
                                <div class="text-h5">{{ formatAmount(totalTarget) }} {{ defaultCurrency }}</div>
                            </div>
                        </div>
                    </v-card>

                    <v-row v-if="!loading && goals.length > 0">
                        <v-col cols="12" md="6" lg="4" v-for="goal in goals" :key="goal.id">
                            <v-card variant="outlined" class="pa-5 text-center" rounded="lg">
                                <!-- Circular progress -->
                                <v-progress-circular
                                    :model-value="Math.min(goal.savedPercent, 100)"
                                    :color="goalColor(goal)"
                                    :size="120"
                                    :width="10"
                                    class="mb-4"
                                >
                                    <span class="text-h6 font-weight-bold">{{ goal.savedPercent }}%</span>
                                </v-progress-circular>

                                <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ goal.name }}</h3>

                                <div class="text-body-2 mb-1">
                                    <span class="font-weight-bold">{{ formatAmount(goal.savedAmount) }}</span>
                                    {{ tt('of') }}
                                    {{ formatAmount(goal.targetAmount) }} {{ goal.currency }}
                                </div>

                                <div class="text-body-2 text-medium-emphasis mb-3" v-if="goal.monthlyRequired > 0">
                                    {{ formatAmount(goal.monthlyRequired) }}/{{ tt('mo') }} {{ tt('to reach goal') }}
                                </div>

                                <div class="text-body-2 text-medium-emphasis mb-3" v-if="goal.targetDate > 0">
                                    {{ tt('Target') }}: {{ formatDate(goal.targetDate) }}
                                </div>

                                <div class="d-flex justify-center ga-2">
                                    <v-btn size="small" variant="outlined" color="primary"
                                           @click="openContributeDialog(goal)">
                                        {{ tt('Add Funds') }}
                                    </v-btn>
                                    <v-btn size="small" variant="text" color="error"
                                           @click="deleteGoal(goal.id)">
                                        {{ tt('Delete') }}
                                    </v-btn>
                                </div>
                            </v-card>
                        </v-col>

                        <!-- Add new goal card -->
                        <v-col cols="12" md="6" lg="4">
                            <v-card variant="outlined" class="pa-5 text-center d-flex flex-column align-center justify-center"
                                    rounded="lg" style="min-height: 300px; border-style: dashed; cursor: pointer;"
                                    @click="showCreateDialog = true">
                                <v-icon :icon="mdiPlus" size="48" color="primary" class="mb-3" />
                                <span class="text-subtitle-1 font-weight-bold">{{ tt('Add a new savings goal') }}</span>
                                <span class="text-body-2 text-medium-emphasis mt-1">{{ tt('Plan your next big purchase or set aside safety funds.') }}</span>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </v-col>

        <!-- Create Goal Dialog -->
        <v-dialog v-model="showCreateDialog" max-width="480" persistent>
            <v-card>
                <v-card-title>{{ tt('Create Savings Goal') }}</v-card-title>
                <v-card-text>
                    <v-form @submit.prevent="createGoal">
                        <v-row>
                            <v-col cols="12">
                                <v-text-field
                                    :label="tt('Goal Name')"
                                    :placeholder="tt('e.g. Emergency Fund, Vacation')"
                                    v-model="newGoal.name"
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-text-field
                                    type="number"
                                    inputmode="decimal"
                                    :label="tt('Target Amount')"
                                    :suffix="defaultCurrency"
                                    v-model.number="newGoalDisplayAmount"
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-text-field
                                    type="date"
                                    :label="tt('Target Date (optional)')"
                                    v-model="newGoalDate"
                                />
                            </v-col>
                        </v-row>
                    </v-form>
                </v-card-text>
                <v-card-actions class="justify-end px-6 pb-4">
                    <v-btn variant="text" @click="showCreateDialog = false">{{ tt('Cancel') }}</v-btn>
                    <v-btn color="primary" variant="flat"
                           :disabled="!newGoal.name || !newGoalDisplayAmount"
                           :loading="creating"
                           @click="createGoal">
                        {{ tt('Create Goal') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Contribute Dialog -->
        <v-dialog v-model="showContributeDialog" max-width="400" persistent>
            <v-card>
                <v-card-title>{{ tt('Add Funds') }} - {{ contributeGoal?.name }}</v-card-title>
                <v-card-text>
                    <v-text-field
                        type="number"
                        inputmode="decimal"
                        :label="tt('Amount')"
                        :suffix="defaultCurrency"
                        v-model.number="contributeDisplayAmount"
                        autofocus
                    />
                </v-card-text>
                <v-card-actions class="justify-end px-6 pb-4">
                    <v-btn variant="text" @click="showContributeDialog = false">{{ tt('Cancel') }}</v-btn>
                    <v-btn color="primary" variant="flat"
                           :disabled="!contributeDisplayAmount"
                           :loading="contributing"
                           @click="contribute">
                        {{ tt('Add Funds') }}
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

import { mdiPiggyBankOutline, mdiPlus } from '@mdi/js';

type SnackBarType = InstanceType<typeof SnackBar>;

const { tt } = useI18n();
const userStore = useUserStore();
const snackbar = useTemplateRef<SnackBarType>('snackbar');

const loading = ref(true);
const creating = ref(false);
const contributing = ref(false);
const goals = ref<any[]>([]);
const showCreateDialog = ref(false);
const showContributeDialog = ref(false);
const contributeGoal = ref<any>(null);
const contributeDisplayAmount = ref<number | null>(null);

const defaultCurrency = computed(() => userStore.currentUserDefaultCurrency || 'EUR');

const newGoal = ref({ name: '' });
const newGoalDisplayAmount = ref<number | null>(null);
const newGoalDate = ref('');

const totalSaved = computed(() => goals.value.reduce((sum: number, g: any) => sum + g.savedAmount, 0));
const totalTarget = computed(() => goals.value.reduce((sum: number, g: any) => sum + g.targetAmount, 0));

function formatAmount(cents: number): string {
    return (cents / 100).toFixed(2);
}

function formatDate(unix: number): string {
    return new Date(unix * 1000).toLocaleDateString();
}

function goalColor(goal: any): string {
    if (goal.savedPercent >= 100) return '#10b981';
    if (goal.savedPercent >= 60) return '#10b981';
    if (goal.savedPercent >= 30) return '#f59e0b';
    return '#7C3AED'; // brand purple for early progress
}

function openContributeDialog(goal: any): void {
    contributeGoal.value = goal;
    contributeDisplayAmount.value = null;
    showContributeDialog.value = true;
}

async function loadGoals(): Promise<void> {
    loading.value = true;
    try {
        const response = await services.getSavingsGoals();
        if (response.data?.success) {
            goals.value = response.data.result || [];
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    } finally {
        loading.value = false;
    }
}

async function createGoal(): Promise<void> {
    if (!newGoal.value.name || !newGoalDisplayAmount.value) return;

    creating.value = true;
    try {
        let targetDate = 0;
        if (newGoalDate.value) {
            targetDate = Math.floor(new Date(newGoalDate.value).getTime() / 1000);
        }

        const response = await services.createSavingsGoal({
            name: newGoal.value.name,
            targetAmount: Math.round(newGoalDisplayAmount.value * 100),
            currency: defaultCurrency.value,
            targetDate,
            icon: '',
            color: '7C3AED',
        });

        if (response.data?.success) {
            showCreateDialog.value = false;
            newGoal.value = { name: '' };
            newGoalDisplayAmount.value = null;
            newGoalDate.value = '';
            await loadGoals();
            snackbar.value?.showMessage(tt('Goal created'));
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    } finally {
        creating.value = false;
    }
}

async function contribute(): Promise<void> {
    if (!contributeGoal.value || !contributeDisplayAmount.value) return;

    contributing.value = true;
    try {
        const response = await services.contributeSavingsGoal({
            id: contributeGoal.value.id,
            amount: Math.round(contributeDisplayAmount.value * 100),
        });

        if (response.data?.success) {
            showContributeDialog.value = false;
            await loadGoals();
            snackbar.value?.showMessage(tt('Funds added'));
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    } finally {
        contributing.value = false;
    }
}

async function deleteGoal(id: string): Promise<void> {
    try {
        const response = await services.deleteSavingsGoal({ id });
        if (response.data?.success) {
            await loadGoals();
            snackbar.value?.showMessage(tt('Goal deleted'));
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    }
}

onMounted(() => {
    loadGoals();
});
</script>
