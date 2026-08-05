/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import MobileShell from './components/MobileShell';
import LandingPage from './components/LandingPage';
import AuthPages from './components/AuthPages';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import GlobalNavbar from './components/GlobalNavbar';
import BiometricLockScreen from './components/BiometricLockScreen';
import SplashScreen from './components/SplashScreen';
import AboutUs from './components/AboutUs';
import ApkDownloadModal from './components/ApkDownloadModal';
import { CommunityHub } from './components/CommunityHub';
import { FloatingAiAssistant } from './components/FloatingAiAssistant';
import { RealEstateProject, Transaction, UserAccount, InvestmentRecord, ProfitClaimRecord, SecurityLog, SystemSettings, Inquiry } from './types';
import { INITIAL_PROJECTS, INITIAL_USER, INITIAL_ADMIN, INITIAL_TRANSACTIONS, INITIAL_SECURITY_LOGS } from './data';
import { 
  seedInitialDataIfEmpty,
  loadProjectsFromFirebase,
  loadUsersFromFirebase,
  loadTransactionsFromFirebase,
  loadInvestmentsFromFirebase,
  loadClaimsFromFirebase,
  loadSecurityLogsFromFirebase,
  saveProjectToFirebase,
  saveUserToFirebase,
  saveTransactionToFirebase,
  saveInvestmentToFirebase,
  saveClaimToFirebase,
  saveSecurityLogToFirebase,
  deleteProjectFromFirebase,
  deleteUserFromFirebase,
  deleteTransactionFromFirebase,
  deleteInvestmentFromFirebase,
  deleteClaimFromFirebase,
  deleteSecurityLogFromFirebase,
  isFirebaseEnabled,
  loadSystemSettingsFromFirebase,
  saveSystemSettingsToFirebase,
  loadInquiriesFromFirebase,
  saveInquiryToFirebase,
  deleteInquiryFromFirebase,
  subscribeToUsersCollection,
  subscribeToTransactionsCollection,
  subscribeToInvestmentsCollection,
  subscribeToProjectsCollection,
  subscribeToClaimsCollection,
  subscribeToSecurityLogsCollection,
  subscribeToSystemSettings
} from './lib/firebaseSync';
import { sendDepositEmail, sendWithdrawalEmail, sendKycEmail } from './lib/emailService';
import { isNativeAppContainer } from './utils/nativeApp';
import { 
  requestNotificationPermission, 
  getNotificationPermission,
  notifyDepositUpdate, 
  notifyWithdrawalUpdate, 
  notifyKycUpdate,
  initServiceWorker
} from './utils/notifications';
import { 
  initFcmPushNotifications,
  triggerFcmDepositApproved,
  triggerFcmDepositRejected,
  triggerFcmWithdrawalApproved,
  triggerFcmWithdrawalRejected,
  triggerFcmKycApproved,
  triggerFcmKycRejected,
  triggerFcmReferralBonus
} from './utils/fcmNotifications';
import InAppNotificationBanner from './components/InAppNotificationBanner';
import NotificationPermissionModal from './components/NotificationPermissionModal';

