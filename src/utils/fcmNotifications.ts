/**
 * Fundora Production FCM (Firebase Cloud Messaging) Native Push Notification Engine
 * Handles Capacitor Android Push Notifications, Device Token Registration, Channel Setup,
 * Background/Closed App Delivery, and Event-Driven Notification Dispatching.
 */

import { PushNotifications, Channel, PermissionStatus, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { db } from '../lib/firebase';
import { isFirebaseEnabled } from '../lib/firebaseSync';
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { UserAccount, UserNotification } from '../types';

export const FCM_CHANNEL_ID = 'fundora_notifications';
export const FCM_CHANNEL_NAME = 'Fundora Notifications';

let isFcmInitialized = false;
let currentRegisteredToken = '';

/**
 * Check if app is running in Capacitor Native Android Shell with Push Notifications plugin
 */
export function isCapacitorAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isNativePushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');
}

/**
 * Configure Android FCM Notification Channel
 */
export async function createFundoraNotificationChannel(): Promise<void> {
  if (!isNativePushSupported()) return;

  try {
    const channel: Channel = {
      id: FCM_CHANNEL_ID,
      name: FCM_CHANNEL_NAME,
      description: 'Fundora Real Estate investment updates, yields, deposits, and account alerts',
      importance: 5, // High / Max priority for lockscreen & status bar popups
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#38BDF8',
      visibility: 1 // Public on lockscreen
    };

    await PushNotifications.createChannel(channel);
    console.log(`[FCM Native Engine] Notification channel "${FCM_CHANNEL_ID}" created/updated successfully.`);
  } catch (err) {
    console.warn('[FCM Native Engine] Failed to create notification channel:', err);
  }
}

/**
 * Save FCM token to logged-in user account in Firestore and LocalStorage
 */
export async function saveFcmTokenToUser(token: string, userIdOrEmail?: string): Promise<void> {
  if (!token) return;

  currentRegisteredToken = token;
  localStorage.setItem('fundora_fcm_token', token);
  localStorage.setItem('fundora_device_push_token', token);

  console.log(`[FCM Native Engine] FCM Device Token saved locally: ${token.substring(0, 20)}...`);

  // Try saving token to logged-in user in Firestore
  try {
    let targetUserId = userIdOrEmail;
    if (!targetUserId) {
      const storedUserRaw = localStorage.getItem('fundora_user') || localStorage.getItem('fundora_current_user');
      if (storedUserRaw) {
        try {
          const parsed = JSON.parse(storedUserRaw);
          targetUserId = parsed?.id || parsed?.email;
        } catch (e) {}
      }
    }

    if (targetUserId && isFirebaseEnabled()) {
      const cleanTarget = targetUserId.trim().toLowerCase();
      // Update by user id or clean email doc
      const userRef = doc(db, 'users', targetUserId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        await updateDoc(userRef, {
          fcmToken: token,
          fcmTokens: arrayUnion(token),
          lastTokenUpdate: new Date().toISOString()
        });
        console.log(`[FCM Native Engine] Successfully linked FCM token to user document "${targetUserId}" in Firestore.`);
      } else {
        // Search by email doc
        const emailRef = doc(db, 'users', cleanTarget);
        const emailSnap = await getDoc(emailRef);
        if (emailSnap.exists()) {
          await updateDoc(emailRef, {
            fcmToken: token,
            fcmTokens: arrayUnion(token),
            lastTokenUpdate: new Date().toISOString()
          });
          console.log(`[FCM Native Engine] Linked FCM token to user email document "${cleanTarget}".`);
        }
      }
    }
  } catch (err) {
    console.warn('[FCM Native Engine] Warning updating user FCM token in Firestore:', err);
  }
}

/**
 * Initialize FCM Push Notifications on Android App launch or User Login
 */
