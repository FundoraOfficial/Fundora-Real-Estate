/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { UserAccount, getAvatarBgClass, getInvestorTier, InvestmentRecord, Transaction } from '../types';
import { 
  Building, Menu, X, LogOut, Wallet, ShieldCheck, 
  TrendingUp, Percent, Users, Key, AppWindow, ArrowRight, LayoutDashboard, Coins,
  Plus, User, Receipt, HelpCircle, Sparkles, MessageSquare, Home, ArrowDownCircle, ArrowUpCircle,
  Crown, Shield, History
} from 'lucide-react';

interface GlobalNavbarProps {
  currentPage: 'home' | 'login' | 'register' | 'forgot' | 'dashboard' | 'admin' | 'about' | 'community';
  activeUser: UserAccount | null;
  onNavigate: (page: 'home' | 'login' | 'register' | 'forgot' | 'dashboard' | 'admin' | 'about' | 'community', reason?: string) => void;
  onLogout: () => void;
  // Dashboard tab controls
  activeTab?: 'overview' | 'properties' | 'wallet' | 'ledger' | 'claim' | 'referrals' | 'profile';
  setActiveTab?: (tab: 'overview' | 'properties' | 'wallet' | 'ledger' | 'claim' | 'referrals' | 'profile') => void;
  // Admin tab controls
  activeAdminTab?: 'stats' | 'deposits' | 'withdrawals' | 'projects' | 'users' | 'security';
  setActiveAdminTab?: (tab: 'stats' | 'deposits' | 'withdrawals' | 'projects' | 'users' | 'security') => void;
  onSimulateDailyRollover?: () => void;
  // Scroll dispatcher helper
  setScrollToAnchor?: (anchor: string | null) => void;
  // Simulated clock properties
  simulatedHour?: number;
  simulatedMinute?: number;
  // Optional for dynamic badge/tier
  investments?: InvestmentRecord[];
  transactions?: Transaction[];
}

