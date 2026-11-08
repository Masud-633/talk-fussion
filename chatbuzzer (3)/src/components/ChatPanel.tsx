import React, { useState, useRef, useEffect } from "react";
import {
  Phone,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  MicOff,
  Send,
  Pin,
  X,
  Palette,
  Star,
  Zap,
  BarChart2,
  Clock,
  Download,
  BellOff,
  Bell,
  Ban,
  Trash2,
  Check,
  CheckCheck,
  CornerUpLeft,
  ArrowLeft,
  FileText,
  MapPin,
  Share2,
  Play,
  Pause,
  ExternalLink,
  Volume2,
  Settings
} from "lucide-react";
import {
  ref,
  set,
  get,
  onValue,
  remove,
  update,
  push,
  db,
  chatKey,
  formatTime
} from "../firebase";
import { formatRichText } from "../utils/formatRichText";
import { ChatMessage, ContactData, UserProfile } from "../types";

interface ChatPanelProps {
  activeChatUid: string | null;
  currentUser: UserProfile;
  contactData: Record<string, ContactData>;
  nicknames: Record<string, string>;
  isGroup: boolean;
  messages: ChatMessage[];
  presenceData: Record<string, { state: string; last_changed: number }>;
  typingData: Record<string, boolean>;
  isBlocked: boolean;
  wallpapers: Record<string, string>;
  onSelectWallpaper: (wp: string) => void;
  onStartVoiceCall: () => void;
  // Modals & Menu Actions
  onOpenStarredModal: () => void;
  onOpenQuickReplies: () => void;
  onOpenCreatePoll: () => void;
  onOpenNotes: () => void;
  onOpenSchedule: () => void;
  onOpenStickers: () => void;
  onOpenDisappearing: () => void;
  onOpenContactCard: () => void;
  onOpenLiveLocation: () => void;
  onOpenChatSettings?: () => void;
  onToggleBlockUser: () => void;
  onClearChat: () => void;
  onToggleStatusMute: (uid: string) => void;
  isStatusMuted: boolean;
  onOpenInfo: (msg: ChatMessage) => void;
  onOpenImage: (url: string) => void;
  onForwardMessage: (msg: ChatMessage) => void;
  onAddContactFromCard: (id: string) => void;
  onBackMobile: () => void;
}