// Safe localStorage helper to prevent QuotaExceededError crashes with large attachments
const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Failed to write to localStorage for key ${key}:`, e);
  }
};

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isFirebaseSynced, setIsFirebaseSynced] = useState<boolean>(false);
  const [showNotifPermModal, setShowNotifPermModal] = useState<boolean>(false);
  const isInitialSyncRef = useRef(true);

  useEffect(() => {
    initServiceWorker().catch(() => {});
  }, []);

  // Automatic Notification Permission Prompt on First APK App Launch
  useEffect(() => {
    const promptShown = localStorage.getItem('fundora_notif_prompt_shown') === 'true';
    const notifState = getNotificationPermission();

    if (!promptShown && notifState !== 'granted') {
      const timer = setTimeout(() => {
        setShowNotifPermModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  useEffect(() => {
    if (isFirebaseSynced) {
      const timer = setTimeout(() => {
        isInitialSyncRef.current = false;
      }, 1000); // 1s cooldown to prevent startup writes
      return () => clearTimeout(timer);
    }
  }, [isFirebaseSynced]);
  // Navigation states
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'register' | 'forgot' | 'dashboard' | 'admin' | 'about' | 'community'>('home');
  const [activeDashboardTab, setActiveDashboardTab] = useState<'overview' | 'properties' | 'wallet' | 'ledger' | 'claim' | 'referrals' | 'profile'>('overview');
  const [activeAdminTab, setActiveAdminTab] = useState<'stats' | 'deposits' | 'withdrawals' | 'projects' | 'users' | 'security' | 'inquiries'>('stats');
  const [scrollToAnchor, setScrollToAnchor] = useState<string | null>(null);
  const [authReason, setAuthReason] = useState<string | null>(null);

  // Core reactive data tables (Synchronized with localStorage)
  const [inquiriesList, setInquiriesList] = useState<Inquiry[]>(() => {
    const saved = localStorage.getItem('inv_inquiries');
    return saved ? JSON.parse(saved) : [];
  });
  const [projectsList, setProjectsList] = useState<RealEstateProject[]>(() => {
    const saved = localStorage.getItem('inv_projects');
    const loaded: RealEstateProject[] = saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    return loaded.map(p => (p.id === 'proj-6' || p.status === 'Active' || (p.name && p.name.includes('Emaar'))) ? { ...p, expectedRoi: 40.5 } : p);
  });

  const [transactionsList, setTransactionsList] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('inv_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [usersListState, setUsersListState] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('inv_users');
    let list: UserAccount[] = saved ? JSON.parse(saved) : [INITIAL_USER, INITIAL_ADMIN];
    let deletedIds: string[] = [];
    let deletedEmails: string[] = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('inv_deleted_user_ids') || '[]');
      deletedEmails = JSON.parse(localStorage.getItem('inv_deleted_user_emails') || '[]');
    } catch (_) {}

    return list
      .map(u => {
        if (!u) return u;
        if (u.id === 'user-admin' && (u.email === 'admin@fundora.one' || u.email === 'no-reply@fundora.one')) {
          return { ...u, email: 'fundora.one@gmail.com' };
        }
        return u;
      })
      .filter(u => 
        u && 
        u.email && 
        u.email.trim().toLowerCase() !== 'no-reply@fundora.one' &&
        !deletedIds.includes(u.id) &&
        !deletedEmails.includes(u.email.trim().toLowerCase())
      );
  });

  const [activeUser, setActiveUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('inv_active_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id === 'user-admin' && (parsed.email === 'admin@fundora.one' || parsed.email === 'no-reply@fundora.one')) {
        return { ...parsed, email: 'fundora.one@gmail.com' };
      }
      return parsed;
    } catch (_) {
      return null;
    }
  });

  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    const saved = localStorage.getItem('inv_active_user');
    if (!saved) return false;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.webAuthnEnabled) {
        const localSaved = localStorage.getItem('inv_local_biometric_emails');
        const localEmails = localSaved ? JSON.parse(localSaved) : [];
        const cleanEmail = parsed.email.toLowerCase().trim();
        return localEmails.includes(cleanEmail) &&
               localStorage.getItem(`inv_device_biometric_active_${cleanEmail}`) === 'true';
      }
      return false;
    } catch (_) {
      return false;
    }
  });

  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const [isNewRegistration, setIsNewRegistration] = useState<boolean>(false);

  // Robust URL Hash Routing Sync using Refs to prevent infinite loop / flickering
  const activeUserRef = useRef(activeUser);
  const isAppLockedRef = useRef(isAppLocked);
  const currentPageRef = useRef(currentPage);
  const activeDashboardTabRef = useRef(activeDashboardTab);
  const activeAdminTabRef = useRef(activeAdminTab);
  const authReasonRef = useRef(authReason);
  const isAutoCheckingRef = useRef(false);

  useEffect(() => { activeUserRef.current = activeUser; }, [activeUser]);
  useEffect(() => { isAppLockedRef.current = isAppLocked; }, [isAppLocked]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { activeDashboardTabRef.current = activeDashboardTab; }, [activeDashboardTab]);
  useEffect(() => { activeAdminTabRef.current = activeAdminTab; }, [activeAdminTab]);
  useEffect(() => { authReasonRef.current = authReason; }, [authReason]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('[App] handleHashChange triggered. hash:', hash);

      setTimeout(() => {
        const latestUser = activeUserRef.current;
        const latestPg = currentPageRef.current;
        const latestDashboardTab = activeDashboardTabRef.current;
        const latestAdminTab = activeAdminTabRef.current;
        const latestAuthReason = authReasonRef.current;

        if (!hash || hash === '#/' || hash === '#/home') {
          if (latestPg !== 'home') setCurrentPage('home');
        } else if (hash === '#/login' || hash.startsWith('#/login')) {
          if (latestPg !== 'login') setCurrentPage('login');
        } else if (hash === '#/register' || hash.startsWith('#/register')) {
          if (latestPg !== 'register') setCurrentPage('register');
        } else if (hash === '#/forgot' || hash.startsWith('#/forgot')) {
          if (latestPg !== 'forgot') setCurrentPage('forgot');
        } else if (hash === '#/about' || hash.startsWith('#/about')) {
          if (latestPg !== 'about') setCurrentPage('about');
        } else if (hash.startsWith('#/dashboard')) {
          const parts = hash.split('/');
          const tab = parts[2] as any;
          const validTabs = ['overview', 'properties', 'wallet', 'ledger', 'claim', 'referrals', 'profile'];
          
          // Authorization Guards
          if (!latestUser) {
            if (latestAuthReason !== 'Dashboard') setAuthReason('Dashboard');
            if (latestPg !== 'login') setCurrentPage('login');
            window.history.replaceState(null, '', '#/login');
            return;
          }
          if (latestUser.role === 'admin') {
            if (latestPg !== 'admin') setCurrentPage('admin');
            return;
          }

          if (latestPg !== 'dashboard') setCurrentPage('dashboard');
          if (validTabs.includes(tab)) {
            if (latestDashboardTab !== tab) setActiveDashboardTab(tab);
          } else {
            if (latestDashboardTab !== 'overview') setActiveDashboardTab('overview');
          }
        } else if (hash.startsWith('#/admin')) {
          const parts = hash.split('/');
          const tab = parts[2] as any;
          const validTabs = ['stats', 'deposits', 'withdrawals', 'projects', 'users', 'security'];

          // Authorization Guards
          if (!latestUser) {
            if (latestAuthReason !== 'Admin Panel') setAuthReason('Admin Panel');
            if (latestPg !== 'login') setCurrentPage('login');
            window.history.replaceState(null, '', '#/login');
            return;
          }
          if (latestUser.role !== 'admin') {
            if (latestPg !== 'dashboard') setCurrentPage('dashboard');
            return;
          }

          if (latestPg !== 'admin') setCurrentPage('admin');
          if (validTabs.includes(tab)) {
            if (latestAdminTab !== tab) setActiveAdminTab(tab);
          } else {
            if (latestAdminTab !== 'stats') setActiveAdminTab('stats');
          }
        }
      }, 0);
    };

    // Run on mount or when key dependencies update
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    let newHash = '';
    if (currentPage === 'home') {
      newHash = '#/home';
    } else if (currentPage === 'about') {
      newHash = '#/about';
    } else if (currentPage === 'login') {
      newHash = '#/login';
    } else if (currentPage === 'register') {
      newHash = '#/register';
    } else if (currentPage === 'forgot') {
      newHash = '#/forgot';
    } else if (currentPage === 'dashboard') {
      newHash = `#/dashboard/${activeDashboardTab}`;
    } else if (currentPage === 'admin') {
      newHash = `#/admin/${activeAdminTab}`;
    }

    // Preserve any existing query parameters from the current hash (e.g. ?ref=INV-5656)
    if (window.location.hash) {
      const parts = window.location.hash.split('?');
      if (parts.length > 1 && newHash && !newHash.includes('?')) {
        newHash = `${newHash}?${parts[1]}`;
      }
    }

    console.log('[App] hash update useEffect currentPage:', currentPage, 'currentHash:', window.location.hash, 'newHash:', newHash);
    if (window.location.hash !== newHash) {
      if (!window.location.hash || window.location.hash === '#/') {
        console.log('[App] Replacing history hash with:', newHash);
        window.history.replaceState(null, '', newHash);
      } else {
        console.log('[App] Pushing history hash with:', newHash);
        window.history.pushState(null, '', newHash);
      }
    }
  }, [currentPage, activeDashboardTab, activeAdminTab]);

  // Scroll to the top of the window on page and tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentPage, activeDashboardTab, activeAdminTab]);

  const [investmentsList, setInvestmentsList] = useState<InvestmentRecord[]>(() => {
    const saved = localStorage.getItem('inv_investments');
    const defaultRecord: InvestmentRecord[] = [
      {
        id: 'inv-rec-101',
        userId: 'user-demo',
        userEmail: 'investor@example.com',
        projectId: 'proj-1',
        projectName: 'Canary Wharf Heights',
        sharesPurchased: 5,
        totalCost: 565.00,
        purchaseDate: '2026-06-16',
        dailyProfitRate: 2.50, // Yielding $2.50 USDT per day
        durationMonths: 18,
        remainingMonths: 14,
        status: 'Active'
      }
    ];
    return saved ? JSON.parse(saved) : defaultRecord;
  });

  const [claimsHistory, setClaimsHistory] = useState<ProfitClaimRecord[]>(() => {
    const saved = localStorage.getItem('inv_claims');
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
        status: 'Expired' // A missed claim example
      }
    ];
    return saved ? JSON.parse(saved) : defaultClaims;
  });

  const [securityLogsList, setSecurityLogsList] = useState<SecurityLog[]>(() => {
    const saved = localStorage.getItem('inv_security_logs');
    return saved ? JSON.parse(saved) : INITIAL_SECURITY_LOGS;
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('inv_system_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.apiUrl || parsed.apiUrl.trim().length < 10) {
          parsed.apiUrl = 'https://fundora.one';
        }
        return parsed;
      } catch (_) {}
    }
    return {
      id: 'default',
      usdtTrc20Address: 'TX1h2A9eFm7xKsZ8Jq9wDpBcNdKyLmTqRy',
      usdtBep20Address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      scanGateTitle: 'Barcode Scanning Gateway',
      scanGateSubtitle: 'Dispatch on the matching blockchain. Tokens sent to mismatched networks are irreversibly lost.',
      apiUrl: 'https://fundora.one'
    };
  });

  // Real-time clock settings (starts matching real local timezone, updates dynamically)
  const [isTimeSimulated, setIsTimeSimulated] = useState<boolean>(false);
  const [clockOffset, setClockOffset] = useState<number>(() => {
    const saved = localStorage.getItem('inv_clock_offset');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [simulatedHour, setSimulatedHour] = useState<number>(() => {
    const savedOffset = localStorage.getItem('inv_clock_offset');
    const offset = savedOffset ? parseInt(savedOffset, 10) : 0;
    return new Date(Date.now() + offset).getHours();
  });
  const [simulatedMinute, setSimulatedMinute] = useState<number>(() => {
    const savedOffset = localStorage.getItem('inv_clock_offset');
    const offset = savedOffset ? parseInt(savedOffset, 10) : 0;
    return new Date(Date.now() + offset).getMinutes();
  });

  const getSecureServerTime = async (): Promise<Date> => {
    try {
      const response = await fetch('/?cb=' + Date.now(), { method: 'HEAD' });
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        const d = new Date(dateHeader);
        if (!isNaN(d.getTime())) {
          return d;
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve local origin date header", e);
    }

    try {
      const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { signal: AbortSignal.timeout(3000) });
      const data = await response.json();
      if (data && data.utc_datetime) {
        const d = new Date(data.utc_datetime);
        if (!isNaN(d.getTime())) {
          return d;
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve worldtimeapi datetime", e);
    }

    try {
      const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC', { signal: AbortSignal.timeout(3000) });
      const data = await response.json();
      if (data && data.dateTime) {
        const d = new Date(data.dateTime);
        if (!isNaN(d.getTime())) {
          return d;
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve timeapi.io datetime", e);
    }

    return new Date();
  };

  const syncSecureClock = async () => {
    const secureTime = await getSecureServerTime();
    const offset = secureTime.getTime() - Date.now();
    setClockOffset(offset);
    safeSetLocalStorage('inv_clock_offset', offset.toString());
  };

  useEffect(() => {
    syncSecureClock();
    const interval = setInterval(syncSecureClock, 45000); // Check server time every 45s
    return () => clearInterval(interval);
  }, []);

  // Custom setSimulatedHour wrapper
  const handleSetSimulatedHour = (hour: number) => {
    setIsTimeSimulated(false);
    const now = new Date(Date.now() + clockOffset);
    setSimulatedHour(now.getHours());
    setSimulatedMinute(now.getMinutes());
  };

  // Keep simulatedHour and simulatedMinute in sync with secure synchronized time
  useEffect(() => {
    const updateRealTime = () => {
      const now = new Date(Date.now() + clockOffset);
      setSimulatedHour(now.getHours());
      setSimulatedMinute(now.getMinutes());
    };

    updateRealTime(); // Run immediately

    const interval = setInterval(updateRealTime, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [clockOffset]);

  // Local Caching Effects (Save to browser cache for offline access, without re-writing to Firebase)
  useEffect(() => {
    safeSetLocalStorage('inv_projects', JSON.stringify(projectsList));
  }, [projectsList]);

  useEffect(() => {
    safeSetLocalStorage('inv_transactions', JSON.stringify(transactionsList));
  }, [transactionsList]);

  useEffect(() => {
    safeSetLocalStorage('inv_users', JSON.stringify(usersListState));
  }, [usersListState]);

  useEffect(() => {
    safeSetLocalStorage('inv_active_user', activeUser ? JSON.stringify(activeUser) : '');
  }, [activeUser]);

  useEffect(() => {
    safeSetLocalStorage('inv_investments', JSON.stringify(investmentsList));
  }, [investmentsList]);

  useEffect(() => {
    safeSetLocalStorage('inv_claims', JSON.stringify(claimsHistory));
  }, [claimsHistory]);

  useEffect(() => {
    safeSetLocalStorage('inv_security_logs', JSON.stringify(securityLogsList));
  }, [securityLogsList]);

  useEffect(() => {
    safeSetLocalStorage('inv_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  useEffect(() => {
    safeSetLocalStorage('inv_inquiries', JSON.stringify(inquiriesList));
  }, [inquiriesList]);

  // Initial boot: Seed & Load everything directly from Firebase!
  useEffect(() => {
    const initializeFirebaseData = async () => {
      if (!isFirebaseEnabled()) {
        console.warn("Firebase is not active. Falling back to local storage.");
        setIsFirebaseSynced(true);
        return;
      }

      console.log("Synchronizing with Firestore Database as single source of truth...");
      await seedInitialDataIfEmpty();

      let projects = null;
      let users = null;
      let transactions = null;
      let investments = null;
      let claims = null;
      let logs = null;
      let settings = null;
      let inquiries = null;

      try { projects = await loadProjectsFromFirebase(); } catch (e) { console.error("Error loading projects collection:", e); }
      try { users = await loadUsersFromFirebase(); } catch (e) { console.error("Error loading users collection:", e); }
      try { transactions = await loadTransactionsFromFirebase(); } catch (e) { console.error("Error loading transactions collection:", e); }
      try { investments = await loadInvestmentsFromFirebase(); } catch (e) { console.error("Error loading investments collection:", e); }
      try { claims = await loadClaimsFromFirebase(); } catch (e) { console.error("Error loading claims collection:", e); }
      try { logs = await loadSecurityLogsFromFirebase(); } catch (e) { console.error("Error loading security logs collection:", e); }
      try { settings = await loadSystemSettingsFromFirebase(); } catch (e) { console.error("Error loading system settings collection:", e); }
      try { inquiries = await loadInquiriesFromFirebase(); } catch (e) { console.error("Error loading inquiries collection:", e); }

      try {
        if (projects !== null) {
          let filteredProjects = projects || [];
          const originalDeletedIds = ['proj-1', 'proj-2', 'proj-4', 'proj-5', 'proj-7'];
          const hasLegacyDeleted = filteredProjects.some(p => originalDeletedIds.includes(p.id));
          
          if (hasLegacyDeleted) {
            console.log("Cleaning up legacy deleted projects from Firestore...");
            for (const id of originalDeletedIds) {
              await deleteProjectFromFirebase(id);
            }
            filteredProjects = filteredProjects.filter(p => !originalDeletedIds.includes(p.id));
          }

          if (filteredProjects && filteredProjects.length > 0) {
            setProjectsList(filteredProjects);
          } else {
            setProjectsList(INITIAL_PROJECTS);
          }
        }

        let deletedIds: string[] = [];
        let deletedEmails: string[] = [];
        try {
          deletedIds = JSON.parse(localStorage.getItem('inv_deleted_user_ids') || '[]');
          deletedEmails = JSON.parse(localStorage.getItem('inv_deleted_user_emails') || '[]');
        } catch (_) {}

        if (users !== null && users.length > 0) {
          // If a user doc exists in Firestore, Firestore is single source of truth: purge any stale local tombstone
          let updatedDeletedEmails = [...deletedEmails];
          let updatedDeletedIds = [...deletedIds];
          let cleanedTombstones = false;

          users.forEach(u => {
            if (u && u.email) {
              const cleanE = u.email.trim().toLowerCase();
              if (updatedDeletedEmails.includes(cleanE)) {
                updatedDeletedEmails = updatedDeletedEmails.filter(e => e !== cleanE);
                cleanedTombstones = true;
              }
              if (updatedDeletedIds.includes(u.id)) {
                updatedDeletedIds = updatedDeletedIds.filter(id => id !== u.id);
                cleanedTombstones = true;
              }
            }
          });

          if (cleanedTombstones) {
            try {
              localStorage.setItem('inv_deleted_user_emails', JSON.stringify(updatedDeletedEmails));
              localStorage.setItem('inv_deleted_user_ids', JSON.stringify(updatedDeletedIds));
            } catch (_) {}
          }

          const cleanUsers = users.filter(u => 
            u && 
            u.email && 
            u.email.trim().toLowerCase() !== 'no-reply@fundora.one' &&
            !updatedDeletedIds.includes(u.id) &&
            !updatedDeletedEmails.includes(u.email.trim().toLowerCase())
          );
          setUsersListState(cleanUsers);
          safeSetLocalStorage('inv_users', JSON.stringify(cleanUsers));
        }

        if (transactions !== null) setTransactionsList(transactions);
        if (investments !== null) setInvestmentsList(investments);
        if (claims !== null) setClaimsHistory(claims);
        if (logs !== null) setSecurityLogsList(logs);
        if (settings !== null) setSystemSettings(settings);
        if (inquiries !== null) setInquiriesList(inquiries);

        // Update active user from the fresh database if there was one logged in
        const savedActiveUser = localStorage.getItem('inv_active_user');
        if (savedActiveUser) {
          try {
            const parsed = JSON.parse(savedActiveUser);
            if (parsed && parsed.email) {
              const cleanE = parsed.email.toLowerCase().trim();
              const isDeleted = deletedIds.includes(parsed.id) || deletedEmails.includes(cleanE);
              if (isDeleted) {
                setActiveUser(null);
                localStorage.removeItem('inv_active_user');
                safeSetLocalStorage('inv_active_user', '');
              } else {
                const freshUser = users ? users.find(u => u.id === parsed.id || u.email.toLowerCase().trim() === cleanE) : null;
                if (freshUser) {
                  setActiveUser(freshUser);
                  const isLocalActive = localStorage.getItem(`inv_device_biometric_active_${freshUser.email.toLowerCase().trim()}`) === 'true';
                  if (freshUser.webAuthnEnabled && isAppLockedRef.current && isLocalActive) {
                    setIsAppLocked(true);
                  } else {
                    setIsAppLocked(false);
                  }
                } else {
                  console.log(`[Sync] Local activeUser ${parsed.email} not in Firestore DB yet. Auto-persisting to Firestore...`);
                  setActiveUser(parsed);
                  setIsAppLocked(false);
                  saveAndSyncUser(parsed);
                  setUsersListState(prev => {
                    const exists = prev.some(u => u.email.trim().toLowerCase() === cleanE);
                    if (exists) return prev;
                    return [...prev, parsed];
                  });
                }
              }
            }
          } catch (_) {
            // fallback
          }
        }

        console.log("Firestore Synchronized successfully!");
        setIsFirebaseSynced(true);
      } catch (err) {
        console.error("Failed to load records from Firestore on startup", err);
        setIsFirebaseSynced(true);
      }
    };

    initializeFirebaseData();
  }, []);

  // Live real-time Firestore database subscription across all clients (Web, APK, Admin)
  useEffect(() => {
    if (!isFirebaseEnabled()) return;

    const unsubUsers = subscribeToUsersCollection((liveUsers) => {
      if (liveUsers !== undefined) {
        let deletedIds: string[] = [];
        let deletedEmails: string[] = [];
        try {
          deletedIds = JSON.parse(localStorage.getItem('inv_deleted_user_ids') || '[]');
          deletedEmails = JSON.parse(localStorage.getItem('inv_deleted_user_emails') || '[]');
        } catch (_) {}

        let updatedDeletedEmails = [...deletedEmails];
        let updatedDeletedIds = [...deletedIds];
        let cleanedTombstones = false;

        (liveUsers || []).forEach(u => {
          if (u && u.email) {
            const cleanE = u.email.trim().toLowerCase();
            if (updatedDeletedEmails.includes(cleanE)) {
              updatedDeletedEmails = updatedDeletedEmails.filter(e => e !== cleanE);
              cleanedTombstones = true;
            }
            if (updatedDeletedIds.includes(u.id)) {
              updatedDeletedIds = updatedDeletedIds.filter(id => id !== u.id);
              cleanedTombstones = true;
            }
          }
        });

        if (cleanedTombstones) {
          try {
            localStorage.setItem('inv_deleted_user_emails', JSON.stringify(updatedDeletedEmails));
            localStorage.setItem('inv_deleted_user_ids', JSON.stringify(updatedDeletedIds));
          } catch (_) {}
        }

        const cleanUsers = (liveUsers || []).filter(u => 
          u && 
          u.email && 
          u.email.trim().toLowerCase() !== 'no-reply@fundora.one' &&
          !updatedDeletedIds.includes(u.id) &&
          !updatedDeletedEmails.includes(u.email.trim().toLowerCase())
        );

        setUsersListState(cleanUsers);
        safeSetLocalStorage('inv_users', JSON.stringify(cleanUsers));

        // Keep activeUser state up-to-date with Firestore changes
        if (activeUserRef.current) {
          const currentE = activeUserRef.current.email.toLowerCase().trim();
          const currentId = activeUserRef.current.id;
          const freshActive = cleanUsers.find(u => u.id === currentId || (u.email && u.email.toLowerCase().trim() === currentE));
          if (freshActive) {
            if (freshActive.isDeactivated && freshActive.role !== 'admin') {
              setActiveUser(null);
              localStorage.removeItem('inv_active_user');
            } else {
              setActiveUser(freshActive);
            }
          } else if (deletedIds.includes(currentId) || deletedEmails.includes(currentE)) {
            setActiveUser(null);
            localStorage.removeItem('inv_active_user');
          }
        }
      }
    });

    const unsubTxs = subscribeToTransactionsCollection((liveTxs) => {
      if (liveTxs !== undefined) {
        setTransactionsList(liveTxs);
      }
    });

    const unsubInvs = subscribeToInvestmentsCollection((liveInvs) => {
      if (liveInvs !== undefined) {
        setInvestmentsList(liveInvs);
      }
    });

    const unsubProjs = subscribeToProjectsCollection((liveProjs) => {
      if (liveProjs !== undefined) {
        setProjectsList(liveProjs);
      }
    });

    const unsubClaims = subscribeToClaimsCollection((liveClaims) => {
      if (liveClaims !== undefined) {
        setClaimsHistory(liveClaims);
      }
    });

    const unsubLogs = subscribeToSecurityLogsCollection((liveLogs) => {
      if (liveLogs !== undefined) {
        setSecurityLogsList(liveLogs);
      }
    });

    const unsubSettings = subscribeToSystemSettings((liveSettings) => {
      if (liveSettings) {
        setSystemSettings(liveSettings);
      }
    });

    return () => {
      unsubUsers();
      unsubTxs();
      unsubInvs();
      unsubProjs();
      unsubClaims();
      unsubLogs();
      unsubSettings();
    };
  }, []);

  // Automated background daily rollover check
  useEffect(() => {
    if (!isFirebaseSynced) return;

    const runAutoCheck = async () => {
      if (isAutoCheckingRef.current) return;
      isAutoCheckingRef.current = true;
      try {
        const secureNow = await getSecureServerTime();
        const todayStr = secureNow.toISOString().slice(0, 10);
        const lastRolloverDate = localStorage.getItem('inv_last_rollover_date');

        console.log('[Auto-Rollover] Secure Date Check:', { todayStr, lastRolloverDate });

        if (!lastRolloverDate) {
          // Initialize last_rollover_date on fresh database load so we don't double trigger immediately on first install
          safeSetLocalStorage('inv_last_rollover_date', todayStr);
          console.log('[Auto-Rollover] Initialized last rollover date to today:', todayStr);
        } else if (lastRolloverDate !== todayStr) {
          // Date has changed to a new day! Trigger automatic rollover
          console.log('[Auto-Rollover] Date mismatch detected. Triggering automated daily payout / rollover...');
          handleSimulateDailyRollover();
          safeSetLocalStorage('inv_last_rollover_date', todayStr);
          addSystemLog('Admin_Action', `Automated Daily Settlement Rollover executed: Yield and portfolio states updated for the new UTC day (${todayStr}).`, 'Secure');
        }
      } catch (err) {
        console.error('[Auto-Rollover] Error during automated rollover check:', err);
      } finally {
        isAutoCheckingRef.current = false;
      }
    };

    // Run check immediately on mount/sync
    runAutoCheck();

    // Re-check every 5 minutes to catch day transitions while the app is open
    const interval = setInterval(runAutoCheck, 300000);
    return () => clearInterval(interval);
  }, [isFirebaseSynced, investmentsList, usersListState, claimsHistory, activeUser]);

  // Prompt for native mobile notification permissions & FCM token registration on load or when user logs in
  useEffect(() => {
    requestNotificationPermission();
    if (activeUser) {
      initFcmPushNotifications(activeUser).catch(() => {});
    }
  }, [activeUser?.id, activeUser?.email]);



  // Clean up and migrate old Pakistani/South Asian cached values to UAE and UK defaults on startup
  useEffect(() => {
    const savedProjectsRaw = localStorage.getItem('inv_projects');
    if (savedProjectsRaw) {
      try {
        const parsed = JSON.parse(savedProjectsRaw);
        if (Array.isArray(parsed)) {
          const hasPakistaniData = parsed.some(p => 
            p.location?.toLowerCase().includes('pakistan') ||
            p.location?.toLowerCase().includes('karachi') ||
            p.location?.toLowerCase().includes('islamabad') ||
            p.location?.toLowerCase().includes('lahore') ||
            p.name?.toLowerCase().includes('pakistan') ||
            p.name?.toLowerCase().includes('karachi') ||
            p.name?.toLowerCase().includes('islamabad') ||
            p.name?.toLowerCase().includes('lahore')
          );
          
          if (hasPakistaniData) {
            safeSetLocalStorage('inv_projects', JSON.stringify(INITIAL_PROJECTS));
            setProjectsList(INITIAL_PROJECTS);
            
            safeSetLocalStorage('inv_users', JSON.stringify([INITIAL_USER, INITIAL_ADMIN]));
            setUsersListState([INITIAL_USER, INITIAL_ADMIN]);
            
            const activeUserRaw = localStorage.getItem('inv_active_user');
            if (activeUserRaw) {
              const u = JSON.parse(activeUserRaw);
              if (u && (u.name?.toLowerCase().includes('khan') || u.name?.toLowerCase().includes('pak') || u.email?.toLowerCase().includes('.pk'))) {
                localStorage.removeItem('inv_active_user');
                setActiveUser(null);
              }
            }
          }
        }
      } catch (err) {
        console.error("Migration error:", err);
      }
    }
  }, []);

  // Handle cross-page scrolling to landing page anchors
  useEffect(() => {
    if (currentPage === 'home' && scrollToAnchor) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollToAnchor);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setScrollToAnchor(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentPage, scrollToAnchor]);

  // Append system security log function
  const addSystemLog = (eventType: any, description: string, status: any) => {
    const newLog: SecurityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      eventType,
      description,
      ipAddress: '198.51.100.45', // Standard Enterprise gateway IP
      status
    };
    setSecurityLogsList(prev => [newLog, ...prev]);
  };

  // Switch navigation pages safely
  const handlePageNavigation = (page: 'home' | 'login' | 'register' | 'forgot' | 'dashboard' | 'admin' | 'about', reason?: string) => {
    console.log('[App] handlePageNavigation called with page:', page, 'reason:', reason);
    if (reason) {
      setAuthReason(reason);
    } else if (page === 'home' || page === 'login' || page === 'register' || page === 'forgot' || page === 'about') {
      if (!reason) {
        setAuthReason(null);
      }
    }

    if ((page === 'dashboard' || page === 'admin') && !activeUser) {
      if (!reason) {
        setAuthReason('Dashboard');
      }
      setCurrentPage('login');
      return;
    }

    // Role security guards:
    if (activeUser) {
      if (activeUser.role === 'admin') {
        // Admins can never access standard user dashboard
        if (page === 'dashboard') {
          setCurrentPage('admin');
          return;
        }
      } else {
        // Regular users can never access admin compliance panel
        if (page === 'admin') {
          setCurrentPage('dashboard');
          return;
        }
      }
    }

    setCurrentPage(page);
  };

  const saveAndSyncUser = (user: UserAccount) => {
    if (!user || !user.id) return;
    const cleanE = user.email ? user.email.toLowerCase().trim() : '';

    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('inv_deleted_user_ids') || '[]');
      const newDeletedIds = deletedIds.filter(id => id !== user.id);
      localStorage.setItem('inv_deleted_user_ids', JSON.stringify(newDeletedIds));

      if (cleanE) {
        const deletedEmails: string[] = JSON.parse(localStorage.getItem('inv_deleted_user_emails') || '[]');
        const newDeletedEmails = deletedEmails.filter(e => e.toLowerCase().trim() !== cleanE);
        localStorage.setItem('inv_deleted_user_emails', JSON.stringify(newDeletedEmails));
      }
    } catch (_) {}

    setUsersListState(prev => {
      const exists = prev.some(u => u.id === user.id || (u.email && u.email.toLowerCase().trim() === cleanE));
      let updated: UserAccount[];
      if (exists) {
        updated = prev.map(u => (u.id === user.id || (u.email && u.email.toLowerCase().trim() === cleanE)) ? user : u);
      } else {
        updated = [...prev, user];
      }
      safeSetLocalStorage('inv_users', JSON.stringify(updated));
      return updated;
    });

    if (isFirebaseEnabled()) {
      saveUserToFirebase(user);
    }
  };

  const handleUpdateAnyUser = (userId: string, updatedFields: Partial<UserAccount>) => {
    const targetUser = usersListState.find(u => u.id === userId);
    if (targetUser) {
      const isKycStatusChange = updatedFields.kycStatus && updatedFields.kycStatus !== targetUser.kycStatus;
      const isKycVerifiedChange = updatedFields.isKycVerified !== undefined && updatedFields.isKycVerified !== targetUser.isKycVerified;

      if (isKycStatusChange || isKycVerifiedChange) {
        try {
          const statusVal = updatedFields.kycStatus || (updatedFields.isKycVerified ? 'Verified' : 'Rejected');
          sendKycEmail(targetUser.email, targetUser.name, statusVal as any).catch(e => console.warn('KYC status email error:', e));
        } catch (_) {}

        try {
          if (updatedFields.kycStatus === 'Verified' || updatedFields.isKycVerified === true) {
            triggerFcmKycApproved(targetUser.email);
          } else if (updatedFields.kycStatus === 'Rejected' || (updatedFields.isKycVerified === false && updatedFields.kycSubmitted === false)) {
            triggerFcmKycRejected(targetUser.email);
          }
        } catch (e) {
          console.warn('FCM Push Notification KYC error:', e);
        }
      }
    }

    setUsersListState(prev => prev.map(u => {
      if (u.id === userId) {
        const updatedU = { ...u, ...updatedFields };
        if (activeUser && activeUser.id === userId) {
          setActiveUser(updatedU);
        }
        saveAndSyncUser(updatedU);
        return updatedU;
      }
      return u;
    }));
  };

  // Successful Session Login/Register
  const handleAuthSuccess = (userAccount: UserAccount, isNewReg?: boolean) => {
    setActiveUser(userAccount);
    setIsAppLocked(false);

    // Save/update global users list
    setUsersListState(prev => {
      const exists = prev.some(u => u.email.trim().toLowerCase() === userAccount.email.trim().toLowerCase());
      if (exists) {
        return prev.map(u => u.email.trim().toLowerCase() === userAccount.email.trim().toLowerCase() ? { ...u, ...userAccount } : u);
      }
      return [...prev, userAccount];
    });

    saveAndSyncUser(userAccount);

    // Send verified user straight to dashboard, or admin straight to admin desk
    if (userAccount.role === 'admin') {
      setCurrentPage('admin');
    } else {
      setCurrentPage('dashboard');
    }

    if (isNewReg && !isNativeAppContainer()) {
      setIsNewRegistration(true);
      setShowApkModal(true);
    }
  };

  // Add pending register user to usersListState to allow resumption
  const handleRegisterPending = (pendingUser: UserAccount) => {
    setUsersListState(prev => {
      const exists = prev.some(u => u.email.trim().toLowerCase() === pendingUser.email.trim().toLowerCase());
      if (exists) {
        return prev.map(u => u.email.trim().toLowerCase() === pendingUser.email.trim().toLowerCase() ? { ...u, ...pendingUser } : u);
      }
      return [...prev, pendingUser];
    });

    saveAndSyncUser(pendingUser);
  };

  const handleResetPassword = (email: string, newPassword: string) => {
    setUsersListState(prev => prev.map(u => {
      if (u.email.trim().toLowerCase() === email.trim().toLowerCase()) {
        const updatedU = { ...u, password: newPassword };
        saveAndSyncUser(updatedU);
        return updatedU;
      }
      return u;
    }));
    addSystemLog('Secure', `Password updated successfully for ${email}.`, 'Secure');
  };

  const handleLogout = () => {
    addSystemLog('Login_Failure', `Active session for ${activeUser?.email || 'Guest'} disconnected.`, 'Secure');
    setActiveUser(null);
    setIsAppLocked(false);
    setCurrentPage('home');
  };

  const handleBackToDashboard = () => {
    setCurrentPage('dashboard');
  };

  const handleNavigateAdmin = () => {
    setCurrentPage('admin');
  };

  // Wallet address link binding
  const handleBindWallet = (trc20: string, bep20: string) => {
    if (!activeUser) return;
    const updatedUser = {
      ...activeUser,
      wallet: {
        ...(activeUser.wallet || { usdtTrc20Address: '', usdtBep20Address: '', isVerified: false }),
        usdtTrc20Address: trc20,
        usdtBep20Address: bep20,
        isVerified: true
      }
    };
    setActiveUser(updatedUser);
    setUsersListState(prev => prev.map(u => (u.id === updatedUser.id || (u.email && u.email.trim().toLowerCase() === updatedUser.email.trim().toLowerCase())) ? updatedUser : u));
    saveAndSyncUser(updatedUser);
    addSystemLog('Wallet_Verification', `Cryptographic wallets bound & verified for ${updatedUser.email}. TRC20: ${trc20.slice(0, 6)}...`, 'Secure');
  };

  // Profile fields updating callback
  const handleUpdateUser = (updatedFields: Partial<UserAccount>) => {
    if (!activeUser) return;
    const updatedUser = { ...activeUser, ...updatedFields };
    setActiveUser(updatedUser);
    setUsersListState(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    saveAndSyncUser(updatedUser);
    addSystemLog('Wallet_Verification', `User profile updated for ${updatedUser.email}.`, 'Secure');
  };

  // Deposit Submit proof
  const handleSubmitDeposit = (amount: number, network: 'TRC20' | 'BEP20', txHash: string, proofImg: string) => {
    if (!activeUser) return;
    const cleanE = activeUser.email ? activeUser.email.trim().toLowerCase() : '';
    const newTx: Transaction = {
      id: `tx-dep-${Date.now()}`,
      userId: activeUser.id,
      userEmail: cleanE,
      type: 'Deposit',
      amount,
      network,
      txHash,
      proofImage: proofImg,
      walletAddress: network === 'TRC20' ? activeUser.wallet?.usdtTrc20Address || 'TX1h2A9eFm7xKsZ8Jq9w' : activeUser.wallet?.usdtBep20Address || '0x71C7656EC7ab88b0',
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Pending',
      description: `Pending USDT ${network} Deposit proof manual verification.`
    };

    setTransactionsList(prev => {
      const exists = prev.some(t => t.id === newTx.id);
      if (exists) return prev;
      const updated = [newTx, ...prev];
      safeSetLocalStorage('inv_transactions', JSON.stringify(updated));
      return updated;
    });

    saveTransactionToFirebase(newTx);
    addSystemLog('Admin_Action', `Pending deposit request of $${amount} USDT submitted by ${cleanE}. Check ledger.`, 'Info');

    try {
      sendDepositEmail(activeUser.email, activeUser.name, amount, network, txHash, 'Submitted').catch(e => console.warn('Deposit submission email error:', e));
    } catch (_) {}
  };

  // Create withdrawal Request
  const handleSubmitWithdrawal = (amount: number, network: 'TRC20' | 'BEP20', address: string) => {
    if (!activeUser) return;

    // Deduct available balance immediately (in lock reserve state)
    const updatedUser = {
      ...activeUser,
      balance: Math.max(0, activeUser.balance - amount),
      totalWithdrawn: activeUser.totalWithdrawn + amount
    };

    const feeAmount = Math.round((amount * 0.20) * 100) / 100;
    const netPayout = Math.max(0, amount - feeAmount);

    const newTx: Transaction = {
      id: `tx-wth-${Date.now()}`,
      userId: activeUser.id,
      userEmail: activeUser.email,
      type: 'Withdrawal',
      amount,
      network,
      walletAddress: address,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Pending',
      description: `USDT ${network} Withdrawal of $${amount.toFixed(2)} USDT. Net payout of $${netPayout.toFixed(2)} USDT (after 20% platform fee of $${feeAmount.toFixed(2)} USDT) pending administrative dispatch.`
    };

    setActiveUser(updatedUser);
    setUsersListState(prev => prev.map(u => (u.id === updatedUser.id || (u.email && u.email.trim().toLowerCase() === updatedUser.email.trim().toLowerCase())) ? updatedUser : u));
    saveAndSyncUser(updatedUser);
    setTransactionsList(prev => [newTx, ...prev]);
    saveTransactionToFirebase(newTx);
    addSystemLog('Large_Withdrawal', `Withdrawal claim of $${amount} USDT submitted by ${activeUser.email}. Net payout $${netPayout} after 20% fee.`, 'Secure');

    try {
      sendWithdrawalEmail(activeUser.email, activeUser.name, amount, network, address, 'Submitted').catch(e => console.warn('Withdrawal submission email error:', e));
    } catch (_) {}
  };

  // Buy fractional shares
  const handlePurchaseShares = (projectId: string, sharesCount: number): { success: boolean; error?: string } => {
    if (!activeUser) return { success: false, error: 'Authorization error.' };

    const project = projectsList.find(p => p.id === projectId);
    if (!project) return { success: false, error: 'Property not found.' };

    if (project.availableShares < sharesCount) {
      return { success: false, error: 'Insufficient available shares currently on catalog.' };
    }

    const totalCost = sharesCount * project.pricePerShare;
    if (activeUser.balance < totalCost) {
      return { success: false, error: 'Insufficient wallet balances. Please deposit first.' };
    }

    // Deduct balance and update user stats
    const updatedUser: UserAccount = {
      ...activeUser,
      balance: Math.round((activeUser.balance - totalCost) * 100) / 100,
      totalInvestment: activeUser.totalInvestment + totalCost
    };

    // Update Project shares
    const updatedProject: RealEstateProject = {
      ...project,
      availableShares: project.availableShares - sharesCount,
      status: (project.availableShares - sharesCount) === 0 ? 'Sold Out' : 'Active'
    };

    // Build unique Investment Record
    const dailyProfitRate = Math.round((totalCost * (project.expectedRoi / 100) / ((project.durationMonths || 12) * 30)) * 100) / 100;
    const newInvestment: InvestmentRecord = {
      id: `inv-${Date.now()}`,
      userId: activeUser.id,
      userEmail: activeUser.email,
      projectId: project.id,
      projectName: project.name,
      sharesPurchased: sharesCount,
      totalCost,
      purchaseDate: new Date().toISOString().slice(0, 10),
      dailyProfitRate,
      durationMonths: project.durationMonths,
      remainingMonths: project.durationMonths,
      status: 'Active'
    };

    // Build investment Transaction receipt
    const newTx: Transaction = {
      id: `tx-purch-${Date.now()}`,
      userId: activeUser.id,
      userEmail: activeUser.email,
      type: 'Investment',
      amount: totalCost,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Completed',
      description: `Purchased ${sharesCount} fractional shares in ${project.name}`
    };

    // Apply updates across lists and sync to Firestore
    setActiveUser(updatedUser);
    setUsersListState(usersListState.map(u => (u.id === updatedUser.id || (u.email && u.email.trim().toLowerCase() === updatedUser.email.trim().toLowerCase())) ? updatedUser : u));
    saveAndSyncUser(updatedUser);

    setProjectsList(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    saveProjectToFirebase(updatedProject);

    setInvestmentsList(prev => [...prev, newInvestment]);
    saveInvestmentToFirebase(newInvestment);

    setTransactionsList(prev => [newTx, ...prev]);
    saveTransactionToFirebase(newTx);

    addSystemLog('Large_Withdrawal', `Fractional buy complete on ${project.name}: ${sharesCount} shares worth $${totalCost} USDT.`, 'Secure');
    return { success: true };
  };

  // Confirm Deposit / Withdrawals in the back-office compliance console
  const handleApproveTransaction = (txId: string) => {
    console.log("[STEP 1] handleApproveTransaction entered");
    const matchedTx = transactionsList.find(t => t.id === txId);
    if (!matchedTx) return;

    // Transition status to approved
    const updatedTx: Transaction = {
      ...matchedTx,
      status: 'Approved',
      description: matchedTx.type === 'Deposit' ? 'Deposit receipt matched & authorized.' : 'USDT Withdrawal dispatches processed.'
    };

    let extraTxs: Transaction[] = [];

    // Find the user who did the transaction
    const userObj = usersListState.find(u => 
      u.id === matchedTx.userId || 
      (u.email && matchedTx.userEmail && u.email.trim().toLowerCase() === matchedTx.userEmail.trim().toLowerCase())
    );

    const targetEmail = matchedTx.userEmail || userObj?.email || '';
    const targetName = userObj?.name || 'Investor';

    // Check approved deposits count
    const approvedDepositsCount = userObj ? transactionsList.filter(
      t => (t.userId === userObj.id || (t.userEmail && t.userEmail.trim().toLowerCase() === userObj.email.trim().toLowerCase())) && t.type === 'Deposit' && t.status === 'Approved'
    ).length : 0;

    const isFirstDeposit = matchedTx.type === 'Deposit' && approvedDepositsCount === 0 && matchedTx.amount >= 113;
    const bonusAmount = isFirstDeposit ? Math.round((matchedTx.amount * 0.10) * 100) / 100 : 0;

    let updatedUsers = usersListState.map(u => {
      const isMatch = u.id === matchedTx.userId || (u.email && matchedTx.userEmail && u.email.trim().toLowerCase() === matchedTx.userEmail.trim().toLowerCase());
      if (isMatch) {
        if (matchedTx.type === 'Deposit') {
          const finalBalance = Math.round((u.balance + matchedTx.amount + bonusAmount) * 100) / 100;
          const updatedU = {
            ...u,
            balance: finalBalance,
            totalDeposited: u.totalDeposited + matchedTx.amount
          };
          
          if (isFirstDeposit && u.referredBy) {
            // Log referee transaction bonus receipt
            const refereeTx: Transaction = {
              id: `tx-bon-fnd-${Date.now()}`,
              userId: u.id,
              userEmail: u.email,
              type: 'Referral Bonus',
              amount: bonusAmount,
              date: new Date().toISOString().replace('T', ' ').slice(0, 16),
              status: 'Completed',
              description: `🎁 10% First deposit welcome bonus on your qualifying deposit of $${matchedTx.amount.toFixed(2)} USDT.`
            };
            extraTxs.push(refereeTx);
          }
          
          if (activeUser && activeUser.id === u.id) {
            setActiveUser(updatedU);
          }
          saveAndSyncUser(updatedU);
          return updatedU;
        }
        if (matchedTx.type === 'Withdrawal') {
          // Funds were already locked from balances. Just log dispatch check.
          const updatedU = {
            ...u,
            totalWithdrawn: u.totalWithdrawn + matchedTx.amount
          };
          if (activeUser && activeUser.id === u.id) {
            setActiveUser(updatedU);
          }
          saveAndSyncUser(updatedU);
          return updatedU;
        }
      }
      return u;
    });

    // If first deposit, also credit the referrer
    if (isFirstDeposit && userObj?.referredBy && bonusAmount > 0) {
      const referralCodeClean = userObj.referredBy.trim().toUpperCase();
      const referrerUserIndex = updatedUsers.findIndex(u => u.referralCode.toUpperCase() === referralCodeClean);
      
      if (referrerUserIndex !== -1) {
        const referrer = updatedUsers[referrerUserIndex];
        const updatedReferrer: UserAccount = {
          ...referrer,
          balance: Math.round((referrer.balance + bonusAmount) * 100) / 100
        };
        updatedUsers[referrerUserIndex] = updatedReferrer;

        // Log referrer transaction bonus receipt
        const referrerTx: Transaction = {
          id: `tx-bon-ref-${Date.now()}`,
          userId: referrer.id,
          userEmail: referrer.email,
          type: 'Referral Bonus',
          amount: bonusAmount,
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'Completed',
          description: `🎁 10% Referral partner bonus on ${targetEmail}'s first qualifying deposit.`
        };
        extraTxs.push(referrerTx);
        
        if (activeUser && activeUser.id === referrer.id) {
          setActiveUser(updatedReferrer);
        }
        saveAndSyncUser(updatedReferrer);
      }
    }

    setUsersListState(updatedUsers);

    setTransactionsList(prev => {
      const updatedList = prev.map(t => t.id === txId ? updatedTx : t);
      const combined = [...extraTxs, ...updatedList];
      console.log("[STEP 2] Saving approved transaction");
      combined.forEach(tx => saveTransactionToFirebase(tx));
      console.log("[STEP 3] Firestore updated");
      return combined;
    });

    addSystemLog('Admin_Action', `${updatedTx.type} ID ${txId} approved by compliance admin. Portfolio balances adjusted.`, 'Secure');
    if (extraTxs.length > 0) {
      addSystemLog('Register_Referral', `Dual 10% First Deposit Referral Bonus activated for ${matchedTx.userEmail} & sponsor!`, 'Secure');
    }

    // Dispatch approval email & instant FCM Push Notification to investor
    try {
      if (targetEmail) {
        if (matchedTx.type === 'Deposit') {
          sendDepositEmail(targetEmail, targetName, matchedTx.amount, matchedTx.network || 'TRC20', matchedTx.txHash || '', 'Approved').catch(e => console.warn('Deposit approve email error:', e));
          triggerFcmDepositApproved(targetEmail, matchedTx.amount);
        } else if (matchedTx.type === 'Withdrawal') {
          sendWithdrawalEmail(targetEmail, targetName, matchedTx.amount, matchedTx.network || 'TRC20', matchedTx.walletAddress || '', 'Approved').catch(e => console.warn('Withdrawal approve email error:', e));
          console.log("[STEP 4] Calling triggerFcmWithdrawalApproved");
          triggerFcmWithdrawalApproved(targetEmail, matchedTx.amount);
        }
      }

      if (isFirstDeposit && bonusAmount > 0 && targetEmail) {
        triggerFcmReferralBonus(targetEmail, bonusAmount, 'First Deposit Welcome Bonus');
        const referralCodeClean = userObj?.referredBy?.trim().toUpperCase();
        const referrer = updatedUsers.find(u => u.referralCode.toUpperCase() === referralCodeClean);
        if (referrer) {
          triggerFcmReferralBonus(referrer.email, bonusAmount, targetEmail);
        }
      }
    } catch (e) {
      console.warn('FCM Push Notification approval trigger error:', e);
    }
  };

  const handleRejectTransaction = (txId: string) => {
    const matchedTx = transactionsList.find(t => t.id === txId);
    if (!matchedTx) return;

    const updatedTx: Transaction = {
      ...matchedTx,
      status: 'Rejected',
      description: 'Transaction declined under secure FBR risk constraints.'
    };

    setTransactionsList(prev => {
      const updatedList = prev.map(t => t.id === txId ? updatedTx : t);
      updatedList.forEach(tx => saveTransactionToFirebase(tx));
      return updatedList;
    });

    // Refund withdrawals if rejected
    if (matchedTx.type === 'Withdrawal') {
      const updatedUsers = usersListState.map(u => {
        const isMatch = u.id === matchedTx.userId || (u.email && matchedTx.userEmail && u.email.trim().toLowerCase() === matchedTx.userEmail.trim().toLowerCase());
        if (isMatch) {
          const updatedU = {
            ...u,
            balance: Math.round((u.balance + matchedTx.amount) * 100) / 100,
            totalWithdrawn: Math.max(0, u.totalWithdrawn - matchedTx.amount)
          };
          if (activeUser && activeUser.id === u.id) {
            setActiveUser(updatedU);
          }
          saveAndSyncUser(updatedU);
          return updatedU;
        }
        return u;
      });
      setUsersListState(updatedUsers);
    }

    // Dispatch rejection notification email & FCM push notification
    const userObj = usersListState.find(u => 
      u.id === matchedTx.userId || 
      (u.email && matchedTx.userEmail && u.email.trim().toLowerCase() === matchedTx.userEmail.trim().toLowerCase())
    );
    const targetEmail = matchedTx.userEmail || userObj?.email || '';
    const targetName = userObj?.name || 'Investor';

    if (targetEmail) {
      try {
        if (matchedTx.type === 'Deposit') {
          sendDepositEmail(targetEmail, targetName, matchedTx.amount, matchedTx.network || 'TRC20', matchedTx.txHash || '', 'Rejected').catch(e => console.warn('Deposit reject email error:', e));
          triggerFcmDepositRejected(targetEmail, matchedTx.amount);
        } else if (matchedTx.type === 'Withdrawal') {
          sendWithdrawalEmail(targetEmail, targetName, matchedTx.amount, matchedTx.network || 'TRC20', matchedTx.walletAddress || '', 'Rejected').catch(e => console.warn('Withdrawal reject email error:', e));
          triggerFcmWithdrawalRejected(targetEmail, matchedTx.amount);
        }
      } catch (_) {}
    }

    addSystemLog('Admin_Action', `${matchedTx.type} ID ${txId} rejected by compliance admin under UK Companies House & FCA compliance guidelines.`, 'Alarm');
  };

  // Adjust user balance directly
  const handleAdjustUserFunds = (userId: string, amount: number, type: 'add' | 'deduct') => {
    setUsersListState(prev => prev.map(u => {
      if (u.id === userId) {
        const adjustment = type === 'add' ? amount : -amount;
        const finalBalance = Math.max(0, Math.round((u.balance + adjustment) * 100) / 100);
        const updatedU = {
          ...u,
          balance: finalBalance
        };
        if (activeUser && activeUser.id === u.id) {
          setActiveUser(updatedU);
        }
        saveAndSyncUser(updatedU);
        return updatedU;
      }
      return u;
    }));

    const userObj = usersListState.find(u => u.id === userId);
    const userEmail = userObj ? userObj.email : 'Unknown';
    addSystemLog('Admin_Action', `Compliance Admin adjusted funds for ${userEmail}: ${type === 'add' ? 'Added' : 'Deducted'} $${amount.toFixed(2)} USDT.`, 'Secure');
  };

  // Unbind user wallet address
  const handleUnbindUserWallet = (userId: string, network: 'TRC20' | 'BEP20' | 'both') => {
    setUsersListState(prev => prev.map(u => {
      if (u.id === userId) {
        const updatedWallet = { ...(u.wallet || { usdtTrc20Address: '', usdtBep20Address: '', isVerified: false }) };
        if (network === 'TRC20' || network === 'both') {
          updatedWallet.usdtTrc20Address = '';
        }
        if (network === 'BEP20' || network === 'both') {
          updatedWallet.usdtBep20Address = '';
        }
        if (!updatedWallet.usdtTrc20Address && !updatedWallet.usdtBep20Address) {
          updatedWallet.isVerified = false;
        }

        const updatedU = {
          ...u,
          wallet: updatedWallet
        };

        if (activeUser && activeUser.id === u.id) {
          setActiveUser(updatedU);
        }
        saveAndSyncUser(updatedU);
        return updatedU;
      }
      return u;
    }));

    const userObj = usersListState.find(u => u.id === userId);
    const userEmail = userObj ? userObj.email : 'Unknown';
    addSystemLog('Admin_Action', `Compliance Admin reset/unbound ${network} wallet address for ${userEmail}.`, 'Secure');
  };

  // Delete User permanently from Firestore & Local Storage
  const handleDeleteUser = async (userId: string) => {
    const targetUser = usersListState.find(u => u.id === userId);
    const targetEmail = targetUser?.email ? targetUser.email.trim().toLowerCase() : '';

    // Record deleted ID and Email locally to prevent ghost resurfacing
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('inv_deleted_user_ids') || '[]');
      if (!deletedIds.includes(userId)) deletedIds.push(userId);
      localStorage.setItem('inv_deleted_user_ids', JSON.stringify(deletedIds));

      if (targetEmail) {
        const deletedEmails: string[] = JSON.parse(localStorage.getItem('inv_deleted_user_emails') || '[]');
        if (!deletedEmails.includes(targetEmail)) deletedEmails.push(targetEmail);
        localStorage.setItem('inv_deleted_user_emails', JSON.stringify(deletedEmails));
      }
    } catch (_) {}

    setUsersListState(prev => {
      const updated = prev.filter(u => u.id !== userId && (targetEmail ? u.email.trim().toLowerCase() !== targetEmail : true));
      safeSetLocalStorage('inv_users', JSON.stringify(updated));
      return updated;
    });

    if (activeUser && (activeUser.id === userId || (targetEmail && activeUser.email.trim().toLowerCase() === targetEmail))) {
      setActiveUser(null);
      localStorage.removeItem('inv_active_user');
      safeSetLocalStorage('inv_active_user', '');
    }

    if (isFirebaseEnabled()) {
      await deleteUserFromFirebase(userId, targetEmail);
    }
    addSystemLog('Admin_Action', `User account ${targetEmail || userId} permanently deleted from database.`, 'Secure');
  };

  // Update Barcode Scanning Gateway / Scan Gate settings
  const handleUpdateSystemSettings = (newSettings: SystemSettings) => {
    setSystemSettings(newSettings);
    saveSystemSettingsToFirebase(newSettings);
    addSystemLog('Admin_Action', `Compliance Admin updated deposit scan gate settings. TRC20 [${newSettings.usdtTrc20Address}], BEP20 [${newSettings.usdtBep20Address}]`, 'Secure');
  };

  // Add new property options
  const handleAddProject = (newProj: RealEstateProject) => {
    setProjectsList(prev => [newProj, ...prev]);
    saveProjectToFirebase(newProj);
    addSystemLog('Admin_Action', `New smart property listing online: ${newProj.name} listed with ${newProj.totalShares} shares.`, 'Secure');
  };

  const handleUpdateProjectRoi = (projectId: string, newRoi: number) => {
    const updatedProjects = projectsList.map(p => p.id === projectId ? { ...p, expectedRoi: newRoi } : p);
    setProjectsList(updatedProjects);
    const targetProj = updatedProjects.find(p => p.id === projectId);
    if (targetProj) saveProjectToFirebase(targetProj);
    
    // Recalibrate active investments
    setInvestmentsList(prev => prev.map(inv => {
      if (inv.projectId === projectId) {
        const duration = inv.durationMonths || 12;
        const newDailyProfit = Math.round((inv.totalCost * (newRoi / 100) / (duration * 30)) * 100) / 100;
        const updatedInv = { ...inv, dailyProfitRate: newDailyProfit };
        saveInvestmentToFirebase(updatedInv);
        return updatedInv;
      }
      return inv;
    }));

    addSystemLog('Admin_Action', `Investment plan ${projectId} expected ROI updated to ${newRoi}%. Active investment payout rates recalibrated.`, 'Secure');
  };

  const handleUpdateProject = (updatedProj: RealEstateProject) => {
    setProjectsList(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));
    saveProjectToFirebase(updatedProj);
    
    // Recalibrate active investments
    setInvestmentsList(prev => prev.map(inv => {
      if (inv.projectId === updatedProj.id) {
        const duration = inv.durationMonths || updatedProj.durationMonths || 12;
        const newDailyProfit = Math.round((inv.totalCost * (updatedProj.expectedRoi / 100) / (duration * 30)) * 100) / 100;
        const updatedInv = {
          ...inv,
          projectName: updatedProj.name,
          dailyProfitRate: newDailyProfit
        };
        saveInvestmentToFirebase(updatedInv);
        return updatedInv;
      }
      return inv;
    }));

    addSystemLog('Admin_Action', `Property details updated for ${updatedProj.name}. Recalibrated active portfolios.`, 'Secure');
  };

  const handleDeleteProject = (projectId: string) => {
    setProjectsList(prev => prev.filter(p => p.id !== projectId));
    if (isFirebaseEnabled()) {
      deleteProjectFromFirebase(projectId);
    }
    addSystemLog('Admin_Action', `Property listing ${projectId} deleted from catalog.`, 'Secure');
  };

  const handleSubmitInquiry = async (name: string, email: string, message: string) => {
    const newInquiry: Inquiry = {
      id: `inq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      email,
      message,
      timestamp: new Date().toISOString(),
      status: 'Pending'
    };
    setInquiriesList(prev => [newInquiry, ...prev]);
    if (isFirebaseEnabled()) {
      await saveInquiryToFirebase(newInquiry);
    }
  };

  const handleUpdateInquiry = async (updatedInquiry: Inquiry) => {
    setInquiriesList(prev => prev.map(inq => inq.id === updatedInquiry.id ? updatedInquiry : inq));
    if (isFirebaseEnabled()) {
      await saveInquiryToFirebase(updatedInquiry);
    }
    addSystemLog('Admin_Action', `Inquiry from ${updatedInquiry.name} updated to ${updatedInquiry.status}.`, 'Secure');
  };

  const handleDeleteInquiry = async (id: string) => {
    setInquiriesList(prev => prev.filter(inq => inq.id !== id));
    if (isFirebaseEnabled()) {
      await deleteInquiryFromFirebase(id);
    }
    addSystemLog('Admin_Action', `Customer inquiry ${id} deleted from databases.`, 'Secure');
  };

  // Daily profit interactive Claim trigger
  const handleClaimDailyProfit = async () => {
    if (!activeUser) return { success: false, type: 'inactive_window' as const };

    // Fetch fresh secure time from the server/public API to prevent any client-side timezone/time spoofing!
    const secureNow = await getSecureServerTime();
    const currentHour = secureNow.getHours();
    const currentMinute = secureNow.getMinutes();
    const todayStr = secureNow.toISOString().slice(0, 10); // True UTC or server date, extremely secure!

    // Calculate sum of active investment yields for active user ONLY
    const userInvestments = investmentsList.filter(inv => inv.userId === activeUser.id || inv.userEmail?.toLowerCase() === activeUser.email.toLowerCase());
    const dailyProfitSum = userInvestments.reduce((sum, inv) => {
      const isActive = inv.status === 'Active' || inv.status === undefined;
      return isActive ? sum + inv.dailyProfitRate : sum;
    }, 0);

    if (dailyProfitSum === 0) {
      return { success: false, type: 'no_yield' as const };
    }

    // Ensure we are inside one of the two slots: 4:00 PM-5:00 PM (16) or 9:00 PM-10:00 PM (21)
    if (currentHour !== 16 && currentHour !== 21) {
      return { success: false, type: 'inactive_window' as const };
    }

    const currentSlot = currentHour;

    // Check if they already claimed today in this specific slot based on secure date
    const alreadyClaimed = claimsHistory.some(c => 
      (c.userId === activeUser.id || c.userEmail?.toLowerCase() === activeUser.email.toLowerCase()) &&
      c.date === todayStr && 
      c.status === 'Claimed' && 
      c.slot === currentSlot
    );
    if (alreadyClaimed) {
      return { success: false, type: 'already_claimed' as const };
    }

    // Update user balance
    const updatedUser = {
      ...activeUser,
      balance: Math.round((activeUser.balance + dailyProfitSum) * 100) / 100,
      totalProfitEarned: activeUser.totalProfitEarned + dailyProfitSum
    };

    // Log Claim Receipt Transaction
    const claimTx: Transaction = {
      id: `tx-claim-${Date.now()}`,
      userId: activeUser.id,
      userEmail: activeUser.email,
      type: 'Profit Claim',
      amount: dailyProfitSum,
      date: secureNow.toISOString().replace('T', ' ').slice(0, 16),
      status: 'Completed',
      description: `Dispatched fractional profit yield of $${dailyProfitSum.toFixed(2)} (${currentSlot === 16 ? '04:00 PM' : '09:00 PM'} Slot)`
    };

    // Add record to claims list
    const newClaimRecord: ProfitClaimRecord = {
      id: `claim-rec-${Date.now()}`,
      userId: activeUser.id,
      userEmail: activeUser.email,
      date: todayStr,
      amount: dailyProfitSum,
      status: 'Claimed',
      claimedAt: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
      slot: currentSlot
    };

    setActiveUser(updatedUser);
    saveAndSyncUser(updatedUser);

    setTransactionsList(prev => [claimTx, ...prev]);
    saveTransactionToFirebase(claimTx);

    setClaimsHistory(prev => [newClaimRecord, ...prev]);
    saveClaimToFirebase(newClaimRecord);

    addSystemLog('Large_Withdrawal', `Daily profit payout of $${dailyProfitSum} claims validated successfully at ${currentHour}:${currentMinute} in ${currentSlot === 16 ? '04:00 PM' : '09:00 PM'} slot.`, 'Secure');
    return { success: true, type: 'success' as const, amount: dailyProfitSum };
  };

  // Emergency early liquidation with 20% penalty
  const handleLiquidateInvestment = (investmentId: string) => {
    if (!activeUser) return { success: false, payout: 0 };

    const inv = investmentsList.find(i => i.id === investmentId);
    if (!inv || (inv.status !== 'Active' && inv.status !== undefined)) {
      return { success: false, payout: 0 };
    }

    const deduction = inv.totalCost * 0.20;
    const payout = Math.round((inv.totalCost - deduction) * 100) / 100;

    // Update user balance & total investment basis
    const updatedUser: UserAccount = {
      ...activeUser,
      balance: Math.round((activeUser.balance + payout) * 100) / 100,
      totalInvestment: Math.max(0, Math.round((activeUser.totalInvestment - inv.totalCost) * 100) / 100)
    };

    // Update investment status to 'Liquidated'
    const updatedInvestments = investmentsList.map(item => {
      if (item.id === investmentId) {
        return { ...item, status: 'Liquidated' as const };
      }
      return item;
    });

    // Re-add sold shares back to the property pool
    const updatedProjects = projectsList.map(p => {
      if (p.id === inv.projectId) {
        const restoredShares = p.availableShares + inv.sharesPurchased;
        return {
          ...p,
          availableShares: restoredShares,
          status: restoredShares > 0 ? 'Active' as const : p.status
        };
      }
      return p;
    });

    // Create a transaction receipt for the automatic liquidation
    const liquidationTx: Transaction = {
      id: `tx-liq-${Date.now()}`,
      userId: activeUser.id,
      userEmail: activeUser.email,
      type: 'Deposit',
      amount: payout,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Completed',
      description: `Emergency liquidation: sold ${inv.sharesPurchased} shares of ${inv.projectName} (-20% loss applied)`
    };

    setActiveUser(updatedUser);
    saveAndSyncUser(updatedUser);

    setInvestmentsList(updatedInvestments);
    const targetInv = updatedInvestments.find(i => i.id === investmentId);
    if (targetInv) saveInvestmentToFirebase(targetInv);

    setProjectsList(updatedProjects);
    const targetProj = updatedProjects.find(p => p.id === inv.projectId);
    if (targetProj) saveProjectToFirebase(targetProj);

    setTransactionsList(prev => [liquidationTx, ...prev]);
    saveTransactionToFirebase(liquidationTx);

    addSystemLog('Admin_Action', `User ${activeUser.email} early liquidated investment ${inv.id}. 20% loss deduction applied ($${deduction.toFixed(2)}), $${payout.toFixed(2)} refunded to main balance.`, 'Secure');

    return { success: true, payout };
  };

  // Simulated Daily/Monthly Rollover (Admin function)
  const handleSimulateDailyRollover = () => {
    // 1. Calculate yesterday's date string
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newMissedRecords: ProfitClaimRecord[] = [];

    // 2. Identify all users who had active investments yesterday but missed claiming their yield
    usersListState.forEach(user => {
      const userInvestments = investmentsList.filter(inv => inv.userId === user.id || inv.userEmail?.toLowerCase() === user.email.toLowerCase());
      const dailyProfitSum = userInvestments.reduce((sum, inv) => {
        const isActive = inv.status === 'Active' || inv.status === undefined;
        return isActive ? sum + inv.dailyProfitRate : sum;
      }, 0);

      if (dailyProfitSum > 0) {
        // Check if user already claimed yesterday
        const hasClaimed = claimsHistory.some(c => 
          (c.userId === user.id || c.userEmail?.toLowerCase() === user.email.toLowerCase()) &&
          c.date === yesterdayStr && 
          c.status === 'Claimed'
        );

        if (!hasClaimed) {
          newMissedRecords.push({
            id: `claim-miss-${user.id}-${Date.now()}`,
            userId: user.id,
            userEmail: user.email,
            date: yesterdayStr,
            amount: dailyProfitSum,
            status: 'Missed'
          });
        }
      }
    });

    if (newMissedRecords.length > 0) {
      setClaimsHistory(prev => [...newMissedRecords, ...prev]);
      newMissedRecords.forEach(claim => saveClaimToFirebase(claim));
    }

    // 3. Decrement plan durations (remainingMonths) for active investments, handling maturities
    let totalMaturedPrincipal = 0;
    const maturedRefundTransactions: Transaction[] = [];
    const refundsByUserEmail: Record<string, number> = {};

    const updatedInvestments = investmentsList.map(inv => {
      const isActive = inv.status === 'Active' || inv.status === undefined;
      if (isActive) {
        const currentRemaining = inv.remainingMonths !== undefined ? inv.remainingMonths : (inv.durationMonths || 12);
        const newRemaining = Math.max(0, currentRemaining - 1);
        if (newRemaining === 0) {
          // Investment matured! Refund full principal cost
          totalMaturedPrincipal += inv.totalCost;
          const emailClean = (inv.userEmail || '').toLowerCase();
          refundsByUserEmail[emailClean] = (refundsByUserEmail[emailClean] || 0) + inv.totalCost;

          maturedRefundTransactions.push({
            id: `tx-matured-refund-${inv.id}-${Date.now()}`,
            userId: inv.userId || '',
            userEmail: inv.userEmail || '',
            type: 'Deposit',
            amount: inv.totalCost,
            date: new Date().toISOString().replace('T', ' ').slice(0, 16),
            status: 'Completed',
            description: `Principal returned automatically upon maturity for: ${inv.projectName}`
          });

          return {
            ...inv,
            remainingMonths: 0,
            status: 'Completed' as const
          };
        }
        return {
          ...inv,
          remainingMonths: newRemaining,
          status: 'Active' as const
        };
      }
      return inv;
    });

    setInvestmentsList(updatedInvestments);
    updatedInvestments.forEach(inv => saveInvestmentToFirebase(inv));

    // 4. Return matured principal to the respective users' balances
    if (maturedRefundTransactions.length > 0) {
      setUsersListState(prev => prev.map(u => {
        const refundAmount = refundsByUserEmail[u.email.toLowerCase()];
        if (refundAmount) {
          const updatedBal = Math.round((u.balance + refundAmount) * 100) / 100;
          const updatedTotalInv = Math.max(0, Math.round((u.totalInvestment - refundAmount) * 100) / 100);
          const updatedUser = {
            ...u,
            balance: updatedBal,
            totalInvestment: updatedTotalInv
          };
          saveAndSyncUser(updatedUser);
          return updatedUser;
        }
        return u;
      }));

      // Update activeUser if they received a refund
      if (activeUser) {
        const refundAmount = refundsByUserEmail[activeUser.email.toLowerCase()];
        if (refundAmount) {
          const updatedActiveUser = {
            ...activeUser,
            balance: Math.round((activeUser.balance + refundAmount) * 100) / 100,
            totalInvestment: Math.max(0, Math.round((activeUser.totalInvestment - refundAmount) * 100) / 100)
          };
          setActiveUser(updatedActiveUser);
          saveAndSyncUser(updatedActiveUser);
        }
      }

      setTransactionsList(prev => [...maturedRefundTransactions, ...prev]);
      maturedRefundTransactions.forEach(tx => saveTransactionToFirebase(tx));

      maturedRefundTransactions.forEach(tx => {
        addSystemLog('Admin_Action', `Automatic principal maturity payout completed: $${tx.amount.toFixed(2)} credited to ${tx.userEmail} balance.`, 'Secure');
      });
    } else {
      addSystemLog('Anti_Fraud_Trigger', `Daily Settlement Rollover executed: Recorded missed claims for uncollected portfolio queues.`, 'Secure');
    }
  };

  // Landing page interactive selection
  const handleSelectProjectFromLanding = (project: RealEstateProject) => {
    if (activeUser) {
      if (activeUser.role === 'admin') {
        setCurrentPage('admin');
      } else {
        setActiveDashboardTab('properties');
        setCurrentPage('dashboard');
        setTimeout(() => {
          const el = document.getElementById(`property-card-${project.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    } else {
      // Lead user automatically to registration as a secure pathway
      setCurrentPage('register');
    }
  };

  const getSimulatedTimeString = () => {
    const isPm = simulatedHour >= 12;
    const dispHour = simulatedHour % 12 === 0 ? 12 : simulatedHour % 12;
    return `${dispHour}:${simulatedMinute.toString().padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
  };

  if (activeUser && isAppLocked) {
    return (
      <BiometricLockScreen
        activeUser={activeUser}
        onUnlock={() => setIsAppLocked(false)}
        onLogout={handleLogout}
        addSystemLog={addSystemLog}
      />
    );
  }

  return (
    <>
      <InAppNotificationBanner />
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}
      <MobileShell currentTimeString={getSimulatedTimeString()}>
      <GlobalNavbar 
        currentPage={currentPage}
        activeUser={activeUser}
        onNavigate={handlePageNavigation}
        onLogout={handleLogout}
        activeTab={activeDashboardTab}
        setActiveTab={setActiveDashboardTab}
        activeAdminTab={activeAdminTab}
        setActiveAdminTab={setActiveAdminTab}
        onSimulateDailyRollover={handleSimulateDailyRollover}
        setScrollToAnchor={setScrollToAnchor}
        simulatedHour={simulatedHour}
        simulatedMinute={simulatedMinute}
        investments={investmentsList}
        transactions={transactionsList}
      />

      {currentPage === 'home' && (
        <LandingPage 
          onNavigate={handlePageNavigation} 
          onSelectProject={handleSelectProjectFromLanding}
          activeUser={activeUser}
          allTransactions={transactionsList}
          allClaims={claimsHistory}
          projects={projectsList}
          allUsers={usersListState}
          onSubmitInquiry={handleSubmitInquiry}
        />
      )}

      {currentPage === 'about' && (
        <AboutUs 
          onNavigate={handlePageNavigation}
          activeUser={activeUser}
        />
      )}

      {(currentPage === 'login' || currentPage === 'register' || currentPage === 'forgot') && (
        <AuthPages 
          initialScreen={currentPage}
          onAuthSuccess={handleAuthSuccess}
          onNavigate={handlePageNavigation}
          usersList={usersListState}
          addSystemLog={addSystemLog}
          authReason={authReason}
          onRegisterPending={handleRegisterPending}
          onPasswordReset={handleResetPassword}
          onUpdateUser={handleUpdateAnyUser}
          isFirebaseSynced={isFirebaseSynced}
        />
      )}

      {currentPage === 'dashboard' && activeUser && (
        <UserDashboard 
          activeUser={activeUser}
          usersList={usersListState}
          projects={projectsList}
          transactions={transactionsList.filter(t => t.userId === activeUser.id || t.userEmail?.toLowerCase() === activeUser.email.toLowerCase())}
          investments={investmentsList.filter(i => i.userId === activeUser.id || i.userEmail?.toLowerCase() === activeUser.email.toLowerCase())}
          claimsHistory={claimsHistory.filter(c => c.userId === activeUser.id || c.userEmail?.toLowerCase() === activeUser.email.toLowerCase())}
          onLogout={handleLogout}
          onNavigateAdmin={handleNavigateAdmin}
          onBindWallet={handleBindWallet}
          onSubmitDeposit={handleSubmitDeposit}
          onSubmitWithdrawal={handleSubmitWithdrawal}
          onPurchaseShares={handlePurchaseShares}
          onClaimDailyProfit={handleClaimDailyProfit}
          onLiquidateInvestment={handleLiquidateInvestment}
          onUpdateUser={handleUpdateUser}
          simulatedHour={simulatedHour}
          simulatedMinute={simulatedMinute}
          setSimulatedHour={handleSetSimulatedHour}
          setSimulatedMinute={setSimulatedMinute}
          isTimeSimulated={isTimeSimulated}
          activeTab={activeDashboardTab}
          setActiveTab={setActiveDashboardTab}
          systemSettings={systemSettings}
        />
      )}

      {currentPage === 'admin' && (
        <AdminPanel 
          projects={projectsList}
          transactions={transactionsList}
          usersList={usersListState}
          securityLogs={securityLogsList}
          inquiries={inquiriesList}
          activeAdminTab={activeAdminTab}
          setActiveAdminTab={setActiveAdminTab}
          onBackToDashboard={activeUser ? handleBackToDashboard : () => setCurrentPage('home')}
          onApproveTransaction={handleApproveTransaction}
          onRejectTransaction={handleRejectTransaction}
          onAddProject={handleAddProject}
          onSimulateDailyRollover={handleSimulateDailyRollover}
          onUpdateProjectRoi={handleUpdateProjectRoi}
          onAdjustUserFunds={handleAdjustUserFunds}
          onUnbindUserWallet={handleUnbindUserWallet}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onUpdateInquiry={handleUpdateInquiry}
          onDeleteInquiry={handleDeleteInquiry}
          systemSettings={systemSettings}
          onUpdateSystemSettings={handleUpdateSystemSettings}
          onUpdateUser={handleUpdateAnyUser}
          onDeleteUser={handleDeleteUser}
          currentUser={activeUser}
        />
      )}

      {currentPage === 'community' && (
        <div className="w-full fixed top-[56px] bottom-[64px] sm:static sm:top-auto sm:bottom-auto sm:pt-20 sm:pb-6 px-0 sm:px-4 flex-1 flex flex-col min-h-0 overflow-hidden z-10">
          <CommunityHub 
            currentUser={activeUser || INITIAL_USER} 
            onNavigateToDeposit={() => {
              setCurrentPage('dashboard');
              setActiveDashboardTab('wallet');
            }}
          />
        </div>
      )}

      {/* Global Floating AI Assistant */}
      <FloatingAiAssistant 
        currentUser={activeUser}
        onNavigateToCommunity={() => setCurrentPage('community')}
        isCommunityPage={currentPage === 'community'}
      />

      {/* Global APK Download Modal */}
      <ApkDownloadModal 
        isOpen={showApkModal} 
        onClose={() => setShowApkModal(false)} 
        isNewRegistration={isNewRegistration} 
      />

      {/* First Launch Android / Web Notification Permission Modal */}
      <NotificationPermissionModal
        isOpen={showNotifPermModal}
        onClose={() => {
          setShowNotifPermModal(false);
          localStorage.setItem('fundora_notif_prompt_shown', 'true');
        }}
        onPermissionChange={() => {
          localStorage.setItem('fundora_notif_prompt_shown', 'true');
        }}
      />
    </MobileShell>
    </>
  );
}
