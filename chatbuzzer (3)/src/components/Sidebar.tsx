import React, { useState } from "react";
import {
  MessageSquare,
  CircleDot,
  UserPlus,
  Users,
  Search,
  Moon,
  Sun,
  Shield,
  LogOut,
  Pin,
  Archive,
  BellOff,
  Bell,
  Trash2,
  Tag,
  Plus,
  PenTool,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  X,
  Settings
} from "lucide-react";
import { SegmentedStatusRing } from "./SegmentedStatusRing";
import { UserProfile, ContactData, StatusItem } from "../types";
import { formatTime, formatStatusTime } from "../firebase";

interface SidebarProps {
  currentUser: UserProfile;
  contacts: string[];
  contactData: Record<string, ContactData>;
  nicknames: Record<string, string>;
  pinnedChats: Record<string, boolean>;
  archivedChats: Record<string, boolean>;
  mutedChats: Record<string, boolean>;
  blockedUsers: Record<string, boolean>;
  unreadData: Record<string, number>;
  presenceData: Record<string, { state: string; last_changed: number }>;
  typingData: Record<string, boolean>;
  lastMessages: Record<string, { text: string; ts?: number; senderUid?: string }>;
  drafts: Record<string, string>;
  activeChatUid: string | null;
  onSelectChat: (contactUid: string, isGroup?: boolean) => void;
  // Statuses
  statusesByUser: Record<string, Record<string, StatusItem>>;
  mutedStatuses: Record<string, any>;
  onOpenStatusViewer: (userUid: string) => void;
  onOpenPostStatus: () => void;
  onToggleStatusMute: (authorUid: string) => void;
  // Modal Triggers
  onOpenProfile: () => void;
  onOpenChatSettings?: () => void;
  onOpenCreateGroup: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  // Actions
  onAddContact: (id: string) => void;
  onTogglePin: (uid: string) => void;
  onToggleArchive: (uid: string) => void;
  onToggleMute: (uid: string) => void;
  onSetNickname: (uid: string) => void;
  onDeleteChat: (uid: string) => void;
  // Theme
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  contacts,
  contactData,
  nicknames,
  pinnedChats,
  archivedChats,
  mutedChats,
  blockedUsers,
  unreadData,
  presenceData,
  typingData,
  lastMessages,
  drafts,
  activeChatUid,
  onSelectChat,
  statusesByUser,
  mutedStatuses,
  onOpenStatusViewer,
  onOpenPostStatus,
  onToggleStatusMute,
  onOpenProfile,
  onOpenChatSettings,
  onOpenCreateGroup,
  onOpenAdmin,
  onLogout,
  onAddContact,
  onTogglePin,
  onToggleArchive,
  onToggleMute,
  onSetNickname,
  onDeleteChat,
  isDarkMode,
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<"chats" | "status">("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "groups">("all");
  const [newContactId, setNewContactId] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [showMutedSection, setShowMutedSection] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    uid: string;
  } | null>(null);