const EMOJIS = [
  "😀","😂","🥰","😎","😭","😡","👍","🙏","🔥","❤️",
  "💯","🎉","✨","👀","💀","🤔","🙌","😊","😍","🤣",
  "😘","😜","🤩","😇","🤗","🤫","🤭","🥳","😏","😒",
  "🙄","😬","🤐","🤥","😴","🤤","🤒","🤕","🤢","🤮",
  "🤧","😷","🤠","🤑","🤓","😈","👿","👻","👽","🤖",
  "🍕","☕","🎈","🚀","🐱","🦄","🌸","⭐","🍰","🍔"
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  activeChatUid,
  currentUser,
  contactData,
  nicknames,
  isGroup,
  messages,
  presenceData,
  typingData,
  isBlocked,
  wallpapers,
  onSelectWallpaper,
  onStartVoiceCall,
  onOpenStarredModal,
  onOpenQuickReplies,
  onOpenCreatePoll,
  onOpenNotes,
  onOpenSchedule,
  onOpenStickers,
  onOpenDisappearing,
  onOpenContactCard,
  onOpenLiveLocation,
  onOpenChatSettings,
  onToggleBlockUser,
  onClearChat,
  onToggleStatusMute,
  isStatusMuted,
  onOpenInfo,
  onOpenImage,
  onForwardMessage,
  onAddContactFromCard,
  onBackMobile,
}) => {
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedMsg, setPinnedMsg] = useState<{ id: string; text: string } | null>(null);

  // Audio voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Silent send hold timer
  const [isHoldSilent, setIsHoldSilent] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio player speeds per message
  const [audioSpeeds, setAudioSpeeds] = useState<Record<string, number>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});

  // Context menu for message bubbles
  const [bubbleMenu, setBubbleMenu] = useState<{
    x: number;
    y: number;
    msg: ChatMessage;
  } | null>(null);

  // Quick reaction picker for double click
  const [reactionPicker, setReactionPicker] = useState<{
    x: number;
    y: number;
    msgId: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleCloseMenus = () => {
      setShowOptionsMenu(false);
      setShowAttachMenu(false);
      setShowEmojiPicker(false);
      setBubbleMenu(null);
      setReactionPicker(null);
    };
    window.addEventListener("click", handleCloseMenus);
    return () => window.removeEventListener("click", handleCloseMenus);
  }, []);

  // Listen to pinned message for active chat
  useEffect(() => {
    if (!activeChatUid) return;
    const pinRef = ref(db, `users/${currentUser.uid}/pinnedMessages/${activeChatUid}`);
    const unsubscribe = onValue(pinRef, (snap) => {
      setPinnedMsg(snap.val() || null);
    });
    return () => unsubscribe();
  }, [activeChatUid, currentUser.uid]);

  // Load and sync draft
  useEffect(() => {
    if (!activeChatUid) return;
    const savedDraft = localStorage.getItem(`chatbuzz_draft_${currentUser.uid}_${activeChatUid}`) || "";
    setInputText(savedDraft);
  }, [activeChatUid, currentUser.uid]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!showSearchBar) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, showSearchBar]);

  if (!activeChatUid) {
    // WhatsApp Web Welcome / Empty Chat Screen
    return (
      <main className="flex-1 hidden md:flex flex-col items-center justify-center p-8 bg-[#f0f2f5] dark:bg-[#111b21] text-center border-l border-slate-200 dark:border-[#2a3942] select-none">
        <div className="max-w-md flex flex-col items-center">
          <img
            src="/logo_talkfussion.jpg"
            alt="TalkFussion Logo"
            className="w-24 h-24 object-cover rounded-3xl shadow-xl mb-6 ring-4 ring-emerald-500/20"
          />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            TalkFussion for Web
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Send and receive instant messages, share live locations, voice notes, and WhatsApp-style status updates.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs text-slate-700 dark:text-slate-300 font-medium">
            <span className="text-slate-400">Your Chat ID:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              @{currentUser.id}
            </span>
          </div>
        </div>
      </main>
    );
  }

  const contact = contactData[activeChatUid] || { id: activeChatUid };
  const displayName = nicknames[activeChatUid] || contact.displayName || contact.id;
  const isOnline = !isGroup && presenceData[activeChatUid]?.state === "online";
  const isTyping = !isGroup && typingData[activeChatUid];
  const wallpaper = wallpapers[activeChatUid] || "doodle";

  // Handle typing & draft persistence
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Save draft
    if (val) {
      localStorage.setItem(`chatbuzz_draft_${currentUser.uid}_${activeChatUid}`, val);
    } else {
      localStorage.removeItem(`chatbuzz_draft_${currentUser.uid}_${activeChatUid}`);
    }

    // Typing presence
    const key = isGroup ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
    const typingRef = ref(db, `typing/${key}/${currentUser.uid}`);
    set(typingRef, true);
    setTimeout(() => set(typingRef, false), 2000);
  };

  // Send message handler
  const handleSendMessage = async (isSilent = false) => {
    const text = inputText.trim();
    if (!text) return;

    setInputText("");
    localStorage.removeItem(`chatbuzz_draft_${currentUser.uid}_${activeChatUid}`);

    const key = isGroup ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
    const msgRef = push(ref(db, `chats/${key}`));

    const payload: any = {
      senderUid: currentUser.uid,
      senderName: currentUser.displayName || currentUser.id,
      text: text,
      ts: Date.now(),
      read: false,
      silent: isSilent,
      readBy: { [currentUser.uid]: true },
    };

    if (replyingTo) {
      payload.replyTo = {
        senderUid: replyingTo.senderUid,
        senderName: replyingTo.senderName,
        text: replyingTo.text,
        type: replyingTo.imageUrl
          ? "image"
          : replyingTo.audioUrl
          ? "audio"
          : replyingTo.location
          ? "location"
          : "text",
      };
      setReplyingTo(null);
    }

    await set(msgRef, payload);

    if (!isGroup) {
      const uRef = ref(db, `unread/${activeChatUid}/${currentUser.uid}`);
      const snap = await get(uRef);
      await set(uRef, (snap.val() || 0) + 1);
    }
  };

  // Photo upload
  const handleImageSend = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 700000) return alert("Image too large. Please select an image under 700KB.");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const key = isGroup ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
      const msgRef = push(ref(db, `chats/${key}`));
      await set(msgRef, {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || currentUser.id,
        text: "📷 Photo",
        imageUrl: ev.target?.result as string,
        ts: Date.now(),
        read: false,
        readBy: { [currentUser.uid]: true },
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const key = isGroup ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
          const msgRef = push(ref(db, `chats/${key}`));
          await set(msgRef, {
            senderUid: currentUser.uid,
            senderName: currentUser.displayName || currentUser.id,
            text: "🎤 Voice Message",
            audioUrl: base64Audio,
            ts: Date.now(),
            read: false,
            readBy: { [currentUser.uid]: true },
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert("Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Silent send hold handlers
  const handleSendMouseDown = () => {
    setIsHoldSilent(false);
    holdTimerRef.current = setTimeout(() => {
      setIsHoldSilent(true);
    }, 600);
  };

  const handleSendMouseUp = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    handleSendMessage(isHoldSilent);
    setIsHoldSilent(false);
  };

  // Export conversation as text file
  const handleExportChat = () => {
    if (!messages.length) return alert("No messages to export.");
    let content = `TalkFussion Transcript\nChat: ${displayName}\nDate: ${new Date().toLocaleString()}\n`;
    content += "========================================\n\n";

    messages.forEach((m) => {
      const time = new Date(m.ts).toLocaleString();
      const sender = m.senderUid === currentUser.uid ? "You" : m.senderName;
      const text = m.deleted ? "[deleted]" : m.text || "[Media]";
      content += `[${time}] ${sender}: ${text}\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TalkFussion_${displayName}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter messages if search is active
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <main className="flex-1 flex flex-col h-full w-full min-w-0 min-h-0 bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden select-none">
      {/* 1. WhatsApp Chat Header - Always visible, never disappears on mobile */}
      <header className="sticky top-0 z-30 shrink-0 w-full h-[60px] px-2.5 sm:px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-slate-200 dark:border-[#2a3942] flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          {/* Back button on mobile */}
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            title="Back to chats"
            aria-label="Back to chats"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 text-sm shrink-0">
            {contact.avatar ? (
              <img src={contact.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </div>

          {/* Contact Name & Online / Typing status */}
          <div className="min-w-0 flex-1 leading-tight">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
              {displayName}
            </h3>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isTyping ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold italic">
                  typing...
                </span>
              ) : isOnline ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
              ) : isGroup ? (
                <span>Group conversation</span>
              ) : (
                <span>{presenceData[activeChatUid]?.last_changed ? "Offline" : "TalkFussion user"}</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-slate-600 dark:text-slate-300 shrink-0">
          {!isGroup && (
            <button
              onClick={onStartVoiceCall}
              className="p-2 sm:p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
              title="Voice Call"
              aria-label="Voice Call"
            >
              <Phone size={19} />
            </button>
          )}

          <button
            onClick={() => setShowSearchBar(!showSearchBar)}
            className="p-2 sm:p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            title="Search in Chat"
            aria-label="Search in Chat"
          >
            <Search size={19} />
          </button>

          {/* 3-dots Menu Button */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsMenu(!showOptionsMenu);
              }}
              className="p-2 sm:p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center cursor-pointer"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical size={19} />
            </button>

            {/* Dropdown Menu */}
            {showOptionsMenu && (
              <div
                className="absolute right-0 top-11 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 z-50 divide-y divide-slate-100 dark:divide-slate-700"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  {onOpenChatSettings && (
                    <button
                      onClick={() => {
                        onOpenChatSettings();
                        setShowOptionsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold"
                    >
                      <Settings size={14} className="text-emerald-500" />
                      <span>Chat Settings</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const next = wallpaper === "doodle" ? "nature" : wallpaper === "nature" ? "light" : "doodle";
                      onSelectWallpaper(next);
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                  >
                    <Palette size={14} className="text-emerald-500" />
                    <span>Change Wallpaper</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenStarredModal();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                  >
                    <Star size={14} className="text-yellow-400" />
                    <span>Starred Messages</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenQuickReplies();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                  >
                    <Zap size={14} className="text-emerald-500" />
                    <span>Quick Replies</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenNotes();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                  >
                    <FileText size={14} className="text-amber-500" />
                    <span>Chat Notes</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      onOpenSchedule();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                  >
                    <Clock size={14} className="text-blue-500" />
                    <span>Schedule Message</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenDisappearing();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                  >
                    <Clock size={14} className="text-emerald-500" />
                    <span>Disappearing Messages</span>
                  </button>

                  <button
                    onClick={() => {
                      handleExportChat();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                  >
                    <Download size={14} className="text-slate-500" />
                    <span>Export Chat</span>
                  </button>

                  {!isGroup && (
                    <button
                      onClick={() => {
                        onToggleStatusMute(activeChatUid);
                        setShowOptionsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5"
                    >
                      {isStatusMuted ? <Bell size={14} /> : <BellOff size={14} />}
                      <span>{isStatusMuted ? "Unmute Status" : "Mute Status"}</span>
                    </button>
                  )}
                </div>

                <div className="py-1">
                  {!isGroup && (
                    <button
                      onClick={() => {
                        onToggleBlockUser();
                        setShowOptionsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 flex items-center gap-2.5"
                    >
                      <Ban size={14} />
                      <span>{isBlocked ? "Unblock User" : "Block User"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onClearChat();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 flex items-center gap-2.5"
                  >
                    <Trash2 size={14} />
                    <span>Clear Chat</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Pinned Message Banner */}
      {pinnedMsg && (
        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-xs truncate">
            <Pin size={13} className="text-emerald-600 rotate-45 shrink-0" />
            <span className="font-semibold text-emerald-800 dark:text-emerald-300 shrink-0">
              Pinned Message:
            </span>
            <span className="text-slate-700 dark:text-slate-300 truncate">{pinnedMsg.text}</span>
          </div>
          <button
            onClick={() => {
              remove(ref(db, `users/${currentUser.uid}/pinnedMessages/${activeChatUid}`));
              setPinnedMsg(null);
            }}
            className="p-1 text-slate-400 hover:text-red-500"
            title="Unpin"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3. In-Chat Search Bar */}
      {showSearchBar && (
        <div className="px-4 py-2 bg-white dark:bg-[#202c33] border-b border-slate-200 dark:border-[#2a3942] flex items-center gap-2 z-10 animate-in slide-in-from-top-1">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in conversation..."
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 outline-none"
            autoFocus
          />
          <button
            onClick={() => {
              setShowSearchBar(false);
              setSearchQuery("");
            }}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4. Messages Feed Area with Custom Wallpaper */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 md:px-12 py-4 space-y-3 ${
          wallpaper === "nature"
            ? "bg-whatsapp-nature"
            : wallpaper === "doodle"
            ? "bg-whatsapp-doodle"
            : "bg-[#efeae2] dark:bg-[#0b141a]"
        }`}
      >
        {filteredMessages.length > 0 ? (
          filteredMessages.map((m) => {
            const isMe = m.senderUid === currentUser.uid;
            const canDeleteEveryone = isMe && Date.now() - m.ts < 2 * 60 * 1000;

            return (
              <div
                key={m.id}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setReactionPicker({ x: e.clientX, y: e.clientY, msgId: m.id });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setBubbleMenu({ x: e.clientX, y: e.clientY, msg: m });
                }}
                className={`flex flex-col group ${isMe ? "items-end" : "items-start"}`}
              >
                {/* Message Bubble Container */}
                <div
                  className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs md:text-sm shadow-sm transition-all ${
                    isMe
                      ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-none"
                      : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 rounded-tl-none"
                  }`}
                >
                  {/* Forwarded Tag */}
                  {m.forwarded && (
                    <div className="text-[10px] italic text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                      <Share2 size={10} />
                      <span>Forwarded</span>
                    </div>
                  )}

                  {/* Quoted Message / Reply Preview */}
                  {m.replyTo && (
                    <div className="mb-1.5 p-2 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-emerald-500 text-[11px] leading-tight">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {m.replyTo.senderUid === currentUser.uid ? "You" : m.replyTo.senderName}
                      </div>
                      <div className="truncate text-slate-600 dark:text-slate-300">
                        {m.replyTo.text}
                      </div>
                    </div>
                  )}

                  {/* Status Reply Quote */}
                  {m.statusReply && (
                    <div className="mb-1.5 p-2 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-emerald-500 flex items-center gap-2 text-[11px]">
                      {m.statusReply.statusImage && (
                        <img
                          src={m.statusReply.statusImage}
                          alt=""
                          className="w-9 h-9 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="truncate">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[10px]">
                          Status reply to {m.statusReply.authorName}
                        </span>
                        <span className="truncate text-slate-600 dark:text-slate-300">
                          {m.statusReply.statusText || "(Photo status)"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Group Sender Name */}
                  {isGroup && !isMe && (
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                      {m.senderName}
                    </div>
                  )}

                  {/* Content: Photo / Voice / Poll / Location / Contact / Text */}
                  {m.deleted ? (
                    <span className="italic text-slate-400 flex items-center gap-1">
                      🚫 This message was deleted
                    </span>
                  ) : m.imageUrl ? (
                    <div className="space-y-1">
                      <img
                        src={m.imageUrl}
                        alt=""
                        onClick={() => onOpenImage(m.imageUrl!)}
                        className="rounded-lg max-h-60 max-w-full object-cover cursor-pointer hover:opacity-95"
                      />
                      {m.text && m.text !== "📷 Photo" && <div>{formatRichText(m.text)}</div>}
                    </div>
                  ) : m.audioUrl ? (
                    <div className="flex items-center gap-3 py-1 min-w-[200px]">
                      <button
                        onClick={() => {
                          const audio = audioElementsRef.current[m.id];
                          if (audio) {
                            if (playingAudioId === m.id) {
                              audio.pause();
                              setPlayingAudioId(null);
                            } else {
                              audio.play();
                              setPlayingAudioId(m.id);
                            }
                          }
                        }}
                        className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm"
                      >
                        {playingAudioId === m.id ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                      </button>
                      <audio
                        ref={(el) => {
                          if (el) audioElementsRef.current[m.id] = el;
                        }}
                        src={m.audioUrl}
                        onEnded={() => setPlayingAudioId(null)}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <div className="h-1.5 bg-black/20 dark:bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-1/2" />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                          Voice message
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const current = audioSpeeds[m.id] || 1;
                          const next = current === 1 ? 1.5 : current === 1.5 ? 2 : 1;
                          setAudioSpeeds({ ...audioSpeeds, [m.id]: next });
                          if (audioElementsRef.current[m.id]) {
                            audioElementsRef.current[m.id].playbackRate = next;
                          }
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/10 dark:bg-white/10"
                      >
                        {audioSpeeds[m.id] || 1}x
                      </button>
                    </div>
                  ) : m.poll ? (
                    <div className="p-1 space-y-2 min-w-[220px]">
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <BarChart2 size={15} className="text-emerald-500" />
                        {m.poll.question}
                      </div>
                      <div className="space-y-1.5">
                        {m.poll.options.map((opt, idx) => {
                          const votes = m.poll?.votes || {};
                          const totalVotes = Object.keys(votes).length;
                          const optVotes = Object.values(votes).filter((v) => v === idx).length;
                          const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                          const hasVoted = votes[currentUser.uid] === idx;

                          return (
                            <button
                              key={idx}
                              onClick={async () => {
                                const key = isGroup ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
                                await update(ref(db, `chats/${key}/${m.id}/poll/votes`), {
                                  [currentUser.uid]: idx,
                                });
                              }}
                              className={`w-full p-2 rounded-xl text-left text-xs transition-all border ${
                                hasVoted
                                  ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 font-semibold"
                                  : "border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-white/5 hover:border-emerald-400"
                              }`}
                            >
                              <div className="flex justify-between mb-1">
                                <span>{opt}</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {pct}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        {Object.keys(m.poll.votes || {}).length} vote(s)
                      </div>
                    </div>
                  ) : m.contactCard ? (
                    <div className="p-2 space-y-2 bg-white/40 dark:bg-black/20 rounded-xl min-w-[200px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          {m.contactCard.avatar ? (
                            <img src={m.contactCard.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            m.contactCard.id.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="leading-tight">
                          <div className="font-bold text-sm">@{m.contactCard.id}</div>
                          <div className="text-[11px] text-slate-500">{m.contactCard.bio || "TalkFussion user"}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => onAddContactFromCard(m.contactCard!.id)}
                        className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors"
                      >
                        Add to Contacts
                      </button>
                    </div>
                  ) : m.liveLocation ? (
                    <div className="p-2 space-y-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-500/30 min-w-[220px]">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <MapPin size={15} className="animate-pulse" />
                        <span>Live Location</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {m.liveLocation.active ? "Sharing current GPS coordinates" : "Live sharing ended"}
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${m.liveLocation.lat},${m.liveLocation.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 underline"
                      >
                        Open in Google Maps <ExternalLink size={11} />
                      </a>
                    </div>
                  ) : m.location ? (
                    <div className="p-2 space-y-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-500/30">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <MapPin size={14} /> Location
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${m.location.lat},${m.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 underline"
                      >
                        View on Google Maps <ExternalLink size={11} />
                      </a>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {formatRichText(m.text)}
                    </div>
                  )}

                  {/* Reaction Pill on message */}
                  {m.reaction && (
                    <div className="absolute -bottom-2.5 right-2 px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs flex items-center gap-1">
                      <span>{m.reaction}</span>
                    </div>
                  )}

                  {/* Bottom Metadata: Time & Double Ticks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400 select-none">
                    {m.edited && <span className="italic mr-0.5">edited</span>}
                    <span>{formatTime(m.ts)}</span>
                    {isMe && !m.deleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInfo(m);
                        }}
                        className="hover:opacity-80"
                        title="Message info"
                      >
                        {!isGroup && currentUser.readReceipts === false ? (
                          m.read || m.delivered ? (
                            <CheckCheck size={14} className="text-slate-400" />
                          ) : (
                            <Check size={14} className="text-slate-400" />
                          )
                        ) : m.read ? (
                          <CheckCheck size={14} className="text-[#53bdeb]" />
                        ) : m.delivered ? (
                          <CheckCheck size={14} className="text-slate-400" />
                        ) : (
                          <Check size={14} className="text-slate-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center text-slate-400 text-xs">
            {searchQuery ? "No messages matching search" : "No messages yet. Say hello! 👋"}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 5. Replying To Snippet Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-slate-100 dark:bg-[#202c33] border-t border-slate-200 dark:border-[#2a3942] flex items-center justify-between text-xs z-10">
          <div className="border-l-4 border-emerald-500 pl-2.5 truncate">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[11px]">
              Replying to {replyingTo.senderUid === currentUser.uid ? "yourself" : replyingTo.senderName}
            </span>
            <span className="text-slate-600 dark:text-slate-300 truncate block">
              {replyingTo.text}
            </span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* 6. Blocked Notice */}
      {isBlocked && (
        <div className="p-2.5 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-300 text-xs text-center font-medium border-t border-red-200 dark:border-red-900/50">
          You have blocked this contact. You can unblock them from the top right menu.
        </div>
      )}

      {/* 7. Bottom Input Bar */}
      <div className="shrink-0 p-2 sm:p-2.5 md:p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-[#2a3942] flex items-center gap-1.5 sm:gap-2 z-20">
        {/* Emoji Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEmojiPicker(!showEmojiPicker);
            }}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Emoji"
          >
            <Smile size={20} />
          </button>

          {/* Emoji Popover */}
          {showEmojiPicker && (
            <div
              className="absolute bottom-12 left-0 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-3 border border-slate-200 dark:border-slate-700 grid grid-cols-6 gap-2 max-h-48 overflow-y-auto z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => {
                    setInputText((prev) => prev + em);
                    setShowEmojiPicker(false);
                  }}
                  className="text-xl p-1 hover:scale-125 transition-transform"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attachment Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAttachMenu(!showAttachMenu);
            }}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Attach"
          >
            <Paperclip size={20} />
          </button>

          {/* Attachment Menu */}
          {showAttachMenu && (
            <div
              className="absolute bottom-12 left-0 w-44 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 z-50 space-y-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachMenu(false);
                }}
                className="w-full px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 text-left"
              >
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <Palette size={13} />
                </div>
                <span>Photo</span>
              </button>

              <button
                onClick={() => {
                  onOpenLiveLocation();
                  setShowAttachMenu(false);
                }}
                className="w-full px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 text-left"
              >
                <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center">
                  <MapPin size={13} />
                </div>
                <span>Live Location</span>
              </button>

              <button
                onClick={() => {
                  onOpenContactCard();
                  setShowAttachMenu(false);
                }}
                className="w-full px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 text-left"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Share2 size={13} />
                </div>
                <span>Contact Card</span>
              </button>

              {isGroup && (
                <button
                  onClick={() => {
                    onOpenCreatePoll();
                    setShowAttachMenu(false);
                  }}
                  className="w-full px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center">
                    <BarChart2 size={13} />
                  </div>
                  <span>Create Poll</span>
                </button>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSend}
            className="hidden"
          />
        </div>

        {/* Message Input */}
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(false);
            }
          }}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-full bg-white dark:bg-[#2a3942] text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs md:text-sm outline-none border border-transparent focus:border-emerald-500 transition-colors"
        />

        {/* Microphone Recording Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-2.5 rounded-full transition-colors ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
          title={isRecording ? "Stop recording" : "Record Voice Note"}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Send Button (Click to send, hold for silent send) */}
        <button
          type="button"
          onMouseDown={handleSendMouseDown}
          onMouseUp={handleSendMouseUp}
          onTouchStart={handleSendMouseDown}
          onTouchEnd={handleSendMouseUp}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-md ${
            isHoldSilent
              ? "bg-slate-700 shadow-slate-700/30"
              : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-600/30"
          }`}
          title="Click to send · Hold for silent send"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Bubble Context Menu */}
      {bubbleMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl py-1 min-w-[160px] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          style={{ top: bubbleMenu.y, left: bubbleMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setReplyingTo(bubbleMenu.msg);
              setBubbleMenu(null);
            }}
            className="w-full px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left flex items-center gap-2"
          >
            <CornerUpLeft size={13} /> Reply
          </button>
          <button
            onClick={() => {
              onForwardMessage(bubbleMenu.msg);
              setBubbleMenu(null);
            }}
            className="w-full px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left flex items-center gap-2"
          >
            <Share2 size={13} /> Forward
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(bubbleMenu.msg.text || "");
              setBubbleMenu(null);
            }}
            className="w-full px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left flex items-center gap-2"
          >
            <Check size={13} /> Copy Text
          </button>
          <button
            onClick={async () => {
              const starRef = ref(db, `users/${currentUser.uid}/starred/${bubbleMenu.msg.id}`);
              const snap = await get(starRef);
              if (snap.exists()) {
                await remove(starRef);
              } else {
                await set(starRef, {
                  text: bubbleMenu.msg.text || "Media Message",
                  senderName: bubbleMenu.msg.senderName,
                  chatId: displayName,
                  chatUid: activeChatUid,
                  ts: bubbleMenu.msg.ts,
                });
              }
              setBubbleMenu(null);
            }}
            className="w-full px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left flex items-center gap-2 text-yellow-500"
          >
            <Star size={13} /> Star / Unstar
          </button>
          <button
            onClick={async () => {
              await set(ref(db, `users/${currentUser.uid}/pinnedMessages/${activeChatUid}`), {
                id: bubbleMenu.msg.id,
                text: bubbleMenu.msg.text || "Media message",
              });
              setBubbleMenu(null);
            }}
            className="w-full px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left flex items-center gap-2 text-emerald-500"
          >
            <Pin size={13} /> Pin Message
          </button>

          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

          {bubbleMenu.msg.senderUid === currentUser.uid && Date.now() - bubbleMenu.msg.ts < 2 * 60 * 1000 && (
            <button
              onClick={async () => {
                const key = isGroup ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
                await update(ref(db, `chats/${key}/${bubbleMenu.msg.id}`), {
                  deleted: true,
                  text: "",
                });
                setBubbleMenu(null);
              }}
              className="w-full px-3.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 text-left flex items-center gap-2"
            >
              <Trash2 size={13} /> Delete for Everyone
            </button>
          )}

          <button
            onClick={async () => {
              const key = isGroup ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
              await remove(ref(db, `chats/${key}/${bubbleMenu.msg.id}`));
              setBubbleMenu(null);
            }}
            className="w-full px-3.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 text-left flex items-center gap-2"
          >
            <Trash2 size={13} /> Delete for Me
          </button>
        </div>
      )}

      {/* Double-Click Reaction Pill */}
      {reactionPicker && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-800 rounded-full shadow-2xl px-2 py-1 border border-slate-200 dark:border-slate-700 flex items-center gap-2 animate-in zoom-in-75"
          style={{ top: reactionPicker.y - 45, left: reactionPicker.x - 70 }}
          onClick={(e) => e.stopPropagation()}
        >
          {["❤️", "👍", "😂", "😮", "😢", "🔥"].map((em) => (
            <button
              key={em}
              onClick={async () => {
                const key = isGroup ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
                await update(ref(db, `chats/${key}/${reactionPicker.msgId}`), { reaction: em });
                setReactionPicker(null);
              }}
              className="text-lg hover:scale-125 transition-transform"
            >
              {em}
            </button>
          ))}
        </div>
      )}
    </main>
  );
};
