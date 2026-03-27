import fs from 'fs';
import { resolve } from 'path';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import git from 'git-rev-sync';

import packageFile from './package.json';

const SRC_DIR = resolve(__dirname, './src');
const BUILD_DIR = resolve(__dirname, './dist/app');

export default defineConfig(() => {
    const licenseContent = fs.readFileSync('./LICENSE', { encoding: 'utf-8' });
    const buildUnixTime = process.env['buildUnixTime'] || '';

    return {
        root: SRC_DIR,
        base: './',
        define: {
            __OSCAR_IS_PRODUCTION__: process.env['NODE_ENV'] === 'production',
            __OSCAR_VERSION__: JSON.stringify(packageFile.version),
            __OSCAR_BUILD_UNIX_TIME__: JSON.stringify(buildUnixTime),
            __OSCAR_BUILD_COMMIT_HASH__: JSON.stringify(git.short()),
            __OSCAR_LICENSE__: JSON.stringify(licenseContent),
        },
        plugins: [
            vue(),
            tailwindcss(),
        ],
        build: {
            target: ['chrome111'],
            outDir: BUILD_DIR,
            sourcemap: false,
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    app: resolve(SRC_DIR, 'app.html'),
                },
            },
        },
        resolve: {
            alias: {
                '@': SRC_DIR,
            },
        },
        server: {
            host: '0.0.0.0',
            port: 5174,
            strictPort: true,
            proxy: {
                '/api': {
                    target: 'http://127.0.0.1:8080/',
                    changeOrigin: true
                },
            }
        },
    };
});
