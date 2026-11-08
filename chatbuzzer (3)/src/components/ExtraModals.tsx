import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Check,
  CheckCheck,
  Shield,
  MessageSquare,
  StickyNote,
  Smile,
  Clock,
  Contact,
  Send,
  Plus,
  Trash2
} from "lucide-react";
import {
  ref,
  get,
  set,
  push,
  onValue,
  remove,
  db,
  sanitizeId,
  formatTime
} from "../firebase";
import { ChatMessage, UserProfile } from "../types";

// ======================== IMAGE VIEWER LIGHTBOX ========================
interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <a
          href={imageUrl}
          download="TalkFussion_Image.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Download Image"
        >
          <Download size={18} />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      <img
        src={imageUrl}
        alt="Full view"
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
      />
    </div>
  );
};

// ======================== MESSAGE INFO MODAL ========================
interface MessageInfoModalProps {
  isOpen: boolean;
  message: ChatMessage | null;
  onClose: () => void;
}

export const MessageInfoModal: React.FC<MessageInfoModalProps> = ({
  isOpen,
  message,
  onClose,
}) => {
  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4 text-center">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Message Info</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 py-2">
          {message.read ? (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 space-y-1">
              <CheckCheck size={28} className="mx-auto" />
              <div className="font-bold text-sm">Read</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {message.readAt ? new Date(message.readAt).toLocaleString() : "Read"}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 space-y-1">
              <Check size={28} className="mx-auto" />
              <div className="font-bold text-sm">Delivered</div>
              <div className="text-xs text-slate-400">
                Waiting to be read...
              </div>
            </div>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 text-left space-y-1 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div><span className="font-semibold text-slate-700 dark:text-slate-300">Sent:</span> {new Date(message.ts).toLocaleString()}</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ======================== DISAPPEARING MESSAGES MODAL ========================
interface DisappearingMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDuration?: number;
  onSelectDuration: (durationMs: number) => void;
}

export const DisappearingMessagesModal: React.FC<DisappearingMessagesModalProps> = ({
  isOpen,
  onClose,
  currentDuration = 0,
  onSelectDuration,
}) => {
  if (!isOpen) return null;

  const options = [
    { label: "Off", ms: 0 },
    { label: "24 Hours", ms: 24 * 60 * 60 * 1000 },
    { label: "7 Days", ms: 7 * 24 * 60 * 60 * 1000 },
    { label: "90 Days", ms: 90 * 24 * 60 * 60 * 1000 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            <Clock size={18} className="text-emerald-500" />
            Disappearing Messages
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          For more privacy, new messages in this chat will disappear after the selected period.
        </p>

        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.ms}
              onClick={() => {
                onSelectDuration(opt.ms);
                onClose();
              }}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                currentDuration === opt.ms
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              <span>{opt.label}</span>
              {currentDuration === opt.ms && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ======================== CONTACT CARD SHARING MODAL ========================
interface ContactCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareContact: (contactId: string) => void;
}

export const ContactCardModal: React.FC<ContactCardModalProps> = ({
  isOpen,
  onClose,
  onShareContact,
}) => {
  const [targetId, setTargetId] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = sanitizeId(targetId.trim());
    if (!id) return;
    onShareContact(id);
    setTargetId("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            <Contact size={18} className="text-emerald-500" />
            Share Contact
          </h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Enter Chat ID to Share
            </label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="e.g. EMILY77"
              maxLength={20}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500 uppercase"
            />
          </div>

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
              disabled={!targetId.trim()}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
            >
              Share Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================== ADMIN DASHBOARD ========================
interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [adminInterruptText, setAdminInterruptText] = useState("");
  const [isSendingInterrupt, setIsSendingInterrupt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load all users
      get(ref(db, "users")).then((snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val)
          .filter(([uid, u]: [string, any]) => u.id !== "ADMIN")
          .map(([uid, u]: [string, any]) => ({ uid, ...u }));
        setUsers(list);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedUserUid) return;
    const key = [currentUser.uid, selectedUserUid].sort().join("__");
    const unsubscribe = onValue(ref(db, `chats/${key}`), (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val)
        .filter(([id, m]: [string, any]) => m && m.text !== undefined)
        .map(([id, m]: [string, any]) => ({ id, ...m }));
      list.sort((a, b) => (a.ts || 0) - (b.ts || 0));
      setMessages(list);
    });
    return () => unsubscribe();
  }, [isOpen, selectedUserUid, currentUser.uid]);

  if (!isOpen) return null;

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserUid || !adminInterruptText.trim()) return;

    setIsSendingInterrupt(true);
    try {
      const key = [currentUser.uid, selectedUserUid].sort().join("__");
      const msgRef = push(ref(db, `chats/${key}`));

      await set(msgRef, {
        senderUid: currentUser.uid,
        senderName: "ADMIN",
        text: adminInterruptText.trim(),
        ts: Date.now(),
        read: false,
        readBy: { [currentUser.uid]: true },
        isAdminIntervention: true,
      });

      // Increment unread for user
      const uRef = ref(db, `unread/${selectedUserUid}/${currentUser.uid}`);
      const snap = await get(uRef);
      await set(uRef, (snap.val() || 0) + 1);

      setAdminInterruptText("");
    } catch (err: any) {
      alert("Failed to send admin message: " + err.message);
    } finally {
      setIsSendingInterrupt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col text-slate-100">
      {/* Admin Top Bar */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 text-red-500 rounded-xl">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="font-bold text-base">Admin Dashboard</h2>
            <p className="text-xs text-slate-400">Live chat supervision & interruption mode</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
        >
          Exit Admin Mode
        </button>
      </div>

      {/* Admin Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: User List */}
        <div className="w-72 bg-slate-900 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800">
          <div className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Registered Users ({users.length})
          </div>
          {users.map((u) => (
            <div
              key={u.uid}
              onClick={() => {
                setSelectedUserUid(u.uid);
                setSelectedUserName(u.displayName || u.id);
              }}
              className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                selectedUserUid === u.uid
                  ? "bg-slate-800 text-white border-l-4 border-emerald-500"
                  : "hover:bg-slate-800/50 text-slate-300"
              }`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center font-bold text-xs">
                {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.id.slice(0, 2)}
              </div>
              <div className="flex-1 truncate">
                <div className="font-semibold text-xs">{u.displayName || u.id}</div>
                <div className="text-[11px] text-slate-500">@{u.id}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Chat Feed & Interruption */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {selectedUserUid ? (
            <>
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Conversation with {selectedUserName}</h3>
                  <span className="text-[11px] text-slate-400">UID: {selectedUserUid}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length > 0 ? (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-md p-3 rounded-2xl text-xs space-y-1 ${
                        m.isAdminIntervention
                          ? "bg-red-950/40 border border-red-500/50 text-red-200 ml-auto"
                          : m.senderUid === currentUser.uid
                          ? "bg-emerald-900/60 ml-auto text-emerald-100"
                          : "bg-slate-800 mr-auto text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold opacity-75">
                        <span>{m.senderName} {m.isAdminIntervention && "(ADMIN OFFICIAL)"}</span>
                        <span>{formatTime(m.ts)}</span>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No messages between Admin and this user yet.
                  </div>
                )}
              </div>

              {/* Admin Interruption Input */}
              <form onSubmit={handleSendAdminMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={adminInterruptText}
                  onChange={(e) => setAdminInterruptText(e.target.value)}
                  placeholder="Inject official Admin intervention message..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={isSendingInterrupt || !adminInterruptText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send size={14} /> Send as Admin
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a user from the left to inspect conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
