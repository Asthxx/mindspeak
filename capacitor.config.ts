import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mindspeak.app',
  appName: 'MindSpeak',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    buildOptions: {
      keystorePath: 'mindspeak.jks',
      keystoreAlias: 'mindspeak',
    }
  }
};

export default config;
