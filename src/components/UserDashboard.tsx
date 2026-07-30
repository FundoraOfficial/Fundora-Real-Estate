/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { NativeBiometric } from 'capacitor-native-biometric';
import { getApiUrl, fetchWithFallback } from '../utils/api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { RealEstateProject, Transaction, UserAccount, InvestmentRecord, ProfitClaimRecord, getAvatarBgClass, getInvestorTier, SystemSettings } from '../types';
import { generateReceiptPDF, generateDocumentPDF } from '../utils/pdfReceipt';
import { sendKycEmail } from '../lib/emailService';
import { 
  TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle, Users, Percent, Gift, Clock,
  Building, MapPin, Search, Filter, ShieldCheck, ChevronRight, ChevronLeft, Calculator, CheckCircle2,
  AlertTriangle, Copy, Trash, Upload, Landmark, Sparkles, RefreshCw, X, XCircle, ChevronDown, Award,
  FileText, Plus, User, Lock, Check, Crown, Shield, Download, Printer, ZoomIn, ZoomOut, Eye, EyeOff,
  ArrowDownLeft, ArrowUpRight, Briefcase, Coins, History, ListFilter, Calendar, Fingerprint, Smartphone,
  Bell, BellOff, Volume2, Send
} from 'lucide-react';
import { 
  getNotificationPreferences, 
  saveNotificationPreferences, 
  requestNotificationPermission, 
  triggerTestNotification, 
  getNotificationPermission,
  NotificationPreferences 
} from '../utils/notifications';

interface UserDashboardProps {
  activeUser: UserAccount;
  usersList?: UserAccount[];
  projects: RealEstateProject[];
  transactions: Transaction[];
  investments: InvestmentRecord[];
  claimsHistory: ProfitClaimRecord[];
  onLogout: () => void;
  onNavigateAdmin: () => void;
  // Transactions
  onBindWallet: (trc20: string, bep20: string) => void;
  onSubmitDeposit: (amount: number, network: 'TRC20' | 'BEP20', txHash: string, proofImg: string) => void;
  onSubmitWithdrawal: (amount: number, network: 'TRC20' | 'BEP20', address: string) => void;
  onPurchaseShares: (projectId: string, sharesCount: number) => { success: boolean; error?: string };
  onClaimDailyProfit: () => Promise<{ success: boolean; type: 'no_yield' | 'inactive_window' | 'already_claimed' | 'success'; amount?: number }> | { success: boolean; type: 'no_yield' | 'inactive_window' | 'already_claimed' | 'success'; amount?: number };
  onLiquidateInvestment: (investmentId: string) => { success: boolean; payout: number };
  onUpdateUser: (fields: Partial<UserAccount>) => void;
  // Simulated clock properties
  simulatedHour: number;
  simulatedMinute: number;
  setSimulatedHour: (hr: number) => void;
  setSimulatedMinute: (min: number) => void;
  isTimeSimulated?: boolean;
  // Sync tab state
  activeTab?: 'overview' | 'properties' | 'wallet' | 'ledger' | 'claim' | 'referrals' | 'profile';
  setActiveTab?: (tab: 'overview' | 'properties' | 'wallet' | 'ledger' | 'claim' | 'referrals' | 'profile') => void;
  systemSettings?: SystemSettings;
}

// Client-side regex & OCR parser helper for crypto payment receipts / deposit screenshots
function parseReceiptText(text: string, fileName?: string) {
  let txid = '';
  let amount = 0;
  let network: 'TRC20' | 'BEP20' = 'TRC20';

  const fullContent = (text || '') + '\n' + (fileName || '');
  if (!fullContent.trim()) return { txid, amount, network };

  const cleanText = fullContent.replace(/\r\n/g, '\n');

  // 1. Extract Amount (USDT / USD deposit amounts)
  const amountMatches = [
    /(?:amount|paid|deposit|total|sum|value|payment|received|transferred)[\s:]*[$]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    /([0-9]+(?:\.[0-9]+)?)\s*(?:USDT|USD)/i,
    /[$]\s*([0-9]+(?:\.[0-9]+)?)/,
    /\b([0-9]{1,6}(?:\.[0-9]{1,2})?)\b/
  ];

  for (const regex of amountMatches) {
    const match = cleanText.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val >= 1 && val <= 1000000) {
        amount = val;
        break;
      }
    }
  }

  // 2. Extract TxID / Order ID / Ref No (e.g., Quotex Deposit ID 124119776, Binance TxID, etc.)
  const txidMatches = [
    /(?:txid|txhash|transaction\s*id|deposit\s*id|order\s*id|ref\s*no|reference|hash|order|deposit|id)[\s:#]*([a-zA-Z0-9_-]{6,64})/i,
    /(0x[a-fA-F0-9]{40,64})/,
    /(T[A-Za-z0-9]{33})/,
    /\b(\d{8,18})\b/
  ];

  for (const regex of txidMatches) {
    const match = cleanText.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const upper = candidate.toUpperCase();
      if (!['AMOUNT', 'SUCCESS', 'DEPOSIT', 'PAYMENT', 'QUOTEX', 'BINANCE', 'USDT', 'PENDING', 'COMPLETED', 'TRANSFER', 'TOTAL', 'USD', 'STATUS', 'DATE'].includes(upper)) {
        txid = candidate;
        break;
      }
    }
  }

  // 3. Network detection
  if (/BEP20|BSC|BINANCE|0X/i.test(cleanText)) {
    network = 'BEP20';
  } else {
    network = 'TRC20';
  }

  return { txid, amount, network };
}

// SafePropertyImage component to prevent subpixel scaling glitches and image flickering/disappearing on mobile
function SafePropertyImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  
  return (
    <div className="relative w-full h-full bg-[#0a0c20] flex items-center justify-center overflow-hidden">
      {status !== 'loaded' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-indigo-500/30 select-none z-0">
          <Building className="w-10 h-10 stroke-[1.2] animate-pulse" />
          <span className="text-[8.5px] uppercase tracking-widest font-mono font-black">Fundora Premium Asset</span>
        </div>
      )}
      
      <img 
        src={src} 
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out z-10 md:group-hover:scale-105 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        referrerPolicy="no-referrer"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}

