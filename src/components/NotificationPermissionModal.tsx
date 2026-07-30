import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Settings, Smartphone } from 'lucide-react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  triggerTestNotification, 
  saveNotificationPreferences,
  openAppNotificationSettings
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
      const granted = await requestNotificationPermission();
      const newPerm = getNotificationPermission();
      setCurrentStatus(newPerm);

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
        setFeedbackMsg('✅ Device Notification Permission Granted!');
        await triggerTestNotification();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setFeedbackMsg('⚠️ Permission not granted yet. Tap "Open App Notification Settings" below to allow.');
        if (onPermissionChange) onPermissionChange(false);
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      setFeedbackMsg('⚠️ Unable to trigger prompt. Please tap "Open App Notification Settings".');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettingsClick = () => {
    const opened = openAppNotificationSettings();
    if (opened) {
      setFeedbackMsg('Opening App Notification Settings...');
    } else {
      setFeedbackMsg('Please open Android Phone Settings > Apps > Fundora > Notifications > Turn ON.');
    }
  };

  const handleMaybeLaterClick = () => {
    if (onPermissionChange) onPermissionChange(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      {/* Native Android Style Permission Dialog Box */}
      <div className="bg-[#f4f6fd] dark:bg-[#181a2e] text-slate-900 dark:text-white w-full max-w-[340px] rounded-[32px] p-6 shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-white/60 dark:border-indigo-500/30 relative overflow-hidden text-center space-y-4 animate-scaleUp">
        
        {/* Top Bell Icon */}
        <div className="flex justify-center pt-1">
          <div className="w-12 h-12 rounded-full bg-[#dbe4ff] dark:bg-indigo-500/20 flex items-center justify-center text-[#1b3a82] dark:text-indigo-300">
            <Bell className="w-6 h-6 stroke-[2.2]" />
          </div>
        </div>

        {/* System Rationale & Permission Text */}
        <div className="space-y-1.5 px-1">
          <h3 className="text-base font-semibold leading-snug font-sans text-slate-900 dark:text-white">
            Allow <span className="font-bold text-indigo-950 dark:text-indigo-300">Fundora APK App</span> to send you notifications?
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
            Get instant device status bar alerts for deposits, withdrawal payouts, KYC approvals, and daily rental yields.
          </p>
        </div>

        {/* Status Feedback Message */}
        {feedbackMsg && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{feedbackMsg}</span>
          </div>
        )}

        {/* Action Buttons Stack */}
        <div className="space-y-2 pt-1">
          {/* 1. Allow Button */}
          <button
            type="button"
            disabled={isRequesting}
            onClick={handleAllowClick}
            className="w-full py-3.5 bg-[#2b56cb] hover:bg-[#2045ab] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-sm rounded-full transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRequesting ? <span>Requesting Permission...</span> : <span>Allow</span>}
          </button>

          {/* 2. Open App Notification Settings Button */}
          <button
            type="button"
            onClick={handleOpenSettingsClick}
            className="w-full py-3 bg-[#e4ebfd] hover:bg-[#d8e3fd] dark:bg-indigo-950/70 dark:hover:bg-indigo-900/70 text-[#1b3a82] dark:text-indigo-200 font-bold text-xs rounded-full transition-all active:scale-[0.98] cursor-pointer border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Open App Notification Settings</span>
          </button>

          {/* 3. Maybe Later Button */}
          <button
            type="button"
            onClick={handleMaybeLaterClick}
            className="w-full py-2.5 text-[#54627a] dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium text-xs rounded-full transition-all cursor-pointer"
          >
            Maybe Later
          </button>
        </div>

      </div>
    </div>
  );
}
