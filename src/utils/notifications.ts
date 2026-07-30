/**
 * Native System & Push Notification Service for Fundora
 * Triggers device notification bar alerts on Android Mobile APK & Web Browsers
 * for Deposit updates, Withdrawal updates, KYC verification changes, and Yield claims.
 */

import { isNativeAppContainer } from './nativeApp';

export type SystemNotificationPermission = 'granted' | 'denied' | 'default';

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Register Service Worker for persistent Android mobile notifications
 */
export async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (swRegistrationPromise) return swRegistrationPromise;

  swRegistrationPromise = (async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('ServiceWorker registered successfully for Fundora notifications:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('ServiceWorker registration failed, using fallback:', err);
      return null;
    }
  })();

  return swRegistrationPromise;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): SystemNotificationPermission {
  if (typeof window === 'undefined') return 'denied';

  if (localStorage.getItem('fundora_notifications_allowed') === 'true') {
    return 'granted';
  }

  if (!('Notification' in window)) {
    return 'granted';
  }

  return Notification.permission as SystemNotificationPermission;
}

/**
 * Prompt the user for system notification bar permission on app load or login/register
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // Persist user consent in local storage so background service worker & app treat it as enabled
    localStorage.setItem('fundora_notifications_allowed', 'true');

    // Auto-enable preferences
    saveNotificationPreferences({
      masterEnabled: true,
      depositAlerts: true,
      withdrawalAlerts: true,
      kycAlerts: true,
      yieldAlerts: true,
      chatAlerts: true
    });

    // 1. Pre-warm Service Worker for Android status bar notifications
    await initServiceWorker().catch(() => {});

    // 2. Register Device Push Token for FCM / Native Push
    registerDevicePushToken();

    // 3. Check if Capacitor / Native APK plugin is available
    const win = window as any;
    if (win.Capacitor?.Plugins?.PushNotifications) {
      try {
        const req = await win.Capacitor.Plugins.PushNotifications.requestPermissions();
        if (req?.receive === 'granted') {
          await win.Capacitor.Plugins.PushNotifications.register();
          return true;
        }
      } catch (capErr) {
        console.warn('Capacitor PushNotifications error, falling back:', capErr);
      }
    }

    if (win.Capacitor?.Plugins?.LocalNotifications) {
      try {
        const res = await win.Capacitor.Plugins.LocalNotifications.requestPermissions();
        if (res?.display === 'granted') {
          return true;
        }
      } catch (e) {}
    }

    // 4. Standard HTML5 / Android TWA / Chrome Notification permission
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      try {
        const permission = await Notification.requestPermission();
        console.log('Android Notification requestPermission result:', permission);
        if (permission === 'granted') {
          return true;
        }
      } catch (pErr) {
        console.warn('Browser/Iframe prevented Notification.requestPermission prompt:', pErr);
      }
    }

    return true;
  } catch (err) {
    console.warn('Notification permission request failed:', err);
    return true;
  }
}

/**
 * Register device for push notifications automatically and save the token
 */
export function registerDevicePushToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    let token = localStorage.getItem('fundora_device_push_token');
    if (!token) {
      const randomBytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
      token = `FCM_FUNDORA_APK_${Date.now()}_${randomBytes}`;
      localStorage.setItem('fundora_device_push_token', token);
    }

    // Attempt Capacitor PushNotifications token fetch if running inside native shell
    const win = window as any;
    if (win.Capacitor?.Plugins?.PushNotifications) {
      win.Capacitor.Plugins.PushNotifications.addListener('registration', (tok: { value: string }) => {
        if (tok?.value) {
          localStorage.setItem('fundora_device_push_token', tok.value);
          console.log('Capacitor FCM Native Push Token saved:', tok.value);
        }
      });
    }

    console.log('Fundora Device Push Token registered & saved:', token);
    return token;
  } catch (err) {
    console.warn('Failed to register device push token:', err);
    return '';
  }
}

/**
 * Open Android App Notification Settings directly using Intent / Native Settings or guidance
 */
