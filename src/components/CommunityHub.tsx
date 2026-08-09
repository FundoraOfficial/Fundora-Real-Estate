import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  CommunityJoinRequest,
  Inquiry
} from '../types';
import { generateSmartFundoraAnswer } from '../lib/aiKnowledgeEngine';
import { db, cleanPayloadForFirestore } from '../lib/firebase';
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
  inquiriesList?: Inquiry[];
  onSubmitInquiry?: (name: string, email: string, message: string, channelId?: string, customInqId?: string) => Promise<void> | void;
  onUpdateInquiry?: (inquiry: Inquiry) => Promise<void> | void;
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
    id: 'tips',
    name: 'investment-tips',
    type: 'announcement',
    description: 'Daily AI tips, portfolio strategies & daily rental claims',
    icon: '💡',
    memberCount: 2150,
    isLocked: true,
    allowedRoles: ['Owner', 'Admin']
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
      text: "🚀 **Fundora Official Announcement**: We are thrilled to roll out our Native AI Investment Community! Official announcements, property listings, and yield updates will be posted here.\n\nUK Companies House Registration No. 16870956.",
      timestamp: new Date(Date.now() - 3600000 * 4).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isPinned: true
    }
  ],
  tips: [
    {
      id: 'msg-tips-1',
      channelId: 'tips',
      senderId: 'ai-assistant',
      senderName: 'Fundora AI Agent',
      senderEmail: 'ai@fundora.one',
      senderRole: 'Admin',
      text: "💡 **Daily Investment Tip**: Reinvesting your daily 1.2% rental yield claims accelerates compound returns. Diversify across residential and commercial property shares for stable daily passive income.",
      timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAiGenerated: true
    }
  ]
};