  // Close context menu on outside click
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactId.trim()) return;
    onAddContact(newContactId.trim());
    setNewContactId("");
    setShowAddContact(false);
  };

  // Status calculation for unviewed badge
  const otherUidsWithStatus = Object.keys(statusesByUser).filter((uid) => uid !== currentUser.uid);
  const unviewedStatusesCount = otherUidsWithStatus.filter((uid) => {
    const isMuted = mutedStatuses[uid];
    if (isMuted) return false;
    const list = Object.values(statusesByUser[uid] || {});
    return list.some((s) => !s.viewers || !s.viewers[currentUser.uid]);
  }).length;

  // Filtered contacts based on contact names or text content of the most recent message
  const filteredContacts = contacts.filter((uid) => {
    if (archivedChats[uid]) return false;
    const data = contactData[uid] || {};
    const name = nicknames[uid] || data.displayName || data.id || "User";
    const lastMsgText = lastMessages[uid]?.text || "";
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !q ||
      name.toLowerCase().includes(q) ||
      (data.id && data.id.toLowerCase().includes(q)) ||
      lastMsgText.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterType === "unread") return (unreadData[uid] || 0) > 0;
    if (filterType === "groups") return !!data.isGroup;
    return true;
  });

  // Sort: pinned first, then by last message timestamp
  filteredContacts.sort((a, b) => {
    const aPin = pinnedChats[a] ? 1 : 0;
    const bPin = pinnedChats[b] ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    const aTime = lastMessages[a]?.ts || 0;
    const bTime = lastMessages[b]?.ts || 0;
    return bTime - aTime;
  });

  // Online active contacts for Active Now bar
  const activeNowContacts = contacts.filter((uid) => {
    if (uid.startsWith("GROUP_")) return false;
    return presenceData[uid]?.state === "online";
  });

  // Organize statuses
  const myStatusList = Object.values(statusesByUser[currentUser.uid] || {}).sort((a, b) => a.ts - b.ts);
  const recentUpdates: { uid: string; list: StatusItem[]; latest: StatusItem; unviewedCount: number }[] = [];
  const viewedUpdates: { uid: string; list: StatusItem[]; latest: StatusItem }[] = [];
  const mutedUpdates: { uid: string; list: StatusItem[]; latest: StatusItem }[] = [];

  otherUidsWithStatus.forEach((uid) => {
    const statusesObj = statusesByUser[uid] || {};
    const list = Object.values(statusesObj).sort((a, b) => a.ts - b.ts);
    if (!list.length) return;
    const latest = list[list.length - 1];
    const unviewedCount = list.filter((s) => !s.viewers || !s.viewers[currentUser.uid]).length;
    const isMuted = !!mutedStatuses[uid];

    if (isMuted) {
      mutedUpdates.push({ uid, list, latest });
    } else if (unviewedCount > 0) {
      recentUpdates.push({ uid, list, latest, unviewedCount });
    } else {
      viewedUpdates.push({ uid, list, latest });
    }
  });

  recentUpdates.sort((a, b) => b.latest.ts - a.latest.ts);
  viewedUpdates.sort((a, b) => b.latest.ts - a.latest.ts);
  mutedUpdates.sort((a, b) => b.latest.ts - a.latest.ts);

  return (
    <aside className="w-full md:w-[380px] lg:w-[410px] h-full flex flex-col bg-white dark:bg-[#111b21] border-r border-slate-200 dark:border-[#2a3942] select-none shrink-0 z-20">
      {/* 1. Header Bar: Avatar, ID, Status, and Action Icons */}
      <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between border-b border-slate-200 dark:border-[#2a3942]">
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Profile Settings"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-800 dark:text-slate-100 text-xs border border-emerald-500 shadow-sm group-hover:ring-2 ring-emerald-500/40 transition-all">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{currentUser.id.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
              <span>{currentUser.displayName || currentUser.id}</span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                @{currentUser.id}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
          {currentUser.id === "ADMIN" && (
            <button
              onClick={onOpenAdmin}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-red-500 transition-colors"
              title="Admin Dashboard"
            >
              <Shield size={18} />
            </button>
          )}

          <button
            onClick={() => setShowAddContact(!showAddContact)}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Add Contact by ID"
          >
            <UserPlus size={18} />
          </button>

          <button
            onClick={onOpenCreateGroup}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="New Group"
          >
            <Users size={18} />
          </button>

          {onOpenChatSettings && (
            <button
              onClick={onOpenChatSettings}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Chat Settings"
            >
              <Settings size={18} />
            </button>
          )}

          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={isDarkMode ? "Light mode" : "Dark mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-red-500 transition-colors"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Add Contact Bar (Expandable) */}
      {showAddContact && (
        <form
          onSubmit={handleAddSubmit}
          className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/40 flex gap-2 animate-in slide-in-from-top-2"
        >
          <input
            type="text"
            value={newContactId}
            onChange={(e) => setNewContactId(e.target.value)}
            placeholder="Enter friend's Chat ID (e.g. EMILY77)..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500 uppercase"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm"
          >
            <Plus size={14} /> Add
          </button>
        </form>
      )}

      {/* 2. WhatsApp Navigation Tabs: Chats vs Status */}
      <div className="flex border-b border-slate-200 dark:border-[#2a3942] bg-white dark:bg-[#111b21]">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === "chats"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <MessageSquare size={16} />
          <span>Chats</span>
        </button>

        <button
          onClick={() => setActiveTab("status")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all relative ${
            activeTab === "status"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <CircleDot size={16} />
          <span>Status</span>
          {unviewedStatusesCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>
      </div>

      {/* ===================== TAB 1: CHATS VIEW ===================== */}
      {activeTab === "chats" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search Bar & Filter Buttons */}
          <div className="p-2.5 space-y-2 border-b border-slate-100 dark:border-[#202c33]">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts or messages..."
                className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[#f0f2f5] dark:bg-[#202c33] text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs outline-none border border-transparent focus:border-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              {(["all", "unread", "groups"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors capitalize ${
                    filterType === type
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                      : "bg-[#f0f2f5] dark:bg-[#202c33] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Active Now Bar */}
          {activeNowContacts.length > 0 && (
            <div className="px-3 py-2 border-b border-slate-100 dark:border-[#202c33] bg-[#f8fafc] dark:bg-[#111b21]/70">
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active Now ({activeNowContacts.length})
              </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {activeNowContacts.map((uid) => {
                  const data = contactData[uid] || {};
                  const name = nicknames[uid] || data.displayName || data.id || "User";
                  return (
                    <div
                      key={uid}
                      onClick={() => onSelectChat(uid)}
                      className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-xs ring-2 ring-emerald-500">
                          {data.avatar ? (
                            <img src={data.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111b21]" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 max-w-[50px] truncate">
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#202c33]">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((uid) => {
                const data = contactData[uid] || {};
                const name = nicknames[uid] || data.displayName || data.id || "User";
                const isGroup = !!data.isGroup;
                const isPinned = !!pinnedChats[uid];
                const isMuted = !!mutedChats[uid];
                const unread = unreadData[uid] || 0;
                const isOnline = !isGroup && presenceData[uid]?.state === "online";
                const isTyping = !isGroup && typingData[uid];
                const lastMsg = lastMessages[uid];
                const draft = drafts[uid];
                const isSelected = activeChatUid === uid;

                return (
                  <div
                    key={uid}
                    onClick={() => onSelectChat(uid, isGroup)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, uid });
                    }}
                    className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors relative ${
                      isSelected
                        ? "bg-[#f0f2f5] dark:bg-[#2a3942]"
                        : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm ${
                          isGroup
                            ? "bg-gradient-to-tr from-purple-600 to-indigo-500 text-white"
                            : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {data.avatar ? (
                          <img src={data.avatar} alt="" className="w-full h-full object-cover" />
                        ) : isGroup ? (
                          <Users size={20} />
                        ) : (
                          name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111b21]" />
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate flex items-center gap-1.5">
                          {name}
                          {nicknames[uid] && nicknames[uid] !== data.id && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({data.id})
                            </span>
                          )}
                        </span>
                        {lastMsg?.ts && (
                          <span
                            className={`text-[11px] shrink-0 ${
                              unread > 0
                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-slate-400"
                            }`}
                          >
                            {formatTime(lastMsg.ts)}
                          </span>
                        )}
                      </div>

                      {/* Subtitle / Last Message / Draft */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1 pr-2">
                          {isTyping ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold italic flex items-center gap-1">
                              typing
                              <span className="animate-pulse">...</span>
                            </span>
                          ) : draft ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Draft: {draft}
                            </span>
                          ) : lastMsg?.text ? (
                            <span className="flex items-center gap-1 truncate">
                              {lastMsg.senderUid === currentUser.uid && (
                                <CheckCheck size={13} className="text-slate-400 shrink-0" />
                              )}
                              <span className="truncate">{lastMsg.text}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No messages yet</span>
                          )}
                        </div>

                        {/* Indicators: Pin, Mute, Unread Badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isMuted && <BellOff size={13} className="text-slate-400" />}
                          {isPinned && <Pin size={13} className="text-slate-400 rotate-45" />}
                          {unread > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs px-6 space-y-2">
                <Search size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  {searchQuery ? `No chats matching "${searchQuery}"` : "No chats found"}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                  {searchQuery
                    ? "Searched contact names, chat IDs, and recent message contents."
                    : 'Click "Add Contact" above to search by Chat ID.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold text-xs hover:bg-slate-200 transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: STATUS VIEW ===================== */}
      {activeTab === "status" && (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#202c33]">
          {/* Section: My Status */}
          <div className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#202c33] transition-colors cursor-pointer">
            <div
              onClick={() => {
                if (myStatusList.length > 0) {
                  onOpenStatusViewer(currentUser.uid);
                } else {
                  onOpenPostStatus();
                }
              }}
              className="flex items-center gap-3.5 flex-1 min-w-0"
            >
              <div className="relative shrink-0">
                <SegmentedStatusRing
                  count={myStatusList.length}
                  unviewedCount={0}
                  size={52}
                  avatarUrl={currentUser.avatar}
                  fallbackText={currentUser.displayName || currentUser.id}
                />
                {myStatusList.length === 0 && (
                  <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white dark:border-[#111b21]">
                    +
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  My status
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {myStatusList.length > 0
                    ? `${myStatusList.length} update${myStatusList.length > 1 ? "s" : ""} · ${formatStatusTime(myStatusList[myStatusList.length - 1].ts)}`
                    : "Tap to add status update"}
                </div>
              </div>
            </div>

            {/* Quick Add Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onOpenPostStatus}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 transition-colors"
                title="Add Status"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Section: Recent Updates (Unviewed) */}
          <div className="py-2">
            <div className="px-4 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recent updates {recentUpdates.length > 0 && `(${recentUpdates.length})`}
            </div>
            {recentUpdates.length > 0 ? (
              recentUpdates.map(({ uid, list, latest, unviewedCount }) => {
                const data = contactData[uid] || {};
                const name = nicknames[uid] || data.displayName || data.id || "User";

                return (
                  <div
                    key={uid}
                    onClick={() => onOpenStatusViewer(uid)}
                    className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#202c33] cursor-pointer transition-colors"
                  >
                    <SegmentedStatusRing
                      count={list.length}
                      unviewedCount={unviewedCount}
                      size={48}
                      avatarUrl={data.avatar}
                      fallbackText={name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatStatusTime(latest.ts)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-xs text-slate-400 italic">
                No recent status updates from contacts
              </div>
            )}
          </div>

          {/* Section: Viewed Updates */}
          {viewedUpdates.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Viewed updates ({viewedUpdates.length})
              </div>
              {viewedUpdates.map(({ uid, list, latest }) => {
                const data = contactData[uid] || {};
                const name = nicknames[uid] || data.displayName || data.id || "User";

                return (
                  <div
                    key={uid}
                    onClick={() => onOpenStatusViewer(uid)}
                    className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#202c33] cursor-pointer transition-colors opacity-85"
                  >
                    <SegmentedStatusRing
                      count={list.length}
                      unviewedCount={0}
                      size={48}
                      avatarUrl={data.avatar}
                      fallbackText={name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {formatStatusTime(latest.ts)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section: Muted Updates (Collapsible) */}
          {mutedUpdates.length > 0 && (
            <div className="py-2">
              <button
                onClick={() => setShowMutedSection(!showMutedSection)}
                className="w-full px-4 py-2 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-[#202c33]"
              >
                <span>Muted updates ({mutedUpdates.length})</span>
                {showMutedSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {showMutedSection &&
                mutedUpdates.map(({ uid, list, latest }) => {
                  const data = contactData[uid] || {};
                  const name = nicknames[uid] || data.displayName || data.id || "User";

                  return (
                    <div
                      key={uid}
                      onClick={() => onOpenStatusViewer(uid)}
                      className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-[#202c33] cursor-pointer transition-colors opacity-60"
                    >
                      <SegmentedStatusRing
                        count={list.length}
                        unviewedCount={0}
                        size={44}
                        avatarUrl={data.avatar}
                        fallbackText={name}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
                          <span>{name}</span>
                          <BellOff size={12} className="text-slate-400" />
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatStatusTime(latest.ts)}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Context Menu for Chat Rows */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl py-1.5 min-w-[170px] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onTogglePin(contextMenu.uid);
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
          >
            <Pin size={14} />
            <span>{pinnedChats[contextMenu.uid] ? "Unpin chat" : "Pin chat"}</span>
          </button>

          <button
            onClick={() => {
              onToggleArchive(contextMenu.uid);
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
          >
            <Archive size={14} />
            <span>{archivedChats[contextMenu.uid] ? "Unarchive chat" : "Archive chat"}</span>
          </button>

          <button
            onClick={() => {
              onToggleMute(contextMenu.uid);
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
          >
            {mutedChats[contextMenu.uid] ? <Bell size={14} /> : <BellOff size={14} />}
            <span>{mutedChats[contextMenu.uid] ? "Unmute notifications" : "Mute notifications"}</span>
          </button>

          {!contextMenu.uid.startsWith("GROUP_") && (
            <button
              onClick={() => {
                onSetNickname(contextMenu.uid);
                setContextMenu(null);
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-left text-emerald-600 dark:text-emerald-400"
            >
              <Tag size={14} />
              <span>Set Nickname</span>
            </button>
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

          <button
            onClick={() => {
              onDeleteChat(contextMenu.uid);
              setContextMenu(null);
            }}
            className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 text-left"
          >
            <Trash2 size={14} />
            <span>Delete Chat</span>
          </button>
        </div>
      )}
    </aside>
  );
};
