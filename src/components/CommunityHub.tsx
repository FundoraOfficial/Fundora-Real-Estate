import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Hash, 
  Lock, 
  Users, 
  Send, 
  Plus, 
  Search, 
  Pin, 
  Smile, 
  Paperclip, 
  Mic, 
  MicOff, 
  BarChart2, 
  Check, 
  CheckCheck, 
  Share2, 
  Sparkles, 
  Languages, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  CornerUpRight, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  X, 
  ShieldCheck, 
  UserPlus, 
  Volume2, 
  Bot, 
  Crown, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ThumbsUp, 
  Heart, 
  Flame, 
  Rocket, 
  Lightbulb,
  Copy,
  Download,
  ChevronLeft
} from 'lucide-react';
import { 
  UserAccount, 
  CommunityChannel, 
  CommunityMessage, 
  PollData, 
  MemberRole, 
  CommunityJoinRequest 
} from '../types';
import { generateSmartFundoraAnswer } from '../lib/aiKnowledgeEngine';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc 
} from 'firebase/firestore';

interface CommunityHubProps {
  currentUser: UserAccount;
  initialChannelId?: string;
  onNavigateToDeposit?: () => void;
}

// Initial Default Channels
const DEFAULT_CHANNELS: CommunityChannel[] = [
  {
    id: 'announcements',
    name: 'announcements',
    type: 'announcement',
    description: 'Official Fundora announcements, property listings & yield updates',
    icon: '📢',
    memberCount: 1420,
    isLocked: true,
    allowedRoles: ['Owner', 'Admin']
  },
  {
    id: 'general',
    name: 'general-discussion',
    type: 'public',
    description: 'Global investor chat and community insights',
    icon: '💬',
    memberCount: 3890,
    inviteCode: 'FUNDORA_GEN'
  },
  {
    id: 'tips',
    name: 'investment-tips',
    type: 'public',
    description: 'Daily AI tips, portfolio strategies & daily rental claims',
    icon: '💡',
    memberCount: 2150,
    inviteCode: 'YIELD_TIPS'
  },

  {
    id: 'support',
    name: 'investor-support',
    type: 'public',
    description: 'Human admin support and verification queries',
    icon: '🛟',
    memberCount: 950
  }
];

// Sample Initial Messages if Firestore empty
const INITIAL_MESSAGES: Record<string, CommunityMessage[]> = {
  announcements: [
    {
      id: 'msg-ann-1',
      channelId: 'announcements',
      senderId: 'admin-1',
      senderName: 'Fundora Compliance Team',
      senderEmail: 'fundora.one@gmail.com',
      senderRole: 'Admin',
      text: "🚀 **Fundora Official Announcement**: We are thrilled to roll out our Native AI Investment Community! Now you can chat with fellow investors, create polls, share voice notes, and trigger @AI Assistant directly in discussions.\n\nUK Companies House Registration No. 16870956.",
      timestamp: new Date(Date.now() - 3600000 * 4).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isPinned: true
    }
  ],
  general: [
    {
      id: 'msg-gen-1',
      channelId: 'general',
      senderId: 'user-sample-1',
      senderName: 'Tariq Mahmood',
      senderEmail: 'tariq@example.com',
      senderRole: 'Member',
      text: "Assalam o Alaikum everyone! Just claimed my 1.2% daily rental yield for my Dubai Residential share. Claims processed instantly!",
      timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: { '🔥': ['user-1', 'user-2'], '👍': ['user-3'] }
    },
    {
      id: 'msg-gen-2',
      channelId: 'general',
      senderId: 'ai-assistant',
      senderName: 'Fundora AI Agent',
      senderEmail: 'ai@fundora.one',
      senderRole: 'Admin',
      text: "🤖 **AI Welcome**: Welcome to the Fundora Community! Remember, minimum deposit is **10 USDT** via TRC20/BEP20. Ask me any question by typing `@AI` in your message!",
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAiGenerated: true
    }
  ]
};