export default function GlobalNavbar({
  currentPage,
  activeUser,
  onNavigate,
  onLogout,
  activeTab,
  setActiveTab,
  activeAdminTab,
  setActiveAdminTab,
  onSimulateDailyRollover,
  setScrollToAnchor,
  simulatedHour = 21,
  simulatedMinute = 15,
  investments = [],
  transactions = []
}: GlobalNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const calculatedTotalInvest = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.totalCost, 0);
  }, [investments]);

  const totalReferralsCount = useMemo(() => {
    const refs = transactions.filter(t => t.type === 'Referral Bonus');
    return refs.length > 0 ? refs.length + 1 : 2;
  }, [transactions]);

  const userTier = useMemo(() => {
    return getInvestorTier(calculatedTotalInvest, totalReferralsCount);
  }, [calculatedTotalInvest, totalReferralsCount]);

  // Helper for scrolling or navigating
  const handleAnchorClick = (anchorId: string, event: React.MouseEvent) => {
    event.preventDefault();
    setMobileMenuOpen(false);

    if (currentPage === 'home') {
      const element = document.getElementById(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      if (setScrollToAnchor) {
        setScrollToAnchor(anchorId);
      }
      onNavigate('home');
    }
  };

  const handleLogoClick = () => {
    setMobileMenuOpen(false);
    if (activeUser) {
      if (activeUser.role === 'admin') {
        onNavigate('admin');
      } else {
        onNavigate('dashboard');
      }
    } else {
      onNavigate('home');
    }
  };

  const handleAdminTabClick = (tab: 'stats' | 'deposits' | 'withdrawals' | 'projects' | 'users' | 'security') => {
    setMobileMenuOpen(false);
    if (!activeUser) {
      onNavigate('login');
      return;
    }
    onNavigate('admin');
    if (setActiveAdminTab) {
      setActiveAdminTab(tab);
    }
  };

  const handleDashboardTabClick = (tab: 'overview' | 'properties' | 'wallet' | 'ledger' | 'claim' | 'referrals' | 'profile') => {
    setMobileMenuOpen(false);
    if (!activeUser) {
      onNavigate('login', tab);
      return;
    }
    if (activeUser.role === 'admin') {
      onNavigate('admin');
      return;
    }
    onNavigate('dashboard');
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  const handleTransactionsTabClick = () => {
    setMobileMenuOpen(false);
    if (!activeUser) {
      onNavigate('login', 'ledger');
      return;
    }
    if (activeUser.role === 'admin') {
      onNavigate('admin');
      if (setActiveAdminTab) {
        setActiveAdminTab('deposits');
      }
      return;
    }
    onNavigate('dashboard');
    if (setActiveTab) {
      setActiveTab('ledger');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-900 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
        {/* Brand Logo */}
        <div 
          onClick={handleLogoClick}
          className="flex items-center space-x-2.5 cursor-pointer hover:opacity-90 select-none"
        >
          <div className="p-1.5 bg-gradient-to-tr from-amber-500 to-emerald-500 rounded-lg text-slate-100 font-black">
            <Building className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <span className="font-extrabold text-white tracking-widest text-sm font-mono block">FUNDORA</span>
            <span className="text-[9px] text-emerald-400 font-mono tracking-wider block leading-none font-bold">FRACTIONAL REAL ESTATE</span>
          </div>
        </div>

        {/* Center Links (Context Dependent) */}
        <nav className="hidden lg:flex items-center space-x-6 text-xs text-slate-450 font-bold uppercase tracking-wider">
          {activeUser === null ? (
            <>
              {/* Visitor links */}
              <button 
                onClick={() => onNavigate('about')}
                className={`flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider font-bold cursor-pointer text-xs ${
                  currentPage === 'about' ? 'text-emerald-400 font-extrabold border-b-2 border-emerald-500 pb-0.5' : 'text-slate-400'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>About Us</span>
              </button>
              <a 
                href="#browse-properties-anchor" 
                onClick={(e) => handleAnchorClick('browse-properties-anchor', e)}
                className="hover:text-amber-400 transition-colors duration-200 text-slate-400"
              >
                Properties
              </a>
              <button 
                onClick={() => handleDashboardTabClick('overview')}
                className="flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider text-slate-400 font-bold cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
              <button 
                onClick={() => handleDashboardTabClick('wallet')}
                className="flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider text-slate-400 font-bold cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Wallet</span>
              </button>
              <button 
                onClick={() => handleDashboardTabClick('claim')}
                className="flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider text-slate-400 font-bold cursor-pointer"
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Claim Center</span>
              </button>
              <button 
                onClick={() => handleDashboardTabClick('referrals')}
                className="flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider text-slate-400 font-bold cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Referral</span>
              </button>
              <button 
                onClick={() => onNavigate('community')}
                className={`flex items-center gap-1.5 hover:text-sky-300 transition-colors uppercase tracking-wider font-extrabold cursor-pointer px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 ${
                  currentPage === 'community' ? 'bg-sky-500 text-slate-950 font-black border-sky-400' : ''
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Community</span>
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              </button>
              <button 
                onClick={() => handleDashboardTabClick('profile')}
                className="flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider text-slate-400 font-bold cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
            </>
          ) : (
            <>
              {/* Logged in direct dashboard section links */}
              {activeUser.role === 'admin' ? (
                <>
                  <button 
                    onClick={() => handleAdminTabClick('stats')}
                    className={`flex items-center gap-1 hover:text-red-400 transition-all uppercase tracking-wider text-xs ${
                      currentPage === 'admin' && activeAdminTab === 'stats' ? 'text-red-400 font-extrabold border-b-2 border-red-500 pb-0.5' : 'text-slate-450'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-red-500" />
                    <span>System Stats</span>
                  </button>
                  <button 
                    onClick={() => handleAdminTabClick('deposits')}
                    className={`flex items-center gap-1 hover:text-red-400 transition-all uppercase tracking-wider text-xs ${
                      currentPage === 'admin' && activeAdminTab === 'deposits' ? 'text-red-400 font-extrabold border-b-2 border-red-500 pb-0.5' : 'text-slate-450'
                    }`}
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5 text-red-500" />
                    <span>Deposits</span>
                  </button>
                  <button 
                    onClick={() => handleAdminTabClick('withdrawals')}
                    className={`flex items-center gap-1 hover:text-red-400 transition-all uppercase tracking-wider text-xs ${
                      currentPage === 'admin' && activeAdminTab === 'withdrawals' ? 'text-red-400 font-extrabold border-b-2 border-red-500 pb-0.5' : 'text-slate-450'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />
                    <span>Withdrawals</span>
                  </button>
                  <button 
                    onClick={() => handleAdminTabClick('projects')}
                    className={`flex items-center gap-1 hover:text-red-400 transition-all uppercase tracking-wider text-xs ${
                      currentPage === 'admin' && activeAdminTab === 'projects' ? 'text-red-400 font-extrabold border-b-2 border-red-500 pb-0.5' : 'text-slate-450'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5 text-red-500" />
                    <span>Projects Desk</span>
                  </button>
                  <button 
                    onClick={() => handleAdminTabClick('users')}
                    className={`flex items-center gap-1 hover:text-red-400 transition-all uppercase tracking-wider text-xs ${
                      currentPage === 'admin' && activeAdminTab === 'users' ? 'text-red-400 font-extrabold border-b-2 border-red-500 pb-0.5' : 'text-slate-450'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-red-500" />
                    <span>User Ledgers</span>
                  </button>
                  <button 
                    onClick={() => handleAdminTabClick('security')}
                    className={`flex items-center gap-1 hover:text-red-400 transition-all uppercase tracking-wider text-xs ${
                      currentPage === 'admin' && activeAdminTab === 'security' ? 'text-red-400 font-extrabold border-b-2 border-red-500 pb-0.5' : 'text-slate-450'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                    <span>Threat Logs</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleDashboardTabClick('overview')}
                    className={`flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider ${
                      currentPage === 'dashboard' && activeTab === 'overview' ? 'text-emerald-400 font-black' : 'text-slate-400'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Overview</span>
                  </button>
                  <button 
                    onClick={() => handleDashboardTabClick('properties')}
                    className={`flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider ${
                      currentPage === 'dashboard' && activeTab === 'properties' ? 'text-emerald-400 font-black' : 'text-slate-400'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Properties</span>
                  </button>
                  <button 
                    onClick={() => handleDashboardTabClick('wallet')}
                    className={`flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider ${
                      currentPage === 'dashboard' && activeTab === 'wallet' ? 'text-emerald-400 font-black' : 'text-slate-400'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Wallet</span>
                  </button>
                  <button 
                    onClick={() => handleDashboardTabClick('ledger')}
                    className={`flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider ${
                      currentPage === 'dashboard' && activeTab === 'ledger' ? 'text-emerald-400 font-black' : 'text-slate-400'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Ledger</span>
                  </button>
                  <button 
                    onClick={() => handleDashboardTabClick('claim')}
                    className={`flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider ${
                      currentPage === 'dashboard' && activeTab === 'claim' ? 'text-emerald-400 font-black' : 'text-slate-400'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Claim Center</span>
                  </button>
                  <button 
                    onClick={() => handleDashboardTabClick('referrals')}
                    className={`flex items-center gap-1 hover:text-emerald-400 transition-colors uppercase tracking-wider ${
                      currentPage === 'dashboard' && activeTab === 'referrals' ? 'text-emerald-400 font-black' : 'text-slate-400'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Referral</span>
                  </button>
                  <button 
                    onClick={() => onNavigate('community')}
                    className={`flex items-center gap-1.5 transition-all uppercase tracking-wider font-extrabold px-3 py-1 rounded-lg border ${
                      currentPage === 'community' 
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-black' 
                        : 'bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Community</span>
                  </button>
                </>
              )}
            </>
          )}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {activeUser === null ? (
            <div className="hidden sm:flex items-center space-x-3">
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold uppercase rounded-lg transition-all cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 text-xs font-black uppercase rounded-lg shadow-md shadow-amber-500/10 hover:shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer"
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-4">
              {/* Balance Readout */}
              {activeUser.role !== 'admin' && (
                <div className="hidden md:flex flex-col items-end text-right px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest leading-none">Wallet balance</span>
                  <span className="text-xs font-mono font-black text-amber-400 mt-0.5">${activeUser.balance.toFixed(2)} USDT</span>
                </div>
              )}

              {/* User Identity Info */}
              {activeUser.role === 'admin' ? (
                <div 
                  className="flex items-center gap-2.5 px-3 py-1.5 bg-red-950/20 border border-red-900/30 rounded-lg select-none"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 bg-red-500/20 text-red-400 border border-red-500/30">
                    AD
                  </div>
                  <div className="flex flex-col leading-tight text-left min-w-0 max-w-[120px]">
                    <span className="text-[10px] font-black text-red-400 truncate">System Admin</span>
                    <span className="text-[8px] font-bold font-mono tracking-wider truncate text-slate-400 uppercase">
                      Compliance Desk
                    </span>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => handleDashboardTabClick('profile')}
                  className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/40 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-900/85 transition-all select-none group"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 relative ${getAvatarBgClass(userTier.id)}`}>
                    {activeUser.email.slice(0, 2)}
                    <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-950 border border-slate-900 shadow-sm ${userTier.color}`}>
                      {userTier.id === 'tier-5' ? <Crown className="w-2 h-2" /> : <Shield className="w-2 h-2" />}
                    </div>
                  </div>
                  <div className="flex flex-col leading-tight text-left min-w-0 max-w-[100px]">
                    <span className="text-[10px] font-black text-slate-200 truncate group-hover:text-white">{activeUser.name || 'Investor'}</span>
                    <span className={`text-[8px] font-bold font-mono tracking-wider truncate ${userTier.color}`}>
                      {userTier.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Log Out Button */}
              <button
                onClick={onLogout}
                className="p-2 bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-950 rounded-lg transition-all cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Menu Burger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-350 hover:text-white transition-colors cursor-pointer select-none"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-[56px] left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-900 p-5 space-y-5 shadow-2sxl max-h-[calc(100vh-56px)] overflow-y-auto animate-fadeIn">
          {activeUser === null ? (
            <>
              {/* Guest links */}
              <div className="flex flex-col space-y-2.5 font-semibold text-xs text-slate-450 uppercase tracking-widest mb-4">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('community');
                  }}
                  className="w-full text-left py-2.5 px-3 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-between text-sky-300 font-extrabold cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    <span>Community Chat Channel</span>
                  </div>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span className="text-[9px] bg-sky-400/20 text-sky-300 px-1.5 py-0.5 rounded font-mono">LIVE</span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('about');
                  }}
                  className="w-full text-left py-2.5 border-b border-slate-900/80 flex items-center justify-between hover:text-white text-emerald-400 font-bold block cursor-pointer"
                >
                  <span>About Us & UK Reg</span>
                  <HelpCircle className="w-4 h-4" />
                </button>
                <a 
                  href="#browse-properties-anchor" 
                  onClick={(e) => handleAnchorClick('browse-properties-anchor', e)}
                  className="hover:text-white transition-colors py-2.5 border-b border-slate-900/80 block"
                >
                  Properties
                </a>
                <button
                  onClick={() => handleDashboardTabClick('overview')}
                  className="w-full text-left py-2.5 border-b border-slate-900/80 flex items-center justify-between hover:text-white transition-colors block cursor-pointer"
                >
                  <span>Overview</span>
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDashboardTabClick('wallet')}
                  className="w-full text-left py-2.5 border-b border-slate-900/80 flex items-center justify-between hover:text-white transition-colors block cursor-pointer"
                >
                  <span>Wallet</span>
                  <Wallet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDashboardTabClick('claim')}
                  className="w-full text-left py-2.5 border-b border-slate-900/80 flex items-center justify-between hover:text-white transition-colors block cursor-pointer"
                >
                  <span>Claim Center</span>
                  <Percent className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDashboardTabClick('referrals')}
                  className="w-full text-left py-2.5 border-b border-slate-900/80 flex items-center justify-between hover:text-white transition-colors block cursor-pointer"
                >
                  <span>Referrals Panel</span>
                  <Users className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDashboardTabClick('profile')}
                  className="w-full text-left py-2.5 border-b border-slate-900/80 flex items-center justify-between hover:text-white transition-colors block cursor-pointer"
                >
                  <span>My Profile</span>
                  <User className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('login');
                  }}
                  className="w-full py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase text-center cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('register');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 rounded-lg font-black text-xs uppercase text-center cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Authenticated user menu */}
              {activeUser.role === 'admin' ? (
                <div className="flex items-center gap-3 p-3 bg-red-950/20 border border-red-900/30 rounded-xl mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black uppercase shrink-0 bg-red-500/20 text-red-400 border border-red-500/30">
                    AD
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-black text-red-400 truncate">System Admin</span>
                    <span className="inline-flex items-center gap-1 text-[8.5px] font-bold font-mono tracking-wider uppercase text-slate-400">
                      <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></span>
                      Compliance Active
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl mb-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black uppercase shrink-0 relative ${getAvatarBgClass(userTier.id)}`}>
                    {activeUser.email.slice(0, 2)}
                    <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-950 border border-slate-900 shadow-sm ${userTier.color}`}>
                      {userTier.id === 'tier-5' ? <Crown className="w-2.5 h-2.5" /> : <Shield className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-black text-slate-200 truncate">{activeUser.name || 'Investor'}</span>
                    <span className={`inline-flex items-center gap-1 text-[8.5px] font-bold font-mono tracking-wider uppercase ${userTier.color}`}>
                      <span className="w-1 h-1 bg-current rounded-full animate-pulse"></span>
                      {userTier.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] text-slate-500 uppercase font-black">Capital</span>
                    <span className="block text-xs font-mono font-bold text-amber-400">${activeUser.balance.toFixed(2)} USDT</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col space-y-2 text-xs uppercase tracking-widest font-black text-slate-400 pt-2 border-t border-slate-900">
                {activeUser.role === 'admin' ? (
                  <>
                    <button
                      onClick={() => handleAdminTabClick('stats')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'admin' && activeAdminTab === 'stats' ? 'bg-red-950/25 text-red-400 font-extrabold border-l-4 border-red-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>System Stats</span>
                      <LayoutDashboard className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => handleAdminTabClick('deposits')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'admin' && activeAdminTab === 'deposits' ? 'bg-red-950/25 text-red-400 font-extrabold border-l-4 border-red-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Deposits Ledger</span>
                      <ArrowDownCircle className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => handleAdminTabClick('withdrawals')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'admin' && activeAdminTab === 'withdrawals' ? 'bg-red-950/25 text-red-400 font-extrabold border-l-4 border-red-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Withdrawals Ledger</span>
                      <ArrowUpCircle className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => handleAdminTabClick('projects')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'admin' && activeAdminTab === 'projects' ? 'bg-red-950/25 text-red-400 font-extrabold border-l-4 border-red-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Projects Desk</span>
                      <Building className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => handleAdminTabClick('users')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'admin' && activeAdminTab === 'users' ? 'bg-red-950/25 text-red-400 font-extrabold border-l-4 border-red-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>User Ledgers</span>
                      <Users className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => handleAdminTabClick('security')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'admin' && activeAdminTab === 'security' ? 'bg-red-950/25 text-red-400 font-extrabold border-l-4 border-red-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Threat Logs</span>
                      <ShieldCheck className="w-4 h-4 text-red-500" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleDashboardTabClick('overview')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'dashboard' && activeTab === 'overview' ? 'bg-emerald-950/20 text-emerald-400 font-extrabold border-l-4 border-emerald-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Overview</span>
                      <TrendingUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDashboardTabClick('properties')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'dashboard' && activeTab === 'properties' ? 'bg-emerald-950/20 text-emerald-400 font-extrabold border-l-4 border-emerald-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Real estate Properties</span>
                      <Building className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDashboardTabClick('wallet')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'dashboard' && activeTab === 'wallet' ? 'bg-emerald-950/20 text-emerald-400 font-extrabold border-l-4 border-emerald-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Wallet (Deposit/Withdraw)</span>
                      <Wallet className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDashboardTabClick('ledger')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'dashboard' && activeTab === 'ledger' ? 'bg-emerald-950/20 text-emerald-400 font-extrabold border-l-4 border-emerald-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Ledger History</span>
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDashboardTabClick('claim')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'dashboard' && activeTab === 'claim' ? 'bg-emerald-950/20 text-emerald-400 font-extrabold border-l-4 border-emerald-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Daily Yield Claim</span>
                      <Percent className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDashboardTabClick('referrals')}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'dashboard' && activeTab === 'referrals' ? 'bg-emerald-950/20 text-emerald-400 font-extrabold border-l-4 border-emerald-500' : 'hover:bg-slate-900'
                      }`}
                    >
                      <span>Referrals Panel</span>
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNavigate('community');
                      }}
                      className={`w-full text-left py-3 px-4 rounded-lg flex items-center justify-between ${
                        currentPage === 'community' 
                          ? 'bg-sky-500 text-slate-950 font-black border-l-4 border-sky-400' 
                          : 'bg-sky-500/10 text-sky-300 font-extrabold border border-sky-500/30 hover:bg-sky-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-sky-400" />
                        <span>Community Chat Channel</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-400/20 text-sky-300 font-mono font-bold">LIVE</span>
                    </button>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-slate-900 flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-3 bg-rose-950/30 hover:bg-rose-950/50 text-rose-455 border border-rose-900/30 rounded-lg text-xs font-black uppercase text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">Sign Out Session</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* UNIVERSAL MOBILE RESPONSIVE BOTTOM MENU BAR */}
      {/* ========================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-900 z-40 py-2.5 px-1 flex justify-around items-center shadow-[0_-5px_22px_rgba(0,0,0,0.8)] select-none">
        {activeUser === null ? (
          <>
            {/* GUEST MODE BAR */}
            {/* 1. Home button */}
            <button
              id="mobile-bottom-guest-home"
              onClick={() => {
                onNavigate('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                currentPage === 'home' ? 'text-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Home className="w-5 h-5 stroke-[2]" />
              <span className="text-[8px] font-bold uppercase tracking-widest block font-sans">Home</span>
            </button>

            {/* 2. Projects/Properties scroll button */}
            <button
              id="mobile-bottom-guest-explore"
              onClick={(e) => handleAnchorClick('browse-properties-anchor', e)}
              className="flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center text-slate-400 hover:text-white"
            >
              <Building className="w-5 h-5 stroke-[2]" />
              <span className="text-[8px] font-bold uppercase tracking-widest block font-sans">Explore</span>
            </button>

            {/* 3. Center CTA: Register */}
            <div className="relative -mt-6">
              <button
                id="mobile-bottom-guest-join"
                onClick={() => onNavigate('register')}
                className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-emerald-500 rounded-full text-slate-950 font-black flex items-center justify-center shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-all border-4 border-slate-950 cursor-pointer"
                title="Register Account"
              >
                <Plus className="w-5 h-5 text-slate-950 stroke-[3]" />
              </button>
            </div>

            {/* 4. Community Chat Channel */}
            <button
              id="mobile-bottom-guest-community"
              onClick={() => onNavigate('community')}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                currentPage === 'community' ? 'text-sky-300 font-extrabold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <MessageSquare className="w-5 h-5 stroke-[2] text-sky-400" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest block font-sans text-sky-300">Community</span>
            </button>

            {/* 5. FAQs / Support info */}
            <button
              id="mobile-bottom-guest-faq"
              onClick={(e) => handleAnchorClick('faq-anchor', e)}
              className="flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center text-slate-400 hover:text-white"
            >
              <HelpCircle className="w-5 h-5 stroke-[2]" />
              <span className="text-[8px] font-bold uppercase tracking-widest block font-sans">FAQs</span>
            </button>
          </>
        ) : (
          <>
            {/* INVESTOR LOGGED-IN MODE BAR OR ADMIN MODE BAR */}
            {activeUser.role === 'admin' ? (
              <>
                {/* ADMIN MODE BOTTOM BAR */}
                {/* 1. Stats */}
                <button
                  id="mobile-bottom-admin-stats"
                  onClick={() => handleAdminTabClick('stats')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                    currentPage === 'admin' && activeAdminTab === 'stats' ? 'text-red-400 font-extrabold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5 stroke-[2] text-red-500" />
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-sans text-red-400">Stats</span>
                </button>

                {/* 2. Deposits */}
                <button
                  id="mobile-bottom-admin-deposits"
                  onClick={() => handleAdminTabClick('deposits')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                    currentPage === 'admin' && activeAdminTab === 'deposits' ? 'text-red-400 font-extrabold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowDownCircle className="w-5 h-5 stroke-[2] text-slate-300" />
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-sans">Deposits</span>
                </button>

                {/* 3. Center CTA: Accrue Daily ROI / Roll-over */}
                <div className="relative -mt-6">
                  <button
                    id="mobile-bottom-admin-rollover"
                    onClick={() => {
                      if (onSimulateDailyRollover) {
                        onSimulateDailyRollover();
                      } else {
                        alert("Daily rollover trigger bound successfully.");
                      }
                    }}
                    className="w-12 h-12 bg-gradient-to-tr from-red-500 to-amber-500 rounded-full text-slate-950 font-black flex items-center justify-center shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95 transition-all border-4 border-slate-950 cursor-pointer"
                    title="Distribute ROI Payout Now"
                  >
                    <Sparkles className="w-5 h-5 text-slate-950 stroke-[3]" />
                  </button>
                </div>

                {/* 4. Withdrawals */}
                <button
                  id="mobile-bottom-admin-withdrawals"
                  onClick={() => handleAdminTabClick('withdrawals')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                    currentPage === 'admin' && activeAdminTab === 'withdrawals' ? 'text-red-400 font-extrabold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpCircle className="w-5 h-5 stroke-[2] text-slate-300" />
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-sans">Withdraws</span>
                </button>

                {/* 5. Users */}
                <button
                  id="mobile-bottom-admin-users"
                  onClick={() => handleAdminTabClick('users')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                    currentPage === 'admin' && activeAdminTab === 'users' ? 'text-red-400 font-extrabold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-5 h-5 stroke-[2] text-slate-300" />
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-sans">Users</span>
                </button>
              </>
            ) : (
              <>
                {/* INVESTOR LOGGED-IN MODE BAR */}
                {/* 1. Overview */}
                <button
                  id="mobile-bottom-inv-overview"
                  onClick={() => handleDashboardTabClick('overview')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                    currentPage === 'dashboard' && activeTab === 'overview' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5 stroke-[2]" />
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-sans">Overview</span>
                </button>

                {/* 2. Projects / Properties list */}
                <button
                  id="mobile-bottom-inv-projects"
                  onClick={() => handleDashboardTabClick('properties')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                    currentPage === 'dashboard' && activeTab === 'properties' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building className="w-5 h-5 stroke-[2]" />
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-sans">Projects</span>
                </button>

                {/* 3. Center Transfer Desk button (+) */}
                <div className="relative -mt-6">
                  <button
                    id="mobile-bottom-inv-transfer"
                    onClick={() => setQuickActionsOpen(true)}
                    className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-emerald-500 rounded-full text-slate-950 font-black flex items-center justify-center shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all border-4 border-slate-950 cursor-pointer"
                    title="Deposit & Withdrawal Operations"
                  >
                    <Plus className="w-6 h-6 text-slate-950 stroke-[3]" />
                  </button>
                </div>

                {/* 4. Community Chat Channel */}
                <button
                  id="mobile-bottom-inv-community"
                  onClick={() => onNavigate('community')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                    currentPage === 'community' ? 'text-sky-300 font-extrabold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <MessageSquare className="w-5 h-5 stroke-[2] text-sky-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-sans text-sky-300">Community</span>
                </button>

                {/* 5. My Profile tab */}
                <button
                  id="mobile-bottom-inv-profile"
                  onClick={() => handleDashboardTabClick('profile')}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-colors w-14 text-center ${
                    currentPage === 'dashboard' && activeTab === 'profile' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-5 h-5 stroke-[2]" />
                  <span className="text-[8px] font-bold uppercase tracking-widest block font-sans">Profile</span>
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* QUICK ACTIONS OVERLAY MODAL FOR DEPOSITS/WITHDRAWALS */}
      {/* ========================================================= */}
      {quickActionsOpen && (
        <div id="deposit-withdrawal-mobile-modal" className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop closer */}
          <div className="absolute inset-0" onClick={() => setQuickActionsOpen(false)}></div>
          
          <div className="relative w-full sm:max-w-md bg-white border border-slate-200 rounded-t-[1.5rem] sm:rounded-[1.25rem] p-6 shadow-2xl text-slate-800">
            
            <button 
              onClick={() => setQuickActionsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>

            <div className="space-y-1.5 pb-3 border-b border-slate-100">
              <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest font-bold block">Transfer Operations</span>
              <h4 className="font-sans font-extrabold text-slate-900 text-sm leading-tight">
                Quick Transaction Desk
              </h4>
              <p className="text-[10px] text-slate-500 font-sans font-medium">
                Select your preferred transfer action. Approved settlements execute instantly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-6">
              {/* Deposit option */}
              <button
                onClick={() => {
                  setQuickActionsOpen(false);
                  onNavigate('dashboard');
                  if (setActiveTab) setActiveTab('wallet');
                  window.dispatchEvent(new CustomEvent('open-wallet-subtab', { detail: 'deposit' }));
                  setTimeout(() => {
                    const el = document.getElementById('binance-deposit-module');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 150);
                }}
                className="flex flex-col items-center justify-center p-5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-100 hover:border-emerald-300 rounded-2xl transition-all group cursor-pointer text-center space-y-3"
              >
                <div className="p-3 bg-emerald-500 rounded-full text-white shadow-md shadow-emerald-500/15 group-hover:scale-105 transition-transform">
                  <ArrowDownCircle className="w-5 h-5 stroke-[2]" />
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
                  onNavigate('dashboard');
                  if (setActiveTab) setActiveTab('wallet');
                  window.dispatchEvent(new CustomEvent('open-wallet-subtab', { detail: 'withdraw' }));
                  setTimeout(() => {
                    const el = document.getElementById('binance-withdrawal-module');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 150);
                }}
                className="flex flex-col items-center justify-center p-5 bg-amber-50 hover:bg-amber-100 border border-amber-100 hover:border-amber-300 rounded-2xl transition-all group cursor-pointer text-center space-y-3"
              >
                <div className="p-3 bg-amber-500 rounded-full text-slate-950 shadow-md shadow-amber-500/15 group-hover:scale-105 transition-transform">
                  <ArrowUpCircle className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="block text-xs font-black uppercase text-slate-900 tracking-wider">Withdraw USDT</span>
                  <span className="block text-[9px] text-amber-700 font-mono mt-0.5">TRC20 / BEP20</span>
                </div>
              </button>
            </div>

            {/* Security Notice badge */}
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-[9px] text-slate-500 text-center flex items-center justify-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Symmetric Cryptographic Escrow Protocol Active</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
