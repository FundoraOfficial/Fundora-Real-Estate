/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProjectCategory = 'Residential' | 'Commercial' | 'Luxury' | 'Co-Living';

export interface RealEstateProject {
  id: string;
  name: string;
  location: string;
  category: ProjectCategory;
  imageUrl: string;
  totalShares: number;
  availableShares: number;
  pricePerShare: number;
  expectedRoi: number; // e.g. 14 for 14%
  durationMonths: number;
  description: string;
  status: 'Active' | 'Sold Out' | 'Upcoming';
  documents: string[];
}

export type TransactionType = 'Deposit' | 'Withdrawal' | 'Investment' | 'Profit Claim' | 'Referral Bonus';
export type TransactionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed';

export interface WalletInfo {
  usdtTrc20Address: string;
  usdtBep20Address: string;
  isVerified: boolean;
}

export interface InvestmentRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  projectId: string;
  projectName: string;
  sharesPurchased: number;
  totalCost: number;
  purchaseDate: string;
  dailyProfitRate: number; // Profit generated per day
  durationMonths?: number;
  remainingMonths?: number;
  status?: 'Active' | 'Completed' | 'Liquidated';
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  type: TransactionType;
  amount: number;
  date: string;
  status: TransactionStatus;
  txHash?: string;
  walletAddress?: string;
  proofImage?: string; // Simulated base64 or placeholder url
  network?: 'TRC20' | 'BEP20';
  description: string;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  referralCode: string;
  referredBy?: string; // Code of who referred this user
  wallet: WalletInfo;
  balance: number; // Available balance
  totalDeposited: number;
  totalWithdrawn: number;
  totalInvestment: number;
  totalProfitEarned: number;
  isEmailVerified: boolean;
  registrationDate: string;
  avatarUrl?: string;
  kycStatus?: 'Unverified' | 'Under Review' | 'Verified' | 'Rejected';
  kycFullName?: string;
  kycCountry?: string;
  kycDocumentType?: string;
  kycDocumentUrl?: string;
  kycDocumentFileName?: string;
  kycDocumentUrlBack?: string;
  kycDocumentFileNameBack?: string;
  password?: string;
  webAuthnEnabled?: boolean;
  webAuthnCredentialId?: string;
  webAuthnPublicKey?: string;
}

export interface ProfitClaimRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  status: 'Claimed' | 'Missed' | 'Expired';
  claimedAt?: string;
  slot?: number; // e.g. 16 or 21
}

export interface ReferralBonusRecord {
  id: string;
  referrerId: string;
  referrerEmail: string;
  refereeId: string;
  refereeEmail: string;
  amount: number;
  date: string;
  status: 'Paid' | 'PendingFirstInvestment';
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  eventType: 'Login_Success' | 'Login_Failure' | 'Register_Referral' | 'Large_Withdrawal' | 'Anti_Fraud_Trigger' | 'Admin_Action' | 'Wallet_Verification';
  description: string;
  ipAddress: string;
  status: 'Alarm' | 'Info' | 'Secure';
}

export interface InvestorTier {
  id: string;
  name: string;
  shieldName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gradientClass: string;
  avatarId: string;
  badgeIcon: 'User' | 'Award' | 'Sparkles' | 'ShieldCheck' | 'Crown' | 'Building';
  minInvest: number;
  minRefs: number;
  benefits: string[];
  nextTier?: {
    name: string;
    reqInvest: number;
    reqRefs: number;
  };
}

