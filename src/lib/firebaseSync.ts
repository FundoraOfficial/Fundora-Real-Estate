/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { app, db, auth, FIREBASE_DATABASE_ID, firebaseConfig } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  getDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';

// Explicit Debug Logger for Firestore Reads/Writes as requested
export const logFirestoreOp = (op: 'READ' | 'WRITE' | 'DELETE' | 'LISTEN', collectionName: string, docId: string, extra?: any) => {
  console.log(
    `[FIRESTORE ${op}] Collection: "${collectionName}" | DocID: "${docId}" | ProjectID: "${firebaseConfig.projectId}" | DatabaseID: "${FIREBASE_DATABASE_ID}" | Time: ${new Date().toISOString()}`,
    extra !== undefined ? extra : ''
  );
};

// Helper to sanitize payload and remove any undefined fields that cause Firestore setDoc/updateDoc to reject
export const cleanPayloadForFirestore = <T>(data: T): T => {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
};
import { 
  INITIAL_PROJECTS, 
  INITIAL_USER, 
  INITIAL_ADMIN, 
  INITIAL_TRANSACTIONS, 
  INITIAL_SECURITY_LOGS 
} from '../data';
import { 
  RealEstateProject, 
  UserAccount, 
  Transaction, 
  InvestmentRecord, 
  ProfitClaimRecord, 
  SecurityLog,
  SystemSettings,
  Inquiry
} from '../types';

// Helper to check if Firebase is correctly configured and working
export const isFirebaseEnabled = (): boolean => {
  return !!db;
};

// Seed initial data if the Firestore collections are completely empty
export const seedInitialDataIfEmpty = async () => {
  if (!isFirebaseEnabled()) return;

  try {
    // 1. Projects
    const projectsCol = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsCol);
    if (projectsSnapshot.empty) {
      console.log('Seeding initial projects to Firestore...');
      for (const proj of INITIAL_PROJECTS) {
        await setDoc(doc(db, 'projects', proj.id), proj);
      }
    }

    // 2. Users
    const usersCol = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCol);
    if (usersSnapshot.empty) {
      console.log('Seeding initial users to Firestore...');
      await setDoc(doc(db, 'users', INITIAL_USER.id), INITIAL_USER);
      await setDoc(doc(db, 'users', INITIAL_ADMIN.id), INITIAL_ADMIN);
    }

    // 3. Transactions
    const txCol = collection(db, 'transactions');
    const txSnapshot = await getDocs(txCol);
    if (txSnapshot.empty) {
      console.log('Seeding initial transactions to Firestore...');
      for (const tx of INITIAL_TRANSACTIONS) {
        await setDoc(doc(db, 'transactions', tx.id), tx);
      }
    }

    // 4. Security Logs
    const logsCol = collection(db, 'security_logs');
    const logsSnapshot = await getDocs(logsCol);
    if (logsSnapshot.empty) {
      console.log('Seeding initial security logs to Firestore...');
      for (const log of INITIAL_SECURITY_LOGS) {
        await setDoc(doc(db, 'security_logs', log.id), log);
      }
    }

    // 5. Investments Default
    const invCol = collection(db, 'investments');
    const invSnapshot = await getDocs(invCol);
    if (invSnapshot.empty) {
      console.log('Seeding initial default investments to Firestore...');
      const defaultRecord: InvestmentRecord = {
        id: 'inv-rec-101',
        userId: 'user-demo',
        userEmail: 'investor@example.com',
        projectId: 'proj-1',
        projectName: 'Canary Wharf Heights',
        sharesPurchased: 5,
        totalCost: 565.00,
        purchaseDate: '2026-06-16',
        dailyProfitRate: 2.50,
        durationMonths: 18,
        remainingMonths: 14,
        status: 'Active'
      };
      await setDoc(doc(db, 'investments', defaultRecord.id), defaultRecord);
    }

    // 6. Claims Default
    const claimsCol = collection(db, 'claims');
    const claimsSnapshot = await getDocs(claimsCol);
    if (claimsSnapshot.empty) {
      console.log('Seeding initial claims history to Firestore...');
      const defaultClaims: ProfitClaimRecord[] = [
        {
          id: 'claim-rec-1',
          userId: 'user-demo',
          userEmail: 'investor@example.com',
          date: '2026-06-21',
          amount: 2.50,
          status: 'Claimed',
          claimedAt: '21:15'
        },
        {
          id: 'claim-rec-2',
          userId: 'user-demo',
          userEmail: 'investor@example.com',
          date: '2026-06-20',
          amount: 2.50,
          status: 'Expired'
        }
      ];
      for (const cl of defaultClaims) {
        await setDoc(doc(db, 'claims', cl.id), cl);
      }
    }

    console.log('Firestore initialization & seeding successfully finished.');
  } catch (error) {
    console.error('Error during Firestore seeding:', error);
  }
};

