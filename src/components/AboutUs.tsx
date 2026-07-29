/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Building, ShieldCheck, HelpCircle, Users, Award, 
  MapPin, CheckCircle, ArrowLeft, ArrowUpRight, TrendingUp, Sparkles, HelpCircle as QuestionIcon, Smartphone, Download
} from 'lucide-react';

interface AboutUsProps {
  onNavigate: (page: 'home' | 'login' | 'register' | 'forgot' | 'dashboard' | 'admin' | 'about', reason?: string) => void;
  activeUser?: any;
}

export default function AboutUs({ onNavigate, activeUser }: AboutUsProps) {
  const handleBack = () => {
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

  return (
    <div id="about-us-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pt-20 pb-28 md:pb-12 px-4 md:px-8 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto w-full relative z-10 flex-1 flex flex-col">
        {/* Back navigation button */}
        <div className="mb-6">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/80 hover:bg-slate-800/80 text-xs text-slate-300 hover:text-white font-medium rounded-lg border border-slate-800 transition-all cursor-pointer shadow-md select-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{activeUser ? 'Back to Dashboard' : 'Back to Home'}</span>
          </button>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-mono uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pioneering Real Estate Liquidity</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight leading-tight">
            Democratizing Property Co-Ownership
          </h1>
          <p className="mt-3 text-xs md:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Fundora is a premier UK-registered fractional real estate platform. We break down traditional, high-capital barriers to property investments. Deposit into your secure wallet with as low as <strong className="text-emerald-400 font-mono">10 USDT</strong>, and begin co-owning premium properties with fractional shares starting from <strong className="text-emerald-400 font-mono">113 USDT per share</strong>.
          </p>
        </div>

        {/* Legitimacy & Legal Verification Badge */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-5 rounded-2xl mb-8 flex flex-col md:flex-row items-center gap-4 shadow-xl">
          <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-center md:text-left flex-1">
            <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">United Kingdom Incorporation Verified</h3>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              Fundora is incorporated strictly under Companies House rules in the United Kingdom with Company Number <strong className="text-white font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">16870956</strong>. We operate with complete automated smart compliance mechanisms.
            </p>
          </div>
          <div className="flex gap-2.5">
            <div className="text-center bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
              <span className="block text-[9px] text-slate-500 font-mono">COUNTRY</span>
              <span className="text-[10px] text-white font-bold font-mono">United Kingdom</span>
            </div>
            <div className="text-center bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
              <span className="block text-[9px] text-slate-500 font-mono">OFFICE</span>
              <span className="text-[10px] text-white font-bold font-mono">London, EC1V</span>
            </div>
          </div>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/20 hover:bg-slate-900/40 border border-slate-850 p-5 rounded-xl transition-all duration-300 flex flex-col">
            <div className="text-emerald-400 mb-3">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Fractional Power</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed flex-1">
              Properties are split into digital co-ownership fractions, allowing investors to participate with manageable amounts without full burden of single purchases.
            </p>
          </div>

          <div className="bg-slate-900/20 hover:bg-slate-900/40 border border-slate-850 p-5 rounded-xl transition-all duration-300 flex flex-col">
            <div className="text-emerald-400 mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Passive Daily Yields</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed flex-1">
              Active co-ownership yields are computed automatically and dispatched to claim queues in two distinct daily slots: 04:00 PM and 09:00 PM.
            </p>
          </div>

          <div className="bg-slate-900/20 hover:bg-slate-900/40 border border-slate-850 p-5 rounded-xl transition-all duration-300 flex flex-col">
            <div className="text-emerald-400 mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Instant Exit Liquidity</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed flex-1">
              Unlike traditional real estate with month-long lockups, our secondary automated liquidations let you exit early or mature principal payouts seamlessly.
            </p>
          </div>
        </div>

        {/* Platform Philosophy Section */}
        <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">How Fractional Co-ownership Works</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">1</div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Strategic Acquisition & Sourcing</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Our professional managers acquire commercial and premium residential properties with high rental demand and steady ROI projections.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">2</div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Tokenization & Fraction Creation</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  We divide the property value into individual shares starting from <strong className="text-emerald-400 font-mono">113 USDT</strong>, enabling bite-sized property portfolios accessible directly via crypto ledger gates.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">3</div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Algorithmic Distribution of Yield</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Collected rental revenue is programmatically calculated and mapped to each investor's ledger balances, ensuring absolute security, speed, and fairness.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Call for Visitors */}
        {!activeUser && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 text-center shadow-lg">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-2">Ready to secure your fractional real estate ledger?</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mb-4">
              Register now and begin accumulating daily property yields with zero paperwork, completely backed by digital compliance.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => onNavigate('register')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Join Register</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => onNavigate('login')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-800 transition-all cursor-pointer"
              >
                <span>Sign In</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Area with Download APK Button */}
        <footer className="mt-12 pt-6 border-t border-slate-900 text-center text-[10px] text-slate-500 font-mono">
          <div className="mb-4 flex justify-center">
            <a
              href="/download/app-fundora.apk"
              target="_blank"
              rel="noopener noreferrer"
              download="app-fundora.apk"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Download Official Android App (APK)</span>
              <Download className="w-3.5 h-3.5 text-emerald-400" />
            </a>
          </div>
          <p>© 2026 FUNDORA REAL ESTATE PLATFORM. DEMOCRATIZING CO-OWNERSHIP BRIDGES.</p>
        </footer>
      </div>
    </div>
  );
}
