import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  triggerTestNotification, 
  saveNotificationPreferences 
} from '../utils/notifications';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPermissionChange?: (granted: boolean) => void;
}

export default function NotificationPermissionModal({ isOpen, onClose, onPermissionChange }: Props) {
  const [currentStatus, setCurrentStatus] = useState<'default' | 'granted' | 'denied'>(getNotificationPermission());
  const [isRequesting, setIsRequesting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStatus(getNotificationPermission());
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAllowClick = async () => {
    setIsRequesting(true);
    setFeedbackMsg(null);
    try {
      // Trigger system permission prompt (HTML5 / Android WebView / Capacitor)
      const granted = await requestNotificationPermission();
      const newPerm = getNotificationPermission();
      setCurrentStatus(newPerm);

      // Auto enable all notification preferences
      saveNotificationPreferences({
        masterEnabled: true,
        depositAlerts: true,
        withdrawalAlerts: true,
        kycAlerts: true,
        yieldAlerts: true,
        chatAlerts: true
      });

      if (granted || newPerm === 'granted') {
        if (onPermissionChange) onPermissionChange(true);
        setFeedbackMsg('✅ Notification permission granted!');
        
        // Immediately fire test notification so user sees it in top bar
        await triggerTestNotification();
        
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        // Fallback info if browser blocked prompt
        setFeedbackMsg('⚠️ Browser prompt blocked. If not prompt appeared, tap browser 🔒 lock icon > Allow Notifications.');
        if (onPermissionChange) onPermissionChange(false);
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      setFeedbackMsg('⚠️ Unable to trigger prompt. Please enable in device settings.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDontAllowClick = () => {
    if (onPermissionChange) onPermissionChange(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Android System Style Permission Dialog Container */}
      <div className="bg-[#f2f4fc] dark:bg-[#1a1c2e] text-slate-900 dark:text-white w-full max-w-[340px] rounded-[32px] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/50 dark:border-indigo-500/30 relative overflow-hidden text-center space-y-5 animate-scaleUp">
        
        {/* Top Bell Icon */}
        <div className="flex justify-center pt-1">
          <div className="w-12 h-12 rounded-full bg-[#dbe4ff] dark:bg-indigo-500/20 flex items-center justify-center text-[#1b3a82] dark:text-indigo-300">
            <Bell className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* System Permission Text */}
        <div className="space-y-1.5 px-1">
          <h3 className="text-base font-semibold leading-snug font-sans text-slate-900 dark:text-white">
            Allow <span className="font-bold text-indigo-950 dark:text-indigo-300">Fundora APK App</span> to send you notifications?
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-sans">
            Get mobile device status bar alerts for deposits, withdrawals, KYC approvals, and daily rental yields.
          </p>
        </div>

        {/* Status Feedback Message */}
        {feedbackMsg && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{feedbackMsg}</span>
          </div>
        )}

        {/* Native Android Style Action Buttons Stack */}
        <div className="space-y-2.5 pt-1">
          {/* Allow Button */}
          <button
            type="button"
            disabled={isRequesting}
            onClick={handleAllowClick}
            className="w-full py-3.5 bg-[#d8e2ff] hover:bg-[#c3d3ff] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-[#001945] dark:text-white font-bold text-sm rounded-full transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRequesting ? (
              <span>Requesting...</span>
            ) : (
              <span>Allow</span>
            )}
          </button>

          {/* Don't allow Button */}
          <button
            type="button"
            onClick={handleDontAllowClick}
            className="w-full py-3.5 bg-[#e8edf9] hover:bg-[#dbe3f5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#3b4760] dark:text-slate-300 font-semibold text-sm rounded-full transition-all active:scale-[0.98] cursor-pointer"
          >
            Don't allow
          </button>
        </div>

      </div>
    </div>
  );
}
