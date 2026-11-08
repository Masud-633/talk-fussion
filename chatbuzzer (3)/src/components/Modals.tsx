import React, { useState, useEffect } from "react";
import {
  X,
  Camera,
  Copy,
  Check,
  Users,
  Search,
  Star,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Contact,
  Download,
  ShieldAlert,
  Send,
  ExternalLink,
  Settings,
  CheckCheck,
  Palette,
  Moon,
  Sun
} from "lucide-react";
import {
  ref,
  set,
  get,
  remove,
  update,
  push,
  db,
  serverTimestamp,
  sanitizeId,
  formatTime
} from "../firebase";
import { UserProfile, ContactData, ChatMessage } from "../types";

// ======================== PROFILE MODAL ========================
interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onProfileUpdated: (updated: Partial<UserProfile>) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || "");
  const [bio, setBio] = useState(currentUser.bio || "");
  const [newChatId, setNewChatId] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatar);
  const [readReceipts, setReadReceipts] = useState<boolean>(currentUser.readReceipts !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser.displayName || "");
      setBio(currentUser.bio || "");
      setAvatarPreview(currentUser.avatar);
      setReadReceipts(currentUser.readReceipts !== false);
      setNewChatId("");
      setCopiedLink(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      alert("Image is too large. Please select an image under 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: any = {
        displayName: displayName.trim() || currentUser.id,
        bio: bio.trim() || "Hey there! I am using TalkFussion.",
        avatar: avatarPreview || null,
        readReceipts: readReceipts,
      };

      await update(ref(db, `users/${currentUser.uid}`), updates);
      onProfileUpdated(updates);
      onClose();
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeChatId = async () => {
    const target = sanitizeId(newChatId.trim());
    if (target.length < 3) return alert("Chat ID must be at least 3 characters.");
    if (target === currentUser.id) return alert("That is already your current Chat ID.");

    try {
      const existing = await get(ref(db, `ids/${target}`));
      if (existing.exists()) return alert("That Chat ID is already taken. Try another.");

      const oldId = currentUser.id;
      await set(ref(db, `ids/${target}`), { uid: currentUser.uid, createdAt: serverTimestamp() });
      await update(ref(db, `users/${currentUser.uid}`), { id: target });
      if (oldId) await remove(ref(db, `ids/${oldId}`));

      onProfileUpdated({ id: target });
      setNewChatId("");
      alert(`Chat ID changed from ${oldId} to ${target}!`);
    } catch (err: any) {
      alert("Failed to change Chat ID: " + err.message);
    }
  };

  const copyInviteLink = () => {
    const text = `Join me on TalkFussion! My Chat ID is: ${currentUser.id}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Profile Settings</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-2xl border-2 border-emerald-500 shadow-md">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{currentUser.id.slice(0, 2).toUpperCase()}</span>
            )}
            <label className="absolute inset-0 bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
              <Camera size={20} />
              <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
            </label>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Click photo to change</span>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={25}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">About / Bio</label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={60}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        {/* Change Chat ID */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
            Current Chat ID: <span className="text-emerald-600 dark:text-emerald-400">@{currentUser.id}</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newChatId}
              onChange={(e) => setNewChatId(e.target.value)}
              placeholder="New Unique ID (e.g. ALEX99)"
              maxLength={20}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500 uppercase"
            />
            <button
              type="button"
              onClick={handleChangeChatId}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-slate-200"
            >
              Update ID
            </button>
          </div>
        </div>

        {/* Read Receipts Privacy Setting */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCheck size={14} className={readReceipts ? "text-[#53bdeb]" : "text-slate-400"} />
                <span>Read Receipts</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Send & receive blue checkmarks
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={readReceipts}
              onClick={() => setReadReceipts(!readReceipts)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                readReceipts ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  readReceipts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Invite link */}
        <button
          type="button"
          onClick={copyInviteLink}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
        >
          {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          <span>{copiedLink ? "Invite Copied!" : "Copy Invite Link"}</span>
        </button>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ======================== CREATE GROUP MODAL ========================
interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onGroupCreated: (groupId: string, groupName: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onGroupCreated,
}) => {
  const [groupName, setGroupName] = useState("");
  const [membersInput, setMembersInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = groupName.trim();
    const rawMembers = membersInput.trim();
    if (!name) return alert("Please enter a group name.");
    if (!rawMembers) return alert("Please enter at least one member Chat ID.");

    const memberIds = rawMembers.split(",").map((m) => sanitizeId(m.trim())).filter(Boolean);
    const groupId = "GROUP_" + Date.now();

    setIsCreating(true);
    try {
      await set(ref(db, `groups/${groupId}`), {
        name,
        creator: currentUser.id,
        createdAt: serverTimestamp(),
        members: { [currentUser.id]: true },
      });

      // Add to creator's contacts and init chat
      await set(ref(db, `users/${currentUser.uid}/contacts/${groupId}`), true);
      await set(ref(db, `chats/${groupId}__${groupId}`), { init: true });

      // Add for each member found
      for (const mid of memberIds) {
        const idSnap = await get(ref(db, `ids/${mid}`));
        if (idSnap.exists()) {
          const mUid = idSnap.val().uid;
          await update(ref(db, `groups/${groupId}/members`), { [mid]: true });
          await set(ref(db, `users/${mUid}/contacts/${groupId}`), true);
        }
      }

      setGroupName("");
      setMembersInput("");
      onGroupCreated(groupId, name);
      onClose();
    } catch (err: any) {
      alert("Failed to create group: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            <Users size={18} className="text-emerald-500" />
            Create Group
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Project Team, Family"
              maxLength={25}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Add Members by Chat ID</label>
            <input
              type="text"
              value={membersInput}
              onChange={(e) => setMembersInput(e.target.value)}
              placeholder="Chat IDs separated by commas"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500 uppercase"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">e.g. JOHN123, SARAH88</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !groupName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
            >
              {isCreating ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================== FORWARD MODAL ========================
interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToForward: ChatMessage | null;
  contacts: string[];
  contactData: Record<string, ContactData>;
  nicknames: Record<string, string>;
  currentUser: UserProfile;
  onForwardComplete: (targetCount: number) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  messageToForward,
  contacts,
  contactData,
  nicknames,
  currentUser,
  onForwardComplete,
}) => {
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedUids(new Set());
      setSearch("");
    }
  }, [isOpen]);

  if (!isOpen || !messageToForward) return null;

  const toggleSelect = (uid: string) => {
    const next = new Set(selectedUids);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelectedUids(next);
  };

  const handleForward = async () => {
    if (selectedUids.size === 0) return alert("Please select at least one contact to forward to.");
    setIsForwarding(true);

    try {
      const m = messageToForward;
      for (const targetUid of selectedUids) {
        const isGroup = targetUid.startsWith("GROUP_");
        const key = isGroup ? `${targetUid}__${targetUid}` : [currentUser.uid, targetUid].sort().join("__");

        const payload: any = {
          senderUid: currentUser.uid,
          senderName: currentUser.displayName || currentUser.id,
          text: m.text || "",
          ts: Date.now(),
          read: false,
          forwarded: true,
          readBy: { [currentUser.uid]: true },
        };

        if (m.imageUrl) payload.imageUrl = m.imageUrl;
        if (m.audioUrl) payload.audioUrl = m.audioUrl;
        if (m.poll) payload.poll = m.poll;
        if (m.contactCard) payload.contactCard = m.contactCard;
        if (m.location) payload.location = m.location;
        if (m.liveLocation) payload.liveLocation = m.liveLocation;

        await push(ref(db, `chats/${key}`), payload);

        if (!isGroup) {
          const uRef = ref(db, `unread/${targetUid}/${currentUser.uid}`);
          const snap = await get(uRef);
          await set(uRef, (snap.val() || 0) + 1);
        }
      }

      onForwardComplete(selectedUids.size);
      onClose();
    } catch (err: any) {
      alert("Forward failed: " + err.message);
    } finally {
      setIsForwarding(false);
    }
  };

  const filtered = contacts.filter((uid) => {
    const data = contactData[uid] || {};
    const name = nicknames[uid] || data.displayName || data.id || "User";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Forward message to</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="my-3 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-700/50 py-1">
          {filtered.length > 0 ? (
            filtered.map((uid) => {
              const data = contactData[uid] || {};
              const name = nicknames[uid] || data.displayName || data.id || "User";
              const isSelected = selectedUids.has(uid);

              return (
                <div
                  key={uid}
                  onClick={() => toggleSelect(uid)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100" : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                  </div>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {data.avatar ? (
                      <img src={data.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 truncate text-xs font-semibold">{name}</div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">No contacts found</div>
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isForwarding || selectedUids.size === 0}
            onClick={handleForward}
            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
          >
            {isForwarding ? "Forwarding..." : `Forward (${selectedUids.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ======================== STARRED MESSAGES MODAL ========================
interface StarredModalProps {
  isOpen: boolean;
  onClose: () => void;
  starredMessages: Record<string, any>;
  onUnstar: (msgId: string) => void;
  onJumpToChat: (chatUid: string, chatId: string) => void;
}

export const StarredMessagesModal: React.FC<StarredModalProps> = ({
  isOpen,
  onClose,
  starredMessages,
  onUnstar,
  onJumpToChat,
}) => {
  if (!isOpen) return null;

  const entries = Object.entries(starredMessages).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            <Star size={18} className="text-yellow-400 fill-yellow-400" />
            Starred Messages
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-3">
          {entries.length > 0 ? (
            entries.map(([id, item]) => (
              <div
                key={id}
                onClick={() => {
                  onJumpToChat(item.chatUid, item.chatId);
                  onClose();
                }}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 cursor-pointer transition-colors relative group"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                  <span>{item.senderName} · {item.chatId}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px]">{formatTime(item.ts)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnstar(id);
                      }}
                      className="text-slate-400 hover:text-red-500"
                      title="Unstar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                  {item.text || "(Media message)"}
                </p>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No starred messages yet. Star any message by clicking the star icon.
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ======================== QUICK REPLIES MODAL ========================
interface QuickRepliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickReplies: string[];
  onSelectReply: (reply: string) => void;
  onAddReply: (newReply: string) => void;
  onDeleteReply: (index: number) => void;
}

export const QuickRepliesModal: React.FC<QuickRepliesModalProps> = ({
  isOpen,
  onClose,
  quickReplies,
  onSelectReply,
  onAddReply,
  onDeleteReply,
}) => {
  const [newText, setNewText] = useState("");

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddReply(newText.trim());
    setNewText("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Quick Replies</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 py-3">
          {quickReplies.map((qr, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelectReply(qr);
                onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 cursor-pointer text-xs text-slate-800 dark:text-slate-200 font-medium transition-colors"
            >
              <span className="truncate flex-1">{qr}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteReply(idx);
                }}
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add custom quick reply..."
            maxLength={100}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!newText.trim()}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
};

// ======================== CREATE POLL MODAL ========================
interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPoll: (question: string, options: string[]) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onSubmitPoll,
}) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 6) return alert("Maximum 6 options allowed.");
    setOptions([...options, ""]);
  };

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    const validOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || validOpts.length < 2) {
      alert("Please enter a question and at least 2 options.");
      return;
    }
    onSubmitPoll(q, validOpts);
    setQuestion("");
    setOptions(["", ""]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Create Poll</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              maxLength={100}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Options</label>
            {options.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                maxLength={50}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs outline-none focus:border-emerald-500"
              />
            ))}
          </div>

          {options.length < 6 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> Add Option
            </button>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
            >
              Create Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================== LIVE LOCATION MODAL ========================
interface LiveLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSharing: (durationMs: number) => void;
  onStopSharing: () => void;
  isSharing: boolean;
}

export const LiveLocationModal: React.FC<LiveLocationModalProps> = ({
  isOpen,
  onClose,
  onStartSharing,
  onStopSharing,
  isSharing,
}) => {
  const [gpsReady, setGpsReady] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsReady(true);
        },
        () => setGpsReady(false)
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4 text-center">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            <MapPin size={18} className="text-red-500" />
            Share Live Location
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {isSharing ? (
          <div className="py-4 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Live location actively sharing
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your location updates continuously as you move.
            </p>
            <button
              onClick={() => {
                onStopSharing();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md shadow-red-600/20"
            >
              Stop Sharing Location
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {gpsReady && coords ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                  GPS signal ready ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                </span>
              ) : (
                "Fetching GPS coordinates..."
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select duration to share your live location:
            </p>

            <div className="space-y-2">
              {[
                { label: "15 Minutes", ms: 15 * 60 * 1000 },
                { label: "1 Hour", ms: 60 * 60 * 1000 },
                { label: "8 Hours", ms: 8 * 60 * 60 * 1000 },
              ].map((opt) => (
                <button
                  key={opt.ms}
                  onClick={() => {
                    onStartSharing(opt.ms);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-800 dark:text-slate-200 hover:text-emerald-600 text-xs font-semibold transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ======================== CHAT SETTINGS MODAL ========================
export interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateReadReceipts: (enabled: boolean) => Promise<void>;
  wallpaper?: string;
  onSelectWallpaper?: (wp: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateReadReceipts,
  wallpaper = "doodle",
  onSelectWallpaper,
  isDarkMode,
  onToggleTheme,
}) => {
  const [readReceipts, setReadReceipts] = useState<boolean>(currentUser.readReceipts !== false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setReadReceipts(currentUser.readReceipts !== false);
  }, [currentUser.readReceipts, isOpen]);

  if (!isOpen) return null;

  const handleToggleReadReceipts = async () => {
    const next = !readReceipts;
    setReadReceipts(next);
    setIsUpdating(true);
    try {
      await onUpdateReadReceipts(next);
    } catch (err: any) {
      alert("Failed to update read receipts: " + err.message);
      setReadReceipts(!next);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Settings size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Chat Settings</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Account privacy & messaging preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Setting 1: Read Receipts (WhatsApp Style) */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Read Receipts</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    readReceipts
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {readReceipts ? "Enabled" : "Off"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                If turned off, you won't send or receive read receipts (blue double checkmarks) in private chats. Read receipts are always sent in group chats.
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={readReceipts}
              disabled={isUpdating}
              onClick={handleToggleReadReceipts}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                readReceipts ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  readReceipts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Visual Indicator Preview */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Visual preview:</span>
            <div className="flex items-center gap-2 font-medium">
              {readReceipts ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCheck size={15} className="text-[#53bdeb]" /> Blue checkmarks (Active)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <CheckCheck size={15} className="text-slate-400" /> Grey checkmarks only (Private)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Setting 2: Chat Wallpaper (Quick switch) */}
        {onSelectWallpaper && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette size={16} className="text-emerald-500" />
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Chat Wallpaper</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{wallpaper}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: "doodle", label: "Doodle" },
                { id: "nature", label: "Nature" },
                { id: "classic", label: "Classic" },
              ].map((wp) => (
                <button
                  key={wp.id}
                  onClick={() => onSelectWallpaper(wp.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    wallpaper === wp.id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  {wp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Setting 3: Dark / Light Mode */}
        {onToggleTheme && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDarkMode ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-500" />}
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm block">Theme</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Currently in {isDarkMode ? "Dark" : "Light"} mode</span>
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Switch to {isDarkMode ? "Light" : "Dark"}
            </button>
          </div>
        )}

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
