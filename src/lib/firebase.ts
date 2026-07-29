/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';

// Permanent database ID for this application
export const FIREBASE_DATABASE_ID = "ai-studio-investyarealesta-ac1ea9f8-3719-4f80-acc1-938a72544e51";

export const firebaseConfig = {
  apiKey: "AIzaSyC7ZQUo7hq9ZY7K-vk2j8o6M_5wcslHL38",
  authDomain: "gen-lang-client-0327121259.firebaseapp.com",
  projectId: "gen-lang-client-0327121259",
  storageBucket: "gen-lang-client-0327121259.firebasestorage.app",
  messagingSenderId: "1005239416050",
  appId: "1:1005239416050:web:5e46ce99441b9248facc6b"
};

// Auto-initializing singleton instances
let app: any;
let db: any;
let auth: any;

console.log("[DEBUG LOG - FIREBASE INIT] Starting Firebase initialization...");
const isAndroidApp = typeof window !== 'undefined' && (
  /android/i.test(navigator.userAgent) || 
  !!(window as any).Capacitor || 
  window.location.origin.startsWith('file:') || 
  window.location.origin.startsWith('capacitor:') || 
  window.location.origin.startsWith('app:') ||
  (window.location.host && window.location.host.includes('localhost') && !(import.meta.env.DEV))
);
const platformTag = isAndroidApp ? '[ANDROID APK - FIREBASE INIT]' : '[WEB - FIREBASE INIT]';

console.log(`${platformTag} Environment detected. Origin: ${typeof window !== 'undefined' ? window.location.origin : 'N/A'}, UserAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`);
console.log(`${platformTag} Config ProjectID:`, firebaseConfig.projectId);
console.log(`${platformTag} Config AppID:`, firebaseConfig.appId);
console.log(`${platformTag} Target DatabaseID:`, FIREBASE_DATABASE_ID);

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  console.log(`${platformTag} FirebaseApp initialized successfully. Existing apps count:`, getApps().length);

  try {
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: true,
    }, FIREBASE_DATABASE_ID);
    console.log(`${platformTag} initializeFirestore executed with long polling for database ID: "${FIREBASE_DATABASE_ID}". Firestore instance created:`, !!db);
  } catch (err) {
    console.warn(`${platformTag} initializeFirestore failed, falling back to getFirestore:`, err);
    db = getFirestore(app, FIREBASE_DATABASE_ID);
    console.log(`${platformTag} Fallback getFirestore executed. Firestore instance created:`, !!db);
  }
  auth = getAuth(app);
  console.log(`${platformTag} FirebaseAuth initialized successfully.`);
} catch (error) {
  console.error(`${platformTag} Critical error during Firebase initialization:`, error);
}

export { app, db, auth };
