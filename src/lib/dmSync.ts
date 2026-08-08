/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, cleanPayloadForFirestore } from './firebase';
import { CommunityMessage, Inquiry } from '../types';

export const LOCAL_DM_STORAGE_KEY = 'investya_local_dms';

/**
 * Retrieves stored local DM messages from localStorage
 */
export function getStoredLocalDms(): CommunityMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_DM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('[DM Sync] Failed to parse local DM storage:', err);
    return [];
  }
}

/**
 * Stores/updates a DM message in localStorage cache
 */
export function storeLocalDm(msg: CommunityMessage): void {
  if (typeof window === 'undefined' || !msg) return;
  try {
    const current = getStoredLocalDms();
    const idx = current.findIndex(m => m.id === msg.id);
    if (idx >= 0) {
      current[idx] = msg;
    } else {
      current.push(msg);
    }
    localStorage.setItem(LOCAL_DM_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('[DM Sync] Failed to store local DM:', err);
  }
}

/**
 * Target admin base extractor
 */
export function getTargetBaseFromChannelId(channelId: string): string {
  if (channelId.includes('ethan-ceo')) return 'ethan-ceo';
  if (channelId.includes('admin-1') || channelId.includes('support')) return 'admin-1';
  if (channelId.includes('ai-assistant') || channelId.includes('ai-bot')) return 'ai-assistant';
  return 'ethan-ceo';
}

/**
 * Enforces single, immutable channelId for User-Admin DM conversations.
 * Ensures both user and admin share the exact same inquiry document in Firestore.
 */
export async function getOrInitializeDMChannel(
  user: { id: string; name: string; email: string },
  targetBase: string = 'ethan-ceo'
): Promise<{ channelId: string; inquiryId: string }> {
  const cleanTargetBase = targetBase || 'ethan-ceo';
  const canonicalChannelId = `dm-${cleanTargetBase}-${user.id}`;
  const canonicalInquiryId = `inq-dm-${cleanTargetBase}-${user.id}`;

  if (!db) {
    return { channelId: canonicalChannelId, inquiryId: canonicalInquiryId };
  }

  try {
    const inqRef = doc(db, 'inquiries', canonicalInquiryId);
    const inqSnap = await getDoc(inqRef);

    if (inqSnap.exists()) {
      const data = inqSnap.data() as Inquiry;
      if (data.channelId !== canonicalChannelId) {
        await setDoc(inqRef, cleanPayloadForFirestore({ ...data, channelId: canonicalChannelId }), { merge: true });
      }
      return { channelId: canonicalChannelId, inquiryId: canonicalInquiryId };
    }

    // Check if an inquiry exists with user email
    const q = query(collection(db, 'inquiries'), where('email', '==', user.email));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      const existingDoc = querySnap.docs[0];
      const existingData = existingDoc.data() as Inquiry;
      const effectiveChannelId = existingData.channelId || canonicalChannelId;
      return { channelId: effectiveChannelId, inquiryId: existingDoc.id };
    }

    // Initialize new Inquiry doc in Firestore
    const newInquiry: Inquiry = {
      id: canonicalInquiryId,
      name: user.name || 'User',
      email: user.email || '',
      message: 'Direct Inquiry Stream Initialized',
      timestamp: new Date().toISOString(),
      status: 'Pending',
      channelId: canonicalChannelId
    };

    await setDoc(inqRef, cleanPayloadForFirestore(newInquiry));
    return { channelId: canonicalChannelId, inquiryId: canonicalInquiryId };
  } catch (err) {
    console.warn('[DM Sync] Firestore channel initialization error:', err);
    return { channelId: canonicalChannelId, inquiryId: canonicalInquiryId };
  }
}

/**
 * Checks whether a message belongs to a specific DM channel, including legacy channels.
 */
export function isMessageInDmChannel(
  m: CommunityMessage,
  targetChanId: string,
  currentUserId?: string,
  currentUserEmail?: string
): boolean {
  if (!m || !m.channelId) return false;
  if (m.channelId === targetChanId) return true;
  if (!targetChanId.startsWith('dm-')) return false;

  const targetBase = getTargetBaseFromChannelId(targetChanId);
  const mTargetBase = getTargetBaseFromChannelId(m.channelId);

  if (!targetBase || targetBase !== mTargetBase) return false;

  const userPart = targetChanId.replace(`dm-${targetBase}-`, '').replace(`dm-${targetBase}`, '');

  if (m.channelId === `dm-${targetBase}`) {
    if (userPart && (m.senderId === userPart || (currentUserId && userPart === currentUserId) || m.senderEmail === currentUserEmail)) {
      return true;
    }
    if (m.senderId === 'ethan-ceo' || m.senderId === 'admin-1' || m.senderId === 'ai-assistant') {
      return true;
    }
  }

  return false;
}

/**
 * Permanently saves a message to Firestore and local cache.
 */
export async function saveDMMessage(msg: CommunityMessage): Promise<void> {
  if (!msg) return;

  // 1. Store in local cache immediately
  storeLocalDm(msg);

  // 2. Persist to Firestore
  if (db) {
    try {
      await setDoc(doc(db, 'messages', msg.id), cleanPayloadForFirestore(msg));
    } catch (err) {
      console.warn('[DM Sync] Error persisting message to Firestore:', err);
    }
  }
}