export function getInvestorTier(totalInvest: number, referralsCount: number): InvestorTier {
  if (totalInvest >= 50000 || referralsCount >= 25) {
    return {
      id: 'tier-5',
      name: 'Crown Ambassador',
      shieldName: 'Imperial Crown Shield',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30 border-rose-500/40 animate-pulse',
      gradientClass: 'bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 text-white',
      avatarId: 'gradient-5',
      badgeIcon: 'Crown',
      minInvest: 50000,
      minRefs: 25,
      benefits: [
        'Premium 12% higher profit yield priority allocation',
        'Direct 24/7 WhatsApp VIP Concierge advisor link',
        'Access to exclusive luxury offshore listings',
        'Exclusive 15% team commission payout multiplier'
      ]
    };
  }
  if (totalInvest >= 10500 || referralsCount >= 10) {
    return {
      id: 'tier-4',
      name: 'Platinum Trustee',
      shieldName: 'Sleek Platinum Shield',
      color: 'text-sky-400',
      bgColor: 'bg-sky-400/10',
      borderColor: 'border-sky-400/30',
      gradientClass: 'bg-gradient-to-tr from-slate-700 via-slate-800 to-slate-950 text-white border border-sky-400/50',
      avatarId: 'gradient-6',
      badgeIcon: 'ShieldCheck',
      minInvest: 10500,
      minRefs: 10,
      benefits: [
        'Dedicated fast-track team support priority line',
        '8% yield booster reward on fresh investments',
        'Early-access beta listings allocations',
        'Quarterly physical asset certificate generation'
      ],
      nextTier: {
        name: 'Crown Ambassador',
        reqInvest: 50000,
        reqRefs: 25
      }
    };
  }
  if (totalInvest >= 2000 || referralsCount >= 5) {
    return {
      id: 'tier-3',
      name: 'Gold Director',
      shieldName: 'Radiant Gold Shield',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      gradientClass: 'bg-gradient-to-tr from-amber-400 to-orange-600 text-slate-950',
      avatarId: 'gradient-2',
      badgeIcon: 'Sparkles',
      minInvest: 2000,
      minRefs: 5,
      benefits: [
        'Standard fast-track priority on claims auditing',
        '5% extra yield multiplier voucher',
        'Dual commission bonuses on team expansion'
      ],
      nextTier: {
        name: 'Platinum Trustee',
        reqInvest: 10500,
        reqRefs: 10
      }
    };
  }
  if (totalInvest >= 500 || referralsCount >= 3) {
    return {
      id: 'tier-2',
      name: 'Silver Partner',
      shieldName: 'Noble Silver Shield',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/20',
      gradientClass: 'bg-gradient-to-tr from-blue-400 to-indigo-600 text-white',
      avatarId: 'gradient-3',
      badgeIcon: 'Award',
      minInvest: 500,
      minRefs: 3,
      benefits: [
        'Automatic access to high-yield residential properties',
        'Standard 10% cash reward on new referees qualifying first deposit'
      ],
      nextTier: {
        name: 'Gold Director',
        reqInvest: 2000,
        reqRefs: 5
      }
    };
  }
  return {
    id: 'tier-1',
    name: 'Bronze Associate',
    shieldName: 'Standard Bronze Shield',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    gradientClass: 'bg-gradient-to-tr from-emerald-400 to-teal-600 text-slate-950',
    avatarId: 'gradient-1',
    badgeIcon: 'User',
    minInvest: 0,
    minRefs: 0,
    benefits: [
      'Standard 10% cash rewards on referrals first qualifying deposit',
      'Verified digital fractional property ownership tracking'
    ],
    nextTier: {
      name: 'Silver Partner',
      reqInvest: 500,
      reqRefs: 3
    }
  };
}

export function getAvatarBgClass(avatarId: string | undefined): string {
  if (avatarId === 'tier-1' || avatarId === 'gradient-1') return 'bg-gradient-to-tr from-emerald-400 to-teal-600 text-slate-950';
  if (avatarId === 'tier-3' || avatarId === 'gradient-2') return 'bg-gradient-to-tr from-amber-400 to-orange-600 text-slate-950';
  if (avatarId === 'tier-2' || avatarId === 'gradient-3') return 'bg-gradient-to-tr from-blue-400 to-indigo-600 text-white';
  if (avatarId === 'gradient-4') return 'bg-gradient-to-tr from-purple-400 to-pink-600 text-white';
  if (avatarId === 'tier-5' || avatarId === 'gradient-5') return 'bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 text-white';
  if (avatarId === 'tier-4' || avatarId === 'gradient-6') return 'bg-gradient-to-tr from-slate-700 via-slate-800 to-slate-950 text-white border border-sky-400/50';
  return 'bg-gradient-to-tr from-emerald-400 to-teal-600 text-slate-950'; // default fallback
}

export interface SystemSettings {
  id: string; // usually 'default'
  usdtTrc20Address: string;
  usdtBep20Address: string;
  scanGateTitle: string;
  scanGateSubtitle: string;
  usdtTrc20QrCode?: string;
  usdtBep20QrCode?: string;
  apiUrl?: string;
  geminiApiKey?: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
  status: 'Pending' | 'Resolved';
}