export async function initFcmPushNotifications(currentUser?: UserAccount | null): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const isSupported = isNativePushSupported();
  console.log(`[FCM Native Engine] Initializing Push Notifications... IsNativePushSupported: ${isSupported}`);

  if (isSupported) {
    // Create notification channel first on Android native
    await createFundoraNotificationChannel();

    try {
      if (!isFcmInitialized) {
        // Register Push Notification Event Listeners
        PushNotifications.addListener('registration', async (token) => {
          console.log(`[FCM Native Engine SUCCESS] Registered with FCM! Device Token: ${token.value}`);
          await saveFcmTokenToUser(token.value, currentUser?.id || currentUser?.email);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('[FCM Native Engine ERROR] FCM Registration Failed:', JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('[FCM Native Engine] Push Notification Received in Foreground:', notification);
          // Trigger in-app banner or sound
          if (typeof window !== 'undefined' && (window as any).dispatchInAppNotification) {
            (window as any).dispatchInAppNotification(notification.title || 'Fundora Alert', notification.body || '');
          }
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          console.log('[FCM Native Engine] User tapped push notification:', action);
          const data = action.notification.data || {};
          const route = data.route || data.link || data.type;

          if (route && typeof window !== 'undefined') {
            if (route.startsWith('/')) {
              window.location.hash = route;
            } else if (route === 'deposit' || route === 'withdrawal') {
              window.location.hash = '#/wallet';
            } else if (route === 'kyc') {
              window.location.hash = '#/profile';
            } else if (route === 'investment' || route === 'yield') {
              window.location.hash = '#/overview';
            } else if (route === 'referral') {
              window.location.hash = '#/referrals';
            } else if (route === 'support') {
              window.location.hash = '#/support';
            } else if (route === 'security') {
              window.location.hash = '#/security';
            }
          }
        });

        isFcmInitialized = true;
      }

      // Check current permission state
      let permStatus: PermissionStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive === 'granted') {
        console.log('[FCM Native Engine] Permission granted! Registering with FCM service...');
        await PushNotifications.register();
        return true;
      } else {
        console.warn('[FCM Native Engine] FCM Notification permission was denied by user.');
      }
    } catch (err) {
      console.error('[FCM Native Engine] Exception during FCM registration:', err);
    }
  } else {
    // Web / Browser Fallback device token generation
    let webToken = localStorage.getItem('fundora_fcm_token');
    if (!webToken) {
      const randStr = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
      webToken = `WEB_FCM_${Date.now()}_${randStr}`;
      localStorage.setItem('fundora_fcm_token', webToken);
    }
    if (currentUser) {
      await saveFcmTokenToUser(webToken, currentUser.id || currentUser.email);
    }
  }

  return false;
}

/**
 * Dispatch Push Notification for all key Fundora platform events
 */
