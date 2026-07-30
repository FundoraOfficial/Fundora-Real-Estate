/**
 * Native System & Push Notification Service for Fundora
 * Triggers device notification bar alerts on Android Mobile APK & Web Browsers
 * for Deposit updates, Withdrawal updates, KYC verification changes, and Yield claims.
 */

import { isNativeAppContainer } from './nativeApp';

export type SystemNotificationPermission = 'granted' | 'denied' | 'default';

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): SystemNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission as SystemNotificationPermission;
}

/**
 * Prompt the user for system notification bar permission on app load or login/register
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // Check if Capacitor / Native plugin is available
    const win = window as any;
    if (win.Capacitor?.Plugins?.LocalNotifications) {
      const res = await win.Capacitor.Plugins.LocalNotifications.requestPermissions();
      if (res?.display === 'granted') return true;
    }

    // Standard HTML5 / Android WebView Notification permission
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    }
  } catch (err) {
    console.warn('Notification permission request failed:', err);
  }
  return false;
}

export interface NotificationOptions {
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  vibrate?: number[];
  silent?: boolean;
}

/**
 * Trigger a native notification bar alert on Mobile APK / Desktop / Browser
 */
export async function sendSystemNotification(
  title: string,
  options: NotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const win = window as any;
  const icon = options.icon || '/favicon.ico';

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
      return true;
    }

    // 2. Try Standard Web / Android WebView Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      // Create native system notification
      const notif = new Notification(title, {
        body: options.body,
        icon,
        tag: options.tag || `fundora-notif-${Date.now()}`,
        data: options.data,
        silent: options.silent || false
      });

      // Play subtle notification audio feedback if available
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {
        // Audio optional
      }

      notif.onclick = function() {
        window.focus();
        notif.close();
      };
      return true;
    }
  } catch (err) {
    console.error('Failed to dispatch system notification:', err);
  }

  return false;
}

/**
 * Notification helper for DEPOSIT updates
 */
export function notifyDepositUpdate(amount: number | string, status: 'approved' | 'rejected' | 'pending', txId?: string) {
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
  sendSystemNotification(`📈 Daily Rental Yield Claimed!`, {
    body: `You successfully claimed $${amount} USDT rental income from ${projectName}.`,
    tag: `yield-${Date.now()}`
  });
}

/**
 * Notification helper for Community Chat DMs or Support replies
 */
export function notifyCommunityMessage(senderName: string, textSnippet: string) {
  sendSystemNotification(`💬 Message from ${senderName}`, {
    body: textSnippet.length > 70 ? `${textSnippet.substring(0, 67)}...` : textSnippet,
    tag: `chat-${Date.now()}`
  });
}
