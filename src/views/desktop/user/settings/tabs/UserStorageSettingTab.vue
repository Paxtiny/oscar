<template>
    <v-card variant="flat">
        <v-card-text>
            <h5 class="text-h5 mb-4">{{ tt('Storage Backend') }}</h5>

            <v-alert v-if="!canUseBYOS" type="info" variant="tonal" class="mb-4">
                {{ tt('Custom storage requires alfred tier or above.') }}
                <strong>{{ tt('Your data is stored securely on nicodAImus servers.') }}</strong>
            </v-alert>

            <v-progress-linear indeterminate v-if="loading" class="mb-4" />

            <div v-if="!loading">
                <v-radio-group v-model="selectedType" :disabled="!canUseBYOS || saving">
                    <v-radio :value="0" :label="tt('nicodAImus hosted (default)')" />
                    <v-radio :value="1" :label="tt('S3-compatible (AWS, Backblaze, MinIO, GCS)')" />
                    <v-radio :value="2" :label="tt('WebDAV (Nextcloud, ownCloud)')" />
                </v-radio-group>

                <!-- S3 Config -->
                <v-card variant="outlined" class="pa-4 mb-4" v-if="selectedType === 1">
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field :label="tt('Endpoint')" :placeholder="tt('s3.amazonaws.com')"
                                          v-model="s3Config.endpoint" :disabled="saving" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :label="tt('Bucket')" v-model="s3Config.bucket" :disabled="saving" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :label="tt('Access Key')" v-model="s3Config.accessKey" :disabled="saving" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :label="tt('Secret Key')" type="password"
                                          v-model="s3Config.secretKey" :disabled="saving" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :label="tt('Region (optional)')" v-model="s3Config.region" :disabled="saving" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :label="tt('Root Path (optional)')" v-model="s3Config.rootPath" :disabled="saving" />
                        </v-col>
                        <v-col cols="12">
                            <v-switch :label="tt('Use SSL')" v-model="s3Config.useSSL" color="primary" hide-details />
                        </v-col>
                    </v-row>
                </v-card>

                <!-- WebDAV Config -->
                <v-card variant="outlined" class="pa-4 mb-4" v-if="selectedType === 2">
                    <v-row>
                        <v-col cols="12">
                            <v-text-field :label="tt('WebDAV URL')"
                                          :placeholder="tt('https://nextcloud.example.com/remote.php/dav/files/user/')"
                                          v-model="webdavConfig.url" :disabled="saving" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :label="tt('Username')" v-model="webdavConfig.username" :disabled="saving" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field :label="tt('Password')" type="password"
                                          v-model="webdavConfig.password" :disabled="saving" />
                        </v-col>
                        <v-col cols="12">
                            <v-text-field :label="tt('Root Path (optional)')" v-model="webdavConfig.rootPath" :disabled="saving" />
                        </v-col>
                    </v-row>
                </v-card>

                <!-- Status -->
                <v-alert v-if="currentConfig && currentConfig.lastTestedUnixTime > 0"
                         :type="currentConfig.lastTestSuccess ? 'success' : 'error'"
                         variant="tonal" class="mb-4">
                    {{ currentConfig.lastTestSuccess ? tt('Connection verified') : tt('Connection failed') }}
                    ({{ formatDate(currentConfig.lastTestedUnixTime) }})
                </v-alert>

                <!-- Actions -->
                <div class="d-flex ga-3" v-if="canUseBYOS">
                    <v-btn color="primary" variant="flat" :loading="saving" @click="saveConfig"
                           :disabled="selectedType > 0 && !hasRequiredFields">
                        {{ tt('Save') }}
                    </v-btn>
                    <v-btn variant="outlined" :loading="testing" @click="testConnection"
                           :disabled="selectedType === 0" v-if="selectedType > 0">
                        {{ tt('Test Connection') }}
                    </v-btn>
                    <v-btn variant="text" color="error" @click="resetToDefault"
                           v-if="currentConfig && currentConfig.storageType > 0">
                        {{ tt('Reset to Default') }}
                    </v-btn>
                </div>
            </div>
        </v-card-text>

        <snack-bar ref="snackbar" />
    </v-card>
</template>

<script setup lang="ts">
import SnackBar from '@/components/desktop/SnackBar.vue';

