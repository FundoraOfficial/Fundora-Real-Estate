import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, TokenMessage, TopicMessage } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

// Singleton Firebase Admin instance
let firebaseAdminApp: App | null = null;

function initFirebaseAdmin(): App | null {
  if (firebaseAdminApp) return firebaseAdminApp;

  const activeApps = getApps();
  if (activeApps.length > 0 && activeApps[0]) {
    firebaseAdminApp = activeApps[0];
    return firebaseAdminApp;
  }

  try {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (rawServiceAccount) {
      let parsedCreds: any;
      const trimmed = rawServiceAccount.trim();
      if (trimmed.startsWith('{')) {
        parsedCreds = JSON.parse(trimmed);
      } else {
        try {
          const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
          parsedCreds = JSON.parse(decoded);
        } catch {
          parsedCreds = JSON.parse(trimmed);
        }
      }

      firebaseAdminApp = initializeApp({
        credential: cert(parsedCreds)
      });
      console.log('[Firebase Admin Vercel] Successfully initialized Firebase Admin SDK.');
      return firebaseAdminApp;
    } else {
      console.warn('[Firebase Admin Vercel] FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
    }
  } catch (err: any) {
    console.error('[Firebase Admin Vercel] Initialization error:', err?.message || err);
  }

  return null;
}

export default async function handler(req: any, res: any) {
  // 1. Enable CORS for GitHub Pages and cross-origin frontend apps
  const origin = req.headers.origin || req.headers.Origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { userEmail, userId, title, body, type, route, channelId, extraData } = req.body || {};
  let targetToken = req.body?.targetToken;

  try {
    console.log(`[FCM Vercel API] Push request for "${userEmail || userId || 'token'}": "${title}" - "${body}"`);

    const adminApp = initFirebaseAdmin();

    if (adminApp) {
      const notificationTitle = title || 'Fundora Notification';
      const notificationBody = body || '';
      const targetChannel = channelId || 'fundora_notifications';

      const messageData: Record<string, string> = {
        title: String(notificationTitle),
        body: String(notificationBody),
        type: String(type || 'system'),
        route: String(route || '#/overview'),
        timestamp: new Date().toISOString()
      };

      if (extraData && typeof extraData === 'object') {
        for (const [key, val] of Object.entries(extraData)) {
          messageData[key] = String(val);
        }
      }

      // If direct targetToken was not supplied in request, search user document in Firestore
      if (!targetToken && (userId || userEmail)) {
        try {
          const db = getFirestore(adminApp);
          if (userId) {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
              const d = userDoc.data();
              targetToken = d?.fcmToken || (Array.isArray(d?.fcmTokens) ? d?.fcmTokens[0] : undefined);
            }
          }
          if (!targetToken && userEmail) {
            const cleanEmail = userEmail.trim().toLowerCase();
            const emailDoc = await db.collection('users').doc(cleanEmail).get();
            if (emailDoc.exists) {
              const d = emailDoc.data();
              targetToken = d?.fcmToken || (Array.isArray(d?.fcmTokens) ? d?.fcmTokens[0] : undefined);
            } else {
              const querySnap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
              if (!querySnap.empty && querySnap.docs[0]) {
                const d = querySnap.docs[0].data();
                targetToken = d?.fcmToken || (Array.isArray(d?.fcmTokens) ? d?.fcmTokens[0] : undefined);
              }
            }
          }
          if (targetToken) {
            console.log(`[FCM Vercel API] Retrieved target FCM token from Firestore for ${userId || userEmail}: ${targetToken.substring(0, 15)}...`);
          } else {
            console.warn(`[FCM Vercel API] No FCM token found in Firestore for ${userId || userEmail}.`);
          }
        } catch (fsErr: any) {
          console.warn('[FCM Vercel API] Firestore token lookup warning:', fsErr?.message || fsErr);
        }
      }

      // Option A: Send via direct target FCM token
      if (targetToken) {
        try {
          const tokenMsg: TokenMessage = {
            token: targetToken,
            notification: {
              title: notificationTitle,
              body: notificationBody
            },
            data: messageData,
            android: {
              priority: 'high',
              notification: {
                title: notificationTitle,
                body: notificationBody,
                sound: 'default',
                channelId: targetChannel,
                priority: 'high',
                visibility: 'public',
                defaultSound: true,
                defaultVibrateTimings: true
              }
            }
          };

          const messageId = await getMessaging(adminApp).send(tokenMsg);
          console.log(`[FCM Vercel API] Successfully sent to FCM token: ${messageId}`);
          return res.status(200).json({ success: true, via: 'firebase_admin_sdk', target: 'token', messageId, tokenUsed: targetToken });
        } catch (tokenErr: any) {
          console.warn(`[FCM Vercel API] Direct token send warning: ${tokenErr?.message || tokenErr}`);
        }
      }

      // Option B: Send via User Topic fallback
      if (userEmail) {
        try {
          const topicName = `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const topicMsg: TopicMessage = {
            topic: topicName,
            notification: {
              title: notificationTitle,
              body: notificationBody
            },
            data: messageData,
            android: {
              priority: 'high',
              notification: {
                title: notificationTitle,
                body: notificationBody,
                sound: 'default',
                channelId: targetChannel,
                priority: 'high',
                visibility: 'public',
                defaultSound: true,
                defaultVibrateTimings: true
              }
            }
          };

          const messageId = await getMessaging(adminApp).send(topicMsg);
          console.log(`[FCM Vercel API] Successfully sent to topic "${topicName}": ${messageId}`);
          return res.status(200).json({ success: true, via: 'firebase_admin_sdk', target: 'topic', topicName, messageId });
        } catch (topicErr: any) {
          console.warn(`[FCM Vercel API] Topic send warning: ${topicErr?.message || topicErr}`);
        }
      }
    }

    // Fallback response if Firebase Admin SDK is missing credentials
    return res.status(200).json({
      success: false,
      via: 'vercel_serverless_handler',
      message: 'Firebase Admin SDK credentials not configured in Vercel environment variables or token missing.',
      requiredEnvVar: 'FIREBASE_SERVICE_ACCOUNT_JSON'
    });
  } catch (err: any) {
    console.error('[FCM Vercel API Error]', err?.message || err);
    return res.status(500).json({ error: 'Internal Server Error', details: err?.message || String(err) });
  }
}