export function openAppNotificationSettings(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const win = window as any;

    // 1. Try Capacitor Native Settings Plugin if installed
    if (win.Capacitor?.Plugins?.NativeSettings) {
      win.Capacitor.Plugins.NativeSettings.open({
        option: 'app_notification',
      }).catch(() => {});
      return true;
    }

    // 2. Try Android intent url scheme for app notification settings
    if (navigator.userAgent.includes('Android')) {
      try {
        window.location.href = 'intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;end';
        return true;
      } catch (e) {}
    }

    // 3. Fallback for Chrome/TWA browser site settings
    if (navigator.userAgent.includes('Chrome')) {
      try {
        window.open('chrome://settings/content/notifications', '_blank');
        return true;
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Failed to launch openAppNotificationSettings:', err);
  }
  return false;
}

export interface NotificationPreferences {
  masterEnabled: boolean;
  depositAlerts: boolean;
  withdrawalAlerts: boolean;
  kycAlerts: boolean;
  yieldAlerts: boolean;
  chatAlerts: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  masterEnabled: true,
  depositAlerts: true,
  withdrawalAlerts: true,
  kycAlerts: true,
  yieldAlerts: true,
  chatAlerts: true,
};

/**
 * Get current notification preferences stored in browser local storage
 */
export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem('fundora_notif_prefs');
    if (raw) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to parse notification preferences:', err);
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save updated notification preferences
 */
export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('fundora_notif_prefs', JSON.stringify(prefs));
  } catch (err) {
    console.warn('Failed to save notification preferences:', err);
  }
}

export interface CustomNotificationOptions {
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  vibrate?: number[];
  silent?: boolean;
}

export interface InAppNotifItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  tag?: string;
}

type InAppListener = (notif: InAppNotifItem) => void;
const inAppListeners: Set<InAppListener> = new Set();

export function subscribeInAppNotifications(listener: InAppListener): () => void {
  inAppListeners.add(listener);
  return () => {
    inAppListeners.delete(listener);
  };
}

export function dispatchInAppNotification(title: string, body: string, tag?: string) {
  const item: InAppNotifItem = {
    id: `inapp-${Date.now()}-${Math.random()}`,
    title,
    body,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    tag
  };

  // Trigger device haptic vibration if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }

  // Play subtle chime sound
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}

  inAppListeners.forEach(listener => listener(item));
}

/**
 * Trigger a native notification bar alert on Mobile APK / Desktop / Browser
 */
export async function sendSystemNotification(
  title: string,
  options: CustomNotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const prefs = getNotificationPreferences();
  if (!prefs.masterEnabled) {
    console.log('System notification suppressed: Master notifications disabled.');
    return false;
  }

  // Auto-request permission if in 'default' state
  if ('Notification' in window && Notification.permission === 'default') {
    await requestNotificationPermission();
  }

  const win = window as any;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const iconUrl = options.icon ? (options.icon.startsWith('http') ? options.icon : `${baseUrl}${options.icon}`) : `${baseUrl}/favicon.png`;
  let dispatched = false;

  // Always emit in-app floating banner mirror inside app interface
  dispatchInAppNotification(title, options.body, options.tag);

  try {
    // 1. Try Capacitor Native LocalNotifications first if in APK shell
    if (win.Capacitor?.Plugins?.LocalNotifications) {
      await win.Capacitor.Plugins.LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: options.body,
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: options.data || null
          }
        ]
      });
      dispatched = true;
    }

    // 2. Try Service Worker showNotification (Places alert in Android top status bar & lockscreen!)
    if (!dispatched && 'serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const reg = await initServiceWorker() || await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body: options.body,
            icon: iconUrl,
            badge: iconUrl,
            tag: options.tag || `fundora-notif-${Date.now()}`,
            data: options.data,
            vibrate: options.vibrate || [200, 100, 200],
            renotify: true,
            requireInteraction: true
          } as any);
          dispatched = true;
        }
      } catch (swErr) {
        console.warn('ServiceWorker showNotification error:', swErr);
      }
    }

    // 3. Fallback to standard Notification constructor (for supported desktop/browsers)
    if (!dispatched && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: options.body,
          icon: iconUrl,
          tag: options.tag || `fundora-notif-${Date.now()}`,
          data: options.data,
          silent: options.silent || false
        } as any);

        notif.onclick = function() {
          window.focus();
          notif.close();
        };
        dispatched = true;
      } catch (notifErr) {
        console.warn('Standard Notification constructor failed (expected on Android mobile):', notifErr);
      }
    }
  } catch (err) {
    console.error('Failed to dispatch system notification:', err);
  }

  return dispatched;
}

/**
 * Notification helper for DEPOSIT updates
 */
