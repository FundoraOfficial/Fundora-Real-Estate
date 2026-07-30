/**
 * Utility to detect whether the application is running inside an Android APK
 * or Native Mobile Container (e.g. Capacitor, Cordova, Trusted Web Activity, WebView)
 */

export function isNativeAppContainer(): boolean {
  if (typeof window === 'undefined') return false;

  const win = window as any;

  // 1. Capacitor / Cordova global window checks
  if (
    win.Capacitor?.isNativePlatform?.() ||
    win.Capacitor?.getPlatform?.() === 'android' ||
    win.Capacitor?.platform === 'android' ||
    win.cordova !== undefined ||
    win.isNativeApp === true ||
    win.isApkBuild === true
  ) {
    return true;
  }

  // 2. Protocol & asset URI checks (Android APK local assets)
  if (
    win.location.protocol === 'file:' ||
    win.location.href.includes('android_asset') ||
    win.location.hostname === 'localhost' && win.location.pathname.includes('android')
  ) {
    return true;
  }

  // 3. Environment variables set during APK compilation
  if (
    import.meta.env.VITE_IS_APK === 'true' ||
    import.meta.env.VITE_BUILD_TARGET === 'apk' ||
    import.meta.env.VITE_PLATFORM === 'android'
  ) {
    return true;
  }

  // 4. Android WebView / Capacitor shell user agent detection
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isWebView = /wv|Capacitor|Cordova|TWA/i.test(ua);

  if (isAndroid && isWebView) {
    return true;
  }

  return false;
}