import { ref, computed, onMounted, useTemplateRef } from 'vue';

import { useI18n } from '@/locales/helpers.ts';
import { useVaultStore } from '@/stores/vault.ts';
import services from '@/lib/services.ts';

type SnackBarType = InstanceType<typeof SnackBar>;

const { tt } = useI18n();
const vaultStore = useVaultStore();
const snackbar = useTemplateRef<SnackBarType>('snackbar');

const loading = ref(true);
const saving = ref(false);
const testing = ref(false);
const currentConfig = ref<any>(null);
const selectedType = ref(0);

const canUseBYOS = computed(() => {
    const tier = vaultStore.tier;
    return tier === 'alfred' || tier === 'pro' || tier === 'jared';
});

const s3Config = ref({
    endpoint: '', bucket: '', region: '', accessKey: '', secretKey: '', rootPath: '', useSSL: true,
});

const webdavConfig = ref({
    url: '', username: '', password: '', rootPath: '',
});

const hasRequiredFields = computed(() => {
    if (selectedType.value === 1) {
        return s3Config.value.endpoint && s3Config.value.bucket && s3Config.value.accessKey && s3Config.value.secretKey;
    }
    if (selectedType.value === 2) {
        return webdavConfig.value.url;
    }
    return true;
});

function formatDate(unix: number): string {
    return new Date(unix * 1000).toLocaleString();
}

async function loadConfig(): Promise<void> {
    loading.value = true;
    try {
        const response = await services.getStorageConfig();
        if (response.data?.success) {
            currentConfig.value = response.data.result;
            selectedType.value = currentConfig.value.storageType || 0;

            if (currentConfig.value.s3Endpoint) {
                s3Config.value.endpoint = currentConfig.value.s3Endpoint;
                s3Config.value.bucket = currentConfig.value.s3Bucket || '';
                s3Config.value.region = currentConfig.value.s3Region || '';
                s3Config.value.rootPath = currentConfig.value.s3RootPath || '';
                s3Config.value.useSSL = currentConfig.value.s3UseSSL;
            }
            if (currentConfig.value.webdavUrl) {
                webdavConfig.value.url = currentConfig.value.webdavUrl;
                webdavConfig.value.rootPath = currentConfig.value.webdavRootPath || '';
            }
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    } finally {
        loading.value = false;
    }
}

async function saveConfig(): Promise<void> {
    saving.value = true;
    try {
        const data: any = { storageType: selectedType.value };

        if (selectedType.value === 1) {
            Object.assign(data, {
                s3Endpoint: s3Config.value.endpoint,
                s3Bucket: s3Config.value.bucket,
                s3Region: s3Config.value.region,
                s3AccessKey: s3Config.value.accessKey,
                s3SecretKey: s3Config.value.secretKey,
                s3RootPath: s3Config.value.rootPath,
                s3UseSSL: s3Config.value.useSSL,
            });
        } else if (selectedType.value === 2) {
            Object.assign(data, {
                webdavUrl: webdavConfig.value.url,
                webdavUsername: webdavConfig.value.username,
                webdavPassword: webdavConfig.value.password,
                webdavRootPath: webdavConfig.value.rootPath,
            });
        }

        const response = await services.updateStorageConfig(data);
        if (response.data?.success) {
            currentConfig.value = response.data.result;
            snackbar.value?.showMessage(tt('Storage configuration saved'));
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    } finally {
        saving.value = false;
    }
}

async function testConnection(): Promise<void> {
    testing.value = true;
    try {
        const response = await services.testStorageConnection();
        if (response.data?.success) {
            const result = response.data.result;
            if (result.success) {
                snackbar.value?.showMessage(tt('Connection successful'));
            } else {
                snackbar.value?.showMessage(result.message);
            }
            await loadConfig(); // Refresh test status
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    } finally {
        testing.value = false;
    }
}

async function resetToDefault(): Promise<void> {
    try {
        const response = await services.resetStorageConfig();
        if (response.data?.success) {
            selectedType.value = 0;
            currentConfig.value = null;
            snackbar.value?.showMessage(tt('Storage reset to default'));
        }
    } catch (error) {
        snackbar.value?.showError(error as any);
    }
}

onMounted(() => {
    loadConfig();
});
</script>
