import React, { useState, useEffect } from 'react';
import { Bell, X, Sparkles, CheckCircle2, ArrowDownCircle, ArrowUpCircle, ShieldCheck, TrendingUp } from 'lucide-react';
import { subscribeInAppNotifications, InAppNotifItem } from '../utils/notifications';

export default function InAppNotificationBanner() {
  const [activeNotif, setActiveNotif] = useState<InAppNotifItem | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeInAppNotifications((item) => {
      setActiveNotif(item);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeNotif) return;
    const timer = setTimeout(() => {
      setActiveNotif(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeNotif?.id]);

  if (!activeNotif) return null;

  const titleLower = activeNotif.title.toLowerCase();
  const isDeposit = titleLower.includes('deposit');
  const isWithdrawal = titleLower.includes('withdraw');
  const isKyc = titleLower.includes('kyc') || titleLower.includes('identity');
  const isYield = titleLower.includes('yield') || titleLower.includes('profit');

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 w-[94%] max-w-md z-[9999] animate-slideDown shadow-2xl">
      <div className="bg-[#0b0e26]/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-white relative overflow-hidden">
        {/* Glow accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-sky-500" />

        <div className="flex items-start gap-3">
          {/* Icon Badge */}
          <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
            isDeposit ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
            isWithdrawal ? 'bg-sky-500/20 border-sky-500/30 text-sky-400' :
            isKyc ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' :
            isYield ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
            'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
          }`}>
            {isDeposit ? <ArrowDownCircle className="w-5 h-5" /> :
             isWithdrawal ? <ArrowUpCircle className="w-5 h-5" /> :
             isKyc ? <ShieldCheck className="w-5 h-5" /> :
             isYield ? <TrendingUp className="w-5 h-5" /> :
             <Bell className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-300">
                Fundora Device Notification
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                {activeNotif.timestamp}
              </span>
            </div>
            <h5 className="text-xs font-bold text-white font-sans mt-0.5 leading-snug truncate">
              {activeNotif.title}
            </h5>
            <p className="text-[11px] text-slate-200/90 font-sans mt-0.5 leading-tight line-clamp-2">
              {activeNotif.body}
            </p>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setActiveNotif(null)}
            className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
