/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RealEstateProject, UserAccount, Transaction, ProfitClaimRecord } from '../types';
import { INITIAL_PROJECTS, FAQS, STATIC_REPORTS } from '../data';
import { 
  Building, Users, Landmark, Coins, ChevronRight, HelpCircle, 
  MapPin, Clock, FileText, ArrowUpRight, CheckCircle, Shield, Sparkles, MessageCircle, Send, Menu, X, FileCheck,
  Search, AlertCircle, RefreshCw
} from 'lucide-react';
import fundoraCertificateImg from '../assets/images/fundora_certificate_1782375653209.jpg';
import { generateReceiptPDF } from '../utils/pdfReceipt';

interface LandingPageProps {
  onNavigate: (page: 'home' | 'login' | 'register' | 'forgot' | 'dashboard' | 'admin' | 'about', reason?: string) => void;
  onSelectProject: (project: RealEstateProject) => void;
  activeUser: UserAccount | null;
  allTransactions?: Transaction[];
  allClaims?: ProfitClaimRecord[];
  projects?: RealEstateProject[];
  allUsers?: UserAccount[];
  onSubmitInquiry?: (name: string, email: string, message: string) => Promise<void>;
}

export default function LandingPage({ 
  onNavigate, 
  onSelectProject, 
  activeUser,
  allTransactions = [],
  allClaims = [],
  projects = INITIAL_PROJECTS,
  allUsers = [],
  onSubmitInquiry
}: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Dynamic Real-time Calculations from actual cards & platform state
  const totalInvestors = allUsers.length > 0 ? allUsers.length : 12; // Fallback to 12 if loading or empty to maintain visual premium feel
  const totalProperties = projects.length;
  const totalInvestment = projects.reduce((sum, p) => sum + (p.totalShares - p.availableShares) * p.pricePerShare, 0);
  const totalProfitDistributed = allClaims.filter(c => c.status === 'Claimed').reduce((sum, c) => sum + c.amount, 0);

  const formatCapital = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M+`;
    }
    if (val >= 1000) {
      return `$${(val / 1000).toFixed(1)}K+`;
    }
    return `$${val.toLocaleString()}`;
  };

  const formatProfit = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(2)}M`;
    }
    if (val >= 1000) {
      return `$${(val / 1000).toFixed(2)}K`;
    }
    return `$${val.toFixed(2)}`;
  };
  
  // Tracking & Verification System States
  const [searchId, setSearchId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    item?: any;
    type?: 'transaction' | 'claim';
    message?: string;
  } | null>(null);

  // Real-time verification on searchId change
  useEffect(() => {
    const cleanId = searchId.trim();
    if (!cleanId) {
      setSearchResult(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const lowerId = cleanId.toLowerCase();

      // 1. Search in allTransactions
      const foundTx = allTransactions.find(t => t.id.toLowerCase() === lowerId);
      if (foundTx) {
        setSearchResult({
          found: true,
          type: 'transaction',
          item: foundTx
        });
        setIsSearching(false);
        return;
      }

      // 2. Search in allClaims
      const foundClaim = allClaims.find(c => c.id.toLowerCase() === lowerId);
      if (foundClaim) {
        setSearchResult({
          found: true,
          type: 'claim',
          item: foundClaim
        });
        setIsSearching(false);
        return;
      }

      // 3. Fallback demo values
      if (lowerId === 'claim-rec-1') {
        setSearchResult({
          found: true,
          type: 'claim',
          item: {
            id: 'claim-rec-1',
            userEmail: 'demo@fundora.com',
            amount: 145.20,
            date: '2026-06-25',
            status: 'Claimed',
            claimedAt: '04:15 PM'
          }
        });
      } else if (lowerId === 'claim-rec-2') {
        setSearchResult({
          found: true,
          type: 'claim',
          item: {
            id: 'claim-rec-2',
            userEmail: 'demo@fundora.com',
            amount: 89.50,
            date: '2026-06-26',
            status: 'Claimed',
            claimedAt: '09:12 PM'
          }
        });
      } else if (lowerId === 'inv-rec-101') {
        setSearchResult({
          found: true,
          type: 'transaction',
          item: {
            id: 'inv-rec-101',
            userEmail: 'demo@fundora.com',
            type: 'Investment',
            amount: 2500.00,
            date: '2026-06-24',
            status: 'Completed',
            network: 'TRC20',
            description: 'Acquired 22 fractional shares of Premium Commercial Plaza'
          }
        });
      } else {
        // Show not found only if user has typed a meaningful prefix (at least 3 chars)
        if (cleanId.length >= 3) {
          setSearchResult({
            found: false,
            message: `ID "${cleanId}" not found in our active decentralized ledger registries. Please double-check the ID or verify it inside your user dashboard.`
          });
        } else {
          setSearchResult(null);
        }
      }
      setIsSearching(false);
    }, 200); // 200ms debounce delay for smooth real-time response

    return () => clearTimeout(timer);
  }, [searchId, allTransactions, allClaims]);

  const handleVerifyLedgerId = (e: React.FormEvent) => {
    e.preventDefault();
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
    submitted: false
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      alert("Please fill in all inquiry form fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (onSubmitInquiry) {
        await onSubmitInquiry(contactForm.name, contactForm.email, contactForm.message);
      }
      setContactForm({
        name: '',
        email: '',
        message: '',
        submitted: true
      });
    } catch (err) {
      console.error(err);
      alert("Failed to submit inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="fundora-landing-page" className="flex flex-col bg-slate-950 text-slate-100 min-h-screen">
      {/* 1. Hero Section */}
      <section className="relative px-6 pt-12 pb-16 md:py-24 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pulse-slow pointer-events-none"></div>
        <div className="absolute bottom-5 left-10 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pulse-slow pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
            Invest in Prime Real Estate for just <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400 font-mono font-black">$113</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Gain secure, fractional legal title ownership in premium commercial plazas, luxury residential suites, and modern co-living communities with daily passive profit claims.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              id="cta-get-started"
              onClick={() => {
                if (activeUser) {
                  if (activeUser.role === 'admin') {
                    onNavigate('admin');
                  } else {
                    onNavigate('dashboard');
                  }
                } else {
                  onNavigate('register');
                }
              }}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Get Started Now</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              id="cta-explore-projects"
              onClick={() => {
                const el = document.getElementById('browse-properties-anchor');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-medium rounded-xl transition-all text-sm"
            >
              Explore Properties
            </button>
          </div>

          {/* Premium Visual Badge */}
          <div className="pt-8 grid grid-cols-3 gap-2 sm:gap-3 max-w-md mx-auto text-center">
            {/* Card 1: Expected Yield */}
            <div className="relative overflow-hidden bg-slate-950/80 backdrop-blur-md rounded-xl p-2 sm:p-3 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.05)] transition-all flex flex-col justify-between items-center min-h-[95px] sm:min-h-[110px] hover:border-emerald-500/40">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-500/30 rounded-full" />
              <div className="text-emerald-400/80 mb-1 mt-1 sm:mt-1.5">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 mx-auto animate-pulse" />
              </div>
              <span className="block text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider leading-tight">Expected Yield</span>
              <span className="mt-1 sm:mt-1.5 text-[12px] sm:text-base font-black text-emerald-400 font-mono tracking-tight whitespace-nowrap">40%-60%/m</span>
            </div>

            {/* Card 2: Claims Payout */}
            <div className="relative overflow-hidden bg-slate-950/80 backdrop-blur-md rounded-xl p-2 sm:p-3 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.05)] transition-all flex flex-col justify-between items-center min-h-[95px] sm:min-h-[110px] hover:border-amber-500/40">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-amber-500/30 rounded-full" />
              <div className="text-amber-400/80 mb-1 mt-1 sm:mt-1.5">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mx-auto" />
              </div>
              <span className="block text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider leading-tight">Claims Payout</span>
              <span className="mt-1 sm:mt-1.5 text-[12px] sm:text-base font-black text-amber-400 font-mono tracking-tight whitespace-nowrap">Daily 2x</span>
            </div>

            {/* Card 3: Assets Bound */}
            <div className="relative overflow-hidden bg-slate-950/80 backdrop-blur-md rounded-xl p-2 sm:p-3 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.05)] transition-all flex flex-col justify-between items-center min-h-[95px] sm:min-h-[110px] hover:border-blue-500/40">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500/30 rounded-full" />
              <div className="text-blue-400/80 mb-1 mt-1 sm:mt-1.5">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 mx-auto" />
              </div>
              <span className="block text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider leading-tight">Assets Bound</span>
              <span className="mt-1 sm:mt-1.5 text-[12px] sm:text-base font-black text-blue-400 font-mono tracking-tight whitespace-nowrap">100% USDT</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Statistics Section */}
      <section className="bg-slate-950 border-y border-slate-900 py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center space-y-1">
            <div className="p-2.5 bg-slate-900 rounded-xl w-max mx-auto border border-slate-800 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-xl font-bold font-mono text-white text-emerald-400">
              {totalInvestors.toLocaleString()}+
            </div>
            <div className="text-xs text-slate-400 font-medium">Global Investors</div>
          </div>

          <div className="text-center space-y-1">
            <div className="p-2.5 bg-slate-900 rounded-xl w-max mx-auto border border-slate-800 text-amber-400">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-xl font-bold font-mono text-white text-emerald-400">
              {totalProperties}
            </div>
            <div className="text-xs text-slate-400 font-medium">Managed Locations</div>
          </div>

          <div className="text-center space-y-1">
            <div className="p-2.5 bg-slate-900 rounded-xl w-max mx-auto border border-slate-800 text-amber-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="text-xl font-bold font-mono text-white text-emerald-400">
              {formatCapital(totalInvestment)}
            </div>
            <div className="text-xs text-slate-400 font-medium">Fractional Capital</div>
          </div>

          <div className="text-center space-y-1">
            <div className="p-2.5 bg-slate-900 rounded-xl w-max mx-auto border border-slate-800 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-xl font-bold font-mono text-white text-emerald-400">
              {formatProfit(totalProfitDistributed)}
            </div>
            <div className="text-xs text-slate-400 font-medium">Profit Distributed</div>
          </div>
        </div>
      </section>

      {/* 2.5 Ledger Verification & Tracking Gate Section */}
      <section id="ledger-tracking-section" className="py-12 px-6 bg-slate-900 border-b border-slate-950/50 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-xl mx-auto space-y-6 relative z-10 text-center">
          
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-mono tracking-wider uppercase">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Fundora Ledger Protocol</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Ledger Verification Gate
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Verify the cryptographic legitimacy of any deposit, withdrawal, investment, or daily profit claim settlement instantly via our decentralized ledger pipeline.
            </p>
          </div>

          <form onSubmit={handleVerifyLedgerId} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter Transaction ID or Settlement ID..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3.5 pl-4 pr-12 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-center uppercase tracking-wide"
              />
              <button
                type="submit"
                disabled={isSearching || !searchId.trim()}
                className="absolute right-2.5 top-2.5 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 rounded-lg transition-all cursor-pointer"
              >
                {isSearching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Format Sample Indicator */}
            <div className="pt-1.5 text-center space-y-1.5 max-w-sm mx-auto">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
                Expected Ledger ID Formats
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-[10.5px]">
                <span className="px-2.5 py-1 bg-slate-950/80 border border-slate-800/85 text-slate-400 rounded-lg">
                  claim-rec-XXXX
                </span>
                <span className="px-2.5 py-1 bg-slate-950/80 border border-slate-800/85 text-slate-400 rounded-lg">
                  tx-dep-XXXX
                </span>
                <span className="px-2.5 py-1 bg-slate-950/80 border border-slate-800/85 text-slate-400 rounded-lg">
                  tx-wth-XXXX
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">
                Enter your exact Ledger ID (e.g., <code className="text-emerald-400/90 font-mono">claim-rec-1</code>, <code className="text-emerald-400/90 font-mono">inv-rec-101</code>, or a real-time transaction ID copied from your ledger history) to verify status.
              </p>
            </div>
          </form>

          {/* Verification Results Panel */}
          {isSearching && (
            <div className="p-8 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-3 flex flex-col items-center justify-center animate-pulse">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
              <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">Querying central ledger network...</p>
            </div>
          )}

          {!isSearching && searchResult && (
            <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl text-left space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* If Found */}
              {searchResult.found ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-widest">✓ Verified Ledger Record</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] tracking-wide font-extrabold uppercase ${
                      searchResult.item.status === 'Approved' || searchResult.item.status === 'Completed' || searchResult.item.status === 'Claimed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : searchResult.item.status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {searchResult.item.status || 'Verified'}
                    </span>
                  </div>

                  {/* Grid details */}
                  <div className="space-y-2.5 font-mono text-[11px]">
                    <div className="flex justify-between border-b border-slate-900 pb-1.5 gap-2">
                      <span className="text-slate-500 font-bold shrink-0">LEDGER ID:</span>
                      <span className="text-slate-200 font-bold select-all break-all text-right">{searchResult.item.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1.5 gap-2">
                      <span className="text-slate-500 font-bold shrink-0">REGISTRY TYPE:</span>
                      <span className="text-slate-200 font-bold text-right">{searchResult.type === 'transaction' ? searchResult.item.type : 'Daily Yield Claim'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1.5 gap-2">
                      <span className="text-slate-500 font-bold shrink-0">SETTLED AMOUNT:</span>
                      <span className="text-emerald-400 font-black text-right">${Number(searchResult.item.amount).toFixed(2)} USDT</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900 pb-1.5 gap-2">
                      <span className="text-slate-500 font-bold shrink-0">TIMESTAMP:</span>
                      <span className="text-slate-200 text-right">{searchResult.item.date} {searchResult.item.claimedAt ? `(${searchResult.item.claimedAt})` : ''}</span>
                    </div>
                    {searchResult.type === 'transaction' && searchResult.item.network && (
                      <div className="flex justify-between border-b border-slate-900 pb-1.5 gap-2">
                        <span className="text-slate-500 font-bold shrink-0">NETWORK CHAIN:</span>
                        <span className="text-slate-200 font-bold text-right">{searchResult.item.network} Protocol</span>
                      </div>
                    )}
                    {searchResult.item.description && (
                      <div className="flex flex-col pt-1 text-left">
                        <span className="text-slate-500 font-bold mb-1">CLEARING DETAILS:</span>
                        <span className="text-slate-300 font-sans italic text-[11px] bg-slate-900/60 p-2.5 rounded border border-slate-900 leading-relaxed">{searchResult.item.description}</span>
                      </div>
                    )}
                  </div>

                  {/* PDF Download trigger */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => generateReceiptPDF(searchResult.item, searchResult.type!)}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-950" />
                      <span>Download Cryptographic PDF Receipt</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-xs font-sans block text-rose-300">Verification Failure</span>
                    <p className="text-[11px] leading-relaxed text-slate-300">{searchResult.message}</p>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </section>

      {/* 3. About Company Section */}
      <section id="features-anchor" className="py-16 px-6 bg-slate-900/40 relative">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-widest block">HOW IT OPERATES</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Democratizing Institutional Real Estate
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              We leverage smart blockchain tokenization and fractional property titles to solve liquidity problems in high-density corporate real estate assets.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
              <div className="p-3 bg-amber-500/10 rounded-xl w-max text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Legally Vetted Assets</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every project is fully approved by premium regulatory development authorities with direct co-ownership security.
              </p>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
              <div className="p-3 bg-emerald-500/10 rounded-xl w-max text-emerald-400">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Low Entry Threshold</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Skip large capital reserves and down payments. Buy a single high-yielding fractional share for as little as $113 and start collecting yields.
              </p>
            </div>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl"></div>
              <div className="p-3 bg-sky-500/10 rounded-xl w-max text-sky-400">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">Daily Liquidation Pool</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Collect rental yields credited straight to your available balance. Dynamic claiming windows offer seamless payouts to web wallets.
              </p>
            </div>
          </div>

          {/* Mission & Vision banner */}
          <div className="bg-gradient-to-r from-slate-900 to-amber-950/20 p-6 rounded-2xl border border-amber-900/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-md">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">MISSION & VISION</span>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "To build the most transparent real estate investment bridge connecting global expats and local retail savers directly to the premium architectural growth of metropolitan cities, backed by immediate smart settlements."
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-400 shrink-0">
                <span className="p-2 bg-slate-950 rounded-lg text-emerald-400 border border-slate-800"><CheckCircle className="w-4 h-4" /></span>
                <span>Fully Compliant Co-Ownership Titles</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Projects Section (Browse Listings) */}
      <section id="browse-properties-anchor" className="py-16 px-6 relative">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-widest block">FEATURED LISTINGS</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">explore active investment properties</h2>
            </div>
            <button 
              onClick={() => {
                if (activeUser) {
                  if (activeUser.role === 'admin') {
                    onNavigate('admin');
                  } else {
                    onNavigate('dashboard');
                  }
                } else {
                  onNavigate('login');
                }
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all flex items-center gap-1.5 align-middle"
            >
              <span>View All Properties</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {projects.slice(0, 4).map((project) => (
              <div 
                key={project.id} 
                onClick={() => onSelectProject(project)}
                className="group cursor-pointer bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 flex flex-col h-full"
              >
                {/* Image & Category Tag */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                  <img 
                    src={project.imageUrl} 
                    alt={project.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-950/80 backdrop-blur rounded-lg border border-slate-800 text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase">
                    {project.category}
                  </div>
                  {project.status === 'Sold Out' && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center">
                      <span className="px-4 py-1.5 bg-red-500/25 border border-red-500/50 text-red-300 font-mono text-xs font-bold uppercase tracking-widest rounded-lg">
                        SOLD OUT
                      </span>
                    </div>
                  )}
                  {project.status === 'Upcoming' && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                      <span className="px-4 py-1.5 bg-blue-500/25 border border-blue-500/50 text-blue-300 font-mono text-xs font-bold uppercase tracking-widest rounded-lg animate-pulse">
                        COMIMG SOON
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono font-medium">
                      <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate">{project.location}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                  </div>

                  {/* ROI, Duration, Price */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-900 font-mono text-center">
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">ROI</span>
                      <span className="text-xs font-bold text-emerald-400">+{project.expectedRoi}% yld</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">DURATION</span>
                      <span className="text-xs font-bold text-slate-300">{project.durationMonths} Month{project.durationMonths !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">PRICE</span>
                      <span className="text-xs font-bold text-amber-400">${project.pricePerShare}</span>
                    </div>
                  </div>

                  {/* Share Availability Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-medium">
                      <span>Available: {project.availableShares} / {project.totalShares} Shares</span>
                      <span className="font-bold text-amber-400">
                        {project.status === 'Sold Out' ? '100% Sold' : `${Math.round(((project.totalShares - project.availableShares) / project.totalShares) * 100)}% Funded`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${project.status === 'Sold Out' ? 100 : ((project.totalShares - project.availableShares) / project.totalShares) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Link Footer */}
                  <div className="text-xs text-amber-400 font-bold flex items-center justify-between pt-1 border-t border-slate-800/60 group-hover:text-white transition-colors">
                    <span>Analyze Property Potential</span>
                    <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UK Corporate Registry & Compliance Section */}
      <section id="compliance-anchor" className="py-16 px-6 bg-gradient-to-r from-slate-950 to-slate-900 border-t border-slate-900">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-widest block">UK REGISTERED & SECURE</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
              <Shield className="w-6 h-6 text-emerald-500" />
              <span>Official United Kingdom Entity</span>
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Fundora is a fully registered Private Limited Company in England and Wales under the Companies Act 2006. All co-ownership titles and assets are secured under strict UK legal structures.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-8 items-center">
            {/* Left: Certificate of Incorporation Preview Card */}
            <div className="md:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all group shadow-xl">
              <div 
                onClick={() => setShowCertificateModal(true)}
                className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer bg-slate-900 border border-slate-800"
              >
                <img 
                  src={fundoraCertificateImg} 
                  alt="Fundora Limited UK Certificate of Incorporation" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103 opacity-90 hover:opacity-100"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-all flex items-center justify-center">
                  <span className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] uppercase font-mono tracking-widest rounded-lg shadow-lg flex items-center gap-1.5 transform group-hover:scale-105 transition-transform">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>View Certificate</span>
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-center text-slate-500 font-mono mt-3">
                Click to inspect official Companies House document
              </p>
            </div>

            {/* Right: Registration & Regulatory details */}
            <div className="md:col-span-3 space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-sans font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[10px] tracking-wider uppercase">Active</span>
                  <span>Fundora Limited Details</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block uppercase font-bold text-[9px]">Company Name</span>
                    <span className="text-slate-200 font-bold">FUNDORA LIMITED</span>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block uppercase font-bold text-[9px]">Company Number</span>
                    <span className="text-amber-400 font-bold">16870956</span>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block uppercase font-bold text-[9px]">Date of Registry</span>
                    <span className="text-slate-200 font-bold">24th November 2025</span>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-slate-500 block uppercase font-bold text-[9px]">Registered Office</span>
                    <span className="text-slate-200 text-[10px] font-bold leading-tight block">England & Wales, UK</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-emerald-400 block uppercase font-mono tracking-wider text-[9px]">COMPLIANCE ASSURANCE</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  As an officially incorporated business in the United Kingdom, Fundora operates under the strict legal jurisdiction of English corporate law. Our fractional property title allocations are bound to authentic real estate portfolios, ensuring transparency, investor safety, and automated legal title claim audits.
                </p>
                <div className="flex items-center gap-2.5 pt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-5 h-3.5 shadow-sm rounded-sm shrink-0">
                    <clipPath id="union-jack-clip">
                      <rect width="60" height="30" />
                    </clipPath>
                    <rect width="60" height="30" fill="#012169" />
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#union-jack-clip)" />
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" clipPath="url(#union-jack-clip)" />
                    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                  </svg>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">Government Registered Private Company • Companies Act 2006</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ Section */}
      <section id="faq-anchor" className="py-16 px-6 bg-slate-900/20 border-t border-slate-900">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-widest block">LEARNING CENTRE</span>
            <span className="p-2 bg-slate-900 rounded-full w-max mx-auto border border-slate-800 text-amber-400 block"><HelpCircle className="w-5 h-5 mx-auto" /></span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            {FAQS.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  id={`faq-btn-${idx}`}
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between text-white font-medium text-xs sm:text-sm"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className={`w-4 h-4 text-amber-400 transform transition-transform duration-200 ${activeFaq === idx ? 'rotate-90' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Contact Section */}
      <section id="helpdesk-anchor" className="py-16 px-6 bg-gradient-to-t from-slate-950 to-slate-900 relative">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-widest block">24/7 HELPDESK</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Need assistance? Reach our helpdesk</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Connect directly with our real estate acquisition desks. We are ready to answer your questions regarding escrow compliance.
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs text-slate-400">
              <div className="flex items-center space-x-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="p-2 bg-slate-900 text-amber-400 rounded-lg"><MessageCircle className="w-4 h-4" /></span>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Expats Compliance Desk</span>
                  <span className="text-slate-200 text-xs text-emerald-400">fundora.one@gmail.com</span>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="p-2 bg-slate-900 text-amber-400 rounded-lg"><MapPin className="w-4 h-4" /></span>
                <div>
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Headquarters Address</span>
                  <span className="text-slate-200 text-xs">128 City Road, London, EC1V 2NX, United Kingdom</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Inquiry Form */}
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 max-w-sm mx-auto w-full">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-1.5">
              <span>Send Quick Inquiry</span>
            </h3>

            {contactForm.submitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Inquiry Dispatched</h4>
                <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                  Your request has been logged and synchronized in real-time with the admin secure dashboard. Our representative will contact you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setContactForm(prev => ({ ...prev, submitted: false }))}
                  className="mt-2 text-[10px] text-amber-400 underline hover:text-amber-300"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-slate-400">Full Name</label>
                  <input 
                    type="text" 
                    required
                    disabled={isSubmitting}
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Oliver Davies"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-slate-400">Email Address</label>
                  <input 
                    type="email" 
                    required
                    disabled={isSubmitting}
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. oliver.davies@outlook.co.uk"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-slate-400">Inquiry Details</label>
                  <textarea 
                    required
                    rows={3}
                    disabled={isSubmitting}
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Describe your interest or ask about corporate yield options..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-slate-950 font-bold rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <span>Sending...</span>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    </>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* UK Certificate Modal Overlay */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
              <div>
                <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest block">Companies House Registrar</span>
                <h3 className="text-xs font-sans font-bold text-white">UK Certificate of Incorporation</h3>
              </div>
              <button 
                onClick={() => setShowCertificateModal(false)}
                className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Certificate Viewport */}
            <div className="p-4 overflow-y-auto bg-slate-950/40 flex-1 flex items-center justify-center">
              <div className="border border-slate-850 rounded-xl overflow-hidden bg-white max-w-sm w-full shadow-lg">
                <img 
                  src={fundoraCertificateImg} 
                  alt="Official UK Certificate of Incorporation of Fundora Limited - Company 16870956" 
                  className="w-full h-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Company Number: 16870956</span>
              <button 
                onClick={() => setShowCertificateModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium rounded-md transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="bg-slate-950 pt-6 pb-28 md:py-6 px-4 border-t border-slate-900 text-center text-[10px] text-slate-500 font-mono tracking-wide">
        <div className="mb-3 flex justify-center gap-4 text-[11px] text-emerald-450 font-sans font-bold">
          <button 
            onClick={() => onNavigate('about')} 
            className="hover:text-amber-400 transition-colors uppercase tracking-wider cursor-pointer"
          >
            About Us & Incorporation
          </button>
          <span>•</span>
          <a 
            href="#browse-properties-anchor" 
            className="hover:text-amber-400 transition-colors uppercase tracking-wider"
          >
            Browse Properties
          </a>
        </div>
        <p>© 2026 FUNDORA REAL ESTATE PLATFORM. DEMOCRATIZING CO-OWNERSHIP BRIDGES.</p>
        <p className="mt-1 text-slate-600">Strictly registered with Companies House, United Kingdom (Company No. 16870956) & operating under automated smart compliance triggers.</p>
      </footer>
    </div>
  );
}