export default function UserDashboard({
  activeUser,
  usersList = [],
  projects,
  transactions,
  investments,
  claimsHistory,
  onLogout,
  onNavigateAdmin,
  onBindWallet,
  onSubmitDeposit,
  onSubmitWithdrawal,
  onPurchaseShares,
  onClaimDailyProfit,
  onLiquidateInvestment,
  onUpdateUser,
  simulatedHour,
  simulatedMinute,
  setSimulatedHour,
  setSimulatedMinute,
  isTimeSimulated = false,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  systemSettings = {
    id: 'default',
    usdtTrc20Address: 'TX1h2A9eFm7xKsZ8Jq9wDpBcNdKyLmTqRy',
    usdtBep20Address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    scanGateTitle: 'Barcode Scanning Gateway',
    scanGateSubtitle: 'Dispatch on the matching blockchain. Tokens sent to mismatched networks are irreversibly lost.',
    usdtTrc20QrCode: '',
    usdtBep20QrCode: '',
    apiUrl: 'https://fundora.one'
  }
}: UserDashboardProps) {
  // Current Tab state
  const [internalActiveTab, setInternalActiveTab] = useState<'overview' | 'properties' | 'wallet' | 'ledger' | 'claim' | 'referrals' | 'profile'>('overview');
  const activeTab = (externalActiveTab !== undefined ? externalActiveTab : internalActiveTab) || 'overview';
  const setActiveTab = externalSetActiveTab !== undefined ? externalSetActiveTab : setInternalActiveTab;

  const [confirmLiquidateId, setConfirmLiquidateId] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<{ item: any; type: 'transaction' | 'claim' } | null>(null);

  // Custom Inline notifications status
  const [dashboardStatus, setDashboardStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setDashboardStatus({ message, type });
    setTimeout(() => {
      setDashboardStatus(null);
    }, 6000);
  };

  // Properties filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'roi' | 'price' | 'shares'>('roi');

  // Investment Calculator Drawer / modal state
  const [selectedProjectForCalc, setSelectedProjectForCalc] = useState<RealEstateProject | null>(null);
  const [calculatorShares, setCalculatorShares] = useState<number>(1);
  const [calcError, setCalcError] = useState<string | null>(null);

  React.useEffect(() => {
    setCalcError(null);
  }, [selectedProjectForCalc, calculatorShares]);

  // PDF Viewer Modal States
  const [activeViewDoc, setActiveViewDoc] = useState<{ docName: string; project: RealEstateProject } | null>(null);
  const [pdfZoom, setPdfZoom] = useState<number>(100);

  // Wallet Setup Inputs
  const [trcLink, setTrcLink] = useState(activeUser?.wallet?.usdtTrc20Address || '');
  const [bepLink, setBepLink] = useState(activeUser?.wallet?.usdtBep20Address || '');

  React.useEffect(() => {
    setTrcLink(activeUser?.wallet?.usdtTrc20Address || '');
    setBepLink(activeUser?.wallet?.usdtBep20Address || '');
  }, [activeUser?.wallet?.usdtTrc20Address, activeUser?.wallet?.usdtBep20Address]);
  const [isBindingOpen, setIsBindingOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  // Deposit Form Info
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositNetwork, setDepositNetwork] = useState<'TRC20' | 'BEP20'>('TRC20');
  const [depositHashInput, setDepositHashInput] = useState('');
  const [depositProofInput, setDepositProofInput] = useState(''); // Stores base64 image data or URL
  const [depositProofFileName, setDepositProofFileName] = useState(''); // Original file name for display
  const [isReceiptAutoFetched, setIsReceiptAutoFetched] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState('');
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [showDepositConfirmModal, setShowDepositConfirmModal] = useState(false);
  const [submittedDepositData, setSubmittedDepositData] = useState<{ amount: number; network: string; txHash: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Withdrawal Form Info
  const [withdrawAmount, setWithdrawAmount] = useState<number>(50);
  const [withdrawNetwork, setWithdrawNetwork] = useState<'TRC20' | 'BEP20'>('TRC20');
  const [withdrawAddressInput, setWithdrawAddressInput] = useState('');
  const [withdrawErrorMsg, setWithdrawErrorMsg] = useState('');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');

  React.useEffect(() => {
    const boundAddress = withdrawNetwork === 'TRC20' 
      ? activeUser?.wallet?.usdtTrc20Address 
      : activeUser?.wallet?.usdtBep20Address;
    setWithdrawAddressInput(boundAddress || '');
  }, [withdrawNetwork, activeUser?.wallet?.usdtTrc20Address, activeUser?.wallet?.usdtBep20Address]);

  // Copy helpers
  const [copiedText, setCopiedText] = useState('');
  const [walletSubTab, setWalletSubTab] = useState<'deposit' | 'withdraw'>('deposit');
  
  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(getNotificationPreferences());
  const [notifStatusMsg, setNotifStatusMsg] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const handleToggleNotifPref = (key: keyof NotificationPreferences) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    saveNotificationPreferences(updated);
  };
  const [claimPopup, setClaimPopup] = useState<{
    isOpen: boolean;
    type: 'no_yield' | 'inactive_window' | 'already_claimed' | 'success';
    amount?: number;
  } | null>(null);

  const [isClaiming, setIsClaiming] = useState(false);

  // Ledger History Filters State
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'All' | 'Deposit' | 'Withdrawal' | 'Investment' | 'Profit Claim' | 'Referral Bonus' | 'Missed Claim'>('All');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Completed' | 'Rejected'>('All');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  const ledgerItems = useMemo(() => {
    // 1. Map standard transactions
    const txItems = transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      status: tx.status,
      txHash: tx.txHash,
      description: tx.description || `${tx.type} operation`,
      network: tx.network,
      rawItem: tx,
      isClaim: false
    }));

    // 2. Map missed or expired claims from claimsHistory as 'Missed Claim'
    const missedClaimsItems = claimsHistory
      .filter(c => c.status === 'Missed' || c.status === 'Expired')
      .map(c => ({
        id: c.id,
        type: 'Missed Claim' as const,
        amount: c.amount,
        date: c.date,
        status: c.status, // 'Missed' or 'Expired'
        txHash: undefined,
        description: `Missed daily dividend yield payout for slot ${c.slot || 16}:00 UTC`,
        network: undefined,
        rawItem: c,
        isClaim: true
      }));

    return [...txItems, ...missedClaimsItems].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions, claimsHistory]);

  const filteredTransactions = useMemo(() => {
    return ledgerItems.filter(item => {
      const searchLower = ledgerSearch.toLowerCase();
      const matchesSearch = !ledgerSearch || 
                            item.id.toLowerCase().includes(searchLower) || 
                            item.description.toLowerCase().includes(searchLower) ||
                            item.date.toLowerCase().includes(searchLower) ||
                            item.type.toLowerCase().includes(searchLower);
      
      const matchesType = ledgerTypeFilter === 'All' || item.type === ledgerTypeFilter;
      
      let matchesStatus = true;
      if (ledgerStatusFilter !== 'All') {
        if (ledgerStatusFilter === 'Completed') {
          matchesStatus = item.status === 'Completed' || item.status === 'Approved' || item.status === 'Claimed';
        } else if (ledgerStatusFilter === 'Pending') {
          matchesStatus = item.status === 'Pending';
        } else if (ledgerStatusFilter === 'Rejected') {
          matchesStatus = item.status === 'Rejected' || item.status === 'Missed' || item.status === 'Expired';
        }
      }

      let matchesDate = true;
      if (item.date) {
        const itemDateOnly = item.date.split(' ')[0]; // Matches "YYYY-MM-DD"
        if (ledgerStartDate && itemDateOnly < ledgerStartDate) {
          matchesDate = false;
        }
        if (ledgerEndDate && itemDateOnly > ledgerEndDate) {
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [ledgerItems, ledgerSearch, ledgerTypeFilter, ledgerStatusFilter, ledgerStartDate, ledgerEndDate]);

  // Profile and Security local states
  const [profileName, setProfileName] = useState(activeUser.name || '');
  const [profileAvatar, setProfileAvatar] = useState(activeUser.avatarUrl || 'gradient-1');
  const [profileStatus, setProfileStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Change password states
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // KYC Verification States
  const [kycFullNameInput, setKycFullNameInput] = useState(activeUser.kycFullName || '');
  const [kycCountryInput, setKycCountryInput] = useState(activeUser.kycCountry || '');
  const [kycDocType, setKycDocType] = useState(activeUser.kycDocumentType || 'Passport');
  const [kycFileName, setKycFileName] = useState('');
  const [kycFilePreview, setKycFilePreview] = useState<string | null>(null);
  const [kycFileSize, setKycFileSize] = useState<string>('');
  const kycFileInputRef = useRef<HTMLInputElement>(null);
  const [isKycDragging, setIsKycDragging] = useState(false);

  // Back side KYC States for Identity Card
  const [kycFileNameBack, setKycFileNameBack] = useState('');
  const [kycFilePreviewBack, setKycFilePreviewBack] = useState<string | null>(null);
  const [kycFileSizeBack, setKycFileSizeBack] = useState<string>('');
  const kycFileInputRefBack = useRef<HTMLInputElement>(null);
  const [isKycDraggingBack, setIsKycDraggingBack] = useState(false);

  const [kycStatus, setKycStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Device Detection State
  const [isMobile, setIsMobile] = useState(false);

  // WebAuthn Biometrics States
  const [showBiometricRegisterModal, setShowBiometricRegisterModal] = useState(false);
  const [biometricRegisterStep, setBiometricRegisterStep] = useState<'intro' | 'scanning' | 'complete'>('intro');
  const [biometricProgress, setBiometricProgress] = useState(0);
  const [isFingerPressedRegister, setIsFingerPressedRegister] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isUAComputed = mobileRegex.test(userAgent);
      const hasTouch = ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
                       ('msMaxTouchPoints' in navigator && (navigator as any).msMaxTouchPoints > 0);
      const isSmallScreen = window.innerWidth <= 1024;
      setIsMobile(isUAComputed || (hasTouch && isSmallScreen));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle tactile register progress on fingerprint press and hold
  useEffect(() => {
    let timer: any;
    if (showBiometricRegisterModal && biometricRegisterStep === 'scanning' && isFingerPressedRegister) {
      timer = setInterval(() => {
        setBiometricProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setBiometricRegisterStep('complete');
            onUpdateUser({
              webAuthnEnabled: true,
              webAuthnCredentialId: 'simulated-credential-' + Math.random().toString(36).substring(2, 11),
              webAuthnPublicKey: 'simulated-pubkey-' + Math.random().toString(36).substring(2, 11)
            });

            // Add to local biometric emails list to prevent privacy leakage
            if (activeUser?.email) {
              try {
                const cleanEmail = activeUser.email.trim().toLowerCase();
                localStorage.setItem(`inv_device_biometric_active_${cleanEmail}`, 'true');
                const existing = localStorage.getItem('inv_local_biometric_emails');
                const emails = existing ? JSON.parse(existing) : [];
                if (!emails.includes(cleanEmail)) {
                  emails.push(cleanEmail);
                  localStorage.setItem('inv_local_biometric_emails', JSON.stringify(emails));
                }
              } catch (e) {
                console.error('Error saving local biometric email:', e);
              }
            }

            return 100;
          }
          if (prev % 20 === 0 && typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
          }
          return prev + 5; // Ticks up by 5% every 50ms (takes 1.0s)
        });
      }, 50);
    } else if (showBiometricRegisterModal && biometricRegisterStep === 'scanning' && !isFingerPressedRegister && biometricProgress < 100) {
      timer = setInterval(() => {
        setBiometricProgress(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return Math.max(0, prev - 10);
        });
      }, 50);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showBiometricRegisterModal, biometricRegisterStep, isFingerPressedRegister, biometricProgress]);

  const startBiometricScan = () => {
    setBiometricRegisterStep('scanning');
    setBiometricProgress(0);
    setIsFingerPressedRegister(false);
  };

  const handleRegisterBiometrics = async () => {
    // 1. Detect if inside Capacitor native app
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor && (
      (window as any).Capacitor.isNative || 
      ((window as any).Capacitor.getPlatform && (window as any).Capacitor.getPlatform() !== 'web')
    );

    if (isCapacitor) {
      showStatus("Initiating native mobile biometric scan...", "info");
      try {
        const available = await NativeBiometric.isAvailable();
        if (available.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason: "Register fingerprint biometric quick access for your Fundora account",
            title: "Register Biometrics",
            subtitle: "Link your device's fingerprint or Face ID",
            description: "Place your finger on the sensor to continue"
          });

          onUpdateUser({
            webAuthnEnabled: true,
            webAuthnCredentialId: 'capacitor-native-biometric',
            webAuthnPublicKey: 'capacitor-approved-key'
          });

          if (activeUser?.email) {
            try {
              const cleanEmail = activeUser.email.trim().toLowerCase();
              localStorage.setItem(`inv_device_biometric_active_${cleanEmail}`, 'true');
              const existing = localStorage.getItem('inv_local_biometric_emails');
              const emails = existing ? JSON.parse(existing) : [];
              if (!emails.includes(cleanEmail)) {
                emails.push(cleanEmail);
                localStorage.setItem('inv_local_biometric_emails', JSON.stringify(emails));
              }
            } catch (e) {
              console.error('Error saving local biometric email:', e);
            }
          }

          showStatus("Native biometric authentication registered successfully!", "success");
        } else {
          showStatus("No native biometric hardware available or set up on this device.", "error");
        }
      } catch (err: any) {
        console.warn("Capacitor biometric registration failed:", err);
        showStatus("Biometric registration failed: " + (err.message || String(err)), "error");
      }
      return;
    }

    // 2. Detect if inside Median.co / GoNative WebView app
    const isMedian = typeof window !== 'undefined' && (
      !!(window as any).median || 
      !!(window as any).gonative || 
      ((window as any).webkit && (window as any).webkit.messageHandlers && !!(window as any).webkit.messageHandlers.gonative)
    );

    if (isMedian) {
      showStatus("Initiating native mobile biometric scan...", "info");
      
      const handleSuccess = () => {
        onUpdateUser({
          webAuthnEnabled: true,
          webAuthnCredentialId: 'median-native-biometric',
          webAuthnPublicKey: 'median-native-approved'
        });

        if (activeUser?.email) {
          try {
            const cleanEmail = activeUser.email.trim().toLowerCase();
            localStorage.setItem(`inv_device_biometric_active_${cleanEmail}`, 'true');
            const existing = localStorage.getItem('inv_local_biometric_emails');
            const emails = existing ? JSON.parse(existing) : [];
            if (!emails.includes(cleanEmail)) {
              emails.push(cleanEmail);
              localStorage.setItem('inv_local_biometric_emails', JSON.stringify(emails));
            }
          } catch (e) {
            console.error('Error saving local biometric email:', e);
          }
        }
        showStatus("Biometric quick access enabled successfully via native hardware sensor!", "success");
      };

      const handleFailure = (errReason: string) => {
        showStatus("Native biometric verification failed or cancelled: " + errReason, "error");
      };

      // Define a secure callback for median.co native prompt
      (window as any).medianBiometricRegisterCallback = function(res: any) {
        if (res && res.success) {
          handleSuccess();
        } else {
          handleFailure(res && res.error ? res.error : "Verification rejected");
        }
      };

      try {
        const medianObj = (window as any).median || (window as any).gonative;
        if (medianObj && medianObj.biometrics && typeof medianObj.biometrics.prompt === 'function') {
          medianObj.biometrics.prompt({
            message: "Register your biometrics to secure your Fundora account",
            callback: (res: any) => {
              if (res && res.success) {
                handleSuccess();
              } else {
                handleFailure(res && res.error ? res.error : "Verification rejected");
              }
            }
          });
        } else {
          // Fallback via URL scheme
          window.location.href = "gonative://biometrics/prompt?message=Register%20biometrics%20for%20Fundora&callback=medianBiometricRegisterCallback";
        }
      } catch (err: any) {
        handleFailure(err.message || String(err));
      }
      return;
    }

    // 2. Standard WebAuthn flow
    try {
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported on this browser.");
      }
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = activeUser.id || 'user-123';
      const userEmail = activeUser.email || 'investor@gmail.com';
      const userName = activeUser.name || 'Fundora Investor';
      const options: CredentialCreationOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: "Fundora Real Estate Investment",
            id: window.location.hostname || "localhost"
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userEmail,
            displayName: userName
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 }
          ],
          timeout: 60000,
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred"
          },
          attestation: "none"
        }
      };
      
      showStatus("Please complete your mobile biometric verification... (check for your device prompt)", "info");
      
      const credential = await navigator.credentials.create(options) as PublicKeyCredential | null;
      if (credential) {
        const rawId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        onUpdateUser({
          webAuthnEnabled: true,
          webAuthnCredentialId: credential.id,
          webAuthnPublicKey: rawId
        });

        // Add to local biometric emails list to prevent privacy leakage
        if (activeUser?.email) {
          try {
            const cleanEmail = activeUser.email.trim().toLowerCase();
            localStorage.setItem(`inv_device_biometric_active_${cleanEmail}`, 'true');
            const existing = localStorage.getItem('inv_local_biometric_emails');
            const emails = existing ? JSON.parse(existing) : [];
            if (!emails.includes(cleanEmail)) {
              emails.push(cleanEmail);
              localStorage.setItem('inv_local_biometric_emails', JSON.stringify(emails));
            }
          } catch (e) {
            console.error('Error saving local biometric email:', e);
          }
        }

        showStatus("Biometric signature registered successfully! You can now use Quick Access to login.", "success");
      }
    } catch (err: any) {
      console.warn("Real WebAuthn registration failed, falling back to secure in-app simulator:", err);
      showStatus("Launching secure in-app biometric simulator...", "info");
      setBiometricRegisterStep('intro');
      setBiometricProgress(0);
      setShowBiometricRegisterModal(true);
    }
  };

  const handleDisableBiometrics = () => {
    onUpdateUser({
      webAuthnEnabled: false,
      webAuthnCredentialId: '',
      webAuthnPublicKey: ''
    });

    // Remove from local biometric emails list
    if (activeUser?.email) {
      try {
        const cleanEmail = activeUser.email.trim().toLowerCase();
        localStorage.setItem(`inv_device_biometric_active_${cleanEmail}`, 'false');
        const existing = localStorage.getItem('inv_local_biometric_emails');
        if (existing) {
          const emails = JSON.parse(existing);
          const filtered = emails.filter((e: string) => e !== cleanEmail);
          localStorage.setItem('inv_local_biometric_emails', JSON.stringify(filtered));
        }
      } catch (e) {
        console.error('Error removing local biometric email:', e);
      }
    }

    showStatus("Biometric quick access has been disabled.", "info");
  };

  const handleKycFileSelect = (file: File, isBack: boolean = false) => {
    if (!file) return;
    if (isBack) {
      setKycFileNameBack(file.name);
    } else {
      setKycFileName(file.name);
    }
    
    // Format size
    const sizeInMB = file.size / (1024 * 1024);
    if (isBack) {
      setKycFileSizeBack(`${sizeInMB.toFixed(2)} MB`);
    } else {
      setKycFileSize(`${sizeInMB.toFixed(2)} MB`);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      // Compress images on the fly to prevent massive payloads
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_width = 1000;
          const max_height = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_width) {
              height *= max_width / width;
              width = max_width;
            }
          } else {
            if (height > max_height) {
              width *= max_height / height;
              height = max_height;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            if (isBack) {
              setKycFilePreviewBack(compressedDataUrl);
            } else {
              setKycFilePreview(compressedDataUrl);
            }
            
            // Calculate actual base64 length in bytes to show dynamic compressed size
            const head = 'data:image/jpeg;base64,';
            const sizeInBytes = Math.round((compressedDataUrl.length - head.length) * 3 / 4);
            const sizeInKB = sizeInBytes / 1024;
            if (isBack) {
              setKycFileSizeBack(`${(sizeInKB / 1024).toFixed(2)} MB (Compressed)`);
            } else {
              setKycFileSize(`${(sizeInKB / 1024).toFixed(2)} MB (Compressed)`);
            }
          } else {
            if (isBack) {
              setKycFilePreviewBack(dataUrl);
            } else {
              setKycFilePreview(dataUrl);
            }
          }
        };
        img.src = dataUrl;
      } else {
        if (isBack) {
          setKycFilePreviewBack(dataUrl);
        } else {
          setKycFilePreview(dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // 10 Key Dashboard Cards calculation:
  // 1. Total Investment: sum of cost in investmentRecords
  const calculatedTotalInvest = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.totalCost, 0);
  }, [investments]);

  // Detailed status-based investment breakdowns
  const activeInvestments = useMemo(() => {
    return investments.filter(inv => inv.status !== 'Completed' && inv.status !== 'Liquidated');
  }, [investments]);

  const activeTotalInvest = useMemo(() => {
    return activeInvestments.reduce((sum, inv) => sum + inv.totalCost, 0);
  }, [activeInvestments]);

  const maturedInvestments = useMemo(() => {
    return investments.filter(inv => inv.status === 'Completed');
  }, [investments]);

  const maturedTotalInvest = useMemo(() => {
    return maturedInvestments.reduce((sum, inv) => sum + inv.totalCost, 0);
  }, [maturedInvestments]);

  const liquidatedInvestments = useMemo(() => {
    return investments.filter(inv => inv.status === 'Liquidated');
  }, [investments]);

  const liquidatedTotalInvest = useMemo(() => {
    return liquidatedInvestments.reduce((sum, inv) => sum + inv.totalCost, 0);
  }, [liquidatedInvestments]);

  // 2. Daily Profit (Accumulated from active investments based on ROI percentage scaled to 1 day)
  const calculatedDailyProfit = useMemo(() => {
    return investments.reduce((sum, inv) => {
      const isActive = inv.status !== 'Completed' && inv.status !== 'Liquidated';
      return isActive ? sum + inv.dailyProfitRate : sum;
    }, 0);
  }, [investments]);

  // 3. Total Profit Earned (claims history count)
  const totalProfitEarnedAmount = useMemo(() => {
    return claimsHistory
      .filter(c => c.status === 'Claimed')
      .reduce((sum, c) => sum + c.amount, 0) + activeUser.totalProfitEarned;
  }, [claimsHistory, activeUser.totalProfitEarned]);

  // 4. Total Deposits
  const totalDepositsSum = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Deposit' && t.status === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // 5. Total Withdrawals
  const totalWithdrawalsSum = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Withdrawal' && t.status === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // 6. Available Balance (from user profile)
  const availableUserBalance = activeUser.balance;

  // 6.5. Check if user has already invested in any project (including totalInvestment metric)
  const hasAlreadyInvested = useMemo(() => {
    return activeUser.totalInvestment > 0 || (investments && investments.some(inv => inv.userId === activeUser.id));
  }, [activeUser.totalInvestment, investments, activeUser.id]);

  // 7. Missed Claims
  const missedClaimsCount = useMemo(() => {
    return claimsHistory.filter(c => c.status === 'Missed' || c.status === 'Expired').length;
  }, [claimsHistory]);

  const successfulClaims = useMemo(() => {
    return claimsHistory.filter(c => c.status === 'Claimed');
  }, [claimsHistory]);

  const missedClaims = useMemo(() => {
    return claimsHistory.filter(c => c.status === 'Missed' || c.status === 'Expired');
  }, [claimsHistory]);

  // 8. Active Projects count
  const activeProjectsCount = useMemo(() => {
    return new Set(investments.map(i => i.projectId)).size;
  }, [investments]);

  // 9. Referral Earnings (sum of Completed Referral Bonus transactions)
  const referralEarningsSum = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Referral Bonus' && t.status === 'Completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Aggregate user deposit and withdrawal activity trends for Line/Area Chart
  const chartData = useMemo(() => {
    // Determine the start date of the chart
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // Default to last 7 days

    if (activeUser?.registrationDate) {
      try {
        const regDate = new Date(activeUser.registrationDate);
        if (!isNaN(regDate.getTime())) {
          startDate = regDate;
        }
      } catch (e) {}
    }

    // Also check if any transaction date is even older to capture the full history
    transactions.forEach(tx => {
      try {
        const txDate = new Date(tx.date);
        if (!isNaN(txDate.getTime()) && txDate < startDate) {
          startDate = txDate;
        }
      } catch (e) {}
    });

    // Limit range to 30 days max to maintain elegant UI presentation & high performance
    const maxDaysAgo = new Date();
    maxDaysAgo.setDate(maxDaysAgo.getDate() - 30);
    if (startDate < maxDaysAgo) {
      startDate = maxDaysAgo;
    }

    // Generate continuous YYYY-MM-DD day entries from startDate to now (local date)
    const days: string[] = [];
    const endDate = new Date();
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(current.toISOString().substring(0, 10));
      current.setDate(current.getDate() + 1);
    }

    // Sort approved/completed transactions for cumulative running balance calculations
    const sortedAllTxs = [...transactions]
      .filter(t => t.status === 'Approved' || t.status === 'Completed')
      .sort((a, b) => a.date.localeCompare(b.date));

    // Map each day to its respective activity and running balance
    return days.map(day => {
      let dailyDeposits = 0;
      let dailyWithdrawals = 0;

      transactions.forEach(tx => {
        const txDay = tx.date.substring(0, 10);
        if (txDay === day && (tx.status === 'Approved' || tx.status === 'Completed')) {
          if (tx.type === 'Deposit') {
            dailyDeposits += tx.amount;
          } else if (tx.type === 'Withdrawal') {
            dailyWithdrawals += tx.amount;
          }
        }
      });

      // Calculate running balance up to the end of this day
      let balanceAtDayEnd = 0;
      sortedAllTxs.forEach(tx => {
        const txDay = tx.date.substring(0, 10);
        if (txDay <= day) {
          if (tx.type === 'Deposit' || tx.type === 'Profit Claim' || tx.type === 'Referral Bonus') {
            balanceAtDayEnd += tx.amount;
          } else if (tx.type === 'Withdrawal' || tx.type === 'Investment') {
            balanceAtDayEnd -= tx.amount;
          }
        }
      });

      // Format date for neat display labels (e.g., "Jun 28")
      let formattedDate = day;
      try {
        const dObj = new Date(day);
        if (!isNaN(dObj.getTime())) {
          formattedDate = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        }
      } catch (e) {}

      return {
        date: day,
        formattedDate,
        deposits: dailyDeposits,
        withdrawals: dailyWithdrawals,
        balance: Math.max(0, balanceAtDayEnd)
      };
    });
  }, [transactions, activeUser]);

  // 10. Total Referrals (from completed transactions or pre-simulated logs)
  const userReferrals = useMemo(() => {
    return usersList.filter(u => u.referredBy === activeUser.referralCode);
  }, [usersList, activeUser.referralCode]);

  const totalReferralsCount = useMemo(() => {
    return userReferrals.length;
  }, [userReferrals]);

  // Dynamic automatically calculated Investor Tier (Shield / Badge system)
  const userTier = useMemo(() => {
    return getInvestorTier(calculatedTotalInvest, totalReferralsCount);
  }, [calculatedTotalInvest, totalReferralsCount]);

  // Is Profit claims window active (04:00 PM to 05:00 PM, or 09:00 PM to 10:00 PM)
  const isClaimWindowActive = useMemo(() => {
    return simulatedHour === 16 || simulatedHour === 21;
  }, [simulatedHour]);

  // Filter projects list
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCat;
    }).sort((a, b) => {
      if (sortBy === 'roi') return b.expectedRoi - a.expectedRoi;
      if (sortBy === 'price') return a.pricePerShare - b.pricePerShare;
      if (sortBy === 'shares') return b.availableShares - a.availableShares;
      return 0;
    });
  }, [projects, searchQuery, selectedCategory, sortBy]);

  // Calculate Calculator specific yields
  const { calculatorCost, calculatorEstimatedMthly, calculatorEstimatedDaily } = useMemo(() => {
    if (!selectedProjectForCalc) return { calculatorCost: 0, calculatorEstimatedMthly: 0, calculatorEstimatedDaily: 0 };
    const cost = calculatorShares * selectedProjectForCalc.pricePerShare;
    const duration = selectedProjectForCalc.durationMonths || 12;
    // Estimated monthly yield is: (Cost * (ROI / 100)) / Duration Months
    const mthly = (cost * (selectedProjectForCalc.expectedRoi / 100)) / duration;
    // Estimated daily yield is: (Cost * (ROI / 100)) / (Duration Months * 30)
    const daily = (cost * (selectedProjectForCalc.expectedRoi / 100)) / (duration * 30);
    return { calculatorCost: cost, calculatorEstimatedMthly: mthly, calculatorEstimatedDaily: daily };
  }, [selectedProjectForCalc, calculatorShares]);

   const handleApplyWalletBinding = (e: React.FormEvent) => {
    e.preventDefault();
    onBindWallet(trcLink, bepLink);
    setIsBindingOpen(false);
    showStatus("USDT TRC20 & BEP20 wallet addresses bound successfully!", "success");
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositSuccessMsg('');
    
    // Screenshot upload is compulsory
    if (!depositProofInput) {
      showStatus("❌ Screenshot proof is compulsory! Please upload a screenshot of your payment to proceed.", "error");
      return;
    }

    if (!depositHashInput || depositHashInput.trim().length < 8) {
      showStatus("Please enter a valid USDT transaction TxID hash to allow node verification.", "error");
      return;
    }

    const currentAmount = depositAmount;
    const currentNetwork = depositNetwork;
    const currentTxHash = depositHashInput;

    onSubmitDeposit(
      depositAmount,
      depositNetwork,
      depositHashInput,
      depositProofInput
    );

    setSubmittedDepositData({
      amount: currentAmount,
      network: currentNetwork,
      txHash: currentTxHash,
    });
    setShowDepositConfirmModal(true);

    setDepositSuccessMsg("Your deposit proof has been received! Our blockchain auditors will verify confirmation logs shortly.");
    showStatus("Deposit request submitted successfully!", "success");
    setDepositHashInput('');
    setDepositProofInput('');
    setDepositProofFileName('');
  };

  const compressAndResizeImage = (base64Str: string, maxW = 1000, maxH = 1000): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress as image/jpeg at 0.8 quality to keep image sharp but extremely light
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
      img.src = base64Str;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDepositProofFileName(file.name);
    setDepositProofInput(file.name);
    setIsAnalyzingReceipt(true);
    setScanErrorMessage(null);
    setScanSuccessMessage(null);
    showStatus(`Uploading "${file.name}" for scan...`, "info");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        
        try {
          // Downscale and compress the image to 1200x1200 JPEG with 0.85 quality for crisp text recognition
          const base64Data = await compressAndResizeImage(rawBase64, 1200, 1200);
          console.log("[UserDashboard] Compressed receipt size: from", Math.round(rawBase64.length / 1024), "KB to", Math.round(base64Data.length / 1024), "KB");

          let resultData = null;
          let scannedViaFallback = false;

          // Resolve API key from settings or Vite public env
          const clientApiKey = systemSettings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;

          try {
            console.log("[UserDashboard] Sending to backend receiver /api/analyze-receipt...");
            const response = await fetchWithFallback('/api/analyze-receipt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-gemini-key': clientApiKey || '',
              },
              body: JSON.stringify({
                base64Data,
                mimeType: 'image/jpeg', // Force jpeg due to canvas compression format
                apiKey: clientApiKey,
              }),
            });

            if (!response.ok) {
              let serverErrorMsg = `Server returned status ${response.status}`;
              try {
                const errJson = await response.json();
                if (errJson && errJson.error) {
                  serverErrorMsg = errJson.error;
                }
              } catch (_) {}
              throw new Error(serverErrorMsg);
            }
            const result = await response.json();
            if (result.success && result.data) {
              resultData = result.data;
            } else {
              throw new Error(result.warning || result.error || "Backend returned empty receipt data");
            }
          } catch (backendErr: any) {
            console.warn("[UserDashboard] Primary backend analysis failed:", backendErr);

            const isKeyValid = (key: string | undefined): boolean => {
              if (!key) return false;
              const clean = key.trim();
              return clean.length > 10;
            };

            if (isKeyValid(clientApiKey)) {
              console.log("[UserDashboard] Initiating high-speed direct client-side Gemini scan...");
              scannedViaFallback = true;

              let cleanBase64 = base64Data;
              if (base64Data.startsWith("data:")) {
                const parts = base64Data.split(";base64,");
                if (parts.length === 2) {
                  cleanBase64 = parts[1];
                }
              }

              // Try gemini-3.6-flash first, then gemini-flash-latest
              const modelsToTry = ["gemini-3.6-flash", "gemini-flash-latest"];
              let lastDirectError = null;

              for (const modelName of modelsToTry) {
                try {
                  console.log(`[UserDashboard] Trying direct client-side scan with ${modelName}...`);
                  const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${clientApiKey!.trim()}`;
                  
                  const directResponse = await fetch(directUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      contents: [
                        {
                          parts: [
                            {
                              inlineData: {
                                mimeType: "image/jpeg",
                                data: cleanBase64
                              }
                            },
                            {
                              text: "Analyze this transaction receipt or payment order screenshot image. Extract three exact fields: 'txid' (the transaction ID, Order ID, Deposit ID, transaction hash, or transfer ID), 'amount' (the DEPOSIT, PAYMENT, or TRANSFER amount in USDT or USD, e.g. 12 for 12 USDT. CRITICAL: DO NOT return user account balances, available balances, wallet balances, or fee amounts! Strictly select the actual transfer/deposit payment amount), and 'network' (the deposit network: TRC20 or BEP20). Return JSON matching this schema: { txid: string, amount: number, network: string }"
                            }
                          ]
                        }
                      ],
                      generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                          type: "object",
                          properties: {
                            txid: {
                              type: "string",
                              description: "The transaction hash, Order ID, Deposit ID or TxID from the screenshot."
                            },
                            amount: {
                              type: "number",
                              description: "The transfer/payment amount parsed strictly as a number."
                            },
                            network: {
                              type: "string",
                              description: "The blockchain network ('TRC20' or 'BEP20')."
                            }
                          },
                          required: ["txid", "amount", "network"]
                        }
                      }
                    }),
                  });

                  if (!directResponse.ok) {
                    const textErr = await directResponse.text();
                    let parsedErr = textErr;
                    try {
                      const parsedJson = JSON.parse(textErr);
                      if (parsedJson?.error?.message) {
                        parsedErr = parsedJson.error.message;
                      }
                    } catch (_) {}
                    throw new Error(`Direct Google API returned status ${directResponse.status}: ${parsedErr}`);
                  }

                  const directJson = await directResponse.json();
                  const textContent = directJson?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (textContent) {
                    resultData = JSON.parse(textContent.trim());
                    lastDirectError = null;
                    break;
                  } else {
                    throw new Error("Direct cloud scan did not extract content.");
                  }
                } catch (err: any) {
                  console.warn(`[UserDashboard] Direct scan failed for ${modelName}:`, err);
                  lastDirectError = err;
                }
              }
            }
          }

          // Local Tesseract OCR fallback if backend and direct Gemini failed or produced no result
          if (!resultData) {
            try {
              console.log("[UserDashboard] Triggering local Tesseract.js client OCR scanner...");
              const ocrRes = await Tesseract.recognize(base64Data, 'eng');
              const extractedText = ocrRes?.data?.text || '';
              console.log("[UserDashboard] Local OCR extracted text:", extractedText);

              const parsedOcr = parseReceiptText(extractedText, file.name);
              if (parsedOcr.amount > 0 || (parsedOcr.txid && parsedOcr.txid.length > 0)) {
                resultData = parsedOcr;
                scannedViaFallback = true;
              }
            } catch (ocrErr) {
              console.warn("[UserDashboard] Local Tesseract OCR fallback failed:", ocrErr);
              const filenameParsed = parseReceiptText('', file.name);
              if (filenameParsed.amount > 0 || filenameParsed.txid) {
                resultData = filenameParsed;
                scannedViaFallback = true;
              }
            }
          }

          // Store proof attachment base64 data and file name
          setDepositProofInput(base64Data || rawBase64 || file.name || 'receipt_screenshot.jpg');
          setDepositProofFileName(file.name || 'receipt_screenshot.jpg');

          if (resultData) {
            let { txid, amount, network } = resultData;
            let matchMessage = "";
            let hasAmount = false;
            let hasTxid = false;

            // Handle TxID / Order ID extraction
            if (txid && typeof txid === 'string' && txid.trim().length > 0) {
              const cleanTxid = txid.trim();
              setDepositHashInput(cleanTxid);
              matchMessage += `TxID (${cleanTxid.length > 12 ? cleanTxid.slice(0, 12) + '...' : cleanTxid}) `;
              hasTxid = true;
            }

            // Handle Amount extraction
            let parsedAmount = 0;
            if (amount !== undefined && amount !== null) {
              if (typeof amount === 'string') {
                const cleaned = (amount as string).replace(/[^\d.]/g, '');
                parsedAmount = parseFloat(cleaned);
              } else if (typeof amount === 'number') {
                parsedAmount = amount;
              }
            }

            if (!isNaN(parsedAmount) && parsedAmount > 0) {
              setDepositAmount(parsedAmount);
              matchMessage += `Amount ($${parsedAmount} USDT) `;
              hasAmount = true;
            }

            // Handle Network extraction
            if (network) {
              const upperNetwork = String(network).toUpperCase();
              if (upperNetwork.includes('BEP') || upperNetwork.includes('BSC') || upperNetwork.includes('BINANCE') || upperNetwork.includes('0X')) {
                setDepositNetwork('BEP20');
                matchMessage += `Network (BEP20) `;
              } else {
                setDepositNetwork('TRC20');
                matchMessage += `Network (TRC20) `;
              }
            } else {
              setDepositNetwork('TRC20');
            }

            if (hasAmount || hasTxid) {
              setIsReceiptAutoFetched(true);
              const successText = `✓ Extracted: ${matchMessage.trim()}`;
              setScanSuccessMessage(successText);
              setScanErrorMessage(null);
              showStatus(successText, "success");
            } else {
              setIsReceiptAutoFetched(false);
              const uploadedText = `✓ Screenshot attached as payment proof. Please enter your TxID and Amount manually below.`;
              setScanSuccessMessage(uploadedText);
              setScanErrorMessage(null);
              showStatus(uploadedText, "info");
            }
          } else {
            setIsReceiptAutoFetched(false);
            const uploadedText = `✓ Screenshot attached as payment proof. Please enter your TxID and Amount manually below.`;
            setScanSuccessMessage(uploadedText);
            setScanErrorMessage(null);
            showStatus(uploadedText, "info");
          }
        } catch (apiErr: any) {
          console.warn("API or AI error during receipt analysis:", apiErr);
          setIsReceiptAutoFetched(false);
          const uploadedText = `✓ Screenshot attached as payment proof. Please enter your TxID and Amount manually below.`;
          setScanSuccessMessage(uploadedText);
          setScanErrorMessage(null);
          showStatus(uploadedText, "info");
        } finally {
          setIsAnalyzingReceipt(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("FileReader error:", err);
      setIsAnalyzingReceipt(false);
      showStatus("Failed to read selected screenshot file.", "error");
    }
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawErrorMsg('');
    setWithdrawSuccessMsg('');

    if (withdrawAmount > availableUserBalance) {
      setWithdrawErrorMsg("Insufficient active funds. You cannot withdraw more than your available balance.");
      showStatus("Withdrawal rejected: Insufficient available balance.", "error");
      return;
    }
    if (withdrawAmount < 10) {
      setWithdrawErrorMsg("The minimum allowed withdrawal on TRC20/BEP20 is $10 USDT.");
      showStatus("Withdrawal rejected: Amount below minimum check.", "error");
      return;
    }

    const boundAddress = withdrawNetwork === 'TRC20' 
      ? activeUser?.wallet?.usdtTrc20Address 
      : activeUser?.wallet?.usdtBep20Address;
    const targetAddress = boundAddress || withdrawAddressInput;

    if (!targetAddress || targetAddress.length < 10) {
      setWithdrawErrorMsg("Please provide a certified destination USDT address.");
      showStatus("Withdrawal rejected: Wallet address destination required.", "error");
      return;
    }

    onSubmitWithdrawal(withdrawAmount, withdrawNetwork, targetAddress);
    setWithdrawSuccessMsg("Your withdrawal claim was logged! Pending inspection, your funds are securely reserved under audit lock.");
    showStatus("Withdrawal request created successfully! Funds in reserve lock.", "success");
  };

  const handleCalculatorPurchase = () => {
    if (!selectedProjectForCalc) return;
    
    // Check for insufficient balance
    if (availableUserBalance < calculatorCost) {
      const neededAmount = (calculatorCost - availableUserBalance).toFixed(2);
      setCalcError(`Insufficient Balance: You need $${calculatorCost.toFixed(2)} USDT but your wallet balance is only $${availableUserBalance.toFixed(2)} USDT (Short of $${neededAmount} USDT).`);
      showStatus("Insufficient Balance! Please deposit USDT to complete your purchase.", "error");
      return;
    }

    const res = onPurchaseShares(selectedProjectForCalc.id, calculatorShares);
    if (res.success) {
      showStatus(`Purchase Success! Acquired co-ownership shares of ${selectedProjectForCalc.name}. Check your active holdings in Overview.`, "success");
      setSelectedProjectForCalc(null);
    } else {
      setCalcError(`Share Purchase Rejected: ${res.error}`);
      showStatus(`Share Purchase Rejected: ${res.error}`, "error");
    }
  };

  return (
    <div 
      id="fundora-portal-layout" 
      className={`flex flex-col md:flex-row min-h-screen transition-colors duration-200 ${
        activeTab === 'properties' ? 'bg-[#060814] text-white' : 'bg-[#f8fafc] text-slate-800'
      }`}
    >
      
      {/* 0. Professional Desktop Sidebar (visible on screens >= md) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-slate-100 border-r border-slate-900 shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Sidenav Header */}
        <div className="p-5 border-b border-slate-900 flex items-center space-x-2.5 bg-slate-950">
          <div className="p-1.5 bg-gradient-to-tr from-amber-500 to-emerald-500 rounded-lg text-slate-950 font-black">
            <Building className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <span className="font-extrabold text-white tracking-widest text-sm font-mono block">FUNDORA</span>
            <span className="text-[8px] text-amber-400 font-mono tracking-wider block leading-none font-bold">FRACTIONAL REAL ESTATE</span>
          </div>
        </div>

        {/* User Account widget */}
        <div className="p-4 border-b border-slate-900 bg-slate-900/10 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-450 uppercase">
            {activeUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              <span className="text-xs font-bold text-slate-100 leading-none truncate">{activeUser.name}</span>
              <span className="px-1 py-0.5 bg-emerald-500/25 text-[7px] font-mono font-bold text-emerald-400 uppercase tracking-wider rounded shrink-0">
                VERIFIED
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight block truncate mt-0.5">{activeUser.email}</span>
          </div>
        </div>

        {/* Sim Clock widget for layout reference */}
        <div className="p-4 border-b border-slate-900 text-[11px] font-mono space-y-1.5 bg-slate-900/5">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <Clock className="w-3.5 h-3.5 animate-pulse text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-300">Clock HUD:</span>
          </div>
          <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-white font-bold tracking-widest text-center">
            {simulatedHour.toString().padStart(2, '0')}:{simulatedMinute.toString().padStart(2, '0')}
          </div>
          <div className="flex items-center justify-between gap-1 mt-2">
            <span className="text-[9px] text-slate-500">Status:</span>
            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-900/30 rounded">
              🟢 SECURE LIVE SYNC
            </span>
          </div>
        </div>

        {/* Sidebar Sidenav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 bg-slate-950">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'properties'
                ? 'bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Properties</span>
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'wallet'
                ? 'bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Wallet</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'ledger'
                ? 'bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('claim')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'claim'
                ? 'bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40 border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              <span>Claim Daily</span>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </nav>

        {/* Separator */}
        <div className="border-t border-slate-900/60 my-3 mx-4"></div>

        {/* Dedicated Separate Profile Button Card */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left group ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-white shadow-sm'
                : 'border-slate-900/50 bg-slate-950/40 hover:bg-slate-900/30 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 relative ${getAvatarBgClass(userTier.id)}`}>
                {activeUser.email.slice(0, 2)}
                {/* Dynamic mini shield icon overlay */}
                <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-950 border border-slate-900 shadow-sm ${userTier.color}`}>
                  {userTier.id === 'tier-5' ? <Crown className="w-2 h-2" /> : <Shield className="w-2 h-2" />}
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-[11px] font-black truncate leading-tight ${activeTab === 'profile' ? 'text-slate-100' : 'text-slate-300 group-hover:text-slate-100'}`}>{activeUser.name || 'Investor'}</span>
                <span className={`text-[8.5px] font-mono tracking-wider flex items-center gap-1 font-bold ${userTier.color}`}>
                  <span className="w-1 h-1 bg-current rounded-full animate-pulse"></span>
                  {userTier.name}
                </span>
              </div>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform ${activeTab === 'profile' ? 'rotate-90 text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Sidenav bottom commands */}
        <div className="p-4 border-t border-slate-900 bg-slate-950 space-y-2">
          <a
            href="/download/app-fundora.apk"
            target="_blank"
            rel="noopener noreferrer"
            download="app-fundora.apk"
            className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase rounded-lg tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Download App (APK)</span>
            <Download className="w-3 h-3" />
          </a>
          {activeUser.role === 'admin' && (
            <button
              onClick={onNavigateAdmin}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black uppercase rounded-lg tracking-wider transition-all block text-center"
            >
              👑 Portal Admin Desk
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold uppercase rounded-lg tracking-wider transition-all block text-center border border-slate-800"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* 2. Main Content panel wrapper (flex layout starts here) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 2. Mini Timing Settlement Warning Bar (visible everywhere) */}
        <div className="bg-[#0f172a] text-white px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
          <div className="flex items-center space-x-2 text-[#10b981]">
            <Clock className="w-3.5 h-3.5 animate-pulse text-[#10b981] shrink-0" />
            <span className="font-semibold text-slate-300">
              Settlement claim clock (4PM-5PM & 9PM-10PM):
            </span>
            <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-705 text-white font-bold tracking-widest">
              {simulatedHour.toString().padStart(2, '0')}:{simulatedMinute.toString().padStart(2, '0')}
            </span>
          </div>

          {/* Timetravel controller for evaluating the 4 PM and 9 PM constraint */}
          <div className="flex items-center space-x-1.5 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30">
            <span className="text-[9.5px] text-emerald-400 font-bold uppercase tracking-wider">
              🔒 SECURED TIME ENGINE
            </span>
          </div>
        </div>

        {/* 3. Mobile-only Tab bar selectors */}
        <nav className="border-b px-1 py-1.5 flex md:hidden justify-between items-center shadow-xs bg-white border-slate-200 transition-colors duration-200">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 border-b-2 text-[9px] font-extrabold uppercase tracking-wide transition-colors ${
              activeTab === 'overview' 
                ? 'border-[#10b981] text-[#10b981]' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-0.5" />
            <span>Overview</span>
          </button>
          <button
            id="tab-properties"
            onClick={() => setActiveTab('properties')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 border-b-2 text-[9px] font-extrabold uppercase tracking-wide transition-colors ${
              activeTab === 'properties' 
                ? 'border-[#10b981] text-[#10b981]' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Building className="w-4 h-4 mb-0.5" />
            <span>Projects</span>
          </button>
          <button
            id="tab-wallet"
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 border-b-2 text-[9px] font-extrabold uppercase tracking-wide transition-colors ${
              activeTab === 'wallet' 
                ? 'border-[#10b981] text-[#10b981]' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Wallet className="w-4 h-4 mb-0.5" />
            <span>Wallet</span>
          </button>
          <button
            id="tab-ledger"
            onClick={() => setActiveTab('ledger')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 border-b-2 text-[9px] font-extrabold uppercase tracking-wide transition-colors ${
              activeTab === 'ledger' 
                ? 'border-[#10b981] text-[#10b981]' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            <span>Ledger</span>
          </button>
          <button
            id="tab-claim"
            onClick={() => setActiveTab('claim')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 border-b-2 text-[9px] font-extrabold uppercase tracking-wide transition-colors relative ${
              activeTab === 'claim' 
                ? 'border-[#10b981] text-[#10b981]' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Percent className="w-4 h-4 mb-0.5 text-amber-500" />
            <span>Claim</span>
            <span className="absolute top-0.5 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </nav>

        {/* 4. Active Tab Stage */}
        <div className="p-4 pb-36 md:pb-8 space-y-6 flex-1 overflow-y-visible md:overflow-y-auto bg-[#060814] text-white transition-colors duration-200">

          {/* Elegant Custom Status Notification Banner */}
          {dashboardStatus && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fadeIn shadow-md transition-all ${
              dashboardStatus.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                : dashboardStatus.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
            }`}>
              {dashboardStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : dashboardStatus.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-xs font-semibold leading-relaxed">{dashboardStatus.message}</p>
              </div>
              <button 
                onClick={() => setDashboardStatus(null)}
                className="text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

        {/* ==================== TAB 1: OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Welcome banner (Only shown when wallet addresses are not yet configured) */}
            {(!activeUser?.wallet?.usdtTrc20Address && !activeUser?.wallet?.usdtBep20Address) && (
              <div className="bg-[#0e112d] border border-indigo-500/40 text-white p-5 rounded-[1.25rem] flex justify-between items-center relative overflow-hidden shadow-md">
                <div className="relative z-10">
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5 font-sans">
                    Welcome to Fundora Portal 
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  </h3>
                  <p className="text-[10px] text-indigo-200/90 leading-normal max-w-sm mt-1">
                    Leverage co-ownership and watch your fractional shares build value. Bind your TRC20/BEP20 cryptographic keys below to initialize wire transfers.
                  </p>
                </div>
                <div className="text-right shrink-0 relative z-10 font-mono">
                  <span className="text-[9px] text-slate-400 uppercase block">My Code</span>
                  <span className="text-xs font-bold text-amber-400 tracking-wider">{activeUser.referralCode}</span>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
              </div>
            )}

            {/* Quick action bindings */}
            {(!activeUser?.wallet?.usdtTrc20Address && !activeUser?.wallet?.usdtBep20Address) && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-[1.25rem] flex items-center justify-between gap-2.5 shadow-xs text-amber-200">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-300 block">Crypto Wallet Not Configured</span>
                  <p className="text-[9px] text-amber-200/90">Setup your USDT TRC20/BEP20 keys to receive authorized yields.</p>
                </div>
                <button
                  id="open-bind-wallet-btn"
                  onClick={() => setIsBindingOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-bold uppercase rounded-lg shrink-0 tracking-wider transition-all shadow-xs cursor-pointer"
                >
                  Bind Wallet
                </button>
              </div>
            )}

            {/* Wallet addresses bind modal box */}
            {isBindingOpen && (
              <div className="p-5 bg-[#0e112d] border border-indigo-500/40 text-white rounded-[1.25rem] space-y-3 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">🔒 Bind Investment Wallets</span>
                  <button onClick={() => setIsBindingOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-indigo-200/80 leading-relaxed">
                  Provide your destination public keys. No password required. We only use these addresses to routing your verified yield withdrawals.
                </p>
                <form onSubmit={handleApplyWalletBinding} className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-indigo-300 uppercase font-bold">USDT Address (TRC20 Network)</span>
                    <input 
                      type="text"
                      required
                      value={trcLink}
                      onChange={(e) => setTrcLink(e.target.value)}
                      placeholder="e.g. TX1h2A9eFm7xKsZ8Jq9w..."
                      className="w-full bg-[#060819] border border-indigo-500/40 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-indigo-300 uppercase font-bold">USDT Address (BEP20 Network)</span>
                    <input 
                      type="text"
                      required
                      value={bepLink}
                      onChange={(e) => setBepLink(e.target.value)}
                      placeholder="e.g. 0x71C7656EC7ab88b0..."
                      className="w-full bg-[#060819] border border-indigo-500/40 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400 text-white font-bold rounded-lg text-xs tracking-wider uppercase shadow-xs transition-colors cursor-pointer"
                  >
                    Save & Authenticate Addresses
                  </button>
                </form>
              </div>
            )}

            {/* THE 10 DASHBOARD CARDS (PREMIUM BENTO LAYOUT) */}
            <div className="space-y-5">
              
              {/* SECTION A: PRIMARY BALANCES */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>My Assets & Valuations</span>
                  </h4>
                  <span className="text-[8px] font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                    USDT Main Ledger
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Available Balance */}
                  <div id="card-available-balance" className="bg-gradient-to-br from-slate-900 via-[#0d1e16] to-slate-950 text-white border border-emerald-500/25 rounded-2xl p-5 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-950/25 transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] text-emerald-400 font-bold font-mono uppercase tracking-widest block">Available Balance</span>
                      <div className="p-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                    <div className="space-y-2 relative z-10">
                      <div className="flex items-baseline gap-x-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-100 font-mono tracking-tight">${availableUserBalance.toFixed(2)}</span>
                        <span className="text-xs text-emerald-400 font-mono font-bold">USDT</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-sans leading-relaxed">
                        Authorized central funds available instantly for property share purchases or immediate yield cashouts.
                      </p>
                    </div>
                  </div>

                  {/* 2. Total Real Estate Investment Card with Active / Terminated / Matured breakdown */}
                  <div id="card-total-investment" className="bg-gradient-to-br from-[#0c0e1e] via-[#12163b] to-[#0a0c1a] text-white border border-indigo-500/30 rounded-2xl p-5 hover:border-indigo-400/60 hover:shadow-xl hover:shadow-indigo-950/35 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
                    {/* Glowing highlight in background */}
                    <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-indigo-500/15 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    
                    <div>
                      {/* Title & Icon row */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-indigo-400 font-extrabold font-mono uppercase tracking-widest block">
                            Asset Valuation
                          </span>
                          <h5 className="text-[11px] font-sans font-bold text-slate-300 tracking-tight">
                            Total Real Estate Investment
                          </h5>
                        </div>
                        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner group-hover:bg-indigo-500/15 group-hover:border-indigo-500/30 transition-all duration-300">
                          <Landmark className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                        </div>
                      </div>

                      {/* Value row */}
                      <div className="space-y-3 relative z-10">
                        <div className="flex items-baseline gap-x-2">
                          <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-200 tracking-tight font-sans">
                            ${activeTotalInvest.toFixed(2)}
                          </span>
                          <span className="text-[9px] font-mono font-black text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded tracking-widest uppercase">
                            Active USD
                          </span>
                        </div>

                        {/* Interactive secondary tags & Badges */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <FileText className="w-3 h-3 text-emerald-400" />
                            {activeInvestments.length} {activeInvestments.length === 1 ? 'Active Contract' : 'Active Contracts'}
                          </span>
                        </div>
                      </div>

                      {/* Detailed Status Breakdown Grid */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-indigo-500/15 relative z-10 font-mono">
                        <div className="text-center bg-emerald-500/5 rounded-xl p-2 border border-emerald-500/10">
                          <span className="block text-[8px] text-emerald-400 font-bold uppercase tracking-wider">
                            Active
                          </span>
                          <span className="block text-sm font-extrabold text-emerald-300 mt-0.5">
                            {activeInvestments.length}
                          </span>
                          <span className="block text-[8px] text-slate-400 mt-0.5">
                            ${activeTotalInvest.toFixed(0)}
                          </span>
                        </div>

                        <div className="text-center bg-sky-500/5 rounded-xl p-2 border border-sky-500/10">
                          <span className="block text-[8px] text-sky-400 font-bold uppercase tracking-wider">
                            Matured
                          </span>
                          <span className="block text-sm font-extrabold text-sky-300 mt-0.5">
                            {maturedInvestments.length}
                          </span>
                          <span className="block text-[8px] text-slate-400 mt-0.5">
                            ${maturedTotalInvest.toFixed(0)}
                          </span>
                        </div>

                        <div className="text-center bg-rose-500/5 rounded-xl p-2 border border-rose-500/10">
                          <span className="block text-[8px] text-rose-400 font-bold uppercase tracking-wider">
                            Terminated
                          </span>
                          <span className="block text-sm font-extrabold text-rose-300 mt-0.5">
                            {liquidatedInvestments.length}
                          </span>
                          <span className="block text-[8px] text-slate-400 mt-0.5">
                            ${liquidatedTotalInvest.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description Footer area */}
                    <div className="border-t border-indigo-500/15 pt-3 mt-4 relative z-10">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 leading-normal font-sans">
                        <span>Cumulative Invested:</span>
                        <span className="font-mono font-bold text-slate-300">${calculatedTotalInvest.toFixed(2)} USD</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: PERFORMANCE & PORTFOLIO TRACKER */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    <span>Performance & Yield Stats</span>
                  </h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  {/* 3. Daily Profit */}
                  <div id="card-daily-profit" className="bg-gradient-to-br from-[#091811] via-[#0d2a1b] to-[#040c08] text-white border border-emerald-500/25 rounded-2xl p-4.5 space-y-3.5 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-950/20 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold tracking-wider block">Daily Profit Avg</span>
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center relative">
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono tracking-tight">+${calculatedDailyProfit.toFixed(2)}</span>
                      <span className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-mono block leading-snug">Credited daily 4-5PM & 9-10PM GMT</span>
                    </div>
                  </div>

                  {/* 4. Total Profit Earned */}
                  <div id="card-total-profit" className="bg-gradient-to-br from-[#0c0e1e] via-[#14193b] to-[#060814] text-white border border-indigo-500/25 rounded-2xl p-4.5 space-y-3.5 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-950/20 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-indigo-400 uppercase font-mono font-bold tracking-wider block">Total Profit</span>
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <span className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">${totalProfitEarnedAmount.toFixed(2)}</span>
                      <span className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-mono block leading-snug">Collected into Balance</span>
                    </div>
                  </div>

                  {/* 5. Active Assets */}
                  <div id="card-active-projects" className="bg-gradient-to-br from-[#08152b] via-[#0d2244] to-[#040a17] text-white border border-blue-500/25 rounded-2xl p-4.5 space-y-3.5 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-950/20 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-blue-400 uppercase font-mono font-bold tracking-wider block">Active Assets</span>
                      <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Building className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <span className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">{activeProjectsCount} Locations</span>
                      <span className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-mono block leading-snug">Fractional Properties</span>
                    </div>
                  </div>

                  {/* 6. Missed Claims */}
                  <div id="card-missed-claims" className="bg-gradient-to-br from-[#210c12] via-[#331119] to-[#120509] text-white border border-rose-500/25 rounded-2xl p-4.5 space-y-3.5 hover:border-rose-400/50 hover:shadow-lg hover:shadow-rose-950/20 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-rose-400 uppercase font-mono font-bold tracking-wider block">Missed Claims</span>
                      <div className="p-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        <Clock className="w-3.5 h-3.5 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight">{missedClaimsCount} {missedClaimsCount === 1 ? 'Claim' : 'Claims'}</span>
                      <span className="text-[8.5px] sm:text-[9.5px] text-rose-400 font-mono block whitespace-normal leading-snug">
                        {missedClaimsCount === 0 ? "No unclaimed dividends" : "Missed daily claim windows"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: CAPITAL TRANSITS & REWARDS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>Funding & Affiliates</span>
                  </h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  {/* 7. Total Deposits */}
                  <div id="card-total-deposits" className="bg-gradient-to-br from-[#1b1209] via-[#2a1d0f] to-[#0c0804] text-white border border-amber-500/25 rounded-2xl p-4.5 space-y-3.5 hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-950/20 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-amber-400 uppercase font-mono font-bold tracking-wider block">Total Deposits</span>
                      <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <ArrowDownCircle className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <span className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">${activeUser.totalDeposited.toFixed(2)}</span>
                      <span className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-mono block leading-snug">USD Equivalents</span>
                    </div>
                  </div>

                  {/* 8. Total Withdrawals */}
                  <div id="card-total-withdrawals" className="bg-gradient-to-br from-[#1c0d0d] via-[#2c1313] to-[#0e0606] text-white border border-rose-500/25 rounded-2xl p-4.5 space-y-3.5 hover:border-rose-400/50 hover:shadow-lg hover:shadow-rose-950/20 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-rose-400 uppercase font-mono font-bold tracking-wider block">Total Withdrawals</span>
                      <div className="p-1.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        <ArrowUpCircle className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <span className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">${activeUser.totalWithdrawn.toFixed(2)}</span>
                      <span className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-mono block leading-snug">Paid out securely</span>
                    </div>
                  </div>

                  {/* 9. Referral Gains */}
                  <div id="card-referral-earnings" className="bg-gradient-to-br from-[#091b19] via-[#0d2a26] to-[#040e0c] text-white border border-teal-500/25 rounded-2xl p-4.5 space-y-3.5 hover:border-teal-400/50 hover:shadow-lg hover:shadow-teal-950/20 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-teal-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-teal-400 uppercase font-mono font-bold tracking-wider block">Referral Gains</span>
                      <div className="p-1.5 bg-teal-500/10 rounded-lg border border-teal-500/20">
                        <Gift className="w-3.5 h-3.5 text-teal-400 animate-bounce" style={{ animationDuration: '3s' }} />
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono tracking-tight">${referralEarningsSum.toFixed(2)}</span>
                      <span className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-mono block leading-snug">10% Direct rewards</span>
                    </div>
                  </div>

                  {/* 10. Total Referrals */}
                  <div id="card-total-referrals" className="bg-gradient-to-br from-[#1c0c16] via-[#2d1123] to-[#0e050b] text-white border border-pink-500/25 rounded-2xl p-4.5 space-y-3.5 hover:border-pink-400/50 hover:shadow-lg hover:shadow-pink-950/20 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-pink-500/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-pink-400 uppercase font-mono font-bold tracking-wider block">Total Referrals</span>
                      <div className="p-1.5 bg-pink-500/10 rounded-lg border border-pink-500/20">
                        <Users className="w-3.5 h-3.5 text-pink-400" />
                      </div>
                    </div>
                    <div className="space-y-1 relative z-10">
                      <span className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight">{totalReferralsCount} Signups</span>
                      <span className="text-[8.5px] sm:text-[9.5px] text-slate-400 font-mono block leading-snug">Unique partners bound</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Financial Activity Trends Chart Card */}
            <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-5 shadow-xs relative overflow-hidden text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Real-time Balance Trend
                  </h4>
                  <p className="text-[10px] text-indigo-200/70 font-sans mt-0.5">
                    Chronological visualization of your total real-time USDT balance over time
                  </p>
                </div>
              </div>

              {/* Custom Legend outside Recharts to prevent overlapping/absolute position bugs */}
              <div className="flex flex-wrap items-center gap-2 mb-4 font-mono text-[9px] sm:text-[10px]">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-extrabold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-blue-500" />
                  Real-time Balance
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-extrabold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-emerald-500" />
                  Deposits
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 font-extrabold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-rose-500" />
                  Withdrawals
                </span>
              </div>

              {/* Chart Stage */}
              <div className="h-[210px] sm:h-[250px] w-full mt-2 font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#13163a" />
                    <XAxis 
                      dataKey="formattedDate" 
                      tickLine={false}
                      axisLine={false}
                      stroke="#4f46e5"
                      tick={{ fill: '#a5b4fc', fontSize: 9 }}
                      minTickGap={25}
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      stroke="#4f46e5"
                      tick={{ fill: '#a5b4fc', fontSize: 9 }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const dayData = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-800 text-white p-2.5 rounded-xl shadow-xl font-mono text-[9px] space-y-1.5 font-sans">
                              <p className="text-slate-400 font-bold border-b border-slate-800 pb-1 font-mono">{dayData.formattedDate || label || 'No Date'}</p>
                              <div className="flex items-center justify-between gap-4 font-mono">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-blue-500" />
                                  <span className="text-slate-300">Real-time Balance:</span>
                                </span>
                                <span className="font-bold text-white">${Number(dayData.balance).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 font-mono">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-emerald-500" />
                                  <span className="text-emerald-300">Daily Deposits:</span>
                                </span>
                                <span className="font-bold text-slate-300">${Number(dayData.deposits).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 font-mono">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-rose-500" />
                                  <span className="text-rose-300">Daily Withdrawals:</span>
                                </span>
                                <span className="font-bold text-slate-300">${Number(dayData.withdrawals).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      name="Real-time Balance" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={0.08} 
                      fill="#3b82f6" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="deposits" 
                      name="Deposits" 
                      stroke="#10b981" 
                      strokeWidth={1.5}
                      fillOpacity={0.05} 
                      fill="#10b981" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="withdrawals" 
                      name="Withdrawals" 
                      stroke="#f43f5e" 
                      strokeWidth={1.5}
                      fillOpacity={0.05} 
                      fill="#f43f5e" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Portfolio detail list */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">💼 My Portfolio Holdings</h4>
              
              {investments.length === 0 ? (
                <div className="text-center py-8 bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] text-slate-400 text-xs shadow-xs">
                  <p>You do not have any active fractional shares yet.</p>
                  <button 
                    onClick={() => setActiveTab('properties')}
                    className="mt-3 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 border border-indigo-400 text-white font-bold uppercase rounded-lg text-[10px] tracking-wider transition-colors cursor-pointer"
                  >
                    View Property Catalogs
                  </button>
                </div>
              ) : (
                <div className="w-full overflow-x-auto bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] font-mono text-[11px] shadow-sm">
                  <table className="w-full text-left border-collapse min-w-[700px] md:min-w-full">
                    <thead>
                      <tr className="bg-[#060819] text-indigo-300 border-b border-indigo-500/30 text-[10px] uppercase font-bold text-center">
                        <th className="p-3 text-left animate-none">Property Location Name</th>
                        <th className="p-3 animate-none">Shares & Status</th>
                        <th className="p-3 animate-none">Cost Basis</th>
                        <th className="p-3 animate-none">Time Left</th>
                        <th className="p-3 text-emerald-400 animate-none">Daily Payout</th>
                        <th className="p-3 text-slate-450 animate-none">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/10 text-center text-slate-300">
                      {investments.map((inv) => {
                        const isCompleted = inv.status === 'Completed';
                        const isLiquidated = inv.status === 'Liquidated';
                        const isActive = !isCompleted && !isLiquidated;

                        return (
                          <tr key={inv.id} className="hover:bg-[#13163a]/40 border-b border-indigo-500/10">
                            <td className="p-3 text-left font-sans font-bold text-white text-[12px]">
                              {inv.projectName}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-white font-bold">{inv.sharesPurchased} Shs</span>
                                {isCompleted && (
                                  <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                    Matured
                                  </span>
                                )}
                                {isLiquidated && (
                                  <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                    Liquidated
                                  </span>
                                )}
                                {isActive && (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase">
                                    Active
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-indigo-200 font-medium">
                              ${inv.totalCost.toFixed(2)}
                            </td>
                            <td className="p-3 font-semibold text-slate-300">
                              {isActive ? (
                                <div className="space-y-0.5">
                                  <span className="text-amber-400">{inv.remainingMonths !== undefined ? inv.remainingMonths : (inv.durationMonths || 12)} mos left</span>
                                  <span className="block text-[9px] text-slate-500">of {inv.durationMonths || 12} mos</span>
                                </div>
                              ) : isCompleted ? (
                                <span className="text-sky-450 font-bold">Matured (100% Paid)</span>
                              ) : (
                                <span className="text-slate-500">Terminated</span>
                              )}
                            </td>
                            <td className="p-3 font-bold text-emerald-400">
                              {isActive ? `+$${inv.dailyProfitRate.toFixed(2)} /day` : '$0.00'}
                            </td>
                            <td className="p-3">
                              {isActive ? (
                                confirmLiquidateId === inv.id ? (
                                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const res = onLiquidateInvestment(inv.id);
                                        if (res && res.success) {
                                          showStatus(`Successfully sold shares! $${res.payout.toFixed(2)} USDT added to your balance (with 20% loss deduction).`, "success");
                                        } else {
                                          showStatus("Unable to liquidate shares at this time.", "error");
                                        }
                                        setConfirmLiquidateId(null);
                                      }}
                                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[9px] uppercase cursor-pointer transition-colors shrink-0"
                                    >
                                      Yes, Sell (-20%)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmLiquidateId(null)}
                                      className="px-1.5 py-1 bg-[#13163a] hover:bg-[#1b1f51] text-indigo-200 border border-indigo-500/30 font-bold rounded text-[9px] uppercase cursor-pointer transition-colors"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmLiquidateId(inv.id)}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[9px] uppercase tracking-wide cursor-pointer transition-colors"
                                    title="Sell your shares early with a 20% deduction"
                                  >
                                    Sell Shares
                                  </button>
                                )
                              ) : (
                                <span className="text-slate-550 font-medium">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB 2: PROPERTIES ==================== */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            
            {/* Catalog search tools */}
            <div className="bg-[#0e112d] border border-indigo-500/40 p-4 sm:p-5 rounded-2xl space-y-4 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center relative z-10">
                
                {/* Search Bar */}
                <div className="relative w-full md:col-span-8">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search locations or assets..."
                    className="w-full bg-[#060819] border border-indigo-500/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-450 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 transition-all shadow-inner"
                  />
                </div>

                {/* Sort selector wrapper */}
                <div className="flex items-center space-x-2 w-full md:col-span-4 bg-[#060819] border border-indigo-500/40 px-3.5 py-2.5 rounded-xl shadow-inner text-slate-200">
                  <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[10px] text-indigo-300 font-mono uppercase tracking-wider shrink-0 font-bold">Sort:</span>
                  <select 
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer pr-1 py-0.5 font-bold flex-1 w-full outline-none"
                  >
                    <option value="roi" className="bg-[#0c0e1e] text-white">Expected Yield</option>
                    <option value="price" className="bg-[#0c0e1e] text-white">Share Price</option>
                    <option value="shares" className="bg-[#0c0e1e] text-white">Available Shares</option>
                  </select>
                </div>
              </div>

              {/* Category Pills List (Horizontal swipe scroll on mobile, wrap on desktop) */}
              <div className="pt-3.5 border-t border-indigo-500/30 space-y-2.5 relative z-10">
                <span className="text-[10px] text-indigo-300 font-mono uppercase tracking-widest font-black block">Asset Class</span>
                <div className="flex md:flex-wrap overflow-x-auto md:overflow-visible gap-2 scrollbar-none py-1 -mx-2 px-2 md:mx-0 md:px-0">
                  {[
                    { name: 'All', icon: <Sparkles className="w-3 h-3" /> },
                    { name: 'Residential', icon: <Building className="w-3 h-3" /> },
                    { name: 'Commercial', icon: <Landmark className="w-3 h-3" /> },
                    { name: 'Luxury', icon: <Crown className="w-3 h-3" /> },
                    { name: 'Co-Living', icon: <Users className="w-3 h-3" /> }
                  ].map((cat) => {
                    const isActive = selectedCategory === cat.name;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border shrink-0 cursor-pointer ${
                          isActive 
                            ? 'bg-gradient-to-r from-indigo-500 to-violet-600 border-indigo-400 text-white shadow-lg shadow-indigo-950/50' 
                            : 'bg-[#13163a]/90 border-indigo-500/30 text-indigo-200 hover:text-white hover:border-indigo-450/60 hover:bg-[#1b1f51]'
                        }`}
                      >
                        <span className={isActive ? 'text-amber-300 animate-pulse' : 'text-indigo-400'}>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Properties Cards list */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  className="bg-[#0b0c1b] border border-indigo-500/20 rounded-2xl overflow-hidden hover:border-indigo-400/50 shadow-lg hover:shadow-xl hover:shadow-indigo-950/20 transition-all duration-300 relative group flex flex-col justify-between"
                >
                  {/* Hover visual glow effect inside card */}
                  <div className="hidden md:block absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>

                  {/* Image and Category */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-[#0c0e25] border-b border-indigo-500/10 shrink-0">
                    <SafePropertyImage src={project.imageUrl} alt={project.name} />

                    <div className="absolute top-3.5 left-3.5 px-3 py-1 bg-[#060814]/90 rounded-lg border border-indigo-500/30 text-[9.5px] font-extrabold font-mono tracking-wider text-indigo-300 shadow-md z-20">
                      {project.category.toUpperCase()}
                    </div>
                    {project.status === 'Sold Out' && (
                      <div className="absolute inset-0 bg-[#060814]/85 flex items-center justify-center z-20">
                        <span className="px-4 py-2 bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono font-bold tracking-widest text-xs uppercase rounded-xl shadow-lg shadow-rose-950/50">
                          SOLDOUT
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body details */}
                  <div className="p-4 space-y-4 flex-1 flex flex-col justify-between relative z-10">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-1 text-[10.5px] text-slate-400 font-mono tracking-tight">
                        <MapPin className="w-3.5 text-indigo-400" />
                        <span>{project.location}</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-100 group-hover:text-white transition-colors font-sans truncate">{project.name}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                        {project.description}
                      </p>
                    </div>

                    {/* Meta stats */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-950/40 p-2.5 rounded-xl text-center font-mono text-[10px] border border-indigo-500/15 shadow-inner">
                      <div>
                        <span className="block text-indigo-300/70 text-[8.5px] uppercase tracking-wider mb-0.5 truncate" title="Expected ROI">ROI</span>
                        <span className="text-[11px] sm:text-xs font-bold text-emerald-400">+{project.expectedRoi}%</span>
                      </div>
                      <div>
                        <span className="block text-indigo-300/70 text-[8.5px] uppercase tracking-wider mb-0.5 truncate" title="Price per Share in USDT">Price (USDT)</span>
                        <span className="text-[11px] sm:text-xs font-bold text-emerald-400">${project.pricePerShare}</span>
                      </div>
                      <div>
                        <span className="block text-indigo-300/70 text-[8.5px] uppercase tracking-wider mb-0.5 truncate" title="Contract Duration">Duration</span>
                        <span className="text-[11px] sm:text-xs font-bold text-indigo-300">{project.durationMonths || 12} Mos</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5 text-[10.5px] font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Available: <strong className="text-slate-200">{project.availableShares}</strong> / {project.totalShares} shs</span>
                        <span className="font-bold text-emerald-400">
                          {project.status === 'Sold Out' ? '100% Sold' : `${Math.round(((project.totalShares - project.availableShares) / project.totalShares) * 100)}%`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${project.status === 'Sold Out' ? 100 : ((project.totalShares - project.availableShares) / project.totalShares) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Documents List */}
                    <div className="pt-3 border-t border-indigo-500/15">
                      <span className="block text-[9px] font-mono uppercase text-indigo-300/80 mb-2 font-black tracking-wider">📂 Secured Legal Documents</span>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[9px]">
                        {project.documents.map((doc, dIdx) => (
                          <span 
                            key={dIdx}
                            className="bg-indigo-950/20 border border-indigo-500/15 hover:border-indigo-400/40 cursor-pointer p-1.5 rounded-lg text-indigo-300 hover:text-white flex items-center gap-1.5 transition-all font-mono text-[9px] max-w-full min-w-0"
                            onClick={() => {
                              setActiveViewDoc({ docName: doc, project });
                              setPdfZoom(100);
                            }}
                          >
                            <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[110px] sm:max-w-[150px]">{doc}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buy CTA button with math calculator selection */}
                    {project.status === 'Active' ? (
                      <button
                        id={`project-calc-btn-${project.id}`}
                        onClick={() => {
                          setSelectedProjectForCalc(project);
                          setCalculatorShares(1);
                        }}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white font-bold rounded-xl text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-indigo-950/40 cursor-pointer border border-indigo-500/30 hover:border-indigo-400/50"
                      >
                        <Calculator className="w-3.5 h-3.5 text-indigo-200" />
                        <span>Calculate & Purchase Shares</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3 bg-indigo-950/15 border border-indigo-500/10 text-indigo-300/40 font-bold rounded-xl text-[10.5px] uppercase tracking-wider cursor-not-allowed text-center"
                      >
                        Property Unavailable
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* INVESTMENT DRAWER MODAL POPUP */}
            {selectedProjectForCalc && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
                <div className="bg-gradient-to-br from-[#0c0e1e] via-[#161a3f] to-[#080a14] text-white border border-indigo-500/35 rounded-[1.25rem] p-4 sm:p-5 max-w-md w-full space-y-3.5 shadow-2xl relative overflow-hidden animate-fade-in max-h-[96vh] overflow-y-auto">
                  
                  {/* Beautiful Glassmorphic Overlay Error Popup on top of card */}
                  {calcError && (
                    <div className="absolute inset-0 z-50 rounded-[1.25rem] bg-[#070915]/98 backdrop-blur-md flex flex-col justify-center items-center p-5 text-center space-y-4 animate-fade-in">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>
                      
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-full shadow-lg shadow-rose-950/20 relative animate-bounce" style={{ animationDuration: '3s' }}>
                        <AlertTriangle className="w-7 h-7 text-rose-400" />
                      </div>

                      <div className="space-y-1.5 px-2">
                        <h4 className="text-sm font-sans font-bold text-white tracking-wide">
                          Transaction Declined
                        </h4>
                        <p className="text-[10.5px] text-slate-300 font-mono leading-relaxed max-w-xs mx-auto">
                          {calcError}
                        </p>
                      </div>

                      <div className="space-y-2 w-full pt-1.5 px-2">
                        <button
                          onClick={() => {
                            setCalcError(null);
                            setSelectedProjectForCalc(null);
                            setActiveTab('wallet');
                          }}
                          className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold uppercase rounded-xl text-[9.5px] tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/25 cursor-pointer"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Deposit USDT</span>
                        </button>

                        <button
                          onClick={() => setCalcError(null)}
                          className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 text-indigo-300 hover:text-white rounded-xl text-[9.5px] font-bold uppercase transition-all duration-200 tracking-wider cursor-pointer"
                        >
                          Adjust Share Amount
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Decorative glowing gradient elements in background */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>
                  <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-xl pointer-events-none"></div>

                  {/* Header Bar with Back and Close options */}
                  <div className="flex justify-between items-center relative z-10 border-b border-indigo-500/15 pb-2">
                    <button
                      onClick={() => setSelectedProjectForCalc(null)}
                      className="flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-400 hover:text-indigo-300 transition-all bg-indigo-500/10 hover:bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/20"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span>Back</span>
                    </button>
                    
                    <button 
                      onClick={() => setSelectedProjectForCalc(null)}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-indigo-500/20 transition-all"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Calculator visual settings wrapper */}
                  <div className="space-y-3 bg-slate-950/50 p-3 sm:p-4 rounded-xl border border-indigo-500/20 relative z-10 shadow-inner">
                    
                    <div className="space-y-1.5 text-center">
                      <span className="text-[9.5px] uppercase font-mono tracking-wider font-extrabold text-indigo-300/80 block leading-none">Select Shares Quantity</span>
                      
                      {/* Plus minus manual input */}
                      <div className="flex items-center justify-center space-x-2.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setCalculatorShares(prev => Math.max(1, prev - 1))}
                          className="w-8 h-8 rounded-lg bg-indigo-950/40 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-500/50 flex items-center justify-center font-extrabold font-mono text-base text-indigo-300 transition-all cursor-pointer shadow-inner active:scale-95"
                        >
                          -
                        </button>
                        
                        <input 
                          type="number"
                          min={1}
                          max={selectedProjectForCalc.availableShares}
                          value={calculatorShares}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setCalculatorShares(isNaN(val) ? 1 : Math.max(1, val));
                          }}
                          className="w-16 bg-slate-950 border border-indigo-500/25 text-center text-xs font-mono font-bold text-slate-100 p-1 rounded-lg focus:outline-none focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/20"
                        />

                        <button
                          type="button"
                          onClick={() => setCalculatorShares(prev => Math.min(selectedProjectForCalc.availableShares, prev + 1))}
                          className="w-8 h-8 rounded-lg bg-indigo-950/40 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-500/50 flex items-center justify-center font-extrabold font-mono text-base text-indigo-300 transition-all cursor-pointer shadow-inner active:scale-95"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-[9px] font-mono text-slate-400 block leading-none">
                        Available Shares: <strong className="text-slate-200">{selectedProjectForCalc.availableShares}</strong>
                      </span>
                    </div>

                    {/* Selection Presets */}
                    <div className="grid grid-cols-5 gap-1 pt-0.5 text-center font-mono">
                      {[1, 2, 5, 10, 50].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCalculatorShares(Math.min(selectedProjectForCalc.availableShares, num))}
                          className={`py-1 border text-[9.5px] font-bold rounded-md font-mono transition-all duration-200 ${
                            calculatorShares === num 
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-950/30' 
                              : 'bg-indigo-950/30 border-indigo-500/15 hover:border-indigo-500/30 text-indigo-300 hover:text-white'
                          }`}
                        >
                          {num} Shs
                        </button>
                      ))}
                    </div>

                    {/* Auto Calculation outputs - Restructured as an Elegant Receipt */}
                    <div className="space-y-2.5 pt-1">
                      
                      {/* Cost Summary Box */}
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2.5 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
                        <div className="relative z-10">
                          <span className="text-[10px] sm:text-[11px] text-indigo-300 uppercase tracking-wider block font-bold">Total Investment</span>
                        </div>
                        <div className="relative z-10 text-right">
                          <span className="text-sm font-bold font-sans text-white block">
                            ${calculatorCost % 1 === 0 ? calculatorCost.toFixed(0) : calculatorCost.toFixed(2)}
                          </span>
                          <span className="text-[8px] text-indigo-400 uppercase tracking-wider font-extrabold block">
                            USDT
                          </span>
                        </div>
                      </div>

                      {/* Yield Breakdown List */}
                      <div className="bg-slate-900/40 rounded-xl border border-indigo-500/15 divide-y divide-indigo-500/10 overflow-hidden">
                        
                        {/* Box Header */}
                        <div className="px-3 py-1.5 bg-indigo-500/5 flex justify-between items-center">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-300 font-sans">Expected Returns</span>
                          <span className="text-[9.5px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            +{selectedProjectForCalc.expectedRoi}%
                          </span>
                        </div>

                        {/* Expected Yield */}
                        <div className="px-3 py-1.5 flex justify-between items-center">
                          <span className="text-slate-300 font-medium text-[10.5px]">Expected Yield ({selectedProjectForCalc.durationMonths || 12} Mos)</span>
                          <div className="text-right flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="text-xs font-bold text-emerald-400 font-mono">
                              +${(calculatorCost * (selectedProjectForCalc.expectedRoi / 100)).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Monthly Yield */}
                        <div className="px-3 py-1.5 flex justify-between items-center">
                          <span className="text-slate-300 font-medium text-[10.5px]">Monthly Yield</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            +${calculatorEstimatedMthly.toFixed(2)}
                          </span>
                        </div>

                        {/* Daily Yield */}
                        <div className="px-3 py-1.5 flex justify-between items-center">
                          <span className="text-slate-300 font-medium text-[10.5px]">Daily Yield</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            +${calculatorEstimatedDaily.toFixed(2)}
                          </span>
                        </div>

                      </div>

                      {/* Wallet Balance Bar */}
                      <div className="flex justify-between items-center px-3 py-1.5 bg-slate-900/30 border border-indigo-500/10 rounded-xl">
                        <span className="flex items-center gap-1 text-[10.5px] text-slate-300 font-medium">
                          <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          Wallet Balance:
                        </span>
                        <span className={`text-[11px] font-mono font-bold ${availableUserBalance >= calculatorCost ? 'text-amber-400' : 'text-rose-400 font-extrabold animate-pulse'}`}>
                          ${availableUserBalance.toFixed(2)} USDT
                        </span>
                      </div>

                    </div>

                  </div>

                  {/* Error popup handled via absolute overlay above */}

                  {/* Anti-Fraud Check alert indicator */}
                  {calculatorCost >= 113 && activeUser.referredBy && activeUser.referredBy.trim() !== '' && !hasAlreadyInvested && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-[9px] font-mono text-emerald-300 relative overflow-hidden z-10">
                      <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/5 rounded-full blur-md"></div>
                      <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold uppercase tracking-wider block text-emerald-400 leading-none mb-0.5">Referral Multiplier Activated</span>
                        <span className="leading-tight block">Dual 10% referral bonus (${(calculatorCost * 0.1).toFixed(2)}) will trigger successfully!</span>
                      </div>
                    </div>
                  )}

                  {/* Action CTA Buttons */}
                  <div className="relative z-10 pt-0.5">
                    <button
                      id="confirm-share-purchase-cta"
                      onClick={handleCalculatorPurchase}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-white font-bold uppercase rounded-lg text-[10px] tracking-wider shadow-lg shadow-emerald-950/25 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Process Secure Purchase</span>
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* 📄 PDF PROSPECTUS VIEWER MODAL POPUP */}
            {activeViewDoc && (
              <div 
                id="pdf-viewer-modal" 
                className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[90vh] sm:h-[85vh] overflow-hidden">
                  
                  {/* Top Control Header Bar */}
                  <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-left">
                      <div className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-white font-sans max-w-[180px] sm:max-w-xs truncate animate-pulse-subtle" title={activeViewDoc.docName}>
                          {activeViewDoc.docName}
                        </span>
                        <span className="block text-[9px] text-slate-400 font-mono font-medium">
                          Fundora Securities Ledger System • {activeViewDoc.project.name}
                        </span>
                      </div>
                    </div>

                    {/* Page & Zoom Controls */}
                    <div className="flex items-center gap-2.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-[10px]">
                      <button 
                        onClick={() => setPdfZoom(prev => Math.max(50, prev - 25))}
                        className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-slate-300 font-bold min-w-[36px] text-center">{pdfZoom}%</span>
                      <button 
                        onClick={() => setPdfZoom(prev => Math.min(200, prev + 25))}
                        className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      
                      <div className="h-3 w-[1px] bg-slate-800 mx-1"></div>
                      
                      <span className="text-slate-400 font-medium">Page 1 of 1</span>
                    </div>

                    {/* Download & Close actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          console.log('[PDFViewer] Downloading generated document PDF:', activeViewDoc.docName);
                          generateDocumentPDF(activeViewDoc.docName, activeViewDoc.project);
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Download Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                      
                      <button
                        onClick={() => setActiveViewDoc(null)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                        title="Close Viewer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Close</span>
                      </button>
                    </div>
                  </div>

                  {/* Document View Canvas Area */}
                  <div className="flex-1 bg-slate-950 overflow-auto p-4 sm:p-8 flex justify-center items-start select-none">
                    <div 
                      className="bg-white text-slate-900 border border-slate-200 shadow-2xl relative transition-transform duration-200 origin-top text-left font-serif p-8 sm:p-12 w-[210mm] min-h-[297mm] mx-auto"
                      style={{ 
                        transform: `scale(${pdfZoom / 100})`,
                        marginBottom: `${(pdfZoom / 100) * 20}px`
                      }}
                    >
                      {/* Diagonal Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden select-none">
                        <span className="text-slate-900 font-sans font-black text-7xl tracking-widest uppercase rotate-45 select-none whitespace-nowrap">
                          FUNDORA SECURITIES • TRUSTEE DEED • FUNDORA SECURITIES
                        </span>
                      </div>

                      {/* Header Logo Letterhead */}
                      <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                        <div>
                          <h1 className="font-sans font-black text-slate-900 text-xl tracking-wide uppercase leading-tight">
                            FUNDORA GLOBAL TRUSTEE
                          </h1>
                          <p className="font-sans text-[8px] tracking-wider text-slate-500 font-bold uppercase">
                            REGULATORY FRACTIONAL SECURITIES & ASSET CUSTODY VAULT
                          </p>
                          <p className="font-mono text-[7px] text-slate-400 mt-1 uppercase">
                            MEMBER COMPLIANCE • SECURED REAL WORLD ASSETS
                          </p>
                        </div>
                        <div className="text-right font-mono text-[8px] text-slate-500">
                          <p className="font-bold text-slate-900">DEED STATUS: ACTIVE</p>
                          <p>Registry Id: SEC-RWA-00{activeViewDoc.project.id}</p>
                          <p>Date: June 30, 2026</p>
                        </div>
                      </div>

                      {/* Document Body Title */}
                      <div className="mt-8 text-center">
                        <h2 className="text-lg font-bold uppercase tracking-widest text-slate-900">
                          CERTIFIED DEED PROSPECTUS
                        </h2>
                        <div className="w-16 h-0.5 bg-slate-900 mx-auto mt-2"></div>
                      </div>

                      {/* Document Content Details block */}
                      <div className="mt-8 space-y-4 font-sans text-xs text-slate-800 leading-relaxed">
                        <p>
                          This document serves as the regulatory-grade security prospectus record for the co-ownership fractionalized shares associated with the asset listed herein. Under the Trust and Securities Act of 2026, the custody, management, and dividend rights of this asset are held on behalf of accredited investors under the Fundora Secure Ledger system.
                        </p>

                        {/* Structured Properties Table */}
                        <div className="border border-slate-300 rounded-lg overflow-hidden mt-6">
                          <div className="grid grid-cols-3 bg-slate-100 font-bold text-[9px] uppercase py-2 px-3 border-b border-slate-300">
                            <span className="col-span-1">Registry Field</span>
                            <span className="col-span-2">Verified Ledger Value</span>
                          </div>
                          
                          <div className="divide-y divide-slate-200 text-[10px]">
                            <div className="grid grid-cols-3 py-2 px-3">
                              <span className="font-bold text-slate-500">Property Name</span>
                              <span className="col-span-2 text-slate-900 font-serif font-bold">{activeViewDoc.project.name}</span>
                            </div>
                            <div className="grid grid-cols-3 py-2 px-3">
                              <span className="font-bold text-slate-500">Property Location</span>
                              <span className="col-span-2 text-slate-900 font-mono text-[9px]">{activeViewDoc.project.location}</span>
                            </div>
                            <div className="grid grid-cols-3 py-2 px-3">
                              <span className="font-bold text-slate-500">Asset Category</span>
                              <span className="col-span-2 text-slate-900">{activeViewDoc.project.category || 'Real Estate Asset'}</span>
                            </div>
                            <div className="grid grid-cols-3 py-2 px-3">
                              <span className="font-bold text-slate-500">Full Valuation</span>
                              <span className="col-span-2 text-slate-900 font-mono font-bold">${(activeViewDoc.project.totalShares * activeViewDoc.project.pricePerShare).toLocaleString()} USDT</span>
                            </div>
                            <div className="grid grid-cols-3 py-2 px-3">
                              <span className="font-bold text-slate-500">Price Per Share</span>
                              <span className="col-span-2 text-slate-900 font-mono font-bold">${activeViewDoc.project.pricePerShare} USDT</span>
                            </div>
                            <div className="grid grid-cols-3 py-2 px-3">
                              <span className="font-bold text-slate-500">Asset Yield</span>
                              <span className="col-span-2 text-emerald-600 font-bold">{activeViewDoc.project.expectedRoi}% Expected Return</span>
                            </div>
                            <div className="grid grid-cols-3 py-2 px-3">
                              <span className="font-bold text-slate-500">Prospectus Document</span>
                              <span className="col-span-2 text-slate-900 font-mono text-[9px] text-blue-600">{activeViewDoc.docName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Secondary text */}
                        <div className="mt-6 space-y-3">
                          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                            {activeViewDoc.docName.toLowerCase().includes('specs') ? (
                              "1. Detailed Specifications & Layout"
                            ) : activeViewDoc.docName.toLowerCase().includes('approval') || activeViewDoc.docName.toLowerCase().includes('permit') ? (
                              "1. Official Regulatory & Development Approval"
                            ) : (
                              "1. Official No Objection Certificate (NOC) Declaration"
                            )}
                          </h4>
                          <p className="text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {activeViewDoc.docName.toLowerCase().includes('specs') ? (
                              `This document certifies the technical specifications and structural blueprints for "${activeViewDoc.project.name}" located at ${activeViewDoc.project.location}.

Asset Details:
- Target Expected Return: ${activeViewDoc.project.expectedRoi}% APR
- Total Unit Shares: ${activeViewDoc.project.totalShares}
- Single Share Price: $${activeViewDoc.project.pricePerShare} USDT

Structural Features & Layout:
${activeViewDoc.project.description}`
                            ) : activeViewDoc.docName.toLowerCase().includes('approval') || activeViewDoc.docName.toLowerCase().includes('permit') ? (
                              `RERA (Real Estate Regulatory Agency) and the planning councils hereby confirm that all safety audits, zoning approvals, structural blueprints, and environmental impact assessments for "${activeViewDoc.project.name}" located at ${activeViewDoc.project.location} have been thoroughly audited, approved, and signed off under registry index UK-REG-${activeViewDoc.project.id}492A-X.`
                            ) : (
                              `The sovereign land registry and local municipal boards certify that they have NO OBJECTION to the fractionalized co-ownership, tokenization, or distribution of yield from "${activeViewDoc.project.name}" located at ${activeViewDoc.project.location}. This asset is certified as clean, free of any lien, and verified for digital asset vaults.`
                            )}
                          </p>
                          
                          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10px] pt-2">
                            2. Cryptographic Security Seal
                          </h4>
                          <p className="text-[10px] text-slate-600">
                            All fractional transactions, share holdings, and monthly yield disbursements are permanently registered in the secure ledger database. The integrity of this file is validated using cryptographic signatures to prevent unauthorized duplication or alteration.
                          </p>
                        </div>

                        {/* Official stamp section at the bottom */}
                        <div className="border-t border-slate-300 pt-6 mt-12 flex flex-col sm:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            {/* Round visual stamp seal */}
                            <div className="w-16 h-16 border-4 border-emerald-600 rounded-full flex flex-col items-center justify-center p-1 font-mono text-[6px] text-emerald-600 uppercase font-black tracking-tighter rotate-12">
                              <span>SECURED</span>
                              <span>DEED</span>
                              <span>* RWA *</span>
                            </div>
                            <div className="text-left font-mono text-[8px] text-slate-500">
                              <p className="font-bold text-slate-800">CUSTODIAN SIGNATURE</p>
                              <p className="italic font-serif text-[10px] text-slate-700">Fundora Asset Trust LLC</p>
                              <p>Secured Multi-Sig Cryptographic Seal</p>
                            </div>
                          </div>

                          <div className="text-center sm:text-right font-mono text-[7px] text-slate-400">
                            <p>SHA-256 HASH VERIFICATION INDEX</p>
                            <p className="text-slate-500">8e5f2a1b94d2c7380cf87{activeViewDoc.project.id}a4e5d6c7b8a90123</p>
                            <p>FUNDORA GLOBAL SECURITIES SYSTEM</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== TAB 3: WALLET & DEPOSITS ==================== */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">

            {/* INTEGRATED WALLET BINDING CENTER */}
            {(!activeUser?.wallet?.usdtTrc20Address && !activeUser?.wallet?.usdtBep20Address) && (
              <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-6.5 space-y-6 shadow-xl text-white animate-fadeIn">
                
                {/* Always visible elegant header indicating configuration status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4.5 border-b border-indigo-500/20 gap-3">
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 shadow-2xs border border-indigo-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-sans font-bold text-white tracking-tight">
                        Cryptographic Payout Node Lock
                      </h4>
                      <p className="text-[10px] text-indigo-200/85 font-sans mt-0.5">
                        Bind your designated Receiving USDT address strings to securely authorize automated withdraw processes.
                      </p>
                    </div>
                  </div>
                  <div>
                    {(activeUser?.wallet?.usdtTrc20Address && activeUser?.wallet?.usdtBep20Address) ? (
                      <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-lg font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                        Fully Bound & Locked
                      </span>
                    ) : (activeUser?.wallet?.usdtTrc20Address || activeUser?.wallet?.usdtBep20Address) ? (
                      <span className="text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25 px-3 py-1 rounded-lg font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                        Partially Bound
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/25 px-3 py-1 rounded-lg font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                        Locks Unconfigured
                      </span>
                    )}
                  </div>
                </div>

                {/* Bound networks list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* TRC20 Binding Card */}
                  <div className={`p-5 rounded-2xl border transition-all duration-350 relative overflow-hidden ${
                    activeUser?.wallet?.usdtTrc20Address 
                      ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-600/[0.02] shadow-2xs text-white'
                      : 'border-indigo-500/20 bg-[#13163a]/50 text-indigo-200 hover:border-indigo-500/40'
                  }`}>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/20"></span>
                        <span className="text-xs uppercase font-sans font-black text-white">USDT (TRC20 Network)</span>
                      </div>
                      {activeUser?.wallet?.usdtTrc20Address ? (
                        <span className="text-[8.5px] font-black uppercase font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Active Bound
                        </span>
                      ) : (
                        <span className="text-[8.5px] font-black uppercase font-mono text-indigo-300 bg-[#060819] px-2.5 py-1 rounded-lg border border-indigo-500/30">
                          Unconfigured
                        </span>
                      )}
                    </div>
                    {activeUser?.wallet?.usdtTrc20Address ? (
                      <div className="space-y-2">
                        <div className="bg-[#060819] border border-indigo-500/20 px-3.5 py-2.5 rounded-xl text-xs font-mono text-indigo-200 truncate flex items-center justify-between gap-2 shadow-2xs">
                          <span className="truncate select-all font-semibold">{activeUser?.wallet?.usdtTrc20Address}</span>
                          <button 
                            onClick={() => triggerCopy(activeUser?.wallet?.usdtTrc20Address || '', 'trc_wallet_copy')}
                            className="text-slate-400 hover:text-emerald-400 shrink-0 cursor-pointer p-1 rounded-lg hover:bg-[#13163a] transition-colors"
                            title="Copy Address"
                          >
                            {copiedText === 'trc_wallet_copy' ? (
                              <span className="text-[9px] text-emerald-450 font-extrabold uppercase font-sans">Copied</span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input 
                          type="text"
                          placeholder="Paste TRC20 Wallet address (starts with 'T'...)"
                          value={trcLink}
                          onChange={(e) => setTrcLink(e.target.value)}
                          className="w-full bg-[#060819] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-indigo-300/45 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-2xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* BEP20 Binding Card */}
                  <div className={`p-5 rounded-2xl border transition-all duration-350 relative overflow-hidden ${
                    activeUser?.wallet?.usdtBep20Address 
                      ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-emerald-600/[0.02] shadow-2xs text-white'
                      : 'border-indigo-500/20 bg-[#13163a]/50 text-indigo-200 hover:border-indigo-500/40'
                  }`}>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/20"></span>
                        <span className="text-xs uppercase font-sans font-black text-white">USDT (BEP20 Network)</span>
                      </div>
                      {activeUser?.wallet?.usdtBep20Address ? (
                        <span className="text-[8.5px] font-black uppercase font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Active Bound
                        </span>
                      ) : (
                        <span className="text-[8.5px] font-black uppercase font-mono text-indigo-300 bg-[#060819] px-2.5 py-1 rounded-lg border border-indigo-500/30">
                          Unconfigured
                        </span>
                      )}
                    </div>
                    {activeUser?.wallet?.usdtBep20Address ? (
                      <div className="space-y-2">
                        <div className="bg-[#060819] border border-indigo-500/20 px-3.5 py-2.5 rounded-xl text-xs font-mono text-indigo-200 truncate flex items-center justify-between gap-2 shadow-2xs">
                          <span className="truncate select-all font-semibold">{activeUser?.wallet?.usdtBep20Address}</span>
                          <button 
                            onClick={() => triggerCopy(activeUser?.wallet?.usdtBep20Address || '', 'bep_wallet_copy')}
                            className="text-slate-400 hover:text-emerald-400 shrink-0 cursor-pointer p-1 rounded-lg hover:bg-[#13163a] transition-colors"
                            title="Copy Address"
                          >
                            {copiedText === 'bep_wallet_copy' ? (
                              <span className="text-[9px] text-emerald-450 font-extrabold uppercase font-sans">Copied</span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input 
                          type="text"
                          placeholder="Paste BEP20 Binance Chain address (starts with '0x'...)"
                          value={bepLink}
                          onChange={(e) => setBepLink(e.target.value)}
                          className="w-full bg-[#060819] border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-indigo-300/45 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-2xs"
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* Inline Save button if any is unbound */}
                {(!activeUser?.wallet?.usdtTrc20Address || !activeUser?.wallet?.usdtBep20Address) && (
                  <div className="pt-4 border-t border-indigo-500/20 flex justify-end">
                    <button
                      onClick={() => {
                        if (!trcLink && !bepLink) {
                          showStatus("Please paste a wallet address for at least one network.", "error");
                          return;
                        }
                        onBindWallet(trcLink || activeUser?.wallet?.usdtTrc20Address || '', bepLink || activeUser?.wallet?.usdtBep20Address || '');
                        showStatus("Wallet addresses bound and verified securely! You can use them to auto-fill withdrawals instantly.", "success");
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400 text-white font-sans font-extrabold rounded-xl text-xs tracking-wider uppercase shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>💾</span>
                      <span>Bind Cryptographic Addresses</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SUB-MENU SELECTION KEYPAD FOR WALLET OPERATIONS */}
            <div className="flex bg-[#0e112d] p-1 rounded-xl border border-indigo-500/40 w-full sm:w-max gap-1 shadow-xs mt-4">
              <button
                type="button"
                onClick={() => {
                  setWalletSubTab('deposit');
                  showStatus("Activated Deposit Portal View", "info");
                }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs font-sans font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  walletSubTab === 'deposit'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                    : 'text-indigo-300 hover:text-emerald-400 bg-transparent hover:bg-emerald-950/20'
                }`}
              >
                <ArrowDownCircle className={`w-3.5 h-3.5 shrink-0 ${walletSubTab === 'deposit' ? 'text-emerald-400 animate-pulse' : 'text-indigo-400'}`} />
                <span>Deposit Hub</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWalletSubTab('withdraw');
                  showStatus("Activated Withdrawal Liquidation Terminal", "info");
                }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs font-sans font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  walletSubTab === 'withdraw'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs'
                    : 'text-indigo-300 hover:text-rose-400 bg-transparent hover:bg-rose-950/20'
                }`}
              >
                <ArrowUpCircle className={`w-3.5 h-3.5 shrink-0 ${walletSubTab === 'withdraw' ? 'text-rose-400 animate-pulse' : 'text-indigo-400'}`} />
                <span>Withdrawal Hub</span>
              </button>
            </div>

            {walletSubTab === 'deposit' ? (
              /* LEFT COLUMN: USDT DEPOSIT PORTAL GATEWAY */
              <div id="binance-deposit-module" className="bg-[#0e112d] border border-indigo-500/20 rounded-[1.25rem] p-4.5 sm:p-6 space-y-4.5 shadow-2xl text-white animate-fadeIn w-full max-w-2xl relative overflow-hidden">
                {/* Visual Accent Corner */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

                {depositSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 leading-normal font-sans shadow-2xs flex items-center gap-3 animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-extrabold uppercase text-[10px] tracking-wide block text-emerald-400">Success Code Dispatched</span>
                      <span className="font-medium text-[10px] opacity-90">{depositSuccessMsg}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleDepositSubmit} className="space-y-6 text-xs font-mono">
                  
                  {/* STEP 1: BLOCKCHAIN NETWORK & DESTINATION DETAILS */}
                  <div className="bg-[#11132e]/50 border border-indigo-500/15 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-indigo-600 text-white font-extrabold w-5 h-5 rounded-md flex items-center justify-center shrink-0">1</span>
                      <span className="text-[10px] sm:text-[11px] text-slate-100 font-extrabold uppercase tracking-wider block font-sans leading-tight">
                        Choose Network & Destination
                      </span>
                    </div>

                    {/* Network Toggles */}
                    <div className="grid grid-cols-2 gap-3.5 pt-1">
                      {/* TRC20 Selector */}
                      <div 
                        onClick={() => {
                          setDepositNetwork('TRC20');
                          showStatus("Switched payment destination to Tron blockchain (TRC20).", "info");
                        }}
                        className={`p-3.5 rounded-xl border-2 text-center cursor-pointer transition-all duration-300 ${
                          depositNetwork === 'TRC20'
                            ? 'bg-[#060819] text-white border-indigo-500 shadow-md ring-4 ring-indigo-500/25'
                            : 'bg-[#13163a]/40 border-indigo-500/10 text-indigo-300 hover:bg-[#13163a] hover:border-indigo-500/30'
                        }`}
                      >
                        <span className="font-extrabold block font-sans text-xs">USDT (TRC20)</span>
                        <span className="text-[8px] text-indigo-400 block mt-0.5 uppercase tracking-wide">Tron Blockchain</span>
                      </div>

                      {/* BEP20 Selector */}
                      <div 
                        onClick={() => {
                          setDepositNetwork('BEP20');
                          showStatus("Switched payment destination to Binance Smart Chain (BEP20).", "info");
                        }}
                        className={`p-3.5 rounded-xl border-2 text-center cursor-pointer transition-all duration-300 ${
                          depositNetwork === 'BEP20'
                            ? 'bg-[#060819] text-white border-indigo-500 shadow-md ring-4 ring-indigo-500/25'
                            : 'bg-[#13163a]/40 border-indigo-500/10 text-indigo-300 hover:bg-[#13163a] hover:border-indigo-500/30'
                        }`}
                      >
                        <span className="font-extrabold block font-sans text-xs">USDT (BEP20)</span>
                        <span className="text-[8px] text-indigo-400 block mt-0.5 uppercase tracking-wide">BNB Smart Chain</span>
                      </div>
                    </div>

                    {/* Unified Address Card & QR Code Row */}
                    <div className="bg-[#060819]/95 border border-indigo-500/20 rounded-xl p-4 space-y-4">
                      
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                        <div className="space-y-1.5 min-w-0">
                          <span className="text-[9px] text-indigo-400 uppercase font-bold tracking-wider block font-sans">
                            Official {depositNetwork} Wallet Address
                          </span>
                          <span className={`text-[11.5px] select-all block break-all font-mono leading-relaxed tracking-tight font-extrabold ${
                            (depositNetwork === 'TRC20' ? systemSettings?.usdtTrc20Address : systemSettings?.usdtBep20Address)
                              ? 'text-emerald-400'
                              : 'text-rose-400 font-sans italic font-bold'
                          }`}>
                            {(depositNetwork === 'TRC20' 
                              ? (systemSettings?.usdtTrc20Address || '') 
                              : (systemSettings?.usdtBep20Address || '')) || '⚠️ Address not configured by administrator'}
                          </span>
                        </div>
                        
                        <button
                          type="button"
                          disabled={!(depositNetwork === 'TRC20' ? systemSettings?.usdtTrc20Address : systemSettings?.usdtBep20Address)}
                          onClick={() => triggerCopy(
                            depositNetwork === 'TRC20' 
                              ? (systemSettings?.usdtTrc20Address || '') 
                              : (systemSettings?.usdtBep20Address || ''),
                            'address'
                          )}
                          className={`px-4 py-2.5 rounded-lg text-[9.5px] uppercase font-bold tracking-wider shrink-0 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 w-full sm:w-auto ${
                            copiedText === 'address'
                              ? 'bg-emerald-600 border border-emerald-500 text-white shadow-lg shadow-emerald-600/10'
                              : 'bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/40 text-white hover:border-indigo-400 disabled:opacity-45 disabled:cursor-not-allowed shadow-md'
                          }`}
                        >
                          {copiedText === 'address' ? (
                            <>
                              <span>✓</span>
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Address</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Barcode & Warning Alert Box */}
                      <div className="flex flex-col sm:flex-row items-center gap-4 pt-3 border-t border-indigo-500/10">
                        {/* Interactive Scan QR Frame */}
                        <div className="w-24 h-24 bg-[#11132e] p-2 rounded-xl shrink-0 flex items-center justify-center border border-indigo-500/20 relative overflow-hidden shadow-inner">
                          {depositNetwork === 'TRC20' ? (
                            systemSettings?.usdtTrc20QrCode ? (
                              <img 
                                src={systemSettings.usdtTrc20QrCode} 
                                alt="USDT TRC20 QR"
                                className="w-full h-full object-contain rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            ) : systemSettings?.usdtTrc20Address ? (
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(systemSettings.usdtTrc20Address)}`} 
                                alt="USDT TRC20 QR"
                                className="w-full h-full object-contain rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="text-[8px] text-indigo-400/50 text-center font-sans">No QR</div>
                            )
                          ) : (
                            systemSettings?.usdtBep20QrCode ? (
                              <img 
                                src={systemSettings.usdtBep20QrCode} 
                                alt="USDT BEP20 QR"
                                className="w-full h-full object-contain rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            ) : systemSettings?.usdtBep20Address ? (
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(systemSettings.usdtBep20Address)}`} 
                                alt="USDT BEP20 QR"
                                className="w-full h-full object-contain rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="text-[8px] text-indigo-400/50 text-center font-sans">No QR</div>
                            )
                          )}
                        </div>

                        {/* Safety Guidelines */}
                        <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                          <span className="font-extrabold text-amber-400 block uppercase text-[10px] tracking-wider font-sans">
                            {systemSettings?.scanGateTitle || '⚠️ Safety Chain Match Warning'}
                          </span>
                          <span className="text-[10px] text-indigo-200/90 leading-relaxed block font-sans">
                            {systemSettings?.scanGateSubtitle || 'Please transfer USDT strictly using the selected chain. Assets sent on wrong chains are lost permanently.'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* STEP 2: UPLOAD TRANSACTION PROOF SCREENSHOT */}
                  <div className="bg-[#11132e]/50 border border-indigo-500/15 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-indigo-600 text-white font-extrabold w-5 h-5 rounded-md flex items-center justify-center shrink-0">2</span>
                      <span className="text-[10px] sm:text-[11px] text-slate-100 font-extrabold uppercase tracking-wider block font-sans leading-tight">
                        Upload Payment Screenshot
                      </span>
                    </div>

                    {/* Hidden Native File Input */}
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Interactive Dropzone */}
                    <div 
                      onClick={() => {
                        if (!isAnalyzingReceipt) {
                          fileInputRef.current?.click();
                        }
                      }}
                      className="border-2 border-dashed border-rose-500/30 hover:border-indigo-500/50 bg-[#13163a]/25 hover:bg-[#13163a]/45 p-4.5 rounded-xl text-center space-y-2 cursor-pointer transition-all duration-200 relative overflow-hidden"
                    >
                      {isAnalyzingReceipt ? (
                        <div className="py-2 space-y-2 flex flex-col items-center justify-center">
                          <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-white font-extrabold block uppercase tracking-wider animate-pulse">Scanning Receipt...</span>
                            <p className="text-[8px] text-indigo-300/80 font-sans">Extracting details automatically</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                          <Upload className="w-5.5 h-5.5 text-rose-400" />
                          <div className="space-y-0.5">
                            {depositProofInput ? (
                              <div className="space-y-1.5 flex flex-col items-center">
                                {depositProofInput.startsWith('data:image') || depositProofInput.startsWith('http') || depositProofInput.startsWith('blob:') ? (
                                  <img 
                                    src={depositProofInput} 
                                    alt="Attached screenshot preview" 
                                    className="w-16 h-16 object-cover rounded-lg border border-emerald-500/50 shadow-md" 
                                  />
                                ) : null}
                                <span className="text-[10px] text-emerald-400 font-bold block max-w-[220px] truncate mx-auto font-mono">
                                  ✓ {depositProofFileName || (depositProofInput.startsWith('data:') ? 'Screenshot Attached' : depositProofInput)}
                                </span>
                                <span className="text-[8px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded uppercase font-black inline-block">
                                  Screenshot Attached
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-rose-300 font-bold block font-sans uppercase">Upload Screenshot *</span>
                                <p className="text-[8px] text-indigo-300/80 font-sans leading-relaxed">
                                  Drag and drop or tap to attach your receipt image
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STEP 3: CONFIRM EXTRACTED DETAILS & VERIFY */}
                  <div className="bg-[#11132e]/50 border border-indigo-500/15 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-indigo-600 text-white font-extrabold w-5 h-5 rounded-md flex items-center justify-center shrink-0">3</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-100 font-extrabold uppercase tracking-wider block font-sans leading-tight">
                          Verify Extracted Details
                        </span>
                      </div>
                      {Boolean(isReceiptAutoFetched && (depositAmount > 0 || depositHashInput.trim().length > 0)) && (
                        <span className="text-[8.5px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <Lock className="w-3 h-3 text-emerald-400" />
                          Auto-Locked
                        </span>
                      )}
                    </div>

                    {/* Step 3 description */}
                    <p className="text-[8.5px] text-indigo-300 font-sans leading-relaxed">
                      Confirm the values below extracted from your uploaded receipt. Audit approval relies strictly on matching transaction evidence.
                    </p>

                    {/* Lock Status & Clear Button Banner */}
                    {Boolean(depositProofInput || isReceiptAutoFetched) && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-300 text-[9.5px] font-sans flex items-center justify-between gap-2 animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-[9px] leading-tight">
                            Screenshot attached as payment proof. Values auto-extracted.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDepositProofInput('');
                            setDepositProofFileName('');
                            setDepositAmount(0);
                            setDepositHashInput('');
                            setIsReceiptAutoFetched(false);
                            setScanSuccessMessage(null);
                            setScanErrorMessage(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            showStatus("Receipt screenshot cleared.", "info");
                          }}
                          className="text-[8px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2 py-1 rounded font-bold uppercase shrink-0 cursor-pointer transition-all"
                        >
                          Clear Image
                        </button>
                      </div>
                    )}

                    {/* Amount & Shares Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Amount display (Read-Only) */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-indigo-300 uppercase font-bold tracking-wider block font-sans">
                            Extracted Amount (USDT) <span className="text-rose-500 font-black text-xs ml-0.5">*</span>
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-indigo-300 font-extrabold text-xs">$</span>
                          <input 
                            type="number"
                            required
                            placeholder="Auto-fills from Screenshot..."
                            value={depositAmount || ''}
                            readOnly={true}
                            tabIndex={-1}
                            className={`w-full bg-[#090b20] border rounded-xl py-3 pl-7 pr-8 text-[10px] sm:text-xs placeholder:text-[10px] sm:placeholder:text-xs font-extrabold shadow-2xs transition-all cursor-not-allowed select-none ${
                              depositAmount > 0 
                                ? 'border-emerald-500/40 text-emerald-300 bg-[#08121d]' 
                                : 'border-indigo-500/20 text-slate-400 bg-[#060819]'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Estimated Shares */}
                      <div className="space-y-1.5 text-left">
                        <span className="text-[9px] text-indigo-300 uppercase font-bold tracking-wider block font-sans">
                          Estimated Shares
                        </span>
                        <div className="bg-[#060819] border border-indigo-500/20 rounded-xl px-3.5 py-2.5 h-[38px] flex items-center justify-between text-xs text-white">
                          <span className="font-extrabold text-emerald-400 font-mono">
                            {(depositAmount / 113).toFixed(2)} Shares
                          </span>
                          <span className="text-[8px] text-indigo-400 font-mono uppercase bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-sm">
                            $113 per share
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Limit info banner */}
                    <div className="bg-[#060819]/40 border border-amber-500/20 rounded-xl py-2.5 px-3 text-center text-[9.5px] font-sans text-indigo-200 space-y-1">
                      <div className="text-amber-400 font-extrabold uppercase tracking-wider text-center">DEPOSIT</div> 
                      <div className="text-center font-medium">
                        Min: <span className="text-white font-extrabold">$10 USDT</span> | Max: <span className="text-white font-extrabold">Unlimited</span>
                      </div>
                    </div>

                    {/* Transaction Hash / TxID Input (Read-Only) */}
                    <div className="space-y-1.5 text-left pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-indigo-300 uppercase font-bold tracking-wider block font-sans">
                          Transaction Hash (TxID) <span className="text-rose-500 font-black text-xs ml-0.5">*</span>
                        </span>
                      </div>
                      <div className="relative">
                        <input 
                          type="text"
                          required
                          value={depositHashInput}
                          placeholder="Auto-fills from Screenshot..."
                          readOnly={true}
                          tabIndex={-1}
                          className={`w-full border rounded-xl p-3 pr-10 text-[10px] sm:text-xs placeholder:text-[10px] sm:placeholder:text-xs font-mono shadow-2xs transition-all cursor-not-allowed select-none ${
                            depositHashInput.trim().length > 0 
                              ? 'border-emerald-500/40 text-emerald-300 bg-[#08121d]' 
                              : 'border-indigo-500/20 text-slate-400 bg-[#060819]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Scan Status Banners */}
                    {scanSuccessMessage && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-200 text-[10px] font-sans flex items-start gap-2 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold uppercase tracking-wider text-[8.5px] text-emerald-400">Scanner Success</p>
                          <p className="text-emerald-300/90 leading-normal mt-0.5">{scanSuccessMessage}</p>
                        </div>
                      </div>
                    )}

                    {scanErrorMessage && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-[10px] font-sans flex items-start gap-2 animate-fadeIn">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold uppercase tracking-wider text-[8.5px] text-amber-400">Scanner Advisory</p>
                          <p className="text-amber-300/90 leading-normal mt-0.5">{scanErrorMessage}</p>
                          <p className="text-[7.5px] text-slate-400 mt-1">Please upload a clear screenshot showing payment amount and TxID so the scanner can extract them automatically.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SUBMISSION ACTION */}
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400 text-white font-sans font-extrabold uppercase rounded-xl text-xs tracking-wider transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] cursor-pointer flex items-center justify-center"
                  >
                    <span>Submit Deposit</span>
                  </button>

                </form>
              </div>
            ) : (
              /* RIGHT COLUMN: USDT WITHDRAWAL requested TERMINAL */
              <div id="binance-withdrawal-module" className="bg-[#0e112d] border border-rose-500/30 rounded-[1.25rem] p-4 sm:p-6 space-y-6 shadow-xl text-white animate-fadeIn w-full max-w-2xl">

                {/* Available Balance card display */}
                <div className="bg-[#060819] border border-indigo-500/35 p-5 rounded-2xl text-white shadow-md relative overflow-hidden flex items-center justify-between">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                  <div className="space-y-1 relative z-10">
                    <span className="text-[9px] uppercase font-mono font-bold text-indigo-300 tracking-wider block">Total Available Balance</span>
                    <span className="text-2xl font-mono font-black text-white block leading-none pt-1">
                      ${availableUserBalance.toFixed(2)} <span className="text-xs text-emerald-400 font-bold">USDT</span>
                    </span>
                  </div>
                  <div className="text-right relative z-10 space-y-1">
                    <span className="text-[8.5px] bg-emerald-500/10 text-emerald-400 font-mono uppercase font-black px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Audited Liquid
                    </span>
                    <p className="text-[8px] text-indigo-300/80 font-mono block">Instantly withdrawable</p>
                  </div>
                </div>

                {withdrawErrorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-300 font-sans shadow-2xs font-bold flex items-center gap-2 animate-fadeIn">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></span>
                    <span>{withdrawErrorMsg}</span>
                  </div>
                )}

                {withdrawSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/35 rounded-xl text-xs text-emerald-300 leading-normal font-sans shadow-2xs font-bold flex items-center gap-2.5 animate-fadeIn">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span>{withdrawSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleWithdrawalSubmit} className="space-y-5 text-xs font-mono">
                  
                  {/* Withdrawal amount selection */}
                  <div className="space-y-2.5 font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider block">1. Withdrawal Amount (USDT)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setWithdrawAmount(Math.max(10, Math.floor(availableUserBalance)));
                          showStatus(`Available balance of $${Math.floor(availableUserBalance)} USDT selected.`, "info");
                        }}
                        className="text-[9px] text-indigo-200 font-extrabold hover:text-white bg-[#13163a] hover:bg-[#1b1f51] border border-indigo-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        ⚡ Use Max Liquid
                      </button>
                    </div>
                    
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-indigo-300 font-bold text-sm">$</span>
                      <input 
                        type="number"
                        required
                        min={10}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                        className="w-full bg-[#060819] border border-indigo-500/30 rounded-xl py-3.5 pl-8 pr-4 text-xs text-white font-extrabold focus:outline-none focus:border-emerald-500 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Network selection for Withdrawal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2.5 font-mono">
                      <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider block">2. USDT Network Chain</span>
                      <select 
                        value={withdrawNetwork}
                        onChange={(e: any) => {
                          const net = e.target.value;
                          setWithdrawNetwork(net);
                          const addr = net === 'TRC20' ? activeUser?.wallet?.usdtTrc20Address : activeUser?.wallet?.usdtBep20Address;
                          setWithdrawAddressInput(addr || '');
                          showStatus(`Updated liquidation pipeline to ${net} network.`, "info");
                        }}
                        className="w-full bg-[#060819] border border-indigo-500/30 rounded-xl p-3 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs transition-all"
                      >
                        <option value="TRC20" className="bg-[#0e112d] text-white">USDT (TRC20 Tron Network)</option>
                        <option value="BEP20" className="bg-[#0e112d] text-white">USDT (BEP20 BNB Smart Chain)</option>
                      </select>
                    </div>

                    {/* Live Processing fee and Net Payout simulation display */}
                    <div className="bg-[#13163a]/40 border border-indigo-500/20 p-3.5 rounded-xl flex flex-col justify-center text-[10px] leading-relaxed shadow-2xs">
                      <div className="flex justify-between text-indigo-300 font-mono">
                        <span className="font-semibold">Transaction Fee (20%):</span>
                        <span className="font-extrabold text-rose-400">-${(withdrawAmount * 0.20).toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between text-white font-extrabold border-t border-indigo-500/10 pt-1.5 mt-1.5">
                        <span className="font-sans font-bold">Net Payout Value:</span>
                        <span className="text-emerald-450 font-mono font-black text-xs">
                          ${Math.max(0, withdrawAmount * 0.80).toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recipient custom address with Auto-fill helper from bounds! */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider block flex items-center gap-1">
                        3. Recipient Destination Address
                      </span>
                      
                      {(() => {
                        const boundAddress = withdrawNetwork === 'TRC20' 
                          ? activeUser?.wallet?.usdtTrc20Address 
                          : activeUser?.wallet?.usdtBep20Address;
                        return boundAddress ? null : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!boundAddress) {
                                showStatus(`You have not bound an address for the ${withdrawNetwork} network yet. Please configure it in your profile first.`, "error");
                                return;
                              }
                              setWithdrawAddressInput(boundAddress);
                              showStatus(`Auto-fetched verified bound address for ${withdrawNetwork} successfully.`, "success");
                            }}
                            className="text-[9px] text-emerald-400 font-bold hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          >
                            🔗 Auto-Fetch Bound Address
                          </button>
                        );
                      })()}
                    </div>

                    {(() => {
                      const boundAddress = withdrawNetwork === 'TRC20' 
                        ? activeUser?.wallet?.usdtTrc20Address 
                        : activeUser?.wallet?.usdtBep20Address;
                      return (
                        <input 
                          type="text"
                          required
                          value={boundAddress || withdrawAddressInput}
                          onChange={(e) => {
                            if (!boundAddress) {
                              setWithdrawAddressInput(e.target.value);
                            }
                          }}
                          readOnly={!!boundAddress}
                          placeholder={`Enter verified USDT ${withdrawNetwork} address...`}
                          className={`w-full border rounded-xl p-3 text-xs font-mono transition-all shadow-2xs focus:outline-none ${
                            boundAddress 
                              ? 'bg-[#0a141d] border-emerald-500/35 text-emerald-400 font-extrabold cursor-not-allowed'
                              : 'bg-[#060819] border-indigo-500/30 text-white focus:border-emerald-500'
                          }`}
                        />
                      );
                    })()}

                    {/* Auto-fill banner alert of critical safety */}
                    {(() => {
                      const boundAddress = withdrawNetwork === 'TRC20' 
                        ? activeUser?.wallet?.usdtTrc20Address 
                        : activeUser?.wallet?.usdtBep20Address;
                      return boundAddress ? (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-start gap-2.5 text-[10px] text-emerald-300 leading-normal font-sans shadow-2xs">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="font-sans leading-relaxed text-emerald-200 font-semibold">
                            This destination key is permanently bound and secured under your account. Withdrawals are strictly routed to this locked address. Contact support if unbind is required.
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5 text-[10px] text-amber-300 leading-normal font-sans shadow-2xs">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="font-sans leading-relaxed text-indigo-200 font-semibold">
                            Confirm that your receiving address string matches the selected network. Sent tokens on mismatched chain standards are irrecoverable and permanently lost.
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400 text-white font-sans font-bold uppercase rounded-xl text-xs tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer"
                  >
                    ⚡ Authorize & Dispatch Liquidation Transfer
                  </button>

                </form>
              </div>
            )}

          </div>
        )}

        {/* ==================== TAB 3_B: LEDGER HISTORY ==================== */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">

            {/* History ledger container */}
            <div id="binance-ledger-module" className="space-y-4">
              
              {/* Modern Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 border border-indigo-500/20">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-sans font-bold text-white tracking-tight">Account Ledger History</h4>
                    <p className="text-[10px] text-indigo-200/90 font-sans">Live cryptographic record of audited wallet settlements & yields</p>
                  </div>
                </div>
                
                {/* Stats quick readout inside header */}
                <div className="flex gap-4 self-start sm:self-center font-mono text-[9px] border-t sm:border-t-0 sm:border-l border-indigo-500/20 pt-2.5 sm:pt-0 sm:pl-4">
                  <div className="text-left">
                    <span className="text-indigo-300 uppercase block font-bold">Total Operations</span>
                    <span className="font-bold text-white text-xs">{ledgerItems.length} Records</span>
                  </div>
                  <div className="text-left">
                    <span className="text-indigo-300 uppercase block font-bold">Pending Audits</span>
                    <span className="font-bold text-amber-400 text-xs">
                      {transactions.filter(t => t.status === 'Pending').length} Pending
                    </span>
                  </div>
                </div>
              </div>


              {/* Advanced Search & Filtering Console */}
              <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-4 shadow-xl space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-300 border-b border-indigo-500/20 pb-2">
                  <ListFilter className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Ledger Filters Console</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Search input field */}
                  <div className="relative sm:col-span-2">
                    <span className="absolute left-3 top-2.5 text-indigo-400">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search ID, description, hash or date..."
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="w-full bg-[#060819] border border-indigo-500/30 rounded-xl py-2 pl-9 pr-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-450 placeholder-indigo-300/40"
                    />
                    {ledgerSearch && (
                      <button
                        onClick={() => setLedgerSearch('')}
                        className="absolute right-3 top-2.5 text-indigo-400 hover:text-white font-bold"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Type Dropdown */}
                  <div>
                    <select
                      value={ledgerTypeFilter}
                      onChange={(e: any) => setLedgerTypeFilter(e.target.value)}
                      className="w-full bg-[#060819] border border-indigo-500/30 rounded-xl p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-450 cursor-pointer"
                    >
                      <option value="All" className="bg-[#0e112d] text-white">All Types</option>
                      <option value="Deposit" className="bg-[#0e112d] text-white">Deposits</option>
                      <option value="Withdrawal" className="bg-[#0e112d] text-white">Withdrawals</option>
                      <option value="Investment" className="bg-[#0e112d] text-white">Investments</option>
                      <option value="Profit Claim" className="bg-[#0e112d] text-white">Profit Claims</option>
                      <option value="Referral Bonus" className="bg-[#0e112d] text-white">Referral Bonuses</option>
                      <option value="Missed Claim" className="bg-[#0e112d] text-white">Missed Claims</option>
                    </select>
                  </div>

                  {/* Filter Status Dropdown */}
                  <div>
                    <select
                      value={ledgerStatusFilter}
                      onChange={(e: any) => setLedgerStatusFilter(e.target.value)}
                      className="w-full bg-[#060819] border border-indigo-500/30 rounded-xl p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-450 cursor-pointer"
                    >
                      <option value="All" className="bg-[#0e112d] text-white">All Statuses</option>
                      <option value="Pending" className="bg-[#0e112d] text-white">Pending</option>
                      <option value="Completed" className="bg-[#0e112d] text-white">Completed / Approved</option>
                      <option value="Rejected" className="bg-[#0e112d] text-white">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Date range filter section */}
                <div className="border-t border-indigo-500/15 pt-3 mt-1.5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[9px] font-bold text-indigo-300 uppercase font-mono tracking-wider">Date Range Filter</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
                      {/* Inputs Container - ensures From and To are always on a single line and fit perfectly */}
                      <div className="flex flex-row flex-nowrap items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-wider shrink-0">From</span>
                          <input
                            type="date"
                            value={ledgerStartDate}
                            onChange={(e) => setLedgerStartDate(e.target.value)}
                            className="bg-[#060819] border border-indigo-500/30 rounded-xl p-1.5 sm:p-2 text-[9px] sm:text-[10px] font-mono font-bold text-white focus:outline-none focus:border-indigo-450 cursor-pointer [color-scheme:dark] w-full min-w-0"
                          />
                        </div>
                        
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-wider shrink-0">To</span>
                          <input
                            type="date"
                            value={ledgerEndDate}
                            onChange={(e) => setLedgerEndDate(e.target.value)}
                            className="bg-[#060819] border border-indigo-500/30 rounded-xl p-1.5 sm:p-2 text-[9px] sm:text-[10px] font-mono font-bold text-white focus:outline-none focus:border-indigo-450 cursor-pointer [color-scheme:dark] w-full min-w-0"
                          />
                        </div>
                      </div>

                      {(ledgerStartDate || ledgerEndDate) && (
                        <button
                          type="button"
                          onClick={() => {
                            setLedgerStartDate('');
                            setLedgerEndDate('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white rounded-xl text-[9px] font-mono font-black uppercase transition-all cursor-pointer shadow-sm ml-auto sm:ml-0"
                        >
                          <X className="w-3 h-3 text-rose-400" />
                          Clear Dates
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger Table Section */}
              <div className="w-full overflow-x-auto bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] font-mono text-[10px] shadow-sm">
                <table className="w-full text-left border-collapse min-w-[650px] sm:min-w-full">
                  <thead>
                    <tr className="bg-[#060819] text-indigo-300 border-b border-indigo-500/30 uppercase text-[9px] font-bold">
                      <th className="p-3.5 text-left pl-5">Type / Category</th>
                      <th className="p-3.5 text-left">Date</th>
                      <th className="p-3.5 text-left">Transaction ID</th>
                      <th className="p-3.5 text-right">Amount</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center pr-5">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/10 text-slate-300">
                    {filteredTransactions.map((tx) => {
                      // Custom Icon & styling for each TransactionType
                      let typeIcon = <History className="w-3.5 h-3.5" />;
                      let typeColorClass = "text-indigo-300 bg-[#060819] border border-indigo-500/20";
                      let amountSign = "";
                      let amountColorClass = "text-white";
                      
                      switch (tx.type) {
                        case 'Deposit':
                          typeIcon = <ArrowDownLeft className="w-3.5 h-3.5" />;
                          typeColorClass = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
                          amountSign = "+";
                          amountColorClass = "text-emerald-400 font-extrabold";
                          break;
                        case 'Withdrawal':
                          typeIcon = <ArrowUpRight className="w-3.5 h-3.5" />;
                          typeColorClass = "text-rose-400 bg-rose-500/10 border border-rose-500/20";
                          amountSign = "-";
                          amountColorClass = "text-rose-400 font-extrabold";
                          break;
                        case 'Investment':
                          typeIcon = <Briefcase className="w-3.5 h-3.5" />;
                          typeColorClass = "text-purple-400 bg-purple-500/10 border border-purple-500/20";
                          amountSign = "-";
                          amountColorClass = "text-indigo-200 font-extrabold";
                          break;
                        case 'Profit Claim':
                          typeIcon = <Coins className="w-3.5 h-3.5 animate-pulse" />;
                          typeColorClass = "text-amber-400 bg-amber-500/10 border border-amber-500/20";
                          amountSign = "+";
                          amountColorClass = "text-emerald-400 font-extrabold";
                          break;
                        case 'Referral Bonus':
                          typeIcon = <Gift className="w-3.5 h-3.5" />;
                          typeColorClass = "text-blue-400 bg-blue-500/10 border border-blue-500/20";
                          amountSign = "+";
                          amountColorClass = "text-emerald-400 font-extrabold";
                          break;
                        case 'Missed Claim':
                          typeIcon = <AlertTriangle className="w-3.5 h-3.5 text-pink-400" />;
                          typeColorClass = "text-pink-400 bg-pink-500/10 border border-pink-500/20";
                          amountSign = "";
                          amountColorClass = "text-pink-400 font-extrabold";
                          break;
                      }

                      return (
                        <tr key={tx.id} className="hover:bg-[#13163a]/40 border-b border-indigo-500/10 transition-colors">
                          {/* Type with visual badge icon */}
                          <td className="p-3.5 pl-5 text-left whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg shrink-0 ${typeColorClass}`}>
                                {typeIcon}
                              </div>
                              <span className="font-sans font-extrabold text-white text-xs">{tx.type}</span>
                            </div>
                          </td>
                          
                          {/* Beautifully styled Date */}
                          <td className="p-3.5 text-left text-slate-400 text-[10px] whitespace-nowrap">
                            {tx.date}
                          </td>
                          
                          {/* Transaction ID */}
                          <td className="p-3.5 text-left font-mono text-[10px] text-slate-400 select-all">
                            <span className="bg-[#060819] px-1.5 py-0.5 rounded text-[9px] border border-indigo-500/20 text-indigo-300">
                              {tx.id.substring(0, 14)}...
                            </span>
                          </td>
                          
                          {/* Rich colored amount */}
                          <td className={`p-3.5 text-right text-xs font-mono font-extrabold ${amountColorClass}`}>
                            {amountSign} ${tx.amount.toFixed(2)} USDT
                          </td>
                          
                          {/* Dynamic status badges with glowing dot */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex justify-center">
                              {tx.status === 'Approved' || tx.status === 'Completed' || tx.status === 'Claimed' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  {tx.status}
                                </span>
                              ) : tx.status === 'Pending' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  {tx.status}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  {tx.status}
                                </span>
                              )}
                            </div>
                          </td>
                          
                          {/* Receipt actions */}
                          <td className="p-3.5 text-center pr-5">
                            <button
                              type="button"
                              onClick={() => setActiveReceipt({ item: tx.rawItem, type: tx.isClaim ? 'claim' : 'transaction' })}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 border border-indigo-400 hover:border-indigo-300 text-white rounded-lg text-[9px] font-sans font-bold uppercase cursor-pointer transition-all shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-300" />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="p-3 bg-[#060819] border border-indigo-500/20 rounded-full text-indigo-400">
                              <History className="w-6 h-6 stroke-[1.5]" />
                            </div>
                            <span className="text-xs font-bold text-white">No matching transactions found</span>
                            <span className="text-[10px] font-mono text-indigo-300">Try modifying your console search filters above</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table pagination/results indicator */}
              {filteredTransactions.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-mono text-indigo-200 bg-[#060819] p-3 rounded-xl border border-indigo-500/20 px-4">
                  <span>Showing {filteredTransactions.length} of {transactions.length} ledger logs</span>
                  <span className="text-emerald-400 font-bold tracking-wider uppercase flex items-center gap-1">
                    ✓ SECURE DECENTRALIZED SYMMETRIC AUDITING
                  </span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB 4: timed CLAIM CENTER ==================== */}
        {activeTab === 'claim' && (
          <div className="space-y-6">

            {/* Timed Claim rules and digital timer */}
            <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-5 space-y-4 shadow-xl text-white">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-indigo-500/20">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 border border-indigo-500/20">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-bold text-white">Profit Claim Center</h4>
                  <span className="text-[10px] text-indigo-200/90 font-mono">Real-time smart contract settlement desk</span>
                </div>
              </div>

              {/* Rules block */}
              <div className="p-3.5 bg-[#060819] rounded-xl border border-indigo-500/20 text-xs text-indigo-200 space-y-2 leading-relaxed">
                <span className="font-bold text-white block uppercase font-mono tracking-wider text-[10px]">Claims Window Constraints</span>
                <p>
                  1. Profit payouts are accrued dynamically to portfolios but are only claimable twice daily: between <strong className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">04:00 PM and 05:00 PM</strong>, and again between <strong className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25">09:00 PM and 10:00 PM</strong>.
                </p>
                <p>
                  2. If you do not claim within these hourly timelines, your profit <strong className="text-rose-400 font-semibold">expires automatically</strong> for that slot and is permanently unrecoverable.
                </p>
              </div>

              {/* Live Simulated clock display */}
              <div className="p-5 bg-[#060819] rounded-xl border border-indigo-500/30 text-center space-y-2">
                <span className="text-[9px] uppercase font-mono tracking-widest text-indigo-300 font-bold block">Current System Clock HUD</span>
                <div className="text-3xl font-black text-white font-mono tracking-wider animate-pulse">
                  {simulatedHour.toString().padStart(2, '0')}:{simulatedMinute.toString().padStart(2, '0')}
                </div>
                <div className="flex items-center justify-center space-x-1.5 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-indigo-200">Local evaluation timezone lock</span>
                </div>
              </div>

              {/* Payout actions */}
              <div className="bg-[#13163a]/40 p-4 rounded-xl border border-indigo-500/20 flex flex-col items-center justify-center space-y-4">
                
                <div className="text-center font-mono">
                  <span className="text-indigo-300 text-[9px] uppercase block font-bold">Yield pool ready today</span>
                  <span className="text-2xl font-black text-emerald-400 font-sans mt-0.5 block">
                    {calculatedDailyProfit > 0 ? `$${calculatedDailyProfit.toFixed(2)} USDT` : '$0.00 USDT'}
                  </span>
                </div>

                <button
                  id="claim-profit-button-interactive"
                  disabled={isClaiming}
                  onClick={async () => {
                    if (isClaiming) return;
                    setIsClaiming(true);
                    try {
                      const res = await onClaimDailyProfit();
                      setClaimPopup({
                        isOpen: true,
                        type: res.type,
                        amount: res.amount
                      });
                    } catch (err) {
                      console.error("Claim error", err);
                      setClaimPopup({
                        isOpen: true,
                        type: 'inactive_window',
                        amount: 0
                      });
                    } finally {
                      setIsClaiming(false);
                    }
                  }}
                  className={`relative overflow-hidden w-full py-5 px-8 font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-3 group cursor-pointer ${
                    isClaiming
                      ? 'bg-[#060819] text-indigo-300/40 cursor-not-allowed border border-indigo-500/20'
                      : isClaimWindowActive 
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-white shadow-[0_12px_24px_-8px_rgba(16,185,129,0.5)] hover:shadow-[0_20px_35px_-6px_rgba(16,185,129,0.65)] hover:-translate-y-0.5' 
                        : 'bg-[#060819] hover:bg-[#13163a] text-indigo-300 border border-indigo-500/20 shadow-inner'
                  }`}
                >
                  {/* Subtle shining light sweep effect */}
                  {isClaimWindowActive && !isClaiming && (
                    <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shimmer" />
                  )}

                  {isClaiming ? (
                    <>
                      <Clock className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                      <span className="font-sans font-black tracking-widest text-[13px]">
                        Verifying Secure NTP Clock...
                      </span>
                    </>
                  ) : isClaimWindowActive ? (
                    <>
                      <Sparkles className="w-5 h-5 text-yellow-300 animate-bounce group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300 shrink-0" />
                      <span className="font-sans font-black tracking-widest text-[13px] drop-shadow-sm">
                        Collect Profit ({simulatedHour === 16 ? '04:00 PM' : '09:00 PM'} Slot)
                      </span>
                      {/* Active green breathing beacon indicator */}
                      <span className="relative flex h-2.5 w-2.5 ml-1 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400"></span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="font-sans font-bold tracking-wider text-[11px] text-indigo-300">
                        Closed (04:00 PM - 05:00 PM & 09:00 PM - 10:00 PM)
                      </span>
                    </>
                  )}
                </button>
                {!isClaimWindowActive && (
                  <p className="text-center text-[10px] text-indigo-300 font-medium bg-[#060819] px-3 py-1.5 rounded-lg border border-indigo-500/20">
                    * Note: This settlement clock uses secure synchronized real-time. Please revisit when the clock reaches 04:00 PM or 09:00 PM in your localized slot.
                  </p>
                )}

              </div>

            </div>

            {/* Verified Claims History */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                ✅ Verified Claims History (Successful Payouts)
              </h4>
              
              <div className="w-full overflow-x-auto bg-[#0e112d] border border-emerald-500/30 rounded-[1.25rem] font-mono text-[10px] shadow-sm">
                <table className="w-full text-left border-collapse min-w-[400px] sm:min-w-full">
                  <thead>
                    <tr className="bg-[#060819] text-emerald-300 border-b border-emerald-500/20 uppercase text-[8px] font-bold text-center">
                      <th className="p-3 text-left">Date Grid</th>
                      <th className="p-3 text-left">Settlement ID</th>
                      <th className="p-3">Yield Amount</th>
                      <th className="p-3">Settlement Check</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10 text-center text-slate-300">
                    {successfulClaims.map((cl) => (
                      <tr key={cl.id} className="hover:bg-[#13163a]/40 border-b border-emerald-500/5">
                        <td className="p-3 text-left text-[9px] text-slate-400">{cl.date}</td>
                        <td className="p-3 text-left font-mono text-[9px] text-emerald-300 select-all">{cl.id}</td>
                        <td className="p-3 font-semibold text-white">${cl.amount.toFixed(2)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[8px] tracking-wide font-extrabold uppercase border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            {cl.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setActiveReceipt({ item: cl, type: 'claim' })}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-indigo-500 to-violet-600 border border-indigo-400 hover:border-indigo-300 text-white rounded text-[9px] font-bold uppercase cursor-pointer transition-all"
                          >
                            <FileText className="w-3 h-3 text-indigo-300" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {successfulClaims.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-5 text-center text-indigo-300 font-sans">
                          No settled payout claims recorded yet. Revisit during claims window slots!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expired / Missed Claims History */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono font-bold tracking-wider text-rose-400 uppercase flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                ⏳ Expired / Missed Claims History
              </h4>
              
              <div className="w-full overflow-x-auto bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] font-mono text-[10px] shadow-sm">
                <table className="w-full text-left border-collapse min-w-[400px] sm:min-w-full">
                  <thead>
                    <tr className="bg-[#060819] text-rose-300 border-b border-indigo-500/30 uppercase text-[8px] font-bold text-center">
                      <th className="p-3 text-left">Date Grid</th>
                      <th className="p-3 text-left">Settlement ID</th>
                      <th className="p-3">Yield Amount</th>
                      <th className="p-3">Settlement Check</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/10 text-center text-slate-300">
                    {missedClaims.map((cl) => (
                      <tr key={cl.id} className="hover:bg-[#13163a]/40 border-b border-indigo-500/10">
                        <td className="p-3 text-left text-[9px] text-slate-400">{cl.date}</td>
                        <td className="p-3 text-left font-mono text-[9px] text-indigo-300 select-all">{cl.id}</td>
                        <td className="p-3 font-semibold text-white">${cl.amount.toFixed(2)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[8px] tracking-wide font-extrabold uppercase border bg-rose-500/10 text-rose-400 border-rose-500/20">
                            {cl.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setActiveReceipt({ item: cl, type: 'claim' })}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-indigo-500 to-violet-600 border border-indigo-400 hover:border-indigo-300 text-white rounded text-[9px] font-bold uppercase cursor-pointer transition-all"
                          >
                            <FileText className="w-3 h-3 text-indigo-300" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {missedClaims.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-5 text-center text-indigo-300 font-sans">
                          No previous missed claims recorded for this cycle. All verified settlements running green.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 5: REFERRAL CENTER ==================== */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">

            {/* Referral Dashboard structure */}
            <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-5 space-y-4 shadow-xl text-white">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-indigo-500/20">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 border border-indigo-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-bold text-white">Dynamic 10% Referral Engine</h4>
                  <span className="text-[10px] text-indigo-200/90 font-mono">Commission loops for active investment groups</span>
                </div>
              </div>

              {/* Dual commission rules banner info */}
              <div className="bg-[#060819] p-3.5 rounded-xl border border-indigo-500/25 space-y-2 leading-relaxed text-xs text-indigo-200">
                <span className="font-bold text-white block uppercase font-mono tracking-wider text-[9px]">How the Flow triggers</span>
                <p>
                  - Share your referral link / code with fellow associates.
                </p>
                <p>
                  - Once they register and complete their first qualifying investment of at least <strong>$113 USDT</strong> (approx 1 share Emaar):
                </p>
                <div className="grid grid-cols-2 gap-2 text-center font-mono py-1">
                  <div className="p-2 bg-[#13163a]/40 border border-indigo-500/20 rounded-lg">
                    <span className="block text-[8px] text-indigo-300 font-bold uppercase">Referrer receives</span>
                    <span className="text-xs font-bold text-emerald-400">🎁 10% Cash Reward</span>
                  </div>
                  <div className="p-2 bg-[#13163a]/40 border border-indigo-500/20 rounded-lg">
                    <span className="block text-[8px] text-indigo-300 font-bold uppercase">New investor receives</span>
                    <span className="text-xs font-bold text-emerald-400">🎁 10% Cash Reward</span>
                  </div>
                </div>
                <p className="text-[9px] text-rose-450">
                  * Note: Registration only does not award anything. Bonuses trigger securely upon first investment verification.
                </p>
              </div>

              {/* My Credentials layout */}
              <div className="space-y-3 font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#060819] p-3 rounded-lg border border-indigo-500/20">
                    <span className="text-[8px] text-indigo-300 uppercase block font-bold">My Personal code</span>
                    <div className="flex items-center justify-between text-xs font-bold text-white pt-1">
                      <span className="text-emerald-400 font-bold select-all">{activeUser.referralCode}</span>
                      <button 
                        type="button"
                        onClick={() => triggerCopy(activeUser.referralCode, 'code')}
                        className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#060819] p-3 rounded-lg border border-indigo-500/20">
                    <span className="text-[8px] text-indigo-300 uppercase block font-bold font-mono">Referral Earnings</span>
                    <div className="text-xs font-bold text-emerald-400 pt-1 text-right">
                      ${referralEarningsSum.toFixed(2)} USDT
                    </div>
                  </div>
                </div>

                <div className="bg-[#060819] p-3 rounded-lg border border-indigo-500/20">
                  <span className="text-[8px] text-indigo-300 uppercase block font-bold">Automated Invitation Link</span>
                  <div className="flex items-center justify-between text-[11px] text-white pt-1">
                    <span className="truncate pr-2 select-all text-indigo-200">
                      {typeof window !== 'undefined' ? `${window.location.origin}/#/register?ref=${activeUser.referralCode}` : `https://fundora.one/#/register?ref=${activeUser.referralCode}`}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => {
                        const link = typeof window !== 'undefined' ? `${window.location.origin}/#/register?ref=${activeUser.referralCode}` : `https://fundora.one/#/register?ref=${activeUser.referralCode}`;
                        triggerCopy(link, 'link');
                      }}
                      className="px-2 py-1 bg-[#13163a] hover:bg-[#1b1f51] border border-indigo-500/30 text-[9px] rounded text-emerald-400 font-bold shrink-0 shadow-xs cursor-pointer transition-colors"
                    >
                      {copiedText === 'link' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Referrals ledger log */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-mono font-bold tracking-wider text-indigo-300 uppercase">👥 My Associates Referral log</h4>
                <span className="text-[8px] bg-[#060819] text-indigo-300 px-2 py-0.5 rounded font-bold sm:hidden">Swipe left to scroll ↔</span>
              </div>
              
              <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] shadow-sm overflow-hidden w-full">
                <div className="overflow-x-auto w-full block scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-transparent">
                  <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-full font-mono text-[10px]">
                    <thead>
                      <tr className="bg-[#060819] text-indigo-300 border-b border-indigo-500/30 uppercase text-[8px] font-bold text-center">
                        <th className="p-3 text-left">Associates Email Address</th>
                        <th className="p-3 text-center">Bonus Paid</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/10 text-center text-slate-350">
                      {userReferrals.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-indigo-300 font-sans">
                            No partners or associates referred yet. Share your link above to build your team!
                          </td>
                        </tr>
                      ) : (
                        userReferrals.map((referredUser) => {
                          // Try to find the referral bonus transaction in the user's transactions list
                          const bonusTx = transactions.find(t => t.type === 'Referral Bonus' && t.description?.toLowerCase().includes(referredUser.email.toLowerCase()));
                          const bonusPaid = bonusTx ? bonusTx.amount : 0;
                          const hasInvested = referredUser.totalInvestment > 0 || (bonusTx && bonusTx.status === 'Completed');
                          
                          return (
                            <tr key={referredUser.id} className="hover:bg-[#13163a]/40 border-b border-indigo-500/10">
                              <td className="p-3 text-left font-sans text-white whitespace-nowrap">{referredUser.email}</td>
                              <td className="p-3 font-semibold text-emerald-400 whitespace-nowrap">${bonusPaid.toFixed(2)} USDT</td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[8px] tracking-wide font-extrabold uppercase inline-block border ${hasInvested ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20 animate-pulse'}`}>
                                  {hasInvested ? 'Active Profit' : 'Pending Purchase'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 6: MY PROFILE & SECURITY ==================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6">

            {/* Profile Intro */}
            <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-5 shadow-xl text-white space-y-4">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-indigo-500/20">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 border border-indigo-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-bold text-white">My Profile & Account Security</h4>
                  <span className="text-[10px] text-indigo-200/90 font-mono">Manage your personal details, secure your account credentials, and complete identity verification (KYC).</span>
                </div>
              </div>

              {/* Grid Layout: Profile Details + Avatar selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Profile Details */}
                <div className="space-y-4">
                  <span className="font-bold text-indigo-300 block uppercase font-mono tracking-wider text-[9px]">Personal Account Details</span>
                  
                  {profileStatus && (
                    <div className={`p-3 rounded-lg text-xs ${profileStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {profileStatus.message}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Display Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3.5 py-2 border border-indigo-500/30 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none text-white bg-[#060819] animate-fadeIn"
                        placeholder="Enter full name"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Email Address (Read-only)</label>
                      <input
                        type="email"
                        value={activeUser.email}
                        disabled
                        className="w-full px-3.5 py-2 border border-indigo-500/10 rounded-xl text-xs font-semibold text-indigo-300/60 bg-[#060819] cursor-not-allowed"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                      <div className="bg-[#060819] border border-indigo-500/20 p-2.5 rounded-xl">
                        <span className="text-indigo-300 block mb-0.5">Registration Date</span>
                        <span className="font-bold text-white">{activeUser.registrationDate}</span>
                      </div>
                      <div className="bg-[#060819] border border-indigo-500/20 p-2.5 rounded-xl">
                        <span className="text-indigo-300 block mb-0.5">Account Status</span>
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Active State
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!profileName.trim()) {
                          setProfileStatus({ message: 'Display Name cannot be empty.', type: 'error' });
                          return;
                        }
                        onUpdateUser({ name: profileName, avatarUrl: profileAvatar });
                        setProfileStatus({ message: 'Profile details saved successfully.', type: 'success' });
                        setTimeout(() => setProfileStatus(null), 3000);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
                    >
                      Save Account Details
                    </button>
                  </div>
                </div>

                {/* Dynamic Automatic Shield & Rank Status Hub */}
                <div className="space-y-4">
                  <span className="font-bold text-indigo-300 block uppercase font-mono tracking-wider text-[9px]">Dynamic Investor Shield & Rank Status</span>
                  
                  {/* Current Active Rank Badge Card */}
                  <div className={`p-5 rounded-2xl border bg-[#060819] text-white relative overflow-hidden shadow-lg ${userTier.borderColor}`}>
                    {/* Abstract background light effect */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="flex items-start gap-4">
                      {/* Giant Dynamic Avatar with Badge Icon Overlay */}
                      <div className="relative shrink-0">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black uppercase shadow-inner ${getAvatarBgClass(userTier.id)}`}>
                          {activeUser.email.slice(0, 2)}
                        </div>
                        {/* Huge Shield Badge */}
                        <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-full bg-[#060819] border-2 border-indigo-950 shadow-md ${userTier.color}`}>
                          {userTier.id === 'tier-5' ? (
                            <Crown className="w-5 h-5 animate-bounce" />
                          ) : userTier.id === 'tier-4' ? (
                            <ShieldCheck className="w-5 h-5" />
                          ) : userTier.id === 'tier-3' ? (
                            <Sparkles className="w-5 h-5" />
                          ) : userTier.id === 'tier-2' ? (
                            <Award className="w-5 h-5" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-indigo-300 block">Current Associate Rank</span>
                        <h4 className={`text-base font-bold font-sans tracking-tight ${userTier.color}`}>
                          {userTier.name}
                        </h4>
                      </div>
                    </div>

                    {/* Stats display inside card */}
                    <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-indigo-500/10 font-mono text-[9px]">
                      <div className="bg-[#13163a]/40 p-2 rounded-xl border border-indigo-500/15">
                        <span className="text-indigo-300 block mb-0.5">Total Investments</span>
                        <span className="font-bold text-xs font-mono text-emerald-400">${calculatedTotalInvest.toFixed(2)} USDT</span>
                      </div>
                      <div className="bg-[#13163a]/40 p-2 rounded-xl border border-indigo-500/15">
                        <span className="text-indigo-300 block mb-0.5">Verified Associates</span>
                        <span className="font-bold text-xs font-mono text-sky-400">{totalReferralsCount} Partners</span>
                      </div>
                    </div>
                  </div>

                  {/* Next Rank progress tracking */}
                  {userTier.nextTier ? (
                    <div className="bg-[#060819] border border-indigo-500/30 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-indigo-300 font-bold uppercase">Progress to {userTier.nextTier.name}</span>
                        <span className="text-emerald-400 font-extrabold font-mono">
                          {Math.min(100, Math.round(((calculatedTotalInvest / userTier.nextTier.reqInvest) * 50) + ((totalReferralsCount / userTier.nextTier.reqRefs) * 50)))}%
                        </span>
                      </div>
                      
                      {/* Custom Dual Progress Bar */}
                      <div className="space-y-2">
                        {/* Investment criteria */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-indigo-200 font-mono">
                            <span>Investments: ${calculatedTotalInvest.toFixed(0)} / ${userTier.nextTier.reqInvest}</span>
                            <span>{calculatedTotalInvest >= userTier.nextTier.reqInvest ? '🟢 Completed' : '⏳ Pending'}</span>
                          </div>
                          <div className="w-full bg-[#13163a] h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (calculatedTotalInvest / userTier.nextTier.reqInvest) * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Referral criteria */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-indigo-200 font-mono">
                            <span>Referrals: {totalReferralsCount} / {userTier.nextTier.reqRefs}</span>
                            <span>{totalReferralsCount >= userTier.nextTier.reqRefs ? '🟢 Completed' : '⏳ Pending'}</span>
                          </div>
                          <div className="w-full bg-[#13163a] h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-sky-400 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (totalReferralsCount / userTier.nextTier.reqRefs) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex gap-2.5 items-start">
                      <Crown className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-amber-300 uppercase block">Pinnacle Status Reached</span>
                        <p className="text-[9px] text-amber-200 leading-normal font-medium">
                          You are currently a Crown Ambassador. You have unlocked all priority nodes, prestige referral rewards, and high-yield offshore allocations!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Active Rank Privileges */}
                  <div className="bg-[#060819] border border-indigo-500/30 rounded-2xl p-4 space-y-2.5">
                    <span className="font-bold text-indigo-300 block uppercase font-mono tracking-wider text-[8px]">Active Tier Privileges ({userTier.name})</span>
                    <ul className="space-y-1.5">
                      {userTier.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[10px] text-indigo-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            </div>

            {/* KYC Identity Verification Module */}
            <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-5 shadow-xl text-white space-y-4">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-indigo-500/20">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 border border-indigo-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-bold text-white">Identity Verification (KYC Hub)</h4>
                  <span className="text-[10px] text-indigo-200/90 font-mono">KYC compliance is mandated by real estate authorities to prevent anti-money laundering (AML).</span>
                </div>
              </div>

              {/* Status display */}
              {activeUser.kycStatus === 'Verified' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-extrabold tracking-widest text-emerald-400 uppercase">Cryptographic Consent Active</span>
                    <h4 className="font-sans font-black text-white text-base">Congratulations! Your Identity is Fully Verified</h4>
                  </div>
                  <p className="text-xs text-indigo-200 max-w-md mx-auto leading-relaxed">
                    Level 1 identity auditing is complete. Limits have been completely unlocked on all property purchases, withdrawals, and referral payouts.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-xl mx-auto font-mono text-[10px] text-left">
                    <div className="p-2.5 bg-[#060819] border border-indigo-500/25 rounded-xl">
                      <span className="text-indigo-350 block">Verified Name</span>
                      <span className="font-bold text-white truncate block">{activeUser.kycFullName || activeUser.name}</span>
                    </div>
                    <div className="p-2.5 bg-[#060819] border border-indigo-500/25 rounded-xl">
                      <span className="text-indigo-350 block">Verified Country</span>
                      <span className="font-bold text-white truncate block">{activeUser.kycCountry || 'International'}</span>
                    </div>
                    <div className="p-2.5 bg-[#060819] border border-indigo-500/25 rounded-xl">
                      <span className="text-indigo-350 block">Document Type</span>
                      <span className="font-bold text-white truncate block">{activeUser.kycDocumentType || 'Passport'}</span>
                    </div>
                  </div>
                </div>
              ) : activeUser.kycStatus === 'Under Review' ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
                    <Clock className="w-7 h-7 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-extrabold tracking-widest text-amber-400 uppercase">Documents Under Review</span>
                    <h4 className="font-sans font-black text-white text-base">KYC Identity Audit Pending</h4>
                  </div>
                  <p className="text-xs text-indigo-200 max-w-md mx-auto leading-relaxed">
                    Our compliance specialists are verifying your uploaded identity papers. Audits are processed daily within 1-2 hours. No action is required.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-xl mx-auto font-mono text-[10px] text-left">
                    <div className="p-2.5 bg-[#060819] border border-indigo-500/25 rounded-xl">
                      <span className="text-indigo-350 block">Submitted Name</span>
                      <span className="font-bold text-white truncate block">{activeUser.kycFullName}</span>
                    </div>
                    <div className="p-2.5 bg-[#060819] border border-indigo-500/25 rounded-xl">
                      <span className="text-indigo-350 block">Country Node</span>
                      <span className="font-bold text-white truncate block">{activeUser.kycCountry}</span>
                    </div>
                    <div className="p-2.5 bg-[#060819] border border-indigo-500/25 rounded-xl">
                      <span className="text-indigo-350 block">Audited Document</span>
                      <span className="font-bold text-white truncate block">{activeUser.kycDocumentType}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 pt-1">
                  
                  {activeUser.kycStatus === 'Rejected' ? (
                    <div className="p-4 bg-rose-500/15 border border-rose-500/40 text-rose-300 rounded-2xl text-xs space-y-1.5 shadow-lg">
                      <div className="font-bold flex items-center gap-2 text-rose-400 text-sm">
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        <span>KYC Verification Rejected / Action Required</span>
                      </div>
                      <p className="text-rose-200/95 leading-relaxed text-[11px]">
                        Your previous KYC identity papers were declined by compliance auditors. The pending lock has been removed so you can resubmit. Please review your legal full name, country, and attach a clear scanned identity document below to submit again.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Action Required: KYC Papers Missing</span>
                      </div>
                      <p className="text-amber-200 leading-normal text-[11px]">
                        Your account identity verification is currently unverified. Please submit your identity papers to unlock full withdraw access and premium high-yield Canary Wharf shares.
                      </p>
                    </div>
                  )}

                  {kycStatus && (
                    <div className={`p-3 rounded-xl text-xs ${kycStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {kycStatus.message}
                    </div>
                  )}

                  <div className="space-y-5">
                    
                    {/* Information form fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                          Legal Full Name <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        <input
                          type="text"
                          value={kycFullNameInput}
                          onChange={(e) => setKycFullNameInput(e.target.value)}
                          className="w-full px-3.5 py-2 border border-indigo-500/30 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none text-white bg-[#060819]"
                          placeholder="As printed on passport / ID card"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                          Country of Residence <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        <select
                          value={kycCountryInput}
                          onChange={(e) => setKycCountryInput(e.target.value)}
                          className="w-full px-3.5 py-2 border border-indigo-500/30 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none text-white bg-[#060819]"
                        >
                          <option value="" className="bg-[#0e112d]">Select Country</option>
                          <option value="Australia" className="bg-[#0e112d]">Australia</option>
                          <option value="Bahrain" className="bg-[#0e112d]">Bahrain</option>
                          <option value="Brazil" className="bg-[#0e112d]">Brazil</option>
                          <option value="Canada" className="bg-[#0e112d]">Canada</option>
                          <option value="Denmark" className="bg-[#0e112d]">Denmark</option>
                          <option value="France" className="bg-[#0e112d]">France</option>
                          <option value="Germany" className="bg-[#0e112d]">Germany</option>
                          <option value="Hong Kong" className="bg-[#0e112d]">Hong Kong</option>
                          <option value="India" className="bg-[#0e112d]">India</option>
                          <option value="Ireland" className="bg-[#0e112d]">Ireland</option>
                          <option value="Italy" className="bg-[#0e112d]">Italy</option>
                          <option value="Japan" className="bg-[#0e112d]">Japan</option>
                          <option value="Kuwait" className="bg-[#0e112d]">Kuwait</option>
                          <option value="Malaysia" className="bg-[#0e112d]">Malaysia</option>
                          <option value="Netherlands" className="bg-[#0e112d]">Netherlands</option>
                          <option value="New Zealand" className="bg-[#0e112d]">New Zealand</option>
                          <option value="Norway" className="bg-[#0e112d]">Norway</option>
                          <option value="Oman" className="bg-[#0e112d]">Oman</option>
                          <option value="Pakistan" className="bg-[#0e112d]">Pakistan</option>
                          <option value="Qatar" className="bg-[#0e112d]">Qatar</option>
                          <option value="Saudi Arabia" className="bg-[#0e112d]">Saudi Arabia</option>
                          <option value="Singapore" className="bg-[#0e112d]">Singapore</option>
                          <option value="South Africa" className="bg-[#0e112d]">South Africa</option>
                          <option value="Spain" className="bg-[#0e112d]">Spain</option>
                          <option value="Sweden" className="bg-[#0e112d]">Sweden</option>
                          <option value="Switzerland" className="bg-[#0e112d]">Switzerland</option>
                          <option value="Turkey" className="bg-[#0e112d]">Turkey</option>
                          <option value="United Arab Emirates" className="bg-[#0e112d]">United Arab Emirates</option>
                          <option value="United Kingdom" className="bg-[#0e112d]">United Kingdom</option>
                          <option value="United States" className="bg-[#0e112d]">United States</option>
                          <option value="Other" className="bg-[#0e112d]">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                          Document Type <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        <select
                          value={kycDocType}
                          onChange={(e) => setKycDocType(e.target.value)}
                          className="w-full px-3.5 py-2 border border-indigo-500/30 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none text-white bg-[#060819]"
                        >
                          <option value="Passport" className="bg-[#0e112d]">Passport</option>
                          <option value="Identity Card" className="bg-[#0e112d]">Identity Card</option>
                          <option value="Driving License" className="bg-[#0e112d]">Driving License</option>
                        </select>
                      </div>
                    </div>

                    {/* File Upload Area */}
                    {(kycDocType === 'Identity Card' || kycDocType === 'National ID Card') ? (
                      /* Dual Upload for Identity Card (Front & Back) */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Front Side Upload */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                            Front Side Image <span className="text-rose-500 font-bold ml-0.5">*</span>
                          </label>
                          <input 
                            type="file" 
                            id="kyc-file-input-front"
                            ref={kycFileInputRef}
                            className="sr-only"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleKycFileSelect(e.target.files[0], false);
                              }
                              e.target.value = '';
                            }}
                          />
                          <div
                            onClick={() => kycFileInputRef.current?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsKycDragging(true);
                            }}
                            onDragLeave={() => setIsKycDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsKycDragging(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleKycFileSelect(e.dataTransfer.files[0], false);
                              }
                            }}
                            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 select-none min-h-[130px] ${
                              isKycDragging 
                                ? 'border-indigo-400 bg-indigo-500/10' 
                                : kycFileName 
                                  ? 'border-emerald-500/40 bg-emerald-500/5' 
                                  : 'border-indigo-500/20 bg-[#060819] hover:bg-[#13163a]'
                            }`}
                          >
                            {kycFileName ? (
                              <>
                                {kycFilePreview && kycFilePreview.startsWith('data:image/') ? (
                                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#13163a] shadow-sm mb-0.5">
                                    <img src={kycFilePreview} alt="Front Preview" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-0.5">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                  </div>
                                )}
                                <div className="space-y-0.5">
                                  <span className="block text-xs font-black text-white">Front Side Uploaded</span>
                                  <span className="block text-[10px] font-mono text-emerald-400 max-w-xs truncate">{kycFileName}</span>
                                  {kycFileSize && (
                                    <span className="block text-[9px] text-indigo-300 font-mono">{kycFileSize}</span>
                                  )}
                                </div>
                                <span className="text-[8px] text-indigo-300 font-mono">Click to change front image</span>
                              </>
                            ) : (
                              <>
                                <div className="w-9 h-9 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-300">
                                  <Upload className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <span className="block text-xs font-black text-white">Front Side Image</span>
                                  <p className="text-[10px] text-indigo-300 leading-normal">
                                    <strong className="text-indigo-400">Click or Drag</strong> Front image here
                                  </p>
                                </div>
                                <span className="text-[8px] text-indigo-350 font-mono">PNG, JPG up to 10MB</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Back Side Upload */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                            Back Side Image <span className="text-rose-500 font-bold ml-0.5">*</span>
                          </label>
                          <input 
                            type="file" 
                            id="kyc-file-input-back"
                            ref={kycFileInputRefBack}
                            className="sr-only"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleKycFileSelect(e.target.files[0], true);
                              }
                              e.target.value = '';
                            }}
                          />
                          <div
                            onClick={() => kycFileInputRefBack.current?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsKycDraggingBack(true);
                            }}
                            onDragLeave={() => setIsKycDraggingBack(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsKycDraggingBack(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleKycFileSelect(e.dataTransfer.files[0], true);
                              }
                            }}
                            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 select-none min-h-[130px] ${
                              isKycDraggingBack 
                                ? 'border-indigo-400 bg-indigo-500/10' 
                                : kycFileNameBack 
                                  ? 'border-emerald-500/40 bg-emerald-500/5' 
                                  : 'border-indigo-500/20 bg-[#060819] hover:bg-[#13163a]'
                            }`}
                          >
                            {kycFileNameBack ? (
                              <>
                                {kycFilePreviewBack && kycFilePreviewBack.startsWith('data:image/') ? (
                                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#13163a] shadow-sm mb-0.5">
                                    <img src={kycFilePreviewBack} alt="Back Preview" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-0.5">
                                    <FileText className="w-4 h-4 text-emerald-400" />
                                  </div>
                                )}
                                <div className="space-y-0.5">
                                  <span className="block text-xs font-black text-white">Back Side Uploaded</span>
                                  <span className="block text-[10px] font-mono text-emerald-400 max-w-xs truncate">{kycFileNameBack}</span>
                                  {kycFileSizeBack && (
                                    <span className="block text-[9px] text-indigo-300 font-mono">{kycFileSizeBack}</span>
                                  )}
                                </div>
                                <span className="text-[8px] text-indigo-300 font-mono">Click to change back image</span>
                              </>
                            ) : (
                              <>
                                <div className="w-9 h-9 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-300">
                                  <Upload className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <span className="block text-xs font-black text-white">Back Side Image</span>
                                  <p className="text-[10px] text-indigo-300 leading-normal">
                                    <strong className="text-indigo-400">Click or Drag</strong> Back image here
                                  </p>
                                </div>
                                <span className="text-[8px] text-indigo-350 font-mono">PNG, JPG up to 10MB</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Single Upload for Passport or Driving License */
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                          Upload Scanned Document Copy <span className="text-rose-500 font-bold ml-0.5">*</span>
                        </label>
                        <input 
                          type="file" 
                          id="kyc-file-input"
                          ref={kycFileInputRef}
                          className="sr-only"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleKycFileSelect(e.target.files[0], false);
                            }
                            e.target.value = '';
                          }}
                        />
                        <div
                          onClick={() => kycFileInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsKycDragging(true);
                          }}
                          onDragLeave={() => setIsKycDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsKycDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleKycFileSelect(e.dataTransfer.files[0], false);
                            }
                          }}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 select-none min-h-[140px] block ${
                            isKycDragging 
                              ? 'border-indigo-400 bg-indigo-500/10' 
                              : kycFileName 
                                ? 'border-emerald-500/40 bg-emerald-500/5' 
                                : 'border-indigo-500/20 bg-[#060819] hover:bg-[#13163a]'
                          }`}
                        >
                          {kycFileName ? (
                            <>
                              {kycFilePreview && kycFilePreview.startsWith('data:image/') ? (
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#13163a] shadow-sm mb-1">
                                  <img src={kycFilePreview} alt="Doc Preview" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-1">
                                  <FileText className="w-5 h-5 text-emerald-400" />
                                </div>
                              )}
                              <div className="space-y-0.5">
                                <span className="block text-xs font-black text-white">Document Attached Successfully</span>
                                <span className="block text-[10px] font-mono text-emerald-400 max-w-xs truncate">{kycFileName}</span>
                                {kycFileSize && (
                                  <span className="block text-[9px] text-indigo-300 font-mono">Size: {kycFileSize}</span>
                                )}
                              </div>
                              <span className="text-[9px] text-indigo-300 font-mono">Click again to replace file</span>
                            </>
                          ) : (
                            <>
                              <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-300">
                                <Upload className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="block text-xs font-black text-white">Drag & Drop Scanned Document here</span>
                                <p className="text-[10px] text-indigo-300 leading-normal font-sans max-w-xs mx-auto">
                                  or <strong className="text-indigo-400">Click here to select document</strong> from file directory
                                </p>
                              </div>
                              <span className="text-[8px] text-indigo-350 font-mono">Supports PNG, JPG, PDF up to 10MB</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                  <button
                    onClick={() => {
                      if (!kycFullNameInput.trim() || !kycCountryInput.trim()) {
                        setKycStatus({ message: 'Please enter your Legal Full Name and Country of Residence.', type: 'error' });
                        return;
                      }
                      const isIdCard = kycDocType === 'Identity Card' || kycDocType === 'National ID Card';
                      if (isIdCard) {
                        if (!kycFileName || !kycFileNameBack) {
                          setKycStatus({ message: 'Please upload both Front and Back images of your Identity Card to submit KYC.', type: 'error' });
                          return;
                        }
                      } else {
                        if (!kycFileName) {
                          setKycStatus({ message: 'Please upload your scanned document copy to submit KYC.', type: 'error' });
                          return;
                        }
                      }
                      onUpdateUser({
                        kycStatus: 'Under Review',
                        kycFullName: kycFullNameInput,
                        kycCountry: kycCountryInput,
                        kycDocumentType: kycDocType,
                        kycDocumentUrl: kycFilePreview || undefined,
                        kycDocumentFileName: kycFileName || undefined,
                        kycDocumentUrlBack: isIdCard ? (kycFilePreviewBack || undefined) : undefined,
                        kycDocumentFileNameBack: isIdCard ? (kycFileNameBack || undefined) : undefined,
                      });
                      try {
                        sendKycEmail(activeUser.email, activeUser.name, 'Under Review').catch(e => console.warn('KYC email error:', e));
                      } catch (_) {}
                      setKycStatus({ message: 'Success! Your identity documents have been submitted and are under review.', type: 'success' });
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Submit KYC Auditing Papers
                  </button>

                </div>
              )}

            </div>

            {/* Change Password Card */}
            <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-5 shadow-xl text-white space-y-4">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-indigo-500/20">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 border border-indigo-500/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-bold text-white">Change Security Password</h4>
                  <span className="text-[10px] text-indigo-200/90 font-mono">Ensure your investment vault remains protected by a cryptographic private key password.</span>
                </div>
              </div>

              {passwordStatus && (
                <div className={`p-3 rounded-xl text-xs ${passwordStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {passwordStatus.message}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2 border border-indigo-500/30 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none text-white bg-[#060819]"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2 p-0.5 text-indigo-400 hover:text-white focus:outline-none cursor-pointer transition-colors"
                      title={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">New Security Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2 border border-indigo-500/30 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none text-white bg-[#060819]"
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2 p-0.5 text-indigo-400 hover:text-white focus:outline-none cursor-pointer transition-colors"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2 border border-indigo-500/30 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none text-white bg-[#060819]"
                      placeholder="Re-type new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2 p-0.5 text-indigo-400 hover:text-white focus:outline-none cursor-pointer transition-colors"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    if (!currentPasswordInput) {
                      setPasswordStatus({ message: 'Please specify your current valid password.', type: 'error' });
                      return;
                    }
                    if (newPasswordInput.length < 6) {
                      setPasswordStatus({ message: 'New security password must be at least 6 characters long.', type: 'error' });
                      return;
                    }
                    if (newPasswordInput !== confirmPasswordInput) {
                      setPasswordStatus({ message: 'New passwords do not match. Please verify your typing.', type: 'error' });
                      return;
                    }
                    onUpdateUser({ password: newPasswordInput });
                    setPasswordStatus({ message: 'Security password changed successfully! Your account remains securely logged in.', type: 'success' });
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                    setTimeout(() => setPasswordStatus(null), 4000);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
                >
                  Confirm Password Update
                </button>
              </div>

            </div>

            {/* Push Notifications & Device Alerts Module */}
            <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-5 shadow-xl text-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 border border-indigo-500/20">
                    <Bell className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-sans font-bold text-white flex items-center gap-2">
                      Push Notifications & Device Alerts
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                        System Bar
                      </span>
                    </h4>
                    <span className="text-[10px] text-indigo-200/90 font-mono">
                      Receive instant device alerts for deposits, withdrawals, KYC verifications, and rental yields.
                    </span>
                  </div>
                </div>

                {/* Master Toggle */}
                <div className="flex items-center gap-2 bg-[#060819] px-3.5 py-1.5 rounded-xl border border-indigo-500/30">
                  <span className="text-xs font-bold text-indigo-200 font-sans">
                    {notifPrefs.masterEnabled ? 'Notifications On' : 'Notifications Off'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleNotifPref('masterEnabled')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      notifPrefs.masterEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifPrefs.masterEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {notifStatusMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  notifStatusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  notifStatusMsg.type === 'info' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{notifStatusMsg.message}</span>
                </div>
              )}

              {/* Permission status alert */}
              {getNotificationPermission() === 'granted' ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span className="font-medium">Device & ServiceWorker status bar notifications are ENABLED.</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const dispatched = await triggerTestNotification();
                      if (dispatched) {
                        setNotifStatusMsg({ message: '🔔 Test alert sent! Pull down your phone top status bar tray to see it.', type: 'success' });
                      } else {
                        setNotifStatusMsg({ message: 'Notification sent. If not visible in top bar, check Phone Settings > Notifications for browser.', type: 'info' });
                      }
                      setTimeout(() => setNotifStatusMsg(null), 6000);
                    }}
                    className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer"
                  >
                    Test Status Bar
                  </button>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <div>
                      <span className="font-bold block">Mobile Notification Permission Required</span>
                      <span className="text-[10px] text-amber-200/90 font-mono block">
                        Tap "ENABLE PERMISSION" below to allow device status bar alerts. If blocked, tap browser 🔒 lock icon &gt; Site Settings &gt; Allow Notifications.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const granted = await requestNotificationPermission();
                      if (granted) {
                        setNotifStatusMsg({ message: 'Device notification permission granted! Sending test status bar alert...', type: 'success' });
                        await triggerTestNotification();
                      } else {
                        setNotifStatusMsg({ 
                          message: 'Permission not granted yet. Please tap "Allow" in browser prompt, or check Android Phone Settings > App Notifications.', 
                          type: 'error' 
                        });
                      }
                      setTimeout(() => setNotifStatusMsg(null), 6000);
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-md"
                  >
                    Enable Permission
                  </button>
                </div>
              )}

              {/* Notification Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                
                {/* 1. Deposit Updates */}
                <div className="p-3.5 bg-[#060819] border border-indigo-500/25 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <ArrowDownCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Deposit Alerts</span>
                      <span className="text-[9px] text-indigo-300 font-mono">Approved, Pending & Declined deposits</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!notifPrefs.masterEnabled}
                    onClick={() => handleToggleNotifPref('depositAlerts')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      notifPrefs.depositAlerts && notifPrefs.masterEnabled ? 'bg-emerald-500' : 'bg-slate-700 opacity-50'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        notifPrefs.depositAlerts && notifPrefs.masterEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Withdrawal Updates */}
                <div className="p-3.5 bg-[#060819] border border-indigo-500/25 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400">
                      <ArrowUpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Withdrawal Alerts</span>
                      <span className="text-[9px] text-indigo-300 font-mono">Payout processing & completed status</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!notifPrefs.masterEnabled}
                    onClick={() => handleToggleNotifPref('withdrawalAlerts')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      notifPrefs.withdrawalAlerts && notifPrefs.masterEnabled ? 'bg-emerald-500' : 'bg-slate-700 opacity-50'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        notifPrefs.withdrawalAlerts && notifPrefs.masterEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. KYC Verification Updates */}
                <div className="p-3.5 bg-[#060819] border border-indigo-500/25 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">KYC Verification Alerts</span>
                      <span className="text-[9px] text-indigo-300 font-mono">Identity audit approved or resubmit status</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!notifPrefs.masterEnabled}
                    onClick={() => handleToggleNotifPref('kycAlerts')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      notifPrefs.kycAlerts && notifPrefs.masterEnabled ? 'bg-emerald-500' : 'bg-slate-700 opacity-50'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        notifPrefs.kycAlerts && notifPrefs.masterEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Rental Yield Claims */}
                <div className="p-3.5 bg-[#060819] border border-indigo-500/25 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Rental Yield Claims</span>
                      <span className="text-[9px] text-indigo-300 font-mono">Daily dividend earnings claimed</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!notifPrefs.masterEnabled}
                    onClick={() => handleToggleNotifPref('yieldAlerts')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      notifPrefs.yieldAlerts && notifPrefs.masterEnabled ? 'bg-emerald-500' : 'bg-slate-700 opacity-50'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        notifPrefs.yieldAlerts && notifPrefs.masterEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

              </div>

              {/* Action Buttons: Test Notification */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-500/20">
                <span className="text-[10px] text-indigo-300 font-mono">
                  Changes save automatically to device local preferences.
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await triggerTestNotification();
                    if (ok) {
                      setNotifStatusMsg({ message: 'Test notification sent to device status bar!', type: 'success' });
                    } else {
                      setNotifStatusMsg({ message: 'Unable to send test notification. Check browser permission.', type: 'error' });
                    }
                    setTimeout(() => setNotifStatusMsg(null), 4000);
                  }}
                  className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Send Test Alert</span>
                </button>
              </div>

            </div>

            {/* Quick Access & Biometric Authentication (WebAuthn) Module */}
            {(() => {
              const isLocalBiometricEnabled = (() => {
                if (!activeUser || !activeUser.webAuthnEnabled) return false;
                try {
                  const existing = localStorage.getItem('inv_local_biometric_emails');
                  const emails = existing ? JSON.parse(existing) : [];
                  const cleanEmail = activeUser.email.toLowerCase().trim();
                  return emails.includes(cleanEmail) &&
                         localStorage.getItem(`inv_device_biometric_active_${cleanEmail}`) === 'true';
                } catch (e) {
                  return false;
                }
              })();

              return (
                <div className="bg-[#0e112d] border border-indigo-500/40 rounded-[1.25rem] p-5 shadow-xl text-white space-y-4">
                  <div className="flex items-center space-x-2.5 pb-2 border-b border-indigo-500/20">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 border border-indigo-500/20">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-sans font-bold text-white">Quick Access (Biometric Login)</h4>
                      <span className="text-[10px] text-indigo-200/90 font-mono">Use your device's secure fingerprint sensor or Face ID to quickly authenticate without typing passwords.</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#060819] border border-indigo-500/20 rounded-2xl gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        Biometric Authentication (WebAuthn API)
                        {isLocalBiometricEnabled ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8.5px] uppercase font-mono tracking-wider font-extrabold">Enabled</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[8.5px] uppercase font-mono tracking-wider font-extrabold">Disabled</span>
                        )}
                      </span>
                      <p className="text-[11px] text-indigo-300 leading-normal max-w-md">
                        Store a cryptographic public key in your device's Secure Enclave. Biometric operations are fully client-side and secure.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <span className="text-[10px] text-indigo-300 font-mono font-bold hidden sm:inline">
                        {isLocalBiometricEnabled ? 'Turn Off' : 'Turn On'}
                      </span>
                      <button
                        onClick={() => {
                          if (isLocalBiometricEnabled) {
                            handleDisableBiometrics();
                          } else {
                            handleRegisterBiometrics();
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                          isLocalBiometricEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isLocalBiometricEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {isLocalBiometricEnabled && (
                    <div className="p-3 bg-[#060819] border border-indigo-500/15 rounded-xl space-y-1 text-[10px] font-mono">
                      <div className="flex justify-between text-indigo-300">
                        <span>Credential Identifier:</span>
                        <span className="text-white font-bold truncate max-w-[200px]">{activeUser.webAuthnCredentialId}</span>
                      </div>
                      <div className="flex justify-between text-indigo-300">
                        <span>Biometric Public Key:</span>
                        <span className="text-white font-bold truncate max-w-[200px]">{activeUser.webAuthnPublicKey}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        )}

      {/* Biometric Register Simulation Modal */}
      {showBiometricRegisterModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-[#0c0e1e] via-[#111434] to-[#060813] text-white border border-indigo-500/30 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative overflow-hidden text-center">
            {/* Design accents */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {biometricRegisterStep === 'intro' && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-indigo-500/15 border border-indigo-500/30 rounded-full flex items-center justify-center text-indigo-400 shadow-inner">
                  <Fingerprint className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-sans font-black text-white">Enable Device Quick Access</h4>
                  <p className="text-xs text-indigo-200 leading-normal">
                    This will link this device's biometric authentication (Face ID, Touch ID, or passcode) to your Fundora Account securely.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowBiometricRegisterModal(false)}
                    className="flex-1 py-2 px-4 border border-indigo-500/25 hover:bg-indigo-500/10 rounded-xl text-xs font-bold text-indigo-300 uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startBiometricScan}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:brightness-110 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all"
                  >
                    Begin Setup
                  </button>
                </div>
              </div>
            )}

            {biometricRegisterStep === 'scanning' && (
              <div className="space-y-4 py-2">
                <div className="text-center space-y-1">
                  <h4 className="text-xs font-sans font-black text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Biometric Sandbox Recorder
                  </h4>
                  <p className="text-[10px] text-indigo-200/90 px-1 leading-normal">
                    Please <strong className="text-emerald-400">press & hold</strong> the fingerprint scanner below to record your device biometric footprint.
                  </p>
                </div>

                <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                  {/* Circular progress SVG ring */}
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      className="text-indigo-950/40"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="transparent"
                      r="42"
                      cx="50"
                      cy="50"
                    />
                    <circle
                      className={`transition-colors duration-150 ${isFingerPressedRegister ? 'text-emerald-400' : 'text-indigo-400'}`}
                      strokeWidth="3.5"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - biometricProgress / 100)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="42"
                      cx="50"
                      cy="50"
                    />
                  </svg>

                  {/* Fingerprint interaction trigger button */}
                  <button
                    type="button"
                    onMouseDown={() => {
                      setIsFingerPressedRegister(true);
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
                    }}
                    onMouseUp={() => setIsFingerPressedRegister(false)}
                    onMouseLeave={() => setIsFingerPressedRegister(false)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setIsFingerPressedRegister(true);
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setIsFingerPressedRegister(false);
                    }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg outline-none select-none ${
                      isFingerPressedRegister 
                        ? 'bg-emerald-500/25 border border-emerald-400 scale-95 shadow-emerald-400/20 text-emerald-400' 
                        : 'bg-indigo-950/50 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-950/70 scale-100 shadow-indigo-500/10 text-indigo-300'
                    }`}
                  >
                    <Fingerprint className={`w-10 h-10 ${isFingerPressedRegister ? 'animate-pulse' : ''}`} />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-mono font-bold">
                    {isFingerPressedRegister ? (
                      <span className="text-emerald-400 animate-pulse">RECORDING BIOMETRICS: {biometricProgress}%</span>
                    ) : (
                      <span className="text-indigo-300">TOUCH & HOLD SENSOR</span>
                    )}
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1 border border-indigo-500/10 overflow-hidden animate-none">
                    <div 
                      className={`h-full transition-all duration-100 ${isFingerPressedRegister ? 'bg-emerald-400' : 'bg-indigo-400'}`} 
                      style={{ width: `${biometricProgress}%` }}
                    ></div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBiometricRegisterModal(false)}
                  className="w-full py-2 border border-indigo-500/25 hover:bg-indigo-500/10 rounded-xl text-xs font-bold text-indigo-300 uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
              </div>
            )}

            {biometricRegisterStep === 'complete' && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-sans font-black text-white">Device Successfully Paired</h4>
                  <p className="text-xs text-indigo-200 leading-normal">
                    Cryptographic biometric handshake registered securely. You can now use biometrics to sign in on subsequent visits!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBiometricRegisterModal(false);
                  }}
                  className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-xs font-bold rounded-xl uppercase tracking-widest transition-all"
                >
                  Done & Enable Quick Access
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions overlay/modal */}
      {quickActionsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          {/* Backdrop closer */}
          <div className="absolute inset-0" onClick={() => setQuickActionsOpen(false)}></div>
          
          <div className="relative w-full sm:max-w-md bg-white border border-slate-200 rounded-t-[1.5rem] sm:rounded-[1.25rem] p-6 shadow-xl text-slate-850 animate-slideUp">
            
            <button 
              onClick={() => setQuickActionsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>

            <div className="space-y-1.5 pb-3 border-b border-slate-100">
              <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest font-bold block">Transfer Operations</span>
              <h4 className="font-sans font-extrabold text-slate-900 text-base leading-tight">
                Quick Transaction Desk
              </h4>
              <p className="text-[11px] text-slate-500 font-sans font-medium">
                Select your preferred transfer node. Approved settlements execute seamlessly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-6">
              {/* Deposit option */}
              <button
                onClick={() => {
                  setQuickActionsOpen(false);
                  setActiveTab('wallet');
                  setTimeout(() => {
                    document.getElementById('binance-deposit-module')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 120);
                }}
                className="flex flex-col items-center justify-center p-5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-150 hover:border-emerald-300 rounded-2xl transition-all group cursor-pointer text-center space-y-3"
              >
                <div className="p-3 bg-emerald-500 rounded-full text-white shadow-md shadow-emerald-500/10 group-hover:scale-110 transition-transform">
                  <ArrowDownCircle className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <span className="block text-xs font-black uppercase text-slate-900 tracking-wider">Deposit Funds</span>
                  <span className="block text-[9px] text-emerald-700 font-mono mt-0.5">TRC20 / BEP20</span>
                </div>
              </button>

              {/* Withdraw option */}
              <button
                onClick={() => {
                  setQuickActionsOpen(false);
                  setActiveTab('wallet');
                  setTimeout(() => {
                    document.getElementById('binance-withdrawal-module')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 120);
                }}
                className="flex flex-col items-center justify-center p-5 bg-amber-50/70 hover:bg-amber-100 border border-amber-150 hover:border-amber-300 rounded-2xl transition-all group cursor-pointer text-center space-y-3"
              >
                <div className="p-3 bg-amber-500 rounded-full text-slate-950 shadow-md shadow-amber-500/10 group-hover:scale-110 transition-transform">
                  <ArrowUpCircle className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <span className="block text-xs font-black uppercase text-slate-900 tracking-wider">Withdraw USDT</span>
                  <span className="block text-[9px] text-amber-700 font-mono mt-0.5">TRC20 / BEP20</span>
                </div>
              </button>
            </div>

            {/* Account Stats readout */}
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 font-semibold">Active Capital:</span>
              <span className="font-bold text-emerald-600">${availableUserBalance.toFixed(2)} USDT</span>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-[9px] text-slate-400 text-center flex items-center justify-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Symmetric Cryptographic Escrow Active</span>
            </div>

          </div>
        </div>
      )}

      {/* Custom Yield Claim Popup Modal */}
      {claimPopup && claimPopup.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop closer */}
          <div className="absolute inset-0" onClick={() => setClaimPopup(null)}></div>
          
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-2xl text-slate-850 animate-fadeIn text-center space-y-4">
            
            <button 
              onClick={() => setClaimPopup(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>

            {claimPopup.type === 'success' && (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-widest font-black block">Settlement Success</span>
                  <h4 className="font-sans font-black text-slate-900 text-lg">🎉 Claim Complete!</h4>
                </div>
                <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl font-mono text-center space-y-1">
                  <span className="text-[9px] text-emerald-700 block uppercase font-bold">Credited Amount</span>
                  <span className="text-2xl font-black text-emerald-600">${claimPopup.amount?.toFixed(2)} USDT</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                  The daily fractional yield payouts have been successfully computed and credited to your main USDT wallet balance.
                </p>
                <button
                  onClick={() => setClaimPopup(null)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-emerald-600/10"
                >
                  Confirm & Dismiss
                </button>
              </div>
            )}

            {claimPopup.type === 'already_claimed' && (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <Award className="w-7 h-7 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-amber-600 uppercase tracking-widest font-black block">Ledger Verification</span>
                  <h4 className="font-sans font-black text-slate-900 text-lg">🔒 Already Claimed For This Window</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                  You have already claimed your fractional yield for this active slot. The ledger has locked this claim epoch securely.
                </p>
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-[10px] font-mono text-slate-600">
                  <span>Next payout cycles are available daily at <strong className="text-emerald-600">04:00 PM</strong> and <strong className="text-emerald-600">09:00 PM</strong>.</span>
                </div>
                <button
                  onClick={() => setClaimPopup(null)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200"
                >
                  Understand & Close
                </button>
              </div>
            )}

            {claimPopup.type === 'inactive_window' && (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                  <Clock className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-rose-600 uppercase tracking-widest font-black block">Timezone Lock Error</span>
                  <h4 className="font-sans font-black text-slate-900 text-lg">⏳ Claim Window Closed / Expired</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                  The yield settlement windows are only open twice daily between <strong className="text-slate-800">04:00 PM - 05:00 PM</strong> and <strong className="text-slate-800">09:00 PM - 10:00 PM</strong>.
                </p>
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-mono text-rose-800 text-left space-y-1.5">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>How to unlock right now:</span>
                  </div>
                  <p className="leading-normal text-xs font-sans text-rose-950 font-normal">
                    Adjust the <strong>"Set Simulated Hour"</strong> dropdown in the top header bar to <strong>"16" (04:15 PM)</strong> or <strong>"21" (09:15 PM)</strong> to claim instantly.
                  </p>
                </div>
                <button
                  onClick={() => setClaimPopup(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200"
                >
                  Acknowledge
                </button>
              </div>
            )}

            {claimPopup.type === 'no_yield' && (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-amber-600 uppercase tracking-widest font-black block">Verification Info</span>
                  <h4 className="font-sans font-black text-slate-900 text-lg">❌ No Active Yield Found</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                  You do not have any active property fractional shares to generate payout yields.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                  Explore available prime listings and acquire shares to begin earning dynamic daily cash rewards.
                </p>
                <button
                  onClick={() => {
                    setClaimPopup(null);
                    setActiveTab('properties');
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  <Building className="w-3.5 h-3.5" />
                  Explore Properties Tab
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Dynamic Receipt View Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setActiveReceipt(null)}></div>
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200 font-mono text-xs z-10 my-8">
            
            {/* Header branding */}
            <div className="bg-slate-900 text-white p-6 relative">
              <button 
                type="button"
                onClick={() => setActiveReceipt(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-[10px] text-emerald-400 font-bold tracking-widest block mb-1">✓ SECURE DIGITAL LEDGER RECORD</span>
              <h3 className="text-lg font-black tracking-tight text-white font-sans">FUNDORA REAL ESTATE</h3>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">PLATFORM CLEARANCE PROTOCOL & RECEIPT</p>
            </div>

            {/* Receipt body */}
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-slate-400 text-[9px] uppercase font-bold block">Document Type</span>
                  <span className="text-slate-900 font-bold font-sans text-sm">Official Transaction Voucher</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[9px] uppercase font-bold block">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] tracking-wide font-extrabold uppercase ${
                    activeReceipt.item.status === 'Approved' || activeReceipt.item.status === 'Completed' || activeReceipt.item.status === 'Claimed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeReceipt.item.status === 'Pending'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-rose-100 text-rose-800'
                  }`}>
                    {activeReceipt.item.status || 'Verified'}
                  </span>
                </div>
              </div>

              {/* Grid details */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-slate-500 gap-2">
                  <span className="font-bold shrink-0">Record ID:</span>
                  <span className="text-slate-900 font-bold break-all font-mono select-all text-right">{activeReceipt.item.id}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 gap-2">
                  <span className="font-bold shrink-0">Account User:</span>
                  <span className="text-slate-900 font-semibold text-right truncate">{activeReceipt.item.userEmail || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 gap-2">
                  <span className="font-bold shrink-0">Registry Type:</span>
                  <span className="text-slate-900 font-sans font-bold text-right">{activeReceipt.type === 'transaction' ? activeReceipt.item.type : 'Daily Yield Claim'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 gap-2">
                  <span className="font-bold shrink-0">Ledger Amount:</span>
                  <span className="text-emerald-600 font-black text-sm text-right">${Number(activeReceipt.item.amount).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 gap-2">
                  <span className="font-bold shrink-0">Timestamp:</span>
                  <span className="text-slate-900 text-right">{activeReceipt.item.date} {activeReceipt.item.claimedAt ? `(${activeReceipt.item.claimedAt})` : ''}</span>
                </div>
                
                {activeReceipt.type === 'transaction' && activeReceipt.item.network && (
                  <div className="flex justify-between items-center text-slate-500 gap-2">
                    <span className="font-bold shrink-0">Network Chain:</span>
                    <span className="text-slate-900 font-bold text-right">{activeReceipt.item.network} Protocol</span>
                  </div>
                )}
                {activeReceipt.type === 'transaction' && activeReceipt.item.walletAddress && (
                  <div className="flex justify-between items-start text-slate-500 gap-2">
                    <span className="font-bold shrink-0">Wallet Destination:</span>
                    <span className="text-slate-900 font-mono text-[9px] select-all break-all text-right max-w-[200px]">{activeReceipt.item.walletAddress}</span>
                  </div>
                )}
                {activeReceipt.type === 'transaction' && activeReceipt.item.txHash && (
                  <div className="flex justify-between items-start text-slate-500 border-t border-slate-200/50 pt-2.5 gap-2">
                    <span className="font-bold shrink-0">Cryptographic Hash:</span>
                    <span className="text-slate-900 font-mono text-[8px] select-all break-all text-right max-w-[200px]">{activeReceipt.item.txHash}</span>
                  </div>
                )}
                
                {activeReceipt.item.description && (
                  <div className="flex flex-col text-slate-500 border-t border-slate-200/50 pt-2.5 gap-1 text-left">
                    <span className="font-bold">Clearing Description:</span>
                    <span className="text-slate-600 font-sans italic text-[11px] leading-relaxed">{activeReceipt.item.description}</span>
                  </div>
                )}
              </div>

              {/* Extra visual stamps */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 border-2 border-dashed border-slate-400 rounded-full flex items-center justify-center text-slate-500 text-[8px] font-bold shrink-0">
                  SEAL
                </div>
                <p className="text-[9px] text-slate-500 font-sans leading-tight">
                  This transaction is fully secured on the Fundora decentralized registry pipeline. Verify compliance using the Transaction Tracker on the main landing homepage.
                </p>
              </div>

              {/* Footer action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => generateReceiptPDF(activeReceipt.item, activeReceipt.type)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10 active:scale-[0.98]"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download PDF Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReceipt(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer border border-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Deposit Confirmation Success Popup Modal */}
      {showDepositConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0e112d] border border-emerald-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-white space-y-5 animate-scaleIn overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setShowDepositConfirmModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center space-y-2 pt-2">
              <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-wide font-sans">
                Deposit Request Submitted!
              </h3>
              <p className="text-xs text-indigo-200/90 leading-relaxed max-w-xs font-sans">
                Your deposit request has been logged successfully and is currently under review by our audit team.
              </p>
            </div>

            {/* Request Summary Details Card */}
            {submittedDepositData && (
              <div className="bg-[#060819] border border-indigo-500/25 rounded-2xl p-4 space-y-3 text-xs font-sans">
                <div className="flex justify-between items-center border-b border-indigo-500/15 pb-2.5">
                  <span className="text-indigo-300 font-semibold text-[11px]">Deposit Amount:</span>
                  <span className="text-emerald-400 font-black text-sm font-mono">${submittedDepositData.amount.toFixed(2)} USDT</span>
                </div>

                <div className="flex justify-between items-center border-b border-indigo-500/15 pb-2.5">
                  <span className="text-indigo-300 font-semibold text-[11px]">Network Chain:</span>
                  <span className="text-white font-bold font-mono bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px]">
                    USDT ({submittedDepositData.network})
                  </span>
                </div>

                <div className="flex justify-between items-start pt-0.5 gap-2">
                  <span className="text-indigo-300 font-semibold text-[11px] shrink-0">Transaction TxID:</span>
                  <span className="text-slate-200 font-mono text-[10px] break-all text-right select-all">
                    {submittedDepositData.txHash}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-indigo-500/15 pt-2.5">
                  <span className="text-indigo-300 font-semibold text-[11px]">Audit Status:</span>
                  <span className="text-amber-400 font-extrabold text-[10px] uppercase bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin" /> Pending Approval
                  </span>
                </div>
              </div>
            )}

            {/* Footer Action Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDepositConfirmModal(false)}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                Close Confirmation
              </button>
            </div>

          </div>
        </div>
      )}

      </div>

    </div>

  </div>
  );
}

// Icon helper
function RadioBoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