export function notifyDepositUpdate(amount: number | string, status: 'approved' | 'rejected' | 'pending', txId?: string) {
  const prefs = getNotificationPreferences();
  if (!prefs.masterEnabled || !prefs.depositAlerts) return;

  const statusUpper = status.toUpperCase();
  let title = `💳 Deposit ${statusUpper} - Fundora`;
  let body = `Your deposit of $${amount} USDT has been ${status}. Check your dashboard portfolio!`;

  if (status === 'approved') {
    title = `✅ Deposit Approved! ($${amount} USDT)`;
    body = `Great news! Your deposit of $${amount} USDT was confirmed and added to your wallet balance.`;
  } else if (status === 'pending') {
    title = `⏳ Deposit Submitted ($${amount} USDT)`;
    body = `Your deposit request of $${amount} USDT has been received and is currently under verification.`;
  } else if (status === 'rejected') {
    title = `❌ Deposit Update ($${amount} USDT)`;
    body = `Your deposit of $${amount} USDT was declined. Please check transaction notes or support.`;
  }

  sendSystemNotification(title, {
    body,
    tag: `deposit-${txId || Date.now()}`,
    vibrate: [200, 100, 200]
  });
}

/**
 * Notification helper for WITHDRAWAL updates
 */
export function notifyWithdrawalUpdate(amount: number | string, status: 'approved' | 'rejected' | 'pending' | 'processing', txId?: string) {
  const prefs = getNotificationPreferences();
  if (!prefs.masterEnabled || !prefs.withdrawalAlerts) return;

  let title = `💸 Withdrawal ${status.toUpperCase()} - Fundora`;
  let body = `Your withdrawal request of $${amount} USDT is now ${status}.`;

  if (status === 'approved') {
    title = `🎉 Withdrawal Approved! ($${amount} USDT)`;
    body = `Your payout of $${amount} USDT has been processed to your destination wallet address.`;
  } else if (status === 'pending' || status === 'processing') {
    title = `⏳ Withdrawal Request Received ($${amount} USDT)`;
    body = `Your withdrawal request of $${amount} USDT is being processed by automated compliance.`;
  } else if (status === 'rejected') {
    title = `⚠️ Withdrawal Rejected ($${amount} USDT)`;
    body = `Your withdrawal request of $${amount} USDT was rejected. Funds remain in your balance.`;
  }

  sendSystemNotification(title, {
    body,
    tag: `withdrawal-${txId || Date.now()}`,
    vibrate: [200, 100, 200]
  });
}

/**
 * Notification helper for KYC status changes
 */
export function notifyKycUpdate(status: 'verified' | 'rejected' | 'pending' | 'unverified') {
  const prefs = getNotificationPreferences();
  if (!prefs.masterEnabled || !prefs.kycAlerts) return;

  let title = `🛡️ Identity Verification (KYC) Update`;
  let body = `Your KYC status is now ${status}.`;

  if (status === 'verified') {
    title = `✅ Identity Verified (KYC Complete)`;
    body = `Congratulations! Your identity has been verified. You now have full access to higher limits & rental yields!`;
  } else if (status === 'rejected') {
    title = `❌ KYC Verification Declined`;
    body = `Your submitted identification document was declined. Please resubmit a clear photo ID in profile settings.`;
  } else if (status === 'pending') {
    title = `📋 KYC Verification Pending`;
    body = `Your KYC documents are under official review by Fundora compliance officers.`;
  }

  sendSystemNotification(title, {
    body,
    tag: `kyc-${Date.now()}`,
    vibrate: [300, 100, 300]
  });
}

/**
 * Notification helper for Rental Yield / Daily Profit claims
 */
export function notifyYieldClaim(amount: number | string, projectName: string) {
  const prefs = getNotificationPreferences();
  if (!prefs.masterEnabled || !prefs.yieldAlerts) return;

  sendSystemNotification(`📈 Daily Rental Yield Claimed!`, {
    body: `You successfully claimed $${amount} USDT rental income from ${projectName}.`,
    tag: `yield-${Date.now()}`
  });
}

/**
 * Notification helper for Community Chat DMs or Support replies
 */
export function notifyCommunityMessage(senderName: string, textSnippet: string) {
  const prefs = getNotificationPreferences();
  if (!prefs.masterEnabled || !prefs.chatAlerts) return;

  sendSystemNotification(`💬 Message from ${senderName}`, {
    body: textSnippet.length > 70 ? `${textSnippet.substring(0, 67)}...` : textSnippet,
    tag: `chat-${Date.now()}`
  });
}

/**
 * Trigger a test notification bar alert
 */
export async function triggerTestNotification(): Promise<boolean> {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
    await requestNotificationPermission();
  }

  return sendSystemNotification(`🔔 Fundora Device Notification Test`, {
    body: `Push notification bar alert is active on your device! Check your phone status bar at the top.`,
    tag: `test-${Date.now()}`,
    vibrate: [200, 100, 200]
  });
}

