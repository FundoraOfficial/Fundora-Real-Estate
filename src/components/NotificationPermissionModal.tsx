import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, CheckCircle2, AlertTriangle, Smartphone, ChevronRight, X, Sparkles, Send } from 'lucide-react';
import { getNotificationPermission, requestNotificationPermission, triggerTestNotification } from '../utils/notifications';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPermissionChange?: (granted: boolean) => void;
}

export default function NotificationPermissionModal({ isOpen, onClose, onPermissionChange }: Props) {
  const [currentStatus, setCurrentStatus] = useState<'default' | 'granted' | 'denied'>(getNotificationPermission());
  const [isRequesting, setIsRequesting] = useState(false);
  const [showAndroidSteps, setShowAndroidSteps] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStatus(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAllowClick = async () => {
    setIsRequesting(true);
    setSuccessMsg(null);
    try {
      const granted = await requestNotificationPermission();
      const newPerm = getNotificationPermission();
      setCurrentStatus(newPerm);

      if (granted || newPerm === 'granted') {
        setSuccessMsg('✅ Device Notification Permission Granted! Sending test alert...');
        if (onPermissionChange) onPermissionChange(true);
        await triggerTestNotification();
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setShowAndroidSteps(true);
        if (onPermissionChange) onPermissionChange(false);
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      setShowAndroidSteps(true);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b0e26] border border-indigo-500/40 w-full max-w-md rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-white relative overflow-hidden space-y-5">
        
        {/* Glow accent header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-sky-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3.5 pt-1">
          <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl text-indigo-400 shrink-0">
            <Bell className="w-7 h-7 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-sans text-white leading-tight">
              Enable Device Notifications
            </h3>
            <span className="text-xs text-indigo-300 font-mono">
              Fundora Mobile Status Bar Alerts
            </span>
          </div>
        </div>

        {/* Dynamic Status / Success Banner */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {currentStatus === 'granted' ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Device Notifications Active</h4>
            <p className="text-xs text-emerald-200/90 font-sans">
              Your mobile device is configured to receive status bar alerts for deposits, withdrawals, KYC, and yields.
            </p>
            <button
              type="button"
              onClick={async () => {
                await triggerTestNotification();
                setSuccessMsg('🔔 Test notification sent to your phone status bar!');
                setTimeout(() => setSuccessMsg(null), 4000);
              }}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>Send Test Notification Bar Alert</span>
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Get instant alerts delivered to your Android status bar and lock screen for critical account activities:
            </p>

            {/* Notification features list */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-2.5 bg-[#060819] border border-indigo-500/20 rounded-xl text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-slate-200 font-medium">Instant Deposit & Withdrawal Payout Approvals</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-[#060819] border border-indigo-500/20 rounded-xl text-xs">
                <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-slate-200 font-medium">KYC Verification & Identity Audit Status</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-[#060819] border border-indigo-500/20 rounded-xl text-xs">
                <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-slate-200 font-medium">Daily Rental Yield Claims & Dividend Alerts</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                disabled={isRequesting}
                onClick={handleAllowClick}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 text-white font-bold rounded-2xl text-sm transition-all shadow-[0_4px_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRequesting ? (
                  <span>Requesting Device Permission...</span>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Allow Mobile Notifications</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowAndroidSteps(!showAndroidSteps)}
                className="w-full text-center text-xs text-indigo-300 hover:text-indigo-200 font-medium py-1 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>{showAndroidSteps ? 'Hide Mobile Setup Instructions' : 'How to enable in Android Phone Settings?'}</span>
              </button>
            </div>

            {/* Step-by-Step Mobile Android Settings Instructions */}
            {showAndroidSteps && (
              <div className="p-4 bg-[#050716] border border-amber-500/30 rounded-2xl text-xs space-y-3 text-slate-300 animate-fadeIn">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Android & Mobile Browser Manual Permission Steps:</span>
                </div>

                <div className="space-y-2 text-[11px] font-sans">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Tap the 🔒 <b>Lock / Settings Icon</b> in your browser top bar next to the web address (URL).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Select <b>Site Settings</b> or <b>Permissions</b>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Find <b>Notifications</b> and change setting to <b>ALLOW</b>.</span>
                  </div>
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-800">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span><b>Android Phone Settings option:</b> Go to <i>Phone Settings &gt; Apps &gt; Chrome/Fundora &gt; Notifications &gt; Turn ON</i>.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAllowClick}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all text-center cursor-pointer mt-1"
                >
                  Try Trigger Permission Prompt Again
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
