import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';

import { getI18nOptions } from '@/locales/helpers.ts';
import './styles/globals.css';
import App from './App.vue';

const app = createApp(App);
const pinia = createPinia();
const i18n = createI18n(getI18nOptions());

app.use(pinia);
app.use(i18n);
app.mount('#app');