const MOCK_TRUSTEES = [
  {
    id: 'admin-1',
    name: 'Fundora Support Team',
    email: 'support@fundora.one',
    role: 'Admin',
    avatar: '🛟',
    status: 'Online',
    bio: 'Official Support & Verification'
  },
  {
    id: 'ethan-ceo',
    name: 'Ethan Chiu',
    email: 'ethan@fundora.one',
    role: 'CEO',
    avatar: '👨‍💼',
    status: 'Online',
    bio: 'Chief Executive Officer, Fundora'
  }
];

export const CommunityHub: React.FC<CommunityHubProps> = ({ 
  currentUser, 
  initialChannelId = '',
  onNavigateToDeposit 
}) => {
  const [channels, setChannels] = useState<CommunityChannel[]>(DEFAULT_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI States
  const [mobileView, setMobileView] = useState<'channels' | 'chat'>('channels');
  const [activeTab, setActiveTab] = useState<'channels' | 'dms' | 'requests'>('channels');
  const [adminPersona, setAdminPersona] = useState<'admin' | 'ethan-ceo' | 'support' | 'ai-bot'>('ethan-ceo');
  const [showPollModal, setShowPollModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDmModal, setShowDmModal] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState<CommunityMessage | null>(null);

  const startDirectMessage = (trustee: typeof MOCK_TRUSTEES[0]) => {
    const dmChannelId = `dm-${trustee.id}`;
    const existingChannel = channels.find(c => c.id === dmChannelId);
    if (!existingChannel) {
      const newDmChannel: CommunityChannel = {
        id: dmChannelId,
        name: trustee.name,
        type: 'private',
        description: `Direct 1-to-1 conversation with ${trustee.name} (${trustee.role})`,
        icon: trustee.avatar,
        memberCount: 2
      };
      setChannels(prev => [...prev, newDmChannel]);

      if (!INITIAL_MESSAGES[dmChannelId]) {
        INITIAL_MESSAGES[dmChannelId] = [
          {
            id: `msg-${dmChannelId}-1`,
            channelId: dmChannelId,
            senderId: trustee.id,
            senderName: trustee.name,
            senderEmail: trustee.email,
            senderRole: (trustee.role === 'CEO' || trustee.role === 'Admin') ? 'Admin' : 'Member',
            text: trustee.id === 'ai-assistant'
              ? "🤖 Assalam o Alaikum! I am the Fundora AI Agent. How can I assist you with investment yields or property deals today?"
              : trustee.id === 'ethan-ceo'
              ? "👨‍💼 Assalam o Alaikum! I'm Ethan Chiu, CEO of Fundora. Thank you for investing with us. How can I assist you today?"
              : "🛟 Assalam o Alaikum! Welcome to Fundora Support. How can we assist you with your account, deposits, or verification today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      }
    }

    setActiveChannelId(dmChannelId);
    setMobileView('chat');
    setShowDmModal(false);
  };
  const [editingMessage, setEditingMessage] = useState<CommunityMessage | null>(null);
  const [activeThreadMessage, setActiveThreadMessage] = useState<CommunityMessage | null>(null);
  const [dailyTip, setDailyTip] = useState<{ en: string; ur: string } | null>(null);
  const [joinRequests, setJoinRequests] = useState<CommunityJoinRequest[]>([]);
  
  // Audio Voice Note Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Poll Form
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['Option 1', 'Option 2']);

  // Channel Form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelType, setNewChannelType] = useState<'public' | 'private'>('public');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChannel = channels.find(c => c.id === activeChannelId) || null;
  const isAdmin = currentUser.role === 'admin';

  // Load Daily Tip
  useEffect(() => {
    fetch('/api/ai/daily-tip')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setDailyTip({ en: data.tipEn, ur: data.tipUr });
        }
      })
      .catch(() => {
        setDailyTip({
          en: "💡 Diversify across residential and commercial property shares to maximize daily yield stability.",
          ur: "💡 روزانہ منافع اور مستحکم پیداوار کے لیے مختلف جائیدادوں میں حصہ لیں۔"
        });
      });
  }, []);

  // Sync Messages from Firestore or Fallback
  useEffect(() => {
    if (!db) {
      setMessages(INITIAL_MESSAGES[activeChannelId] || []);
      return;
    }

    try {
      const q = query(
        collection(db, 'messages'),
        where('channelId', '==', activeChannelId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const loadedMsgs: CommunityMessage[] = [];
          snapshot.forEach(docSnap => {
            loadedMsgs.push({ id: docSnap.id, ...docSnap.data() } as CommunityMessage);
          });
          // sort chronologically
          loadedMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setMessages(loadedMsgs);
        } else {
          setMessages(INITIAL_MESSAGES[activeChannelId] || []);
        }
      }, (err) => {
        console.warn("[Community Firestore Listener Warning]", err);
        setMessages(INITIAL_MESSAGES[activeChannelId] || []);
      });

      return () => unsubscribe();
    } catch (e) {
      setMessages(INITIAL_MESSAGES[activeChannelId] || []);
    }
  }, [activeChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId, mobileView]);

  useEffect(() => {
    if (activeChannelId === 'dm-ethan-ceo') {
      setAdminPersona('ethan-ceo');
    } else if (activeChannelId === 'dm-admin-1') {
      setAdminPersona('support');
    } else if (activeChannelId === 'dm-ai-assistant') {
      setAdminPersona('ai-bot');
    }
  }, [activeChannelId]);

  // Voice Note Recorder Controls
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          sendVoiceNoteMessage(base64Audio);
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access is required to send voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const sendVoiceNoteMessage = async (voiceBase64: string) => {
    const newMsg: CommunityMessage = {
      id: `msg-${Date.now()}`,
      channelId: activeChannelId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      senderAvatar: currentUser.avatarUrl,
      senderRole: isAdmin ? 'Admin' : 'Member',
      text: '🎤 Voice Note',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      voiceNoteUrl: voiceBase64
    };

    await saveMessage(newMsg);
  };

  const saveMessage = async (msg: CommunityMessage) => {
    setMessages(prev => [...prev, msg]);

    if (db) {
      try {
        await addDoc(collection(db, 'messages'), msg);
      } catch (err) {
        console.warn("[Firestore Save Message Warning]", err);
      }
    }

    const isAiDm = msg.channelId === 'dm-ai-assistant' || msg.channelId === 'dm-ai-bot' || msg.channelId.startsWith('dm-ai-');
    const isSenderUser = msg.senderId !== 'ai-assistant' && msg.senderId !== 'ai-bot';

    // Auto-reply if message is sent in DM to AI Agent or if @AI is tagged in a channel
    if (isAiDm && isSenderUser) {
      triggerAiCommunityReply(msg.text, msg.channelId);
    } else if (isSenderUser && (msg.text.includes('@AI') || msg.text.toLowerCase().includes('help') || msg.text.toLowerCase().includes('yield') || msg.text.toLowerCase().includes('deposit'))) {
      triggerAiCommunityReply(msg.text, msg.channelId);
    }

    // Executive auto-response from Ethan Chiu if a member sends a DM to Ethan Chiu
    if (msg.channelId === 'dm-ethan-ceo' && msg.senderId !== 'ethan-ceo' && !isAdmin) {
      setTimeout(async () => {
        const ceoMsg: CommunityMessage = {
          id: `ethan-reply-${Date.now()}`,
          channelId: 'dm-ethan-ceo',
          senderId: 'ethan-ceo',
          senderName: 'Ethan Chiu',
          senderEmail: 'ethan@fundora.one',
          senderAvatar: '👨‍💼',
          senderRole: 'CEO',
          text: "👨‍💼 **Ethan Chiu (CEO)**: Assalam o Alaikum! Thank you for reaching out directly. I have received your message regarding Fundora property investments. My executive office or I will review and reply shortly!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        await saveMessage(ceoMsg);
      }, 1500);
    }
  };

  const triggerAiCommunityReply = async (promptText: string, targetChannelId?: string) => {
    const channelId = targetChannelId || activeChannelId;
    const chanName = channels.find(c => c.id === channelId)?.name || 'Direct Message';
    try {
      const res = await fetch('/api/ai/community-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText, channelName: chanName })
      });
      const data = await res.json();
      const smartFallback = generateSmartFundoraAnswer(promptText, 'en', chanName);
      const replyText = (data.success && data.reply) ? data.reply : smartFallback.reply;
      
      setTimeout(async () => {
        const aiMsg: CommunityMessage = {
          id: `ai-msg-${Date.now()}`,
          channelId: channelId,
          senderId: 'ai-assistant',
          senderName: 'Fundora AI Agent',
          senderEmail: 'ai@fundora.one',
          senderAvatar: '🤖',
          senderRole: 'Admin',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAiGenerated: true
        };
        await saveMessage(aiMsg);
      }, 1000);
    } catch (e) {
      console.warn("AI reply error", e);
      const smartFallback = generateSmartFundoraAnswer(promptText, 'en', chanName);
      setTimeout(async () => {
        const aiMsg: CommunityMessage = {
          id: `ai-msg-${Date.now()}`,
          channelId: channelId,
          senderId: 'ai-assistant',
          senderName: 'Fundora AI Agent',
          senderEmail: 'ai@fundora.one',
          senderAvatar: '🤖',
          senderRole: 'Admin',
          text: smartFallback.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAiGenerated: true
        };
        await saveMessage(aiMsg);
      }, 1000);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (editingMessage) {
      const updated = messages.map(m => 
        m.id === editingMessage.id 
          ? { ...m, text: inputText, isEdited: true }
          : m
      );
      setMessages(updated);
      setEditingMessage(null);
      setInputText('');
      return;
    }

    let senderId = currentUser.id;
    let senderName = currentUser.name;
    let senderEmail = currentUser.email;
    let senderAvatar = currentUser.avatarUrl;
    let senderRole: 'Admin' | 'Member' | 'CEO' = isAdmin ? 'Admin' : 'Member';

    if (isAdmin) {
      if (adminPersona === 'ethan-ceo' || activeChannelId === 'dm-ethan-ceo') {
        senderId = 'ethan-ceo';
        senderName = 'Ethan Chiu';
        senderEmail = 'ethan@fundora.one';
        senderAvatar = '👨‍💼';
        senderRole = 'CEO';
      } else if (adminPersona === 'support' || activeChannelId === 'dm-admin-1') {
        senderId = 'admin-1';
        senderName = 'Fundora Support Team';
        senderEmail = 'support@fundora.one';
        senderAvatar = '🛟';
        senderRole = 'Admin';
      } else if (adminPersona === 'ai-bot' || activeChannelId === 'dm-ai-assistant') {
        senderId = 'ai-assistant';
        senderName = 'Fundora AI Agent';
        senderEmail = 'ai@fundora.one';
        senderAvatar = '🤖';
        senderRole = 'Admin';
      }
    }

    const newMsg: CommunityMessage = {
      id: `msg-${Date.now()}`,
      channelId: activeChannelId,
      senderId,
      senderName,
      senderEmail,
      senderAvatar,
      senderRole,
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyToId: replyingToMessage?.id,
      replyToPreview: replyingToMessage ? {
        senderName: replyingToMessage.senderName,
        text: replyingToMessage.text
      } : undefined
    };

    setInputText('');
    setReplyingToMessage(null);
    await saveMessage(newMsg);
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const currentReactions = m.reactions || {};
      const users = currentReactions[emoji] || [];
      const hasReacted = users.includes(currentUser.id);
      
      const newUsers = hasReacted 
        ? users.filter(u => u !== currentUser.id)
        : [...users, currentUser.id];

      return {
        ...m,
        reactions: {
          ...currentReactions,
          [emoji]: newUsers
        }
      };
    }));
  };

  const handleCreatePoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      alert("Please enter a question and at least 2 non-empty options.");
      return;
    }

    const pollData: PollData = {
      question: pollQuestion,
      options: pollOptions.filter(o => o.trim()).map((opt, idx) => ({
        id: `opt-${idx}`,
        text: opt,
        votes: []
      })),
      totalVotes: 0
    };

    const pollMsg: CommunityMessage = {
      id: `poll-msg-${Date.now()}`,
      channelId: activeChannelId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      senderRole: isAdmin ? 'Admin' : 'Member',
      text: `📊 Community Poll: ${pollQuestion}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      poll: pollData
    };

    saveMessage(pollMsg);
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['Option 1', 'Option 2']);
  };

  const handleVotePoll = (msgId: string, optionId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.poll) return m;

      const updatedOptions = m.poll.options.map(opt => {
        const hasVoted = opt.votes.includes(currentUser.id);
        if (opt.id === optionId) {
          return {
            ...opt,
            votes: hasVoted ? opt.votes.filter(v => v !== currentUser.id) : [...opt.votes, currentUser.id]
          };
        } else {
          // Single choice poll: remove vote from other options
          return {
            ...opt,
            votes: opt.votes.filter(v => v !== currentUser.id)
          };
        }
      });

      const totalVotes = updatedOptions.reduce((acc, curr) => acc + curr.votes.length, 0);

      return {
        ...m,
        poll: {
          ...m.poll,
          options: updatedOptions,
          totalVotes
        }
      };
    }));
  };

  const handleTranslateMessage = async (msgId: string, targetLang: 'en' | 'ur') => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text, targetLang })
      });
      const data = await res.json();
      if (data.success && data.translatedText) {
        alert(`🌐 Translation (${targetLang.toUpperCase()}):\n\n${data.translatedText}`);
      }
    } catch (e) {
      alert("Translation service currently unavailable.");
    }
  };

  const handleSummarizeThread = async () => {
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-10) })
      });
      const data = await res.json();
      if (data.success) {
        alert(`🤖 Fundora AI Discussion Summary:\n\n${data.summary}`);
      }
    } catch (e) {
      alert("AI Thread summary service active.");
    }
  };

  const filteredMessages = messages.filter(m => 
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.senderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto h-full sm:h-[calc(100vh-7rem)] flex flex-col md:flex-row bg-slate-950 rounded-none sm:rounded-2xl border-0 sm:border border-slate-800 shadow-2xl overflow-hidden my-0 sm:my-2" id="community-hub-container">
      {/* SIDEBAR: Channels & Direct Messages */}
      <div className={`w-full md:w-80 bg-slate-900 border-r border-slate-800/80 flex flex-col shrink-0 min-h-0 h-full ${mobileView === 'channels' ? 'flex flex-1' : 'hidden md:flex'}`}>
        {/* Sidebar Header */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-sky-500/20 border border-sky-400/30 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-white text-sm sm:text-base tracking-wide flex items-center gap-1.5 truncate">
                Fundora Community
              </h2>
              <p className="text-[10px] sm:text-[11px] text-sky-400 font-medium truncate">Verified Investor Network</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeChannelId && (
              <button
                onClick={() => setMobileView('chat')}
                className="md:hidden p-2 rounded-xl bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 transition text-xs font-bold"
                title="Open Active Chat"
              >
                Chat →
              </button>
            )}
            <button
              onClick={() => setShowCreateChannelModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-sky-900/40 text-sky-300 border border-slate-700 transition"
              title="Create Channel / Group"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 pt-2 flex items-center gap-1 border-b border-slate-800 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-2 rounded-t-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'channels' 
                ? 'bg-slate-800 text-sky-300 border-t-2 border-sky-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            Channels ({channels.length})
          </button>
          
          <button
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-2 rounded-t-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'dms' 
                ? 'bg-slate-800 text-sky-300 border-t-2 border-sky-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Direct Messages
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-2 px-2 rounded-t-lg transition flex items-center justify-center gap-1 ${
                activeTab === 'requests' 
                  ? 'bg-slate-800 text-amber-300 border-t-2 border-amber-400' 
                  : 'text-slate-400 hover:text-amber-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Join Requests
            </button>
          )}
        </div>

        {/* Channels List */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y overscroll-contain p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {activeTab === 'channels' && (
            <>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                Official Channels
              </div>
              {channels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannelId(ch.id);
                    setMobileView('chat');
                  }}
                  className={`w-full p-2.5 rounded-xl transition flex items-center justify-between text-left group ${
                    activeChannelId === ch.id
                      ? 'bg-gradient-to-r from-sky-600/30 via-sky-500/20 to-indigo-600/20 text-white font-bold border border-sky-500/40'
                      : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{ch.icon || '#'}</span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold truncate flex items-center gap-1">
                        <span>{ch.name}</span>
                        {ch.type === 'private' && <Lock className="w-3 h-3 text-amber-400" />}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{ch.description}</div>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-500 group-hover:text-sky-300 px-1.5 py-0.5 rounded bg-slate-950 shrink-0">
                    {ch.memberCount}
                  </span>
                </button>
              ))}
            </>
          )}

          {activeTab === 'dms' && (
            <div className="space-y-3 p-1">
              <button
                onClick={() => setShowDmModal(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Start Direct Message</span>
              </button>

              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 pt-1">
                Verified Direct Contacts
              </div>

              <div className="space-y-1">
                {MOCK_TRUSTEES.map(trustee => {
                  const dmChannelId = `dm-${trustee.id}`;
                  const isSelected = activeChannelId === dmChannelId;
                  return (
                    <button
                      key={trustee.id}
                      onClick={() => startDirectMessage(trustee)}
                      className={`w-full p-2.5 rounded-xl transition flex items-center justify-between text-left group ${
                        isSelected
                          ? 'bg-gradient-to-r from-sky-600/30 via-sky-500/20 to-indigo-600/20 text-white font-bold border border-sky-500/40'
                          : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm">
                            {trustee.avatar}
                          </div>
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                            trustee.status === 'Online' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                            <span className="truncate">{trustee.name}</span>
                            {trustee.role === 'Admin' && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{trustee.bio}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-sky-400 group-hover:text-sky-300 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                        Chat
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'requests' && isAdmin && (
            <div className="p-2 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1 mb-2">
                <ShieldCheck className="w-4 h-4" />
                Private VIP Join Requests
              </div>
              <p className="text-[11px] text-slate-400">
                All join requests for `#vip-investors` are auto-audited for $2,000+ portfolio tier requirement.
              </p>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                <div className="font-bold text-white">Tariq Mahmood</div>
                <div className="text-[10px] text-slate-400">Requested #vip-investors • Portfolio $2,500</div>
                <div className="flex items-center gap-2 mt-2">
                  <button className="flex-1 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px]">
                    Approve
                  </button>
                  <button className="flex-1 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-[10px]">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center font-bold text-white text-xs border border-sky-400/40 shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                {currentUser.name}
                {isAdmin && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active Investor
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 bg-slate-950 h-full ${mobileView === 'chat' ? 'flex flex-1' : 'hidden md:flex'}`}>
        {!activeChannel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-12 space-y-5 bg-slate-950">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-xl">
              <Users className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-xl font-extrabold text-white tracking-wide">Fundora Community</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Select a channel or direct message from the sidebar to view discussions and start chatting.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-lg">
              {channels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannelId(ch.id);
                    setMobileView('chat');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-xs text-sky-300 font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
                >
                  <span>{ch.icon || '#'}</span>
                  <span>#{ch.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-900 shadow-md flex items-center justify-between shrink-0 z-30">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => {
                    setActiveChannelId('');
                    setMobileView('channels');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-extrabold text-xs shrink-0 border border-sky-500/40 active:scale-95 transition shadow-sm"
                  title="Return to Channels & Messages"
                >
                  <ChevronLeft className="w-4 h-4 text-sky-400 stroke-[3]" />
                  <span className="text-xs font-extrabold">Back</span>
                </button>
                <span className="text-lg sm:text-xl shrink-0">{activeChannel.icon || '#'}</span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-base font-extrabold text-white flex items-center gap-1.5">
                    <span className="truncate">{activeChannel.type === 'private' ? activeChannel.name : `#${activeChannel.name}`}</span>
                    {activeChannel.isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{activeChannel.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Search Input */}
                <div className="relative hidden lg:block">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* AI Thread Summarizer */}
                <button
                  onClick={handleSummarizeThread}
                  className="px-2 sm:px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 transition"
                  title="AI Summarize Discussion"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Summarize</span>
                </button>

                {/* Create Poll Button */}
                <button
                  onClick={() => setShowPollModal(true)}
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Create Poll"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                {/* Share Invite Link */}
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition"
                  title="Invite Members"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* Close Chat Button */}
                <button
                  onClick={() => {
                    setActiveChannelId('');
                    setMobileView('channels');
                  }}
                  className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-sm"
                  title="Close Chat"
                >
                  <X className="w-4 h-4 text-red-400 stroke-[2.5]" />
                  <span className="text-xs font-bold hidden sm:inline">Close</span>
                </button>
              </div>
            </div>

        {/* Message Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto touch-pan-y overscroll-contain p-3 sm:p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-700" />
              <p className="text-sm font-semibold">No messages yet in #{activeChannel.name}</p>
              <p className="text-xs text-slate-600 max-w-sm">Be the first to start the discussion or ask a question about Fundora property yield shares!</p>
            </div>
          ) : (
            filteredMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col group ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Metadata */}
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    {msg.senderName}
                    {msg.senderRole === 'Admin' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Admin
                      </span>
                    )}
                    {msg.isAiGenerated && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        AI Agent
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>

                {/* Reply Context Preview */}
                {msg.replyToPreview && (
                  <div className="mb-1 text-[11px] p-2 rounded-lg bg-slate-900 border-l-2 border-sky-400 text-slate-400 max-w-md">
                    <strong className="text-sky-300">{msg.replyToPreview.senderName}:</strong> {msg.replyToPreview.text.slice(0, 80)}...
                  </div>
                )}

                {/* Main Message Bubble */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${
                    msg.senderId === currentUser.id
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-br-none border border-sky-400/30'
                      : msg.isPinned
                      ? 'bg-amber-950/40 text-amber-100 rounded-bl-none border border-amber-500/40'
                      : 'bg-slate-900 text-slate-200 rounded-bl-none border border-slate-800'
                  }`}
                >
                  {/* Pinned Tag */}
                  {msg.isPinned && (
                    <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1 mb-1">
                      <Pin className="w-3 h-3 fill-amber-400" />
                      Pinned Announcement
                    </div>
                  )}

                  {/* Message Content */}
                  <div>
                    {msg.text.split('\n').map((line, idx) => (
                      <p key={idx} className={idx > 0 ? 'mt-1' : ''}>
                        {line}
                      </p>
                    ))}
                    {msg.isEdited && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}
                  </div>

                  {/* Voice Note Audio Player */}
                  {msg.voiceNoteUrl && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-sky-400 shrink-0" />
                      <audio controls src={msg.voiceNoteUrl} className="h-7 w-48 max-w-full" />
                    </div>
                  )}

                  {/* Interactive Poll Rendering */}
                  {msg.poll && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="font-bold text-white text-xs sm:text-sm">{msg.poll.question}</div>
                      <div className="space-y-1.5">
                        {msg.poll.options.map(opt => {
                          const percentage = msg.poll!.totalVotes > 0 
                            ? Math.round((opt.votes.length / msg.poll!.totalVotes) * 100) 
                            : 0;
                          const hasVoted = opt.votes.includes(currentUser.id);

                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleVotePoll(msg.id, opt.id)}
                              className={`w-full p-2 rounded-lg text-left text-xs transition relative overflow-hidden border ${
                                hasVoted 
                                  ? 'border-sky-400 bg-sky-950/60 text-sky-200 font-bold' 
                                  : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                              }`}
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-sky-500/20 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                              <div className="relative z-10 flex items-center justify-between">
                                <span>{opt.text}</span>
                                <span>{percentage}% ({opt.votes.length})</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500 text-right">
                        Total Votes: {msg.poll.totalVotes}
                      </div>
                    </div>
                  )}

                  {/* Message Action Bar on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 right-2 bg-slate-900 border border-slate-700 rounded-lg p-1 flex items-center gap-1 shadow-md">
                    {/* Reactions */}
                    {['👍', '🔥', '🚀', '❤️', '👏'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className="hover:scale-125 transition p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="w-px h-3 bg-slate-700 mx-0.5" />

                    {/* Reply */}
                    <button
                      onClick={() => setReplyingToMessage(msg)}
                      className="p-1 hover:text-sky-300 text-slate-400 transition"
                      title="Reply"
                    >
                      <CornerUpRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Translate */}
                    <button
                      onClick={() => handleTranslateMessage(msg.id, 'ur')}
                      className="p-1 hover:text-sky-300 text-slate-400 transition"
                      title="Translate to Urdu"
                    >
                      <Languages className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Active Reactions Rendering */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(msg.reactions).map(([emoji, uList]) => {
                        const users = (uList || []) as string[];
                        return users.length > 0 ? (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition ${
                              users.includes(currentUser.id)
                                ? 'bg-sky-950 border-sky-400 text-sky-200'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{users.length}</span>
                          </button>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Replying Banner */}
        {replyingToMessage && (
          <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-sky-300 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <CornerUpRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Replying to <strong>{replyingToMessage.senderName}</strong>: "{replyingToMessage.text.slice(0, 50)}..."</span>
            </div>
            <button onClick={() => setReplyingToMessage(null)} className="hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Voice Note Recording State Banner */}
        {isRecording && (
          <div className="px-4 py-2 bg-red-950/80 border-t border-red-500/40 flex items-center justify-between text-xs text-red-200 animate-pulse shrink-0">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-red-400" />
              <span>Recording Voice Note... ({recordingTime}s)</span>
            </div>
            <button
              onClick={stopRecording}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition"
            >
              Send Voice Note
            </button>
          </div>
        )}

        {/* Admin Identity Switcher Banner */}
        {isAdmin && (
          <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-[11px] text-amber-300">Reply As:</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              <button
                type="button"
                onClick={() => setAdminPersona('ethan-ceo')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                  adminPersona === 'ethan-ceo'
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <span>👨‍💼</span>
                <span>Ethan Chiu (CEO)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminPersona('support')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                  adminPersona === 'support'
                    ? 'bg-sky-500/25 text-sky-200 border border-sky-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <span>🛟</span>
                <span>Support Team</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminPersona('ai-bot')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                  adminPersona === 'ai-bot'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <span>🤖</span>
                <span>AI Agent</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminPersona('admin')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                  adminPersona === 'admin'
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/50 shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <span>👤</span>
                <span>Admin ({currentUser.name})</span>
              </button>
            </div>
          </div>
        )}

        {/* Chat Input Box */}
        <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
            {/* Poll Trigger */}
            <button
              type="button"
              onClick={() => setShowPollModal(true)}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-sky-300 transition shrink-0"
              title="Create Poll"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            {/* Voice Recorder Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 sm:p-2.5 rounded-xl transition shrink-0 ${
                isRecording 
                  ? 'bg-red-600 text-white animate-bounce' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-sky-300'
              }`}
              title="Record Voice Note"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={activeChannel ? `Message #${activeChannel.name}...` : 'Select a channel...'}
              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />

            {/* Submit Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 text-white shadow-md shadow-sky-500/20 transition flex items-center justify-center shrink-0 gap-1 font-bold text-xs cursor-pointer active:scale-95"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
          </>
        )}
      </div>

      {/* MODAL: Create Poll */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-sky-400" />
                Create Community Poll
              </h3>
              <button onClick={() => setShowPollModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Poll Question</label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g., Which property yields interest you most?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Poll Choices</label>
                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[idx] = e.target.value;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                  className="text-xs text-sky-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPollModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold hover:from-sky-400"
              >
                Post Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Share Invite Link */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Share2 className="w-5 h-5 text-sky-400" />
                Invite Members to #{activeChannel ? activeChannel.name : 'channel'}
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Share this direct invite link with fellow real estate investors to join Fundora Community.
              </p>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Shareable Channel Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://fundora.one/#/community?join=${activeChannel ? (activeChannel.inviteCode || activeChannel.id) : ''}`}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-sky-300 font-mono"
                  />
                  <button
                    onClick={() => {
                      if (activeChannel) {
                        navigator.clipboard.writeText(`https://fundora.one/#/community?join=${activeChannel.inviteCode || activeChannel.id}`);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition flex items-center gap-1 text-xs"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Start Direct Message */}
      {showDmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-400" />
                Start Direct Message
              </h3>
              <button onClick={() => setShowDmModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={dmSearchQuery}
                onChange={(e) => setDmSearchQuery(e.target.value)}
                placeholder="Search verified trustees or admins..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {MOCK_TRUSTEES.filter(t => 
                t.name.toLowerCase().includes(dmSearchQuery.toLowerCase()) || 
                t.role.toLowerCase().includes(dmSearchQuery.toLowerCase())
              ).map(trustee => (
                <div
                  key={trustee.id}
                  onClick={() => startDirectMessage(trustee)}
                  className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-base">
                        {trustee.avatar}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{trustee.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-sky-300 font-medium">
                          {trustee.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{trustee.bio}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startDirectMessage(trustee);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shrink-0 transition"
                  >
                    Message
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