// Generic Load functions (can be used to pull initial snapshots or fall back to local storage)
export const loadProjectsFromFirebase = async (): Promise<RealEstateProject[] | null> => {
  if (!isFirebaseEnabled()) return null;
  try {
    const snapshot = await getDocs(collection(db, 'projects'));
    if (snapshot.empty) return INITIAL_PROJECTS;
    const projects = snapshot.docs.map(d => d.data() as RealEstateProject);
    return projects.map(p => {
      if (p.id === 'proj-3' || (p.name && p.name.includes('Kensington'))) {
        const updated = { ...p, expectedRoi: 50.8, durationMonths: 2 };
        if (p.expectedRoi !== 50.8 || p.durationMonths !== 2) {
          saveProjectToFirebase(updated).catch(() => {});
        }
        return updated;
      }
      if (p.id === 'proj-6' || p.status === 'Active' || (p.name && p.name.includes('Emaar'))) {
        const updated = { ...p, expectedRoi: 40.5 };
        if (p.expectedRoi !== 40.5) {
          saveProjectToFirebase(updated).catch(() => {});
        }
        return updated;
      }
      return p;
    });
  } catch (e) {
    console.error('Error loading projects from Firebase:', e);
    return null;
  }
};

export const loadUsersFromFirebase = async (): Promise<UserAccount[] | null> => {
  const isAndroid = typeof window !== 'undefined' && (
    /android/i.test(navigator.userAgent) || 
    !!(window as any).Capacitor || 
    window.location.origin.startsWith('file:') || 
    window.location.origin.startsWith('capacitor:') || 
    window.location.origin.startsWith('app:')
  );
  const tag = isAndroid ? '[ANDROID APK - FIRESTORE READ]' : '[WEB - FIRESTORE READ]';

  if (!isFirebaseEnabled()) {
    console.warn(`${tag} loadUsersFromFirebase SKIPPED: isFirebaseEnabled returned false`);
    return null;
  }
  console.log(`${tag} Querying getDocs(collection(db, "users"))...`);
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    console.log(`${tag} SUCCESS: getDocs returned ${snapshot.size} documents in users collection.`);
    if (snapshot.empty) return [INITIAL_USER, INITIAL_ADMIN];
    
    // Automatically migrate old admin email to fundora.one@gmail.com and clean email strings
    const cleanedUsers: UserAccount[] = [];
    for (const d of snapshot.docs) {
      const u = d.data() as UserAccount;
      if (!u) continue;

      const originalEmail = u.email || '';
      const cleanEmail = originalEmail.trim().toLowerCase();
      let updatedUser: UserAccount = { 
        ...u, 
        email: cleanEmail,
        password: u.password ? u.password.trim() : (u.password || '')
      };

      if (updatedUser.id === 'user-admin' && (updatedUser.email === 'admin@fundora.one' || updatedUser.email === 'no-reply@fundora.one')) {
        updatedUser = { ...updatedUser, email: 'fundora.one@gmail.com' };
      }

      // If email or password was untrimmed or contained uppercase characters, rewrite Firestore document to lowercase/normalized form
      const needsEmailRewrite = Boolean(u.email && u.email !== updatedUser.email);
      const needsPasswordRewrite = Boolean(u.password && u.password !== updatedUser.password);
      if (needsEmailRewrite || needsPasswordRewrite) {
        try {
          await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
        } catch (err) {
          console.warn(`${tag} Error updating cleaned user doc in Firestore:`, err);
        }
      }
      if (updatedUser.email && updatedUser.email !== 'no-reply@fundora.one') {
        cleanedUsers.push(updatedUser);
      }
    }

    console.log(`${tag} Cleaned users count: ${cleanedUsers.length}. Emails found:`, cleanedUsers.map(u => u.email));
    return cleanedUsers;
  } catch (e: any) {
    console.error(`${tag} ERROR loading users from Firebase Firestore:`, e);
    return null;
  }
};

