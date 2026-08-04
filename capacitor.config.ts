// Fundora Web-to-APK Configuration - Live Server Webview Wrapper
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'one.fundora.app',
  appName: 'Fundora',
  webDir: 'dist',
  server: {
    url: 'https://fundora.one',
    allowNavigation: ['*', 'fundora.one', '*.fundora.one', '*.run.app'],
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: false
    },
    CapacitorCookies: {
      enabled: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: "#030514",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    }
  }
};

export default config;
