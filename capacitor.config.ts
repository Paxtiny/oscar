import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nicodaimus.oscar',
  appName: 'oscar',
  webDir: 'dist/app',
  server: {
    androidScheme: 'https',
    hostname: 'localhost'
  }
};

export default config;