export const loadTransactionsFromFirebase = async (): Promise<Transaction[] | null> => {
  if (!isFirebaseEnabled()) return null;
  try {
    const snapshot = await getDocs(collection(db, 'transactions'));
    if (snapshot.empty) return INITIAL_TRANSACTIONS;
    const cleanTxs: Transaction[] = snapshot.docs.map(d => d.data() as Transaction);
    return cleanTxs.sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    console.error('Error loading transactions from Firebase:', e);
    return null;
  }
};

export const loadInvestmentsFromFirebase = async (): Promise<InvestmentRecord[] | null> => {
  if (!isFirebaseEnabled()) return null;
  try {
    const snapshot = await getDocs(collection(db, 'investments'));
    return snapshot.docs.map(d => d.data() as InvestmentRecord);
  } catch (e) {
    console.error('Error loading investments from Firebase:', e);
    return null;
  }
};

export const loadClaimsFromFirebase = async (): Promise<ProfitClaimRecord[] | null> => {
  if (!isFirebaseEnabled()) return null;
  try {
    const snapshot = await getDocs(collection(db, 'claims'));
    return snapshot.docs.map(d => d.data() as ProfitClaimRecord);
  } catch (e) {
    console.error('Error loading claims from Firebase:', e);
    return null;
  }
};

