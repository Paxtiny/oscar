<template>
    <div class="layout-wrapper">
        <router-link to="/">
            <div class="auth-logo d-flex align-start gap-x-3">
                <img alt="logo" class="login-page-logo" :src="APPLICATION_LOGO_PATH" />
                <h1 class="font-weight-medium leading-normal text-2xl">{{ tt('global.app.title') }}</h1>
            </div>
        </router-link>
        <v-row no-gutters class="auth-wrapper">
            <v-col cols="12" md="8" class="d-none d-md-flex align-center justify-center position-relative"
                   :style="{ background: isDarkMode ? 'linear-gradient(135deg, #0f0d13 0%, #1a1028 50%, #0f0d13 100%)' : 'linear-gradient(135deg, #f3f0ff 0%, #ede5ff 50%, #f8f7fa 100%)' }">
                <div class="d-flex flex-column align-center justify-center text-center px-12" style="max-width: 600px;">
                    <v-icon :icon="mdiShieldLock" size="80" color="primary" class="mb-6" />
                    <h2 class="text-h3 font-weight-bold mb-4" :class="isDarkMode ? 'text-white' : 'text-on-background'">
                        {{ tt('Your finances, your eyes only') }}
                    </h2>
                    <p class="text-body-1 mb-8" :class="isDarkMode ? 'text-grey-400' : 'text-medium-emphasis'">
                        {{ tt('End-to-end encrypted expense tracking. Not even we can read your data.') }}
                    </p>
                    <div class="d-flex flex-column ga-4 w-100" style="max-width: 400px;">
                        <div class="d-flex align-center ga-3">
                            <v-icon :icon="mdiLock" size="24" color="primary" />
                            <span class="text-body-2">{{ tt('Zero-knowledge encryption') }}</span>
                        </div>
                        <div class="d-flex align-center ga-3">
                            <v-icon :icon="mdiEyeOff" size="24" color="primary" />
                            <span class="text-body-2">{{ tt('No personal data required') }}</span>
                        </div>
                        <div class="d-flex align-center ga-3">
                            <v-icon :icon="mdiCloudLock" size="24" color="primary" />
                            <span class="text-body-2">{{ tt('Bring your own storage') }}</span>
                        </div>
                    </div>
                </div>
            </v-col>
            <v-col cols="12" md="4" class="auth-card d-flex flex-column">
                <div class="d-flex align-center justify-center h-100">
                    <v-card variant="flat" class="w-100 mt-0 px-4 pt-12" max-width="500">
                        <v-card-text>
                            <h4 class="text-h4 mb-2">{{ tt('Welcome to oscar') }}</h4>
                            <p class="mb-0" v-if="isNicodaimusAuthEnabled()">{{ tt('Enter your nicodAImus account number') }}</p>
                            <p class="mb-0" v-else-if="isInternalAuthEnabled()">{{ tt('Please log in with your oscar account') }}</p>
                            <p class="mt-1 mb-0" v-if="tips">{{ tips }}</p>
                        </v-card-text>

                        <v-card-text class="pb-0 mb-6">
                            <v-form>
                                <v-row>
                                    <!-- nicodAImus 16-digit account number login -->
                                    <v-col cols="12" v-if="isNicodaimusAuthEnabled()">
                                        <v-text-field
                                            type="text"
                                            autocomplete="on"
                                            inputmode="numeric"
                                            maxlength="19"
                                            :autofocus="true"
                                            :disabled="loggingInByAccount"
                                            :label="tt('Account Number')"
                                            :placeholder="tt('1234 5678 9012 3456')"
                                            v-model="accountNumberDisplay"
                                            @input="onAccountInput"
                                            @keyup.enter="loginByAccount"
                                        />
                                    </v-col>

                                    <v-col cols="12" v-if="isNicodaimusAuthEnabled()">
                                        <v-btn block color="primary"
                                               :disabled="!accountNumberValid || loggingInByAccount"
                                               @click="loginByAccount">
                                            {{ tt('Log In') }}
                                            <v-progress-circular indeterminate size="22" class="ms-2" v-if="loggingInByAccount"></v-progress-circular>
                                        </v-btn>
                                    </v-col>

                                    <v-col cols="12" class="text-center" v-if="isNicodaimusAuthEnabled()">
                                        <span class="me-1">{{ tt('Don\'t have an account?') }}</span>
                                        <a class="text-primary" href="https://nicodaimus.com/account/create/" target="_blank"
                                           :class="{ 'disabled': loggingInByAccount }">
                                            {{ tt('Create an account') }}
                                        </a>
                                    </v-col>

                                    <!-- Legacy username+password login (for self-hosters) -->
                                    <v-col cols="12" v-if="!isNicodaimusAuthEnabled() && isInternalAuthEnabled()">
                                        <v-text-field
                                            type="text"
                                            autocomplete="username"
                                            autocapitalize="none"
                                            autocorrect="off"
                                            spellcheck="false"
                                            inputmode="email"
                                            :autofocus="true"
                                            :disabled="show2faInput || loggingInByPassword || loggingInByOAuth2 || verifying"
                                            :label="tt('Username')"
                                            :placeholder="tt('Your username or email')"
                                            v-model.trim="username"
                                            @input="tempToken = ''"
                                            @keyup.enter="passwordInput?.focus()"
                                        />
                                    </v-col>

                                    <v-col cols="12" v-if="!isNicodaimusAuthEnabled() && isInternalAuthEnabled()">
                                        <v-text-field
                                            autocomplete="current-password"
                                            ref="passwordInput"
                                            type="password"
                                            :disabled="show2faInput || loggingInByPassword || loggingInByOAuth2 || verifying"
                                            :label="tt('Password')"
                                            :placeholder="tt('Your password')"
                                            v-model="password"
                                            @input="tempToken = ''"
                                            @keyup.enter="login"
                                        />
                                    </v-col>

                                    <v-col cols="12" v-show="show2faInput">
                                        <v-text-field
                                            type="number"
                                            autocomplete="one-time-code"
                                            ref="passcodeInput"
                                            :disabled="loggingInByPassword || loggingInByOAuth2 || verifying"
                                            :label="tt('Passcode')"
                                            :placeholder="tt('Passcode')"
                                            :append-inner-icon="mdiHelpCircleOutline"
                                            v-model="passcode"
                                            @click:append-inner="twoFAVerifyType = 'backupcode'"
                                            @keyup.enter="verify"
                                            v-if="twoFAVerifyType === 'passcode'"
                                        />
                                        <v-text-field
                                            type="text"
                                            :disabled="loggingInByPassword || loggingInByOAuth2 || verifying"
                                            :label="tt('Backup Code')"
                                            :placeholder="tt('Backup Code')"
                                            :append-inner-icon="mdiOnepassword"
                                            v-model="backupCode"
                                            @click:append-inner="twoFAVerifyType = 'passcode'"
                                            @keyup.enter="verify"
                                            v-if="twoFAVerifyType === 'backupcode'"
                                        />
                                    </v-col>

                                    <v-col cols="12" class="py-0 mt-1 mb-4" v-if="!isNicodaimusAuthEnabled()">
                                        <div class="d-flex align-center justify-space-between flex-wrap">
                                            <a href="javascript:void(0);"
                                               :class="{ 'disabled': loggingInByPassword || loggingInByOAuth2 || verifying }"
                                               @click="showMobileQrCode = true">
                                                <span class="nav-item-title">{{ tt('Use on Mobile Device') }}</span>
                                            </a>
                                            <v-spacer/>
                                            <router-link class="text-primary" to="/forgetpassword"
                                                         :class="{ 'disabled': !isUserForgetPasswordEnabled() || loggingInByPassword || loggingInByOAuth2 || verifying }">
                                                {{ tt('Forget Password?') }}
                                            </router-link>
                                        </div>
                                    </v-col>

                                    <v-col cols="12" v-if="!isNicodaimusAuthEnabled()">
                                        <v-btn block :disabled="inputIsEmpty || loggingInByPassword || loggingInByOAuth2 || verifying"
                                               @click="login" v-if="isInternalAuthEnabled() && !show2faInput">
                                            {{ tt('Log In') }}
                                            <v-progress-circular indeterminate size="22" class="ms-2" v-if="loggingInByPassword"></v-progress-circular>
                                        </v-btn>
                                        <v-btn block :disabled="twoFAInputIsEmpty || loggingInByPassword || loggingInByOAuth2 || verifying"
                                               @click="verify" v-else-if="isInternalAuthEnabled() && show2faInput">
                                            {{ tt('Continue') }}
                                            <v-progress-circular indeterminate size="22" class="ms-2" v-if="verifying"></v-progress-circular>
                                        </v-btn>

                                        <v-col cols="12" class="d-flex align-center px-0 text-no-wrap" v-if="isInternalAuthEnabled() && isOAuth2Enabled()">
                                            <v-divider class="me-3" />
                                            {{ tt('or') }}
                                            <v-divider class="ms-3" />
                                        </v-col>

                                        <v-btn block :disabled="show2faInput || loggingInByPassword || loggingInByOAuth2 || verifying" :href="oauth2LoginUrl"
                                               @click="loggingInByOAuth2 = true" v-if="isOAuth2Enabled()">
                                            {{ oauth2LoginDisplayName }}
                                            <v-progress-circular indeterminate size="22" class="ms-2" v-if="loggingInByOAuth2"></v-progress-circular>
                                        </v-btn>
                                    </v-col>

                                    <v-col cols="12" class="text-center text-base" v-if="isInternalAuthEnabled()">
                                        <span class="me-1">{{ tt('Don\'t have an account?') }}</span>
                                        <router-link class="text-primary" to="/signup"
                                                     :class="{ 'disabled': !isUserRegistrationEnabled() || loggingInByPassword || loggingInByOAuth2 || verifying }">
                                            {{ tt('Create an account') }}
                                        </router-link>
                                    </v-col>
                                </v-row>
                            </v-form>
                        </v-card-text>
                    </v-card>
                </div>
                <v-spacer/>
                <div class="d-flex align-center justify-center">
                    <v-card variant="flat" class="w-100 px-4 pb-4" max-width="500">
                        <v-card-text class="pt-0">
                            <v-row>
                                <v-col cols="12" class="text-center">
                                    <language-select-button :disabled="loggingInByPassword || loggingInByOAuth2 || verifying" />
                                </v-col>

                                <v-col cols="12" class="d-flex align-center pt-0">
                                    <v-divider />
                                </v-col>

                                <v-col cols="12" class="text-center text-sm">
                                    <span>Powered by </span>
                                    <a href="https://github.com/Paxtiny/oscar" target="_blank">oscar</a>&nbsp;<span>{{ version }}</span>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </div>
            </v-col>
        </v-row>

        <switch-to-mobile-dialog v-model:show="showMobileQrCode" />
        <snack-bar ref="snackbar" />
    </div>