export async function sendFcmEventNotification(params: {
  userEmail: string;
  userId?: string;
  title: string;
  body: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'profit' | 'community' | 'referral' | 'system' | 'kyc' | 'security';
  route?: string;
  extraData?: Record<string, any>;
}): Promise<boolean> {
  const { userEmail, userId, title, body, type, route, extraData } = params;

  console.log(`[FCM Event Dispatcher] Sending FCM Push Notification ("${title}") to ${userEmail}...`);

  // 1. Save notification to user's history in Firestore so it's reflected inside user account
  if (isFirebaseEnabled()) {
    try {
      const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const notifItem: UserNotification = {
        id: notifId,
        userId: userId || userEmail,
        title,
        message: body,
        type: type === 'kyc' || type === 'security' ? 'system' : type,
        date: new Date().toISOString(),
        read: false,
        link: route || '#/overview'
      };
      await setDoc(doc(db, 'user_notifications', notifId), notifItem);
    } catch (err) {
      console.warn('[FCM Event Dispatcher] Could not save notification log to Firestore:', err);
    }
  }

  // 2. Post to backend FCM push gateway endpoint
  try {
    const backendUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/notifications/send-fcm` : '/api/notifications/send-fcm';
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail,
        userId,
        title,
        body,
        type,
        route,
        channelId: FCM_CHANNEL_ID,
        extraData
      })
    });

    if (response.ok) {
      const resData = await response.json();
      console.log(`[FCM Event Dispatcher] Backend dispatch result:`, resData);
      return true;
    }
  } catch (err) {
    console.warn('[FCM Event Dispatcher] Backend FCM API call failed:', err);
  }

  return false;
}

// Dedicated Event Wrappers for all required account activities:

export function triggerFcmDepositSubmitted(email: string, amount: number | string, network: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '⏳ Deposit Submitted',
    body: `Your deposit request of $${amount} USDT (${network}) has been received and is under verification.`,
    type: 'deposit',
    route: '#/wallet'
  });
}

export function triggerFcmDepositApproved(email: string, amount: number | string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '✅ Deposit Approved!',
    body: `Great news! Your deposit of $${amount} USDT was confirmed and credited to your wallet balance.`,
    type: 'deposit',
    route: '#/wallet'
  });
}

export function triggerFcmDepositRejected(email: string, amount: number | string, reason?: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '❌ Deposit Rejected',
    body: `Your deposit request of $${amount} USDT was declined. ${reason || 'Please contact support if you need assistance.'}`,
    type: 'deposit',
    route: '#/wallet'
  });
}

export function triggerFcmWithdrawalSubmitted(email: string, amount: number | string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '💸 Withdrawal Submitted',
    body: `Your withdrawal request of $${amount} USDT has been queued for processing.`,
    type: 'withdrawal',
    route: '#/wallet'
  });
}

export function triggerFcmWithdrawalApproved(email: string, amount: number | string, txHash?: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '🎉 Withdrawal Approved!',
    body: `Your payout of $${amount} USDT has been processed to your destination wallet address.`,
    type: 'withdrawal',
    route: '#/wallet'
  });
}

export function triggerFcmWithdrawalRejected(email: string, amount: number | string, reason?: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '⚠️ Withdrawal Rejected',
    body: `Your withdrawal request of $${amount} USDT was rejected. Funds remain safely in your balance.`,
    type: 'withdrawal',
    route: '#/wallet'
  });
}

export function triggerFcmKycSubmitted(email: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '📋 KYC Documents Submitted',
    body: 'Your identity verification documents have been received and are under official review.',
    type: 'kyc',
    route: '#/profile'
  });
}

export function triggerFcmKycApproved(email: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '🛡️ Identity Verified (KYC Complete)',
    body: 'Congratulations! Your identity is verified. You now enjoy higher limits & full yield access.',
    type: 'kyc',
    route: '#/profile'
  });
}

export function triggerFcmKycRejected(email: string, reason?: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '❌ KYC Verification Declined',
    body: `Your identification document was declined. ${reason || 'Please re-upload a clear photo ID.'}`,
    type: 'kyc',
    route: '#/profile'
  });
}

export function triggerFcmInvestmentActivated(email: string, projectName: string, shares: number, totalAmount: number) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '🏢 Real Estate Shares Activated!',
    body: `You successfully purchased ${shares} shares ($${totalAmount} USDT) in ${projectName}. Daily yield is now active!`,
    type: 'investment',
    route: '#/overview'
  });
}

export function triggerFcmDailyProfitAvailable(email: string, amount: number | string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '📈 Daily Rental Yield Available!',
    body: `You have $${amount} USDT in unclaimed daily rental income waiting in your portfolio. Tap to claim!`,
    type: 'profit',
    route: '#/overview'
  });
}

export function triggerFcmProfitClaimed(email: string, amount: number | string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '💰 Rental Yield Claimed',
    body: `Successfully claimed $${amount} USDT rental income directly into your available balance!`,
    type: 'profit',
    route: '#/overview'
  });
}

export function triggerFcmReferralBonus(email: string, bonusAmount: number, refereeNameOrEmail: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '🎁 Referral Bonus Received!',
    body: `You earned a $${bonusAmount} USDT commission reward from team member ${refereeNameOrEmail}!`,
    type: 'referral',
    route: '#/referrals'
  });
}

export function triggerFcmSupportReply(email: string, snippet: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '💬 New Support Message',
    body: `Support Concierge: ${snippet}`,
    type: 'community',
    route: '#/support'
  });
}

export function triggerFcmSecurityAlert(email: string, alertText: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '🚨 Security Alert',
    body: alertText,
    type: 'security',
    route: '#/security'
  });
}

export function triggerFcmNewLoginAlert(email: string, ipAddress?: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '🔐 New Login Detected',
    body: `Your Fundora account was accessed from a new session${ipAddress ? ` (IP: ${ipAddress})` : ''}. If this wasn't you, secure your account immediately.`,
    type: 'security',
    route: '#/security'
  });
}

export function triggerFcmPasswordChanged(email: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '🔑 Password Changed',
    body: 'Your Fundora account password was updated successfully.',
    type: 'security',
    route: '#/security'
  });
}

export function triggerFcmOtpVerification(email: string, code: string) {
  return sendFcmEventNotification({
    userEmail: email,
    title: '🔢 Security OTP Verification Code',
    body: `Your Fundora security verification code is: ${code}. Valid for 10 minutes.`,
    type: 'system',
    route: '#/security'
  });
}