export const loadSecurityLogsFromFirebase = async (): Promise<SecurityLog[] | null> => {
  if (!isFirebaseEnabled()) return null;
  try {
    const snapshot = await getDocs(collection(db, 'security_logs'));
    if (snapshot.empty) return INITIAL_SECURITY_LOGS;
    const logs = snapshot.docs.map(d => d.data() as SecurityLog);
    return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (e) {
    console.error('Error loading security logs from Firebase:', e);
    return null;
  }
};

// Write helpers for real-time synchronization
export const saveProjectToFirebase = async (proj: RealEstateProject) => {
  if (!isFirebaseEnabled() || !proj || !proj.id) return;
  try {
    const cleanProj = cleanPayloadForFirestore(proj);
    logFirestoreOp('WRITE', 'projects', cleanProj.id, { name: cleanProj.name });
    await setDoc(doc(db, 'projects', cleanProj.id), cleanProj);
  } catch (e) {
    console.error('Failed to save project to Firebase:', e);
  }
};

export const saveUserToFirebase = async (user: UserAccount) => {
  const isAndroid = typeof window !== 'undefined' && (
    /android/i.test(navigator.userAgent) || 
    !!(window as any).Capacitor || 
    window.location.origin.startsWith('file:') || 
    window.location.origin.startsWith('capacitor:') || 
    window.location.origin.startsWith('app:')
  );
  const tag = isAndroid ? '[ANDROID APK - FIRESTORE WRITE]' : '[WEB - FIRESTORE WRITE]';

  console.log(`${tag} [ENTER saveUserToFirebase] Input user:`, {
    userObject: user,
    userId: user?.id,
    userEmail: user?.email,
    isFirebaseEnabled: isFirebaseEnabled(),
    dbInstance: !!db,
    appInstance: !!app,
    authInstance: !!auth
  });

  if (!isFirebaseEnabled()) {
    console.warn(`${tag} [EARLY RETURN] Reason: isFirebaseEnabled() returned false. db instance is falsy or uninitialized. db:`, db);
    return;
  }

  if (!user) {
    console.warn(`${tag} [EARLY RETURN] Reason: user argument passed to saveUserToFirebase is null or undefined.`);
    return;
  }

  if (!user.id) {
    console.warn(`${tag} [EARLY RETURN] Reason: user.id is missing or empty on the user object passed:`, user);
    return;
  }

  const cleanEmail = user.email ? user.email.trim().toLowerCase() : '';
  const rawUser: UserAccount = {
    ...user,
    email: cleanEmail,
    password: user.password ? user.password.trim() : (user.password || ''),
    name: user.name ? user.name.trim() : (user.name || '')
  };

  // Strip out any undefined properties that cause Firestore setDoc to reject with 'Unsupported field value: undefined'
  const cleanUser: UserAccount = cleanPayloadForFirestore(rawUser);

  console.log(`${tag} [BEFORE setDoc] Preparing setDoc for doc path "users/${cleanUser.id}":`, {
    cleanUserId: cleanUser.id,
    cleanUserEmail: cleanUser.email,
    isFirebaseEnabled: isFirebaseEnabled(),
    db: db,
    app: app,
    auth: auth,
    cleanUserPayload: cleanUser
  });

  const startTime = Date.now();
  try {
    const userDocRef = doc(db, 'users', cleanUser.id);
    console.log(`${tag} [EXECUTING setDoc] Invoking setDoc(doc(db, "users", "${cleanUser.id}"), cleanUser)...`);
    
    logFirestoreOp('WRITE', 'users', cleanUser.id, { email: cleanUser.email, role: cleanUser.role });
    
    const cachedFcmToken = typeof window !== 'undefined' ? (localStorage.getItem('fundora_device_push_token') || localStorage.getItem('fundora_fcm_token') || undefined) : undefined;
    if (cachedFcmToken && !cleanUser.fcmToken) {
      cleanUser.fcmToken = cachedFcmToken;
    }

    await setDoc(userDocRef, cleanUser, { merge: true });
    
    const duration = Date.now() - startTime;
    console.log(`${tag} [AFTER SUCCESSFUL setDoc] Document setDoc resolved successfully in ${duration}ms for cleanUser.id: "${cleanUser.id}", cleanUser.email: "${cleanUser.email}".`);
  } catch (e: any) {
    const duration = Date.now() - startTime;
    console.error(`${tag} [EXCEPTION IN setDoc] setDoc threw or rejected after ${duration}ms:`, {
      code: e?.code || 'NO_CODE',
      message: e?.message || String(e),
      stack: e?.stack || 'NO_STACK',
      fullErrorObj: e,
      cleanUserId: cleanUser.id,
      cleanUserEmail: cleanUser.email
    });
    throw e;
  }
};

export const deleteUserFromFirebase = async (id: string, userEmail?: string) => {
  if (!isFirebaseEnabled()) return;
  try {
    logFirestoreOp('DELETE', 'users', id);
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (_) {}

    const cleanE = userEmail ? userEmail.trim().toLowerCase() : '';
    if (cleanE) {
      try {
        await deleteDoc(doc(db, 'users', cleanE));
      } catch (_) {}
    }

    const snap = await getDocs(collection(db, 'users'));
    for (const d of snap.docs) {
      const data = d.data();
      const docId = data?.id;
      const docEmail = data?.email ? data.email.trim().toLowerCase() : '';

      if (
        d.id === id || 
        docId === id || 
        (cleanE && (d.id === cleanE || docEmail === cleanE))
      ) {
        try {
          await deleteDoc(doc(db, 'users', d.id));
        } catch (err) {
          console.error(`Failed deleting user doc ${d.id}:`, err);
        }
      }
    }
  } catch (e) {
    console.error('Failed to delete user from Firebase:', e);
  }
};

export const deleteTransactionFromFirebase = async (id: string) => {
  if (!isFirebaseEnabled()) return;
  try {
    logFirestoreOp('DELETE', 'transactions', id);
    await deleteDoc(doc(db, 'transactions', id));
  } catch (e) {
    console.error('Failed to delete transaction from Firebase:', e);
  }
};

export const deleteInvestmentFromFirebase = async (id: string) => {
  if (!isFirebaseEnabled()) return;
  try {
    logFirestoreOp('DELETE', 'investments', id);
    await deleteDoc(doc(db, 'investments', id));
  } catch (e) {
    console.error('Failed to delete investment from Firebase:', e);
  }
};

export const deleteClaimFromFirebase = async (id: string) => {
  if (!isFirebaseEnabled()) return;
  try {
    logFirestoreOp('DELETE', 'claims', id);
    await deleteDoc(doc(db, 'claims', id));
  } catch (e) {
    console.error('Failed to delete claim from Firebase:', e);
  }
};

export const deleteSecurityLogFromFirebase = async (id: string) => {
  if (!isFirebaseEnabled()) return;
  try {
    logFirestoreOp('DELETE', 'security_logs', id);
    await deleteDoc(doc(db, 'security_logs', id));
  } catch (e) {
    console.error('Failed to delete security log from Firebase:', e);
  }
};

export const subscribeToUsersCollection = (callback: (users: UserAccount[]) => void) => {
  if (!isFirebaseEnabled()) {
    console.warn('[DEBUG LOG - USERS SUBSCRIPTION] isFirebaseEnabled returned false');
    return () => {};
  }
  console.log('[DEBUG LOG - USERS SUBSCRIPTION START] Subscribing to "users" onSnapshot...');
  try {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      console.log(`[DEBUG LOG - USERS SUBSCRIPTION SNAPSHOT] Document count: ${snapshot.size}, isFromCache: ${snapshot.metadata.hasPendingWrites}`);
      if (!snapshot.empty) {
        const users = snapshot.docs.map(d => {
          const u = d.data() as UserAccount;
          if (!u || !u.email) return u;
          let cleanEmail = u.email.trim().toLowerCase();
          if (u.id === 'user-admin' && (cleanEmail === 'admin@fundora.one' || cleanEmail === 'no-reply@fundora.one')) {
            cleanEmail = 'fundora.one@gmail.com';
          }
          return {
            ...u,
            email: cleanEmail,
            password: u.password ? u.password.trim() : u.password
          };
        }).filter(u => u && u.email && u.email.trim().toLowerCase() !== 'no-reply@fundora.one');
        console.log('[DEBUG LOG - USERS SUBSCRIPTION SUCCESS] Loaded user emails:', users.map(u => u?.email));
        callback(users as UserAccount[]);
      } else {
        console.log('[DEBUG LOG - USERS SUBSCRIPTION SNAPSHOT] Snapshot empty');
        callback([]);
      }
    }, (err) => {
      console.error('[DEBUG LOG - USERS SUBSCRIPTION ERROR] Real-time users subscription error:', err);
    });
  } catch (err) {
    console.error('[DEBUG LOG - USERS SUBSCRIPTION CATCH] Exception in subscribeToUsersCollection:', err);
    return () => {};
  }
};