</template>

<script setup lang="ts">
import { VTextField } from 'vuetify/components/VTextField';
import SnackBar from '@/components/desktop/SnackBar.vue';

import { ref, computed, useTemplateRef, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';

import { useI18n } from '@/locales/helpers.ts';
import { useLoginPageBase } from '@/views/base/LoginPageBase.ts';

import { useRootStore } from '@/stores/index.ts';

import { ThemeType } from '@/core/theme.ts';
import { APPLICATION_LOGO_PATH } from '@/consts/asset.ts';
import { KnownErrorCode } from '@/consts/api.ts';

import { generateRandomUUID } from '@/lib/misc.ts';
import {
    isNicodaimusAuthEnabled,
    isUserRegistrationEnabled,
    isUserForgetPasswordEnabled,
    isUserVerifyEmailEnabled,
    isInternalAuthEnabled,
    isOAuth2Enabled
} from '@/lib/server_settings.ts';

import { formatAccount16, digits16 } from '@/lib/account-number.ts';

import {
    mdiOnepassword,
    mdiHelpCircleOutline,
    mdiShieldLock,
    mdiLock,
    mdiEyeOff,
    mdiCloudLock
} from '@mdi/js';

type SnackBarType = InstanceType<typeof SnackBar>;

const router = useRouter();
const theme = useTheme();

const { tt } = useI18n();

const rootStore = useRootStore();

const {
    version,
    username,
    password,
    passcode,
    backupCode,
    tempToken,
    twoFAVerifyType,
    oauth2ClientSessionId,
    loggingInByPassword,
    loggingInByOAuth2,
    verifying,
    inputIsEmpty,
    twoFAInputIsEmpty,
    oauth2LoginUrl,
    oauth2LoginDisplayName,
    tips,
    doAfterLogin
} = useLoginPageBase('desktop');

const passwordInput = useTemplateRef<VTextField>('passwordInput');
const passcodeInput = useTemplateRef<VTextField>('passcodeInput');
const snackbar = useTemplateRef<SnackBarType>('snackbar');

const show2faInput = ref<boolean>(false);
const showMobileQrCode = ref<boolean>(false);

// nicodAImus account number login state
const accountNumberDisplay = ref<string>('');
const loggingInByAccount = ref<boolean>(false);
const accountNumberValid = computed<boolean>(() => digits16(accountNumberDisplay.value) !== null);

function onAccountInput(): void {
    accountNumberDisplay.value = formatAccount16(accountNumberDisplay.value);
}

function loginByAccount(): void {
    const account = digits16(accountNumberDisplay.value);
    if (!account || loggingInByAccount.value) return;

    loggingInByAccount.value = true;

    rootStore.authorizeByAccount({
        accountNumber: account
    }).then(authResponse => {
        loggingInByAccount.value = false;
        doAfterLogin(authResponse);
        router.replace('/');
    }).catch(error => {
        loggingInByAccount.value = false;
        if (!error.processed) {
            snackbar.value?.showError(error);
        }
    });
}

const isDarkMode = computed<boolean>(() => theme.global.name.value === ThemeType.Dark);

function login(): void {
    if (!username.value) {
        snackbar.value?.showMessage('Username cannot be blank');
        return;
    }

    if (!password.value) {
        snackbar.value?.showMessage('Password cannot be blank');
        return;
    }

    if (tempToken.value) {
        show2faInput.value = true;
        return;
    }

    if (loggingInByPassword.value) {
        return;
    }

    loggingInByPassword.value = true;

    rootStore.authorize({
        loginName: username.value,
        password: password.value
    }).then(authResponse => {
        loggingInByPassword.value = false;

        if (authResponse.need2FA) {
            tempToken.value = authResponse.token;
            show2faInput.value = true;

            nextTick(() => {
                if (passcodeInput.value) {
                    passcodeInput.value.focus();
                    passcodeInput.value.select();
                }
            });

            return;
        }

        doAfterLogin(authResponse);
        router.replace('/');
    }).catch(error => {
        loggingInByPassword.value = false;

        if (isUserVerifyEmailEnabled() && error.error && error.error.errorCode === KnownErrorCode.UserEmailNotVerified && error.error.context && error.error.context.email) {
            router.push(`/verify_email?email=${encodeURIComponent(error.error.context.email)}&emailSent=${error.error.context.hasValidEmailVerifyToken || false}`);
            return;
        }

        if (!error.processed) {
            snackbar.value?.showError(error);
        }
    });
}

function verify(): void {
    if (twoFAInputIsEmpty.value || verifying.value) {
        return;
    }

    if (twoFAVerifyType.value === 'passcode' && !passcode.value) {
        snackbar.value?.showMessage('Passcode cannot be blank');
        return;
    } else if (twoFAVerifyType.value === 'backupcode' && !backupCode.value) {
        snackbar.value?.showMessage('Backup code cannot be blank');
        return;
    }

    verifying.value = true;

    rootStore.authorize2FA({
        token: tempToken.value,
        passcode: twoFAVerifyType.value === 'passcode' ? passcode.value : null,
        recoveryCode: twoFAVerifyType.value === 'backupcode' ? backupCode.value : null
    }).then(authResponse => {
        verifying.value = false;

        doAfterLogin(authResponse);
        router.replace('/');
    }).catch(error => {
        verifying.value = false;

        if (!error.processed) {
            snackbar.value?.showError(error);
        }
    });
}

oauth2ClientSessionId.value = generateRandomUUID();
</script>