const getStoredLocalDms = (): CommunityMessage[] => {
  try {
    const raw = localStorage.getItem('fundora_community_messages');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalDmMessage = (msg: CommunityMessage) => {
  try {
    const existing = getStoredLocalDms();
    if (!existing.some(m => m.id === msg.id)) {
      const updated = [...existing, msg];
      localStorage.setItem('fundora_community_messages', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.warn("Failed to persist DM to localStorage", e);
  }
};

const MOCK_TRUSTEES = [
  {
    id: 'admin-1',
    name: 'Fundora Support Team',
    email: 'fundora.one@gmail.com',
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
  initialChannelId = 'announcements',
  onNavigateToDeposit,
  inquiriesList = [],
  onSubmitInquiry,
  onUpdateInquiry
}) => {
  const [channels, setChannels] = useState<CommunityChannel[]>(DEFAULT_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId || 'announcements');
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

  // Attachment Upload State
  const [selectedAttachment, setSelectedAttachment] = useState<{
    url: string;
    name: string;
    type: 'image' | 'video' | 'document';
    size?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit. Please select a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      let type: 'image' | 'video' | 'document' = 'document';
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      }

      const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };

      setSelectedAttachment({
        url: base64Data,
        name: file.name,
        type,
        size: formatSize(file.size)
      });
    };
  };

  // Effective visitor identity for DM separation (works for both logged-in users and guest/unauthenticated viewers)
  const effectiveUser = useMemo(() => {
    if (currentUser && (currentUser.name || currentUser.email)) {
      return {
        id: currentUser.id || 'usr-investor',
        name: currentUser.name || currentUser.email?.split('@')[0] || 'Active Investor',
        email: currentUser.email || 'investor@fundora.one',
        avatar: currentUser.avatarUrl || '👤',
        isGuest: false
      };
    }
    let guestId = localStorage.getItem('fundora_guest_dm_id');
    let guestName = localStorage.getItem('fundora_guest_dm_name');
    if (!guestId) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      guestId = `guest-${rand}`;
      guestName = `Investor Guest #${rand}`;
      localStorage.setItem('fundora_guest_dm_id', guestId);
      localStorage.setItem('fundora_guest_dm_name', guestName);
    }
    return { id: guestId, name: guestName || 'Investor Guest', email: `${guestId}@guest.fundora.one`, avatar: '👤', isGuest: true };
  }, [currentUser]);

  const [allDmMessages, setAllDmMessages] = useState<CommunityMessage[]>([]);

  // Subscribe to all DM messages across Firestore and localStorage
  useEffect(() => {
    // 1. Load local DM messages immediately
    const localDms = getStoredLocalDms();
    if (localDms.length > 0) {
      setAllDmMessages(prev => {
        const msgMap = new Map<string, CommunityMessage>();
        prev.forEach(m => msgMap.set(m.id, m));
        localDms.forEach(m => msgMap.set(m.id, m));
        return Array.from(msgMap.values());
      });
    }

    // 2. Storage event listener for multi-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fundora_community_messages') {
        const dms = getStoredLocalDms();
        setAllDmMessages(prev => {
          const msgMap = new Map<string, CommunityMessage>();
          prev.forEach(m => msgMap.set(m.id, m));
          dms.forEach(m => msgMap.set(m.id, m));
          return Array.from(msgMap.values());
        });
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Firestore snapshot listener
    if (!db) {
      return () => window.removeEventListener('storage', handleStorageChange);
    }

    try {
      const q = query(collection(db, 'messages'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loaded: CommunityMessage[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as CommunityMessage;
          if (data.channelId && data.channelId.startsWith('dm-')) {
            loaded.push({ id: docSnap.id, ...data });
          }
        });

        // Merge Firestore loaded docs with local store
        setAllDmMessages(prev => {
          const msgMap = new Map<string, CommunityMessage>();
          getStoredLocalDms().forEach(m => msgMap.set(m.id, m));
          prev.forEach(m => msgMap.set(m.id, m));
          loaded.forEach(m => msgMap.set(m.id, m));
          return Array.from(msgMap.values());
        });
      }, (err) => {
        console.warn("[DM Snapshot Listener Warning]", err);
      });

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        unsubscribe();
      };
    } catch (e) {
      console.warn("[DM Snapshot Warning]", e);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

// Helper function to check if a message belongs to a DM channel
const isMessageInDmChannel = (m: CommunityMessage, targetChanId: string, currentUserId?: string, currentUserEmail?: string): boolean => {
  if (!m || !m.channelId) return false;
  if (m.channelId === targetChanId) return true;
  if (!targetChanId.startsWith('dm-')) return false;

  const getTargetBase = (cid: string) => {
    if (cid.includes('ethan-ceo')) return 'ethan-ceo';
    if (cid.includes('admin-1') || cid.includes('support')) return 'admin-1';
    if (cid.includes('ai-assistant') || cid.includes('ai-bot')) return 'ai-assistant';
    return '';
  };

  const targetBase = getTargetBase(targetChanId);
  const mTargetBase = getTargetBase(m.channelId);

  if (!targetBase || targetBase !== mTargetBase) return false;

  const userPart = targetChanId.replace(`dm-${targetBase}-`, '').replace(`dm-${targetBase}`, '');

  if (m.channelId === `dm-${targetBase}`) {
    if (userPart && (m.senderId === userPart || (currentUserId && userPart === currentUserId) || m.senderEmail === currentUserEmail)) return true;
    if (m.senderId === 'ethan-ceo' || m.senderId === 'admin-1' || m.senderId === 'ai-assistant') return true;
  }

  return false;
};

  const userDmThreads = useMemo(() => {
    const dmMap = new Map<string, CommunityMessage>();

    // Combine static INITIAL_MESSAGES for DMs, localStorage, and Firestore DM messages
    Object.entries(INITIAL_MESSAGES).forEach(([chanId, msgList]) => {
      if (chanId.startsWith('dm-')) {
        msgList.forEach(m => dmMap.set(m.id, m));
      }
    });

    getStoredLocalDms().forEach(m => {
      if (m.channelId && m.channelId.startsWith('dm-')) {
        dmMap.set(m.id, m);
      }
    });

    allDmMessages.forEach(m => dmMap.set(m.id, m));

    const allDms = Array.from(dmMap.values());
    const grouped = new Map<string, CommunityMessage[]>();

    allDms.forEach(m => {
      if (!m.channelId || !m.channelId.startsWith('dm-')) return;
      
      let canonicalChanId = m.channelId;
      if (m.channelId === 'dm-ethan-ceo' || m.channelId === 'dm-admin-1' || m.channelId === 'dm-ai-assistant') {
        if (m.senderId && m.senderId !== 'ethan-ceo' && m.senderId !== 'admin-1' && m.senderId !== 'ai-assistant') {
          canonicalChanId = `${m.channelId}-${m.senderId}`;
        }
      }

      if (!grouped.has(canonicalChanId)) {
        grouped.set(canonicalChanId, []);
      }
      grouped.get(canonicalChanId)!.push(m);
    });

    const threads: Array<{
      channelId: string;
      targetId: string;
      targetCategoryName: string;
      targetAvatar: string;
      userId: string;
      userName: string;
      userEmail: string;
      userAvatar: string;
      lastMessageText: string;
      lastTimestamp: string;
      lastCreatedAt: number;
      messageCount: number;
      hasPendingInquiry: boolean;
    }> = [];

    grouped.forEach((msgList, chanId) => {
      msgList.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const lastMsg = msgList[msgList.length - 1];

      let targetId = 'ethan-ceo';
      let targetCategoryName = 'Ethan Chiu (CEO)';
      let targetAvatar = '👨‍💼';

      if (chanId.includes('admin-1') || chanId.includes('support')) {
        targetId = 'admin-1';
        targetCategoryName = 'Fundora Support Team';
        targetAvatar = '🛟';
      } else if (chanId.includes('ai-assistant') || chanId.includes('ai-bot')) {
        targetId = 'ai-assistant';
        targetCategoryName = 'Fundora AI Agent';
        targetAvatar = '🤖';
      }

      // Find non-admin sender messages in this channel
      const userMsgs = msgList.filter(m => m.senderId !== 'ethan-ceo' && m.senderId !== 'admin-1' && m.senderId !== 'ai-assistant');
      const bestUserMsg = [...userMsgs].reverse().find(m => m.senderName && m.senderName !== 'Community Member' && m.senderName !== 'Guest Visitor' && !m.senderName.startsWith('General ')) || userMsgs[userMsgs.length - 1] || userMsgs[0];

      const customInqId = `inq-dm-${chanId}`;
      const matchingInq = inquiriesList.find(i => i.channelId === chanId || i.id === customInqId);

      let userId = bestUserMsg?.senderId || chanId.replace(/^dm-(ethan-ceo|admin-1|ai-assistant)-?/, '') || 'user';
      let userName = bestUserMsg?.senderName;
      let userEmail = bestUserMsg?.senderEmail || matchingInq?.email || (userId.startsWith('guest-') ? `${userId}@guest.fundora.one` : 'user@fundora.one');
      let userAvatar = bestUserMsg?.senderAvatar || '👤';

      // 1. Resolve name from Inquiry record if message name is generic
      if ((!userName || userName === 'Community Member' || userName.startsWith('General ')) && matchingInq && matchingInq.name && matchingInq.name !== 'Community Member') {
        userName = matchingInq.name;
      }

      // 2. Resolve name from user email if available
      if ((!userName || userName === 'Community Member') && userEmail && userEmail !== 'user@fundora.one') {
        const prefix = userEmail.split('@')[0];
        userName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }

      // 3. Fallback name formatting
      if (!userName || userName === 'Community Member') {
        if (chanId === 'dm-ethan-ceo') userName = 'General Executive Channel';
        else if (chanId === 'dm-admin-1') userName = 'General Support Channel';
        else if (userId.startsWith('guest-')) userName = `Guest (${userId.slice(-4)})`;
        else userName = `User (${userId.slice(-6)})`;
      }

      const hasPendingInq = (matchingInq && matchingInq.status === 'Pending') || false;
      const lastSenderIsUser = lastMsg && lastMsg.senderId !== 'ethan-ceo' && lastMsg.senderId !== 'admin-1' && lastMsg.senderId !== 'ai-assistant';

      threads.push({
        channelId: chanId,
        targetId,
        targetCategoryName,
        targetAvatar,
        userId,
        userName,
        userEmail,
        userAvatar,
        lastMessageText: lastMsg ? lastMsg.text : 'Direct conversation started',
        lastTimestamp: lastMsg ? lastMsg.timestamp : 'Just now',
        lastCreatedAt: lastMsg ? (lastMsg.createdAt || Date.now()) : Date.now(),
        messageCount: msgList.length,
        hasPendingInquiry: hasPendingInq || lastSenderIsUser
      });
    });

    // Also include threads from inquiriesList if any DM channel has an inquiry record but no message doc yet
    inquiriesList.forEach(inq => {
      if (inq.channelId && inq.channelId.startsWith('dm-') && !grouped.has(inq.channelId)) {
        let targetId = 'ethan-ceo';
        let targetCategoryName = 'Ethan Chiu (CEO)';
        let targetAvatar = '👨‍💼';

        if (inq.channelId.includes('admin-1') || inq.channelId.includes('support')) {
          targetId = 'admin-1';
          targetCategoryName = 'Fundora Support Team';
          targetAvatar = '🛟';
        } else if (inq.channelId.includes('ai-assistant') || inq.channelId.includes('ai-bot')) {
          targetId = 'ai-assistant';
          targetCategoryName = 'Fundora AI Agent';
          targetAvatar = '🤖';
        }

        const cleanText = inq.message.replace(/^💬\s*\[.*?\]:\s*/, '');
        const uId = inq.channelId.replace(/^dm-(ethan-ceo|admin-1|ai-assistant)-?/, '') || 'user';

        threads.push({
          channelId: inq.channelId,
          targetId,
          targetCategoryName,
          targetAvatar,
          userId: uId,
          userName: inq.name || 'Community Member',
          userEmail: inq.email || 'user@fundora.one',
          userAvatar: '👤',
          lastMessageText: cleanText,
          lastTimestamp: inq.timestamp ? new Date(inq.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          lastCreatedAt: inq.timestamp ? new Date(inq.timestamp).getTime() : Date.now(),
          messageCount: 1,
          hasPendingInquiry: inq.status === 'Pending'
        });
      }
    });

    return threads.sort((a, b) => b.lastCreatedAt - a.lastCreatedAt);
  }, [allDmMessages, messages, inquiriesList]);

  const startDirectMessage = (trustee: typeof MOCK_TRUSTEES[0]) => {
    let dmChannelId = `dm-${trustee.id}`;
    const isAdminUser = currentUser?.role === 'admin' || currentUser?.isAdmin;

    // For non-admin members/guests, isolate DM channel per user
    if (!isAdminUser) {
      dmChannelId = `dm-${trustee.id}-${effectiveUser.id}`;
    }

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
              ? "👨‍💼 Assalam o Alaikum! I'm Ethan Chiu, CEO of Fundora. Thank you for reaching out directly. How can I assist you today?"
              : "🛟 Assalam o Alaikum! Welcome to Fundora Support. How can we assist you with your account, deposits, or verification today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: Date.now()
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

  const isAdmin = currentUser?.role === 'admin';

  const activeChannel = useMemo(() => {
    const found = channels.find(c => c.id === activeChannelId);
    if (found) return found;

    if (activeChannelId.startsWith('dm-')) {
      let targetName = 'Direct Message';
      let icon = '💬';
      let desc = 'Direct 1-to-1 conversation';

      if (activeChannelId.includes('ethan-ceo')) {
        targetName = 'Ethan Chiu (CEO)';
        icon = '👨‍💼';
        desc = 'Direct executive message with Ethan Chiu, CEO of Fundora';
      } else if (activeChannelId.includes('admin-1') || activeChannelId.includes('support')) {
        targetName = 'Fundora Support Team';
        icon = '🛟';
        desc = 'Direct support conversation with Fundora Support Team';
      } else if (activeChannelId.includes('ai-assistant') || activeChannelId.includes('ai-bot')) {
        targetName = 'Fundora AI Agent';
        icon = '🤖';
        desc = 'Direct conversation with Fundora AI Agent';
      }

      const thread = userDmThreads.find(t => t.channelId === activeChannelId);
      if (thread && isAdmin) {
        desc = `Direct conversation between ${targetName} and ${thread.userName} (${thread.userEmail})`;
      }

      return {
        id: activeChannelId,
        name: targetName,
        type: 'private' as const,
        description: desc,
        icon,
        memberCount: 2
      };
    }

    return null;
  }, [channels, activeChannelId, userDmThreads, isAdmin]);

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
    // Auto-canonicalize bare DM channel for non-admin users
    if (!isAdmin && activeChannelId.startsWith('dm-') && !activeChannelId.includes(effectiveUser.id)) {
      const canonical = `${activeChannelId}-${effectiveUser.id}`;
      setActiveChannelId(canonical);
      return;
    }

    const initialForChan = (INITIAL_MESSAGES[activeChannelId] || []).filter(m => isMessageInDmChannel(m, activeChannelId, effectiveUser.id, effectiveUser.email));
    const localDmsForChan = getStoredLocalDms().filter(m => isMessageInDmChannel(m, activeChannelId, effectiveUser.id, effectiveUser.email));
    const dmsForChan = activeChannelId.startsWith('dm-') 
      ? allDmMessages.filter(m => isMessageInDmChannel(m, activeChannelId, effectiveUser.id, effectiveUser.email)) 
      : [];

    const mergeAndSet = (firestoreMsgs: CommunityMessage[] = []) => {
      const msgMap = new Map<string, CommunityMessage>();
      initialForChan.forEach(m => msgMap.set(m.id, m));
      localDmsForChan.forEach(m => msgMap.set(m.id, m));
      dmsForChan.forEach(m => msgMap.set(m.id, m));
      firestoreMsgs.forEach(m => {
        if (isMessageInDmChannel(m, activeChannelId, effectiveUser.id, effectiveUser.email) || !activeChannelId.startsWith('dm-')) {
          msgMap.set(m.id, m);
        }
      });

      // Synthesize user inquiry message if no user message exists in this DM channel yet
      if (activeChannelId.startsWith('dm-')) {
        const customInqId = `inq-dm-${activeChannelId}`;
        const matchingInq = inquiriesList.find(i => i.channelId === activeChannelId || i.id === customInqId);
        if (matchingInq && matchingInq.message) {
          const userMsgsInMap = Array.from(msgMap.values()).filter(m => 
            m.senderId !== 'ethan-ceo' && m.senderId !== 'admin-1' && m.senderId !== 'ai-assistant'
          );
          if (userMsgsInMap.length === 0) {
            const cleanText = matchingInq.message.replace(/^💬\s*\[.*?\]:\s*/, '');
            const synthMsg: CommunityMessage = {
              id: `inq-msg-${matchingInq.id}`,
              channelId: activeChannelId,
              senderId: activeChannelId.replace(/^dm-(ethan-ceo|admin-1|ai-assistant)-?/, '') || 'user-inq',
              senderName: matchingInq.name || 'Community Member',
              senderEmail: matchingInq.email || 'user@fundora.one',
              senderAvatar: '👤',
              senderRole: 'Member',
              text: cleanText,
              timestamp: matchingInq.timestamp ? new Date(matchingInq.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
              createdAt: matchingInq.timestamp ? new Date(matchingInq.timestamp).getTime() : (Date.now() - 1000)
            };
            msgMap.set(synthMsg.id, synthMsg);
          }
        }
      }

      const combined = Array.from(msgMap.values());
      combined.sort((a, b) => {
        const tA = a.createdAt || (a.timestamp && !a.timestamp.includes('M') ? new Date(a.timestamp).getTime() : 0) || 0;
        const tB = b.createdAt || (b.timestamp && !b.timestamp.includes('M') ? new Date(b.timestamp).getTime() : 0) || 0;
        return tA - tB;
      });
      setMessages(combined);
    };

    if (!db) {
      mergeAndSet([]);
      return;
    }

    try {
      const q = query(
        collection(db, 'messages'),
        where('channelId', '==', activeChannelId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedMsgs: CommunityMessage[] = [];
        snapshot.forEach(docSnap => {
          loadedMsgs.push({ id: docSnap.id, ...docSnap.data() } as CommunityMessage);
        });
        mergeAndSet(loadedMsgs);
      }, (err) => {
        console.warn("[Community Firestore Listener Warning]", err);
        mergeAndSet([]);
      });

      return () => unsubscribe();
    } catch (e) {
      mergeAndSet([]);
    }
  }, [activeChannelId, allDmMessages, inquiriesList]);

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
    let senderId = effectiveUser.id;
    let senderName = effectiveUser.name;
    let senderEmail = effectiveUser.email;
    let senderAvatar = effectiveUser.avatar;

    if (isAdmin) {
      if (adminPersona === 'ethan-ceo' || activeChannelId.includes('ethan-ceo')) {
        senderId = 'ethan-ceo';
        senderName = 'Ethan Chiu';
        senderEmail = 'ethan@fundora.one';
        senderAvatar = '👨‍💼';
      } else if (adminPersona === 'support' || activeChannelId.includes('admin-1')) {
        senderId = 'admin-1';
        senderName = 'Fundora Support Team';
        senderEmail = 'fundora.one@gmail.com';
        senderAvatar = '🛟';
      }
    }

    const newMsg: CommunityMessage = {
      id: `msg-${Date.now()}`,
      channelId: activeChannelId,
      senderId,
      senderName,
      senderEmail,
      senderAvatar,
      senderRole: isAdmin ? 'Admin' : 'Member',
      text: '🎤 Voice Note',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      voiceNoteUrl: voiceBase64
    };

    await saveMessage(newMsg);
  };

  const saveMessage = async (msg: CommunityMessage) => {
    const fullMsg: CommunityMessage = {
      ...msg,
      createdAt: msg.createdAt || Date.now()
    };

    saveLocalDmMessage(fullMsg);

    // 1. Update static fallback store array for this channel so local state never loses sent messages
    if (!INITIAL_MESSAGES[fullMsg.channelId]) {
      INITIAL_MESSAGES[fullMsg.channelId] = [];
    }
    if (!INITIAL_MESSAGES[fullMsg.channelId].some(m => m.id === fullMsg.id)) {
      INITIAL_MESSAGES[fullMsg.channelId].push(fullMsg);
    }

    // 2. Update React messages state
    setMessages(prev => {
      if (prev.some(m => m.id === fullMsg.id)) return prev;
      const updated = [...prev, fullMsg];
      return updated.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    });

    // 3. Update allDmMessages if this is a DM message
    if (fullMsg.channelId.startsWith('dm-')) {
      setAllDmMessages(prev => {
        if (prev.some(m => m.id === fullMsg.id)) return prev;
        return [...prev, fullMsg];
      });
    }

    // 3. Save to Firestore messages collection using setDoc with fixed id
    if (db) {
      try {
        await setDoc(doc(db, 'messages', fullMsg.id), cleanPayloadForFirestore(fullMsg));
      } catch (err) {
        console.warn("[Firestore Save Message Warning]", err);
      }
    }

    // 4. Handle DM inquiry status and AI smart response
    const isUserSender = fullMsg.senderId !== 'ethan-ceo' && fullMsg.senderId !== 'admin-1' && fullMsg.senderId !== 'ai-assistant';
    const isDmChannel = fullMsg.channelId.startsWith('dm-');

    // When user sends a DM, ALWAYS record/update the Pending Inquiry record so Admin sees the message in Admin Panel & DM Threads
    if (isUserSender && isDmChannel) {
      const isEthan = fullMsg.channelId.includes('ethan-ceo');
      const isSupport = fullMsg.channelId.includes('admin-1') || fullMsg.channelId.includes('support');
      const targetDesc = isEthan ? 'Ethan Chiu (CEO)' : isSupport ? 'Support Team' : 'Direct DM';
      const customInqId = `inq-dm-${fullMsg.channelId}`;
      const inqMessage = `💬 [Direct DM to ${targetDesc}]: ${fullMsg.text}`;

      if (onSubmitInquiry) {
        onSubmitInquiry(
          fullMsg.senderName || effectiveUser.name,
          fullMsg.senderEmail || effectiveUser.email,
          inqMessage,
          fullMsg.channelId,
          customInqId
        );
      }

      if (db) {
        try {
          const inqData = {
            id: customInqId,
            name: fullMsg.senderName || effectiveUser.name,
            email: fullMsg.senderEmail || effectiveUser.email,
            message: inqMessage,
            timestamp: new Date().toISOString(),
            status: 'Pending',
            channelId: fullMsg.channelId
          };
          await setDoc(doc(db, 'inquiries', customInqId), cleanPayloadForFirestore(inqData));
        } catch (e) {
          console.warn("[Inquiry Record Sync Warning]", e);
        }
      }
    }

    // When admin manually posts a reply in DM, resolve matching inquiry to clear red unread badge
    if (!isUserSender && (isAdmin || fullMsg.senderId === 'ethan-ceo' || fullMsg.senderId === 'admin-1')) {
      const customInqId = `inq-dm-${fullMsg.channelId}`;
      const matchingInq = inquiriesList.find(i => i.channelId === fullMsg.channelId || i.id === customInqId);
      if (matchingInq && onUpdateInquiry) {
        onUpdateInquiry({
          ...matchingInq,
          status: 'Resolved',
          message: `${matchingInq.message}\n\n✅ [Executive Reply]: ${fullMsg.text}`
        });
      }
      if (db) {
        try {
          await setDoc(doc(db, 'inquiries', customInqId), cleanPayloadForFirestore({
            id: customInqId,
            name: fullMsg.senderName || 'Community Member',
            email: fullMsg.senderEmail || 'user@fundora.one',
            message: `Resolved via Executive DM`,
            timestamp: new Date().toISOString(),
            status: 'Resolved',
            channelId: fullMsg.channelId
          }));
        } catch (e) {
          console.warn("[Inquiry Resolve Warning]", e);
        }
      }
    }

    // Auto-reply with AI agent for user questions in DMs or when tagging @AI
    if (isUserSender && (isDmChannel || fullMsg.text.includes('@AI'))) {
      triggerAiCommunityReply(fullMsg.text, fullMsg.channelId, fullMsg);
    }
  };

  const triggerAiCommunityReply = async (promptText: string, targetChannelId: string, userMsg: CommunityMessage) => {
    const channelId = targetChannelId || activeChannelId;
    const chanName = channels.find(c => c.id === channelId)?.name || 'Direct Message';

    // 1. Evaluate smart website knowledge engine
    const smartFallback = generateSmartFundoraAnswer(promptText, 'en', chanName);

    let replyText = smartFallback.reply;
    const needsEscalation = smartFallback.escalate;

    // If question IS relevant to website content: AI answers directly using Gemini API
    if (!needsEscalation) {
      try {
        const res = await fetch('/api/ai/community-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promptText, channelName: chanName })
        });
        const data = await res.json();
        if (data.success && data.reply) {
          replyText = data.reply;
        }
      } catch (e) {
        console.warn("AI reply server endpoint fallback to local knowledge engine", e);
      }
    } else {
      // Question is IRRELEVANT to website content or requires manual executive review:
      replyText = `🤖 **Fundora AI Agent**: Assalam o Alaikum! Your question falls outside standard platform FAQs or requires personal executive attention. I have forwarded your direct message to CEO Ethan Chiu & Support!\n\nAn administrator will review your message and reply directly in this chat shortly.`;
    }

    // Deliver AI reply into the chat
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
        createdAt: Date.now(),
        isAiGenerated: true
      };

      await saveMessage(aiMsg);
    }, 600);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((activeChannel?.isLocked || activeChannel?.type === 'announcement') && !isAdmin) {
      return;
    }
    if (!inputText.trim() && !selectedAttachment) return;

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

    let senderId = effectiveUser.id;
    let senderName = effectiveUser.name;
    let senderEmail = effectiveUser.email;
    let senderAvatar = effectiveUser.avatar;
    let senderRole: 'Admin' | 'Member' | 'CEO' = isAdmin ? 'Admin' : 'Member';

    if (isAdmin) {
      if (adminPersona === 'ethan-ceo' || activeChannelId.includes('ethan-ceo')) {
        senderId = 'ethan-ceo';
        senderName = 'Ethan Chiu';
        senderEmail = 'ethan@fundora.one';
        senderAvatar = '👨‍💼';
        senderRole = 'CEO';
      } else if (adminPersona === 'support' || activeChannelId.includes('admin-1')) {
        senderId = 'admin-1';
        senderName = 'Fundora Support Team';
        senderEmail = 'fundora.one@gmail.com';
        senderAvatar = '🛟';
        senderRole = 'Admin';
      } else if (adminPersona === 'ai-bot' || activeChannelId.includes('ai-assistant')) {
        senderId = 'ai-assistant';
        senderName = 'Fundora AI Agent';
        senderEmail = 'ai@fundora.one';
        senderAvatar = '🤖';
        senderRole = 'Admin';
      }
    }

    let targetChannelId = activeChannelId;
    if (!isAdmin && targetChannelId.startsWith('dm-') && !targetChannelId.includes(effectiveUser.id)) {
      targetChannelId = `${targetChannelId}-${effectiveUser.id}`;
      setActiveChannelId(targetChannelId);
    }

    const newMsg: CommunityMessage = {
      id: `msg-${Date.now()}`,
      channelId: targetChannelId,
      senderId,
      senderName,
      senderEmail,
      senderAvatar,
      senderRole,
      text: inputText || (selectedAttachment ? `[Attachment: ${selectedAttachment.name}]` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
      replyToId: replyingToMessage?.id,
      replyToPreview: replyingToMessage ? {
        senderName: replyingToMessage.senderName,
        text: replyingToMessage.text
      } : undefined,
      attachmentUrl: selectedAttachment?.url,
      attachmentType: selectedAttachment?.type,
      attachmentName: selectedAttachment?.name
    };

    setInputText('');
    setSelectedAttachment(null);
    setReplyingToMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await saveMessage(newMsg);
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const currentReactions = m.reactions || {};
      const users = currentReactions[emoji] || [];
      const hasReacted = users.includes(effectiveUser.id);
      
      const newUsers = hasReacted 
        ? users.filter(u => u !== effectiveUser.id)
        : [...users, effectiveUser.id];

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
      senderId: effectiveUser.id,
      senderName: effectiveUser.name,
      senderEmail: effectiveUser.email,
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
        const hasVoted = opt.votes.includes(effectiveUser.id);
        if (opt.id === optionId) {
          return {
            ...opt,
            votes: hasVoted ? opt.votes.filter(v => v !== effectiveUser.id) : [...opt.votes, effectiveUser.id]
          };
        } else {
          // Single choice poll: remove vote from other options
          return {
            ...opt,
            votes: opt.votes.filter(v => v !== effectiveUser.id)
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
            {isAdmin && (
              <button
                onClick={() => setShowCreateChannelModal(true)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-sky-900/40 text-sky-300 border border-slate-700 transition"
                title="Create Channel / Group"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
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

              {!isAdmin ? (
                <>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 pt-1">
                    Direct Message Contacts
                  </div>

                  <div className="space-y-1">
                    {MOCK_TRUSTEES.map(trustee => {
                      const dmChannelId = `dm-${trustee.id}-${effectiveUser.id}`;
                      const isSelected = activeChannelId === dmChannelId || activeChannelId === `dm-${trustee.id}`;
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
                                {trustee.role === 'CEO' && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
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
                </>
              ) : (
                /* Admin View: Grouped by Category with Separate User Chat Boxes */
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 pt-1 border-b border-slate-800/80 pb-1">
                    👥 User Direct Message Threads (Admin Hub)
                  </div>
                  {MOCK_TRUSTEES.map(trustee => {
                    const categoryThreads = userDmThreads.filter(t => t.targetId === trustee.id || (trustee.id === 'ethan-ceo' && t.channelId.includes('ethan-ceo')) || (trustee.id === 'admin-1' && (t.channelId.includes('admin-1') || t.channelId.includes('support'))));
                    
                    return (
                      <div key={trustee.id} className="space-y-1">
                        <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-bold text-sky-300 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <span>{trustee.avatar}</span>
                            <span>{trustee.name} ({categoryThreads.length} User Chats)</span>
                          </span>
                        </div>
                        {categoryThreads.length === 0 ? (
                          <div className="px-3 py-1.5 text-[10px] text-slate-500 italic">No user messages yet under this category</div>
                        ) : (
                          categoryThreads.map(thread => {
                            const isSelected = activeChannelId === thread.channelId;
                            return (
                              <button
                                key={thread.channelId}
                                onClick={() => {
                                  setActiveChannelId(thread.channelId);
                                  setMobileView('chat');
                                }}
                                className={`w-full p-2.5 rounded-xl transition flex items-center justify-between text-left group ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-sky-600/30 via-sky-500/20 to-indigo-600/20 text-white font-bold border border-sky-500/40'
                                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs shrink-0">
                                    {thread.userAvatar}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                      <span className="truncate">{thread.userName}</span>
                                      <span className="text-[9px] font-normal text-slate-400">{thread.lastTimestamp}</span>
                                    </div>
                                    <div className="text-[10px] font-medium text-sky-400/90 truncate">{thread.userEmail}</div>
                                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{thread.lastMessageText}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {thread.hasPendingInquiry && (
                                    <span className="text-[9px] font-extrabold text-white px-2 py-0.5 rounded-full bg-red-600 border border-red-400 shadow-md shadow-red-600/50 animate-pulse flex items-center gap-0.5">
                                      🚩 New
                                    </span>
                                  )}
                                  <span className="text-[9px] font-semibold text-amber-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                                    {thread.messageCount} msgs
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
              {effectiveUser.name ? effectiveUser.name.charAt(0) : 'G'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                {effectiveUser.name}
                {isAdmin && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {effectiveUser.isGuest ? 'Guest Visitor' : 'Active Investor'}
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
                className={`flex flex-col group ${msg.senderId === effectiveUser.id || (currentUser?.id && msg.senderId === currentUser.id) ? 'items-end' : 'items-start'}`}
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
                    msg.senderId === effectiveUser.id || (currentUser?.id && msg.senderId === currentUser.id)
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

                  {/* File / Image / Video Attachment Rendering */}
                  {msg.attachmentUrl && (
                    <div className="mt-2.5">
                      {msg.attachmentType === 'image' || (msg.attachmentUrl.startsWith('data:image/')) ? (
                        <div className="relative group max-w-xs overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950">
                          <img 
                            src={msg.attachmentUrl} 
                            alt={msg.attachmentName || 'Attachment image'} 
                            className="w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.attachmentUrl, '_blank')}
                          />
                          <div className="p-1.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-300">
                            <span className="truncate max-w-[180px] font-medium">{msg.attachmentName || 'Image Attachment'}</span>
                            <a 
                              href={msg.attachmentUrl} 
                              download={msg.attachmentName || 'image.png'} 
                              className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 font-bold flex items-center gap-1 transition shrink-0"
                            >
                              <Download className="w-3 h-3" />
                              <span>Save</span>
                            </a>
                          </div>
                        </div>
                      ) : msg.attachmentType === 'video' || (msg.attachmentUrl.startsWith('data:video/')) ? (
                        <div className="max-w-sm rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-1">
                          <video controls src={msg.attachmentUrl} className="w-full max-h-60 rounded-lg" />
                          {msg.attachmentName && (
                            <div className="p-1.5 text-[11px] text-slate-300 font-medium truncate flex items-center justify-between">
                              <span className="truncate flex items-center gap-1">
                                <VideoIcon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                {msg.attachmentName}
                              </span>
                              <a 
                                href={msg.attachmentUrl} 
                                download={msg.attachmentName || 'video.mp4'} 
                                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-bold flex items-center gap-1 text-[10px] transition shrink-0"
                              >
                                <Download className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-3 max-w-sm shadow-md">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-sky-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">{msg.attachmentName || 'Document Attachment'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">File Attachment</div>
                            </div>
                          </div>
                          <a 
                            href={msg.attachmentUrl} 
                            download={msg.attachmentName || 'attachment'} 
                            className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 transition shrink-0 flex items-center gap-1 text-xs font-bold"
                            title="Download Attachment"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
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
                          const hasVoted = opt.votes.includes(effectiveUser.id);

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
                              users.includes(effectiveUser.id)
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
                <span>Admin ({effectiveUser.name})</span>
              </button>
            </div>
          </div>
        )}

        {/* Chat Input Box */}
        {(activeChannel?.isLocked || activeChannel?.type === 'announcement') && !isAdmin ? (
          <div className="p-3.5 sm:p-4 bg-slate-900/95 border-t border-slate-800 shrink-0 text-center flex items-center justify-center gap-2 text-amber-400 text-xs sm:text-sm font-medium">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Only administrators can post messages in <strong className="text-white">#{activeChannel?.name || 'this channel'}</strong></span>
          </div>
        ) : (
          <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 shrink-0">
            {/* Selected Attachment Preview Chip */}
            {selectedAttachment && (
              <div className="mb-2 p-2 rounded-xl bg-slate-950 border border-sky-500/40 flex items-center justify-between text-xs text-slate-200 animate-fadeIn">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedAttachment.type === 'image' ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                      <img src={selectedAttachment.url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : selectedAttachment.type === 'video' ? (
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                      <VideoIcon className="w-4 h-4 text-rose-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-sky-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate text-xs">{selectedAttachment.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{selectedAttachment.size || 'Ready to send'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAttachment(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                  title="Remove Attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
              />

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 sm:p-2.5 rounded-xl transition shrink-0 ${
                  selectedAttachment 
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-sky-300'
                }`}
                title="Attach File / Image"
              >
                <Paperclip className="w-4 h-4" />
              </button>

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
                disabled={!inputText.trim() && !selectedAttachment}
                className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 text-white shadow-md shadow-sky-500/20 transition flex items-center justify-center shrink-0 gap-1 font-bold text-xs cursor-pointer active:scale-95"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        )}
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
