/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Smartphone, Download, CheckCircle2, X, Sparkles, AlertCircle } from 'lucide-react';
import { isNativeAppContainer } from '../utils/nativeApp';

export const APK_DOWNLOAD_URL = "/download/app-fundora.apk";

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNewRegistration?: boolean;
}

export default function ApkDownloadModal({ isOpen, onClose, isNewRegistration }: ApkDownloadModalProps) {
  if (!isOpen || isNativeAppContainer()) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[300] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0b0e26] border border-emerald-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-white space-y-5 animate-scaleIn overflow-hidden">
        
        {/* Background Radial Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all cursor-pointer z-10"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header & Icon */}
        <div className="flex flex-col items-center text-center space-y-2.5 pt-2">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 border-2 border-emerald-400 rounded-2xl flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
              <Smartphone className="w-9 h-9 text-emerald-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full uppercase border border-amber-300 shadow">
              APK
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-300 text-[10px] font-mono uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Official Mobile App • Android</span>
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-wide font-sans">
            {isNewRegistration ? 'Registration Successful!' : 'Download Fundora App'}
          </h3>

          <p className="text-xs text-indigo-200/90 leading-relaxed max-w-xs font-sans">
            {isNewRegistration 
              ? 'Your account is ready! Download the official Android APK now to enjoy faster biometric access and real-time updates.'
              : 'Install the official Android application to manage your fractional properties and claim daily yields directly from your phone.'}
          </p>
        </div>

        {/* App Features List */}
        <div className="bg-[#060819] border border-indigo-500/20 rounded-2xl p-4 space-y-2.5 text-xs font-sans">
          <div className="flex items-center gap-2 text-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Biometric fingerprint & Face ID login support</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Instant push alerts for settlement claim windows</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Ultra-fast mobile UI optimized for Android</span>
          </div>
        </div>

        {/* Primary Download APK Button */}
        <div className="space-y-3 pt-1">
          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            download="app-fundora.apk"
            className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xl shadow-emerald-500/25 active:scale-[0.98] flex items-center justify-center gap-2.5 border border-emerald-300/30"
          >
            <Smartphone className="w-5 h-5" />
            <span>Download Fundora APK</span>
            <Download className="w-4 h-4" />
          </a>

          {/* Quick Install Guide */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-[10.5px] text-amber-200/90 leading-normal">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-semibold block uppercase text-[9.5px]">Android Installation Tip:</strong>
              After downloading, open <span className="text-white font-mono">app-fundora.apk</span> to install. Allow <span className="text-amber-300 font-semibold">"Install from unknown sources"</span> if prompted.
            </div>
          </div>
        </div>

        {/* Modal Secondary Action Button */}
        <div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-slate-800 cursor-pointer"
          >
            {isNewRegistration ? 'Continue to Dashboard' : 'Close Window'}
          </button>
        </div>

      </div>
    </div>
  );
}
