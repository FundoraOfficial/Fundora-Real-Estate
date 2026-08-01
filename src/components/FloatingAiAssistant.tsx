import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  Globe2, 
  LifeBuoy, 
  ChevronDown, 
  Maximize2, 
  Minimize2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
  Users,
  GripVertical,
  Move
} from 'lucide-react';
import { UserAccount } from '../types';
import { generateSmartFundoraAnswer } from '../lib/aiKnowledgeEngine';

interface FloatingAiAssistantProps {
  currentUser?: UserAccount | null;
  onNavigateToCommunity?: (channelId?: string) => void;
  isCommunityPage?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  escalate?: boolean;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ur', name: 'اردو (Urdu)', flag: '🇵🇰', dir: 'rtl' },
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦', dir: 'rtl' },
  { code: 'ps', name: 'پښتو (Pashto)', flag: '🇦🇫', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇧🇩', dir: 'ltr' },
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe (Turkish)', flag: '🇹🇷', dir: 'ltr' },
  { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳', dir: 'ltr' },
];

export const FloatingAiAssistant: React.FC<FloatingAiAssistantProps> = ({ 
  currentUser,
  onNavigateToCommunity,
  isCommunityPage = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [language, setLanguage] = useState<string>('en');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Drag / Position State
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0, startY: 0, initialX: 0, initialY: 0
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! Welcome to **Fundora Real Estate**. I am your AI Investment Concierge.\n\nHow can I assist your real estate co-ownership journey today? Feel free to ask about deposits, yields, property locations, or select your preferred language below.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  // Dragging event handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent text selection during drag
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: position.x,
      initialY: position.y
    };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - dragStartRef.current.startX;
      const deltaY = clientY - dragStartRef.current.startY;

      setPosition({
        x: dragStartRef.current.initialX + deltaX,
        y: dragStartRef.current.initialY + deltaY
      });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          chatHistory: messages.slice(-6),
          language
        })
      });

      const data = await response.json();
      const smartFallback = generateSmartFundoraAnswer(messageText, language);
      
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || smartFallback.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        escalate: data.escalate !== undefined ? data.escalate : smartFallback.escalate
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[AI Assistant Client Error]', err);
      const smartFallback = generateSmartFundoraAnswer(messageText, language);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: smartFallback.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          escalate: smartFallback.escalate
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    { label: '📊 Property ROI', query: 'What is the current property ROI and yield schedule for Emaar Downtown Dubai?' },
    { label: '💳 How to Deposit?', query: 'How to deposit USDT on Fundora via TRC20 or BEP20?' },
    { label: '🏛️ UK Legal Reg', query: 'What is Fundora UK Companies House registration number and legal standing?' },
    { label: '📱 Mobile APK App', query: 'How to download the official Fundora Android Mobile App APK?' },
    { label: '💸 Minimum Withdrawal', query: 'What is the minimum withdrawal limit and payout processing time?' },
    { label: '👥 Referral Rewards', query: 'Explain the 10% direct referral bonus and multi-tier rewards.' },
    { label: '🇵🇰 Urdu Guidance', query: 'فنڈورا پر انویسٹمنٹ اور یو ایس ڈی ٹی ڈپازٹ کا طریقہ بتائیں۔' },
    { label: '🇸🇦 Arabic Guidance', query: 'معلومات عن منصة فندورا للاستثمار العقاري وكيفية الإيداع' }
  ];

  return (
    <>
      {/* Floating Action Trigger Button (Compact & Sleek FAB) */}
      {!isOpen && (
        <div
          style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
          className={`fixed ${isCommunityPage ? 'bottom-36 sm:bottom-6' : 'bottom-20 sm:bottom-6'} right-4 sm:right-6 z-40 touch-none select-none`}
        >
          <button
            onClick={() => { setIsOpen(true); setIsMinimized(false); }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-sky-500/35 border border-sky-300/40 hover:scale-105 active:scale-95 transition-all duration-200 group cursor-grab active:cursor-grabbing"
            id="btn-floating-ai-assistant"
            aria-label="Fundora AI Concierge"
          >
            <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-sm animate-pulse" />
          </button>
        </div>
      )}

      {/* Floating Chat Modal (Fixed, Responsive Window anchored safely to viewport) */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-150 ease-out flex flex-col bg-slate-900/98 backdrop-blur-2xl border border-sky-500/30 rounded-2xl shadow-2xl overflow-hidden ${
            isMinimized 
              ? 'bottom-20 sm:bottom-6 right-4 sm:right-6 w-72 h-14' 
              : 'top-14 bottom-18 left-2 right-2 sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto sm:w-[420px] sm:h-[600px] sm:max-h-[85vh]'
          }`}
          id="modal-floating-ai-assistant"
        >
          {/* Header Bar */}
          <div 
            className="bg-slate-900 border-b border-sky-500/20 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 select-none shrink-0 shadow-md"
          >
            {/* Left: Avatar & App Info */}
            <div className="flex items-center gap-2 min-w-0 shrink">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-[1px] shadow-sm flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate">Fundora AI</h3>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">v2.0</span>
                </div>
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  Online
                </p>
              </div>
            </div>

            {/* Right Controls: Community Link, Language Selector, Minimize, Red Close Button */}
            <div className="flex items-center gap-1.5 shrink-0" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
              {/* Direct Community Chat Navigation Button */}
              {onNavigateToCommunity && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNavigateToCommunity();
                  }}
                  className="flex items-center gap-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold transition-all shadow-sm shrink-0 active:scale-95"
                  title="Open Community Chat Channel"
                >
                  <Users className="w-3.5 h-3.5 text-sky-300" />
                  <span className="hidden sm:inline">Community</span>
                </button>
              )}

              {/* Custom Styled Language Selector Dropdown */}
              <div className="relative group shrink-0">
                <div className="flex items-center gap-1 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/80 hover:border-sky-500/50 px-2 py-1 rounded-lg text-xs font-semibold text-slate-200 cursor-pointer transition-all shadow-sm">
                  <span className="text-xs">{selectedLangObj.flag}</span>
                  <span className="text-[10px] sm:text-xs font-extrabold text-sky-300 uppercase tracking-wider">{selectedLangObj.code}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300 transition-colors" />
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Select Language"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code} className="bg-slate-900 text-white font-medium py-1">
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minimize/Expand */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center border border-slate-800 hover:border-slate-700 shrink-0"
                title={isMinimized ? "Expand AI Assistant" : "Minimize AI Assistant"}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close Button - Highly Visible Red Accent Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/20 text-red-300 hover:text-white hover:bg-red-600 border border-red-500/40 transition-all flex items-center justify-center shadow-md shrink-0 active:scale-95"
                title="Close AI Assistant"
                id="btn-close-ai-assistant"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                <div className="p-2.5 sm:p-3 rounded-xl bg-sky-950/40 border border-sky-500/20 text-xs text-sky-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-white text-[11px] sm:text-xs">UK Registered Platform (No. 16870956)</strong>
                    <p className="text-slate-300 mt-0.5 text-[10px] sm:text-xs">
                      {language === 'ur' 
                        ? 'فنڈورا اے آئی آپ کو ریئل اسٹیٹ کو آنرشپ کے حوالے سے تصدیق شدہ معلومات فراہم کرتا ہے۔'
                        : 'Get verified answer regarding 10 USDT minimum deposits, daily yield claims & fractional property shares.'}
                    </p>
                  </div>
                </div>

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {msg.sender === 'user' ? (currentUser?.name || 'You') : 'Fundora AI'}
                      </span>
                      <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[90%] sm:max-w-[88%] p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-br-none border border-sky-400/30'
                          : 'bg-slate-800/90 text-slate-200 rounded-bl-none border border-slate-700/80'
                      }`}
                    >
                      {msg.text.split('\n').map((line, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>
                          {line.split('**').map((part, pIdx) => 
                            pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-sky-300">{part}</strong> : part
                          )}
                        </p>
                      ))}

                      {/* Human Escalation Box */}
                      {msg.escalate && (
                        <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            Human Admin Escalation Triggered
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Need direct support? Email our support team at <a href="mailto:fundora.one@gmail.com" className="text-sky-300 underline">fundora.one@gmail.com</a> or join our Community Support channel.
                          </p>
                          {onNavigateToCommunity && (
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                onNavigateToCommunity('support');
                              }}
                              className="mt-2 w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] transition flex items-center justify-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Open Community Chat Channel
                            </button>
                          )}
                        </div>
                      )}
                      {/* Direct Community Chat Action Button on Community Related Replies */}
                      {!msg.escalate && onNavigateToCommunity && (
                        msg.text.toLowerCase().includes('community') || 
                        msg.text.includes('کمیونٹی') || 
                        msg.text.toLowerCase().includes('chat channel') ||
                        msg.text.includes('گروپ')
                      ) && (
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              onNavigateToCommunity();
                            }}
                            className="w-full py-2 px-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
                          >
                            <Users className="w-4 h-4 text-white" />
                            <span>Join / Open Community Chat Channel</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-sky-400 bg-slate-800/60 p-2.5 sm:p-3 rounded-2xl w-fit border border-slate-700/50">
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-sky-400" />
                    <span className="font-semibold">Fundora is writing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions Chips */}
              <div className="px-2.5 sm:px-3 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q.query)}
                    disabled={isLoading}
                    className="shrink-0 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium bg-slate-800/80 hover:bg-sky-900/60 text-slate-300 hover:text-sky-200 border border-slate-700/80 hover:border-sky-500/40 transition"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <div className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      selectedLangObj.dir === 'rtl'
                        ? `اپنا سوال ${selectedLangObj.name} میں لکھیں...`
                        : `Ask in ${selectedLangObj.name} about yields, deposits...`
                    }
                    disabled={isLoading}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/80 transition"
                    dir={selectedLangObj.dir as any}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 text-white shadow-md shadow-sky-500/20 transition flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