export const subscribeToTransactionsCollection = (callback: (txs: Transaction[]) => void) => {
  if (!isFirebaseEnabled()) return () => {};
  try {
    return onSnapshot(collection(db, 'transactions'), (snapshot) => {
      if (!snapshot.empty) {
        const txs = snapshot.docs.map(d => d.data() as Transaction);
        txs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        callback(txs);
      } else {
        callback([]);
      }
    }, (err) => {
      console.warn('Real-time transactions subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed to setup transactions snapshot listener:', err);
    return () => {};
  }
};

export const subscribeToInvestmentsCollection = (callback: (invs: InvestmentRecord[]) => void) => {
  if (!isFirebaseEnabled()) return () => {};
  try {
    return onSnapshot(collection(db, 'investments'), (snapshot) => {
      if (!snapshot.empty) {
        const invs = snapshot.docs.map(d => d.data() as InvestmentRecord);
        callback(invs);
      } else {
        callback([]);
      }
    }, (err) => {
      console.warn('Real-time investments subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed to setup investments snapshot listener:', err);
    return () => {};
  }
};

export const subscribeToProjectsCollection = (callback: (projs: RealEstateProject[]) => void) => {
  if (!isFirebaseEnabled()) return () => {};
  try {
    return onSnapshot(collection(db, 'projects'), (snapshot) => {
      if (!snapshot.empty) {
        const projs = snapshot.docs.map(d => d.data() as RealEstateProject);
        callback(projs);
      } else {
        callback([]);
      }
    }, (err) => {
      console.warn('Real-time projects subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed to setup projects snapshot listener:', err);
    return () => {};
  }
};

export const subscribeToClaimsCollection = (callback: (claims: ProfitClaimRecord[]) => void) => {
  if (!isFirebaseEnabled()) return () => {};
  try {
    return onSnapshot(collection(db, 'claims'), (snapshot) => {
      if (!snapshot.empty) {
        const claims = snapshot.docs.map(d => d.data() as ProfitClaimRecord);
        callback(claims);
      } else {
        callback([]);
      }
    }, (err) => {
      console.warn('Real-time claims subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed to setup claims snapshot listener:', err);
    return () => {};
  }
};

export const subscribeToSecurityLogsCollection = (callback: (logs: SecurityLog[]) => void) => {
  if (!isFirebaseEnabled()) return () => {};
  try {
    return onSnapshot(collection(db, 'security_logs'), (snapshot) => {
      if (!snapshot.empty) {
        const logs = snapshot.docs.map(d => d.data() as SecurityLog);
        callback(logs);
      } else {
        callback([]);
      }
    }, (err) => {
      console.warn('Real-time security logs subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed to setup security logs snapshot listener:', err);
    return () => {};
  }
};

export const subscribeToSystemSettings = (callback: (settings: SystemSettings) => void) => {
  if (!isFirebaseEnabled()) return () => {};
  try {
    return onSnapshot(doc(db, 'system_settings', 'default'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SystemSettings;
        if (data.apiUrl && data.apiUrl.includes('fundora.one')) {
          data.apiUrl = 'https://ais-pre-hb5de275kkaohqffdp2qfz-614235734610.asia-southeast1.run.app';
        }
        callback(data);
      }
    }, (err) => {
      console.warn('Real-time system settings subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed to setup system settings snapshot listener:', err);
    return () => {};
  }
};

export const saveTransactionToFirebase = async (tx: Transaction) => {
  if (!isFirebaseEnabled() || !tx || !tx.id) return;
  try {
    const rawTx: Transaction = {
      ...tx,
      userEmail: tx.userEmail ? tx.userEmail.trim().toLowerCase() : ''
    };
    let cleanTx = cleanPayloadForFirestore(rawTx);

    // If proofImage is present and Base64 length exceeds 400KB, truncate safely to avoid exceeding Firestore 1MB doc limit
    if (cleanTx.proofImage && cleanTx.proofImage.length > 400000) {
      console.warn(`[saveTransactionToFirebase] Truncating large proofImage (${cleanTx.proofImage.length} bytes) for Firestore limit.`);
      cleanTx.proofImage = cleanTx.proofImage.slice(0, 400000);
    }

    logFirestoreOp('WRITE', 'transactions', cleanTx.id, { type: cleanTx.type, amount: cleanTx.amount, userEmail: cleanTx.userEmail });
    await setDoc(doc(db, 'transactions', cleanTx.id), cleanTx);
    console.log(`[saveTransactionToFirebase] SUCCESS written tx doc ID "${cleanTx.id}" for user "${cleanTx.userEmail}".`);
  } catch (e) {
    console.error('Failed to save transaction to Firebase:', e);
  }
};

export const saveInvestmentToFirebase = async (inv: InvestmentRecord) => {
  if (!isFirebaseEnabled() || !inv || !inv.id) return;
  try {
    const rawInv: InvestmentRecord = {
      ...inv,
      userEmail: inv.userEmail ? inv.userEmail.trim().toLowerCase() : ''
    };
    const cleanInv = cleanPayloadForFirestore(rawInv);
    logFirestoreOp('WRITE', 'investments', cleanInv.id, { projectName: cleanInv.projectName, shares: cleanInv.sharesPurchased });
    await setDoc(doc(db, 'investments', cleanInv.id), cleanInv);
  } catch (e) {
    console.error('Failed to save investment to Firebase:', e);
  }
};

export const saveClaimToFirebase = async (claim: ProfitClaimRecord) => {
  if (!isFirebaseEnabled() || !claim || !claim.id) return;
  try {
    const rawClaim: ProfitClaimRecord = {
      ...claim,
      userEmail: claim.userEmail ? claim.userEmail.trim().toLowerCase() : ''
    };
    const cleanClaim = cleanPayloadForFirestore(rawClaim);
    logFirestoreOp('WRITE', 'claims', cleanClaim.id, { amount: cleanClaim.amount, status: cleanClaim.status });
    await setDoc(doc(db, 'claims', cleanClaim.id), cleanClaim);
  } catch (e) {
    console.error('Failed to save claim to Firebase:', e);
  }
};

export const saveSecurityLogToFirebase = async (log: SecurityLog) => {
  if (!isFirebaseEnabled() || !log || !log.id) return;
  try {
    const cleanLog = cleanPayloadForFirestore(log);
    logFirestoreOp('WRITE', 'security_logs', cleanLog.id, { eventType: cleanLog.eventType, status: cleanLog.status });
    await setDoc(doc(db, 'security_logs', cleanLog.id), cleanLog);
  } catch (e) {
    console.error('Failed to save security log to Firebase:', e);
  }
};

// Deletions / Batch updaters (For admin dashboard actions)
export const deleteProjectFromFirebase = async (id: string) => {
  if (!isFirebaseEnabled()) return;
  try {
    logFirestoreOp('DELETE', 'projects', id);
    await deleteDoc(doc(db, 'projects', id));
  } catch (e) {
    console.error('Failed to delete project from Firebase:', e);
  }
};

export const loadSystemSettingsFromFirebase = async (): Promise<SystemSettings | null> => {
  const defaultSettings: SystemSettings = {
    id: 'default',
    usdtTrc20Address: 'TX1h2A9eFm7xKsZ8Jq9wDpBcNdKyLmTqRy',
    usdtBep20Address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    scanGateTitle: 'Barcode Scanning Gateway',
    scanGateSubtitle: 'Dispatch on the matching blockchain. Tokens sent to mismatched networks are irreversibly lost.',
    apiUrl: 'https://ais-pre-hb5de275kkaohqffdp2qfz-614235734610.asia-southeast1.run.app'
  };

  if (!isFirebaseEnabled()) return null;
  try {
    logFirestoreOp('READ', 'system_settings', 'default');
    const docRef = doc(db, 'system_settings', 'default');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as SystemSettings;
      if (!data.apiUrl || data.apiUrl.trim().length < 10 || data.apiUrl.includes('fundora.one')) {
        data.apiUrl = defaultSettings.apiUrl;
      }
      return data;
    } else {
      logFirestoreOp('WRITE', 'system_settings', 'default');
      await setDoc(docRef, defaultSettings);
      return defaultSettings;
    }
  } catch (e) {
    console.error('Error loading system settings from Firebase:', e);
    return null;
  }
};

export const saveSystemSettingsToFirebase = async (settings: SystemSettings) => {
  if (!isFirebaseEnabled() || !settings) return;
  try {
    const rawSettings = {
      ...settings,
      apiUrl: (settings.apiUrl && !settings.apiUrl.includes('fundora.one')) ? settings.apiUrl : 'https://ais-pre-hb5de275kkaohqffdp2qfz-614235734610.asia-southeast1.run.app'
    };
    const cleanSettings = cleanPayloadForFirestore(rawSettings);
    logFirestoreOp('WRITE', 'system_settings', 'default', cleanSettings);
    await setDoc(doc(db, 'system_settings', 'default'), cleanSettings);
  } catch (e) {
    console.error('Failed to save system settings to Firebase:', e);
  }
};

export const loadInquiriesFromFirebase = async (): Promise<Inquiry[] | null> => {
  if (!isFirebaseEnabled()) return null;
  try {
    logFirestoreOp('READ', 'inquiries', 'ALL_DOCS');
    const snapshot = await getDocs(collection(db, 'inquiries'));
    if (snapshot.empty) return [];
    const inquiries = snapshot.docs.map(d => d.data() as Inquiry);
    return inquiries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (e) {
    console.error('Error loading inquiries from Firebase:', e);
    return null;
  }
};

export const saveInquiryToFirebase = async (inquiry: Inquiry) => {
  if (!isFirebaseEnabled() || !inquiry || !inquiry.id) return;
  try {
    const cleanInquiry = cleanPayloadForFirestore(inquiry);
    logFirestoreOp('WRITE', 'inquiries', cleanInquiry.id, { name: cleanInquiry.name, email: cleanInquiry.email });
    await setDoc(doc(db, 'inquiries', cleanInquiry.id), cleanInquiry);
  } catch (e) {
    console.error('Failed to save inquiry to Firebase:', e);
  }
};

export const deleteInquiryFromFirebase = async (id: string) => {
  if (!isFirebaseEnabled()) return;
  try {
    logFirestoreOp('DELETE', 'inquiries', id);
    await deleteDoc(doc(db, 'inquiries', id));
  } catch (e) {
    console.error('Failed to delete inquiry from Firebase:', e);
  }
};

export const subscribeToInquiriesCollection = (callback: (inquiries: Inquiry[]) => void) => {
  if (!isFirebaseEnabled()) return () => {};
  try {
    logFirestoreOp('LISTEN', 'inquiries', 'COLLECTION_SUBSCRIPTION');
    const colRef = collection(db, 'inquiries');
    return onSnapshot(colRef, (snapshot) => {
      const inquiries = snapshot.docs.map(d => d.data() as Inquiry);
      const sorted = inquiries.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      callback(sorted);
    }, (error) => {
      console.error('Error in inquiries real-time listener:', error);
    });
  } catch (e) {
    console.error('Failed to set up inquiries real-time listener:', e);
    return () => {};
  }
};

