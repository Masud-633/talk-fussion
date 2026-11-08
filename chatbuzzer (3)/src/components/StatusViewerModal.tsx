import React, { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Camera,
  Send,
  MessageSquare,
  BellOff,
  Bell,
  Heart
} from "lucide-react";
import {
  ref,
  set,
  get,
  remove,
  push,
  update,
  onValue,
  db,
  chatKey,
  formatStatusTime
} from "../firebase";
import { StatusItem, UserProfile } from "../types";

interface StatusViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid: string;
  statuses: StatusItem[];
  currentUser: UserProfile;
  authorName: string;
  authorAvatar?: string | null;
  isMuted: boolean;
  onToggleMute: (authorUid: string) => void;
  onOpenChatWithContact: (contactUid: string, contactId: string) => void;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  isOpen,
  onClose,
  userUid,
  statuses,
  currentUser,
  authorName,
  authorAvatar,
  isMuted,
  onToggleMute,
  onOpenChatWithContact,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMine = userUid === currentUser.uid;
  const currentStatus = statuses[currentIndex];

  // Reset index when modal opens or userUid changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setReplyText("");
      setReplyImage(null);
      setShowCommentsDrawer(false);
      setShowViewersModal(false);
    }
  }, [isOpen, userUid]);

  // Mark status as viewed by current user
  useEffect(() => {
    if (isOpen && currentStatus && !isMine && currentUser.uid) {
      const viewerRef = ref(db, `statuses/${userUid}/${currentStatus.id}/viewers/${currentUser.uid}`);
      set(viewerRef, true).catch(() => {});
    }
  }, [isOpen, currentStatus?.id, isMine, userUid, currentUser.uid]);

  // Listen to live comments for current status
  useEffect(() => {
    if (!isOpen || !currentStatus) return;
    const commentsRef = ref(db, `statuses/${userUid}/${currentStatus.id}/comments`);
    const unsubscribe = onValue(commentsRef, (snapshot) => {
      const val = snapshot.val() || {};
      const list = Object.entries(val).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }));
      list.sort((a, b) => a.ts - b.ts);
      setComments(list);
    });
    return () => unsubscribe();
  }, [isOpen, currentStatus?.id, userUid]);

  // Auto-advance timer (5 seconds)
  useEffect(() => {
    if (!isOpen || showCommentsDrawer || showViewersModal) return;
    const timer = setTimeout(() => {
      if (currentIndex < statuses.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onClose();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isOpen, currentIndex, statuses.length, showCommentsDrawer, showViewersModal, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, statuses.length]);

  if (!isOpen || !currentStatus) return null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  // Toggle emoji reaction
  const handleEmojiReaction = async (emoji: string) => {
    if (isMine) return;
    const myCurrentReaction = currentStatus.reactions?.[currentUser.uid];
    const reactRef = ref(db, `statuses/${userUid}/${currentStatus.id}/reactions/${currentUser.uid}`);
    if (myCurrentReaction === emoji) {
      await remove(reactRef);
    } else {
      await set(reactRef, emoji);
    }
  };

  // Delete status
  const handleDeleteStatus = async () => {
    if (!isMine) return;
    if (confirm("Delete this status?")) {
      await remove(ref(db, `statuses/${currentUser.uid}/${currentStatus.id}`));
      if (statuses.length <= 1) {
        onClose();
      } else if (currentIndex >= statuses.length - 1) {
        setCurrentIndex((prev) => prev - 1);
      }
    }
  };

  // Send comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const txt = newCommentText.trim();
    if (!txt) return;

    const commentPushRef = push(ref(db, `statuses/${userUid}/${currentStatus.id}/comments`));
    await set(commentPushRef, {
      text: txt,
      ts: Date.now(),
      senderUid: currentUser.uid,
      senderName: currentUser.displayName || currentUser.id,
      senderAvatar: currentUser.avatar || null,
    });
    setNewCommentText("");
  };

  // Send private reply to status into chat
  const handleSendPrivateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMine) return;
    const text = replyText.trim();
    if (!text && !replyImage) return;

    setIsSendingReply(true);
    try {
      const key = chatKey(currentUser.uid, userUid);
      const msgRef = push(ref(db, `chats/${key}`));

      const payload: any = {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || currentUser.id,
        text: text || "📷 Photo",
        ts: Date.now(),
        read: false,
        readBy: { [currentUser.uid]: true },
        statusReply: {
          statusId: currentStatus.id,
          statusText: currentStatus.text || "",
          statusImage: currentStatus.image || null,
          statusBg: currentStatus.bg || "#00a884",
          authorUid: userUid,
          authorName: authorName,
        },
      };

      if (replyImage) {
        payload.imageUrl = replyImage;
      }

      await set(msgRef, payload);

      // Increment unread for receiver
      const uRef = ref(db, `unread/${userUid}/${currentUser.uid}`);
      const snap = await get(uRef);
      await set(uRef, (snap.val() || 0) + 1);

      // Reset
      setReplyText("");
      setReplyImage(null);
      onClose();
      onOpenChatWithContact(userUid, authorName);
    } catch (err: any) {
      alert("Failed to send reply: " + err.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Handle image upload for reply
  const handlePhotoReplySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 700000) {
      alert("Image is too large. Please select an image under 700KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReplyImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Viewers list count
  const viewersCount = Object.keys(currentStatus.viewers || {}).length;
  const myReaction = currentStatus.reactions?.[currentUser.uid];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none backdrop-blur-sm">
      <div className="relative w-full max-w-md h-full md:h-[88vh] md:max-h-[780px] bg-slate-900 md:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Top Progress Segmented Bar */}
        <div className="absolute top-3 left-4 right-4 z-30 flex items-center gap-1.5">
          {statuses.map((_, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={idx}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className={`h-full bg-white transition-all ${
                    isCompleted
                      ? "w-full"
                      : isCurrent
                      ? "w-full duration-[5000ms] ease-linear"
                      : "w-0"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Header Bar */}
        <div className="absolute top-7 left-4 right-4 z-30 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-white/20">
              {authorAvatar ? (
                <img src={authorAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{authorName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="font-semibold text-sm drop-shadow">{authorName}</div>
              <div className="text-xs text-white/75 drop-shadow">
                {formatStatusTime(currentStatus.ts)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isMine && (
              <button
                onClick={() => onToggleMute(userUid)}
                className={`p-2 rounded-full transition-colors ${
                  isMuted ? "bg-red-500/80 text-white" : "bg-black/30 text-white/80 hover:bg-black/50"
                }`}
                title={isMuted ? "Unmute status" : "Mute status for 24h"}
              >
                {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
              </button>
            )}

            {isMine && (
              <button
                onClick={handleDeleteStatus}
                className="p-2 rounded-full bg-red-600/80 text-white hover:bg-red-600 transition-colors"
                title="Delete this status"
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Body Area */}
        <div className="relative flex-1 flex items-center justify-center p-6 text-center overflow-hidden">
          {currentStatus.image ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img
                src={currentStatus.image}
                alt=""
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-xl"
              />
              {currentStatus.text && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md text-white text-sm px-4 py-2.5 rounded-xl">
                  {currentStatus.text}
                </div>
              )}
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center p-8 rounded-xl shadow-2xl transition-all"
              style={{ backgroundColor: currentStatus.bg || "#00a884" }}
            >
              <p className="text-white text-xl md:text-2xl font-bold leading-relaxed max-w-sm whitespace-pre-wrap break-words drop-shadow-md">
                {currentStatus.text}
              </p>
            </div>
          )}

          {/* Left / Right Tap zones */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all z-20"
            title="Previous"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all z-20"
            title="Next"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Footer Area: Actions & Replies */}
        <div className="relative z-30 p-3 bg-slate-900/90 border-t border-white/10 backdrop-blur-md">
          {/* Reaction Pill for Contacts */}
          {!isMine && (
            <div className="flex items-center justify-center gap-2 mb-2">
              {["❤️", "😂", "😮", "😢", "👍", "🔥"].map((emoji) => {
                const isSelected = myReaction === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiReaction(emoji)}
                    className={`text-xl p-1.5 rounded-full transition-transform hover:scale-125 ${
                      isSelected ? "scale-110 ring-2 ring-emerald-500 bg-emerald-500/20" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}

          {/* If Mine: Viewers Count & List */}
          {isMine ? (
            <div className="flex items-center justify-between text-white text-xs px-2 py-1">
              <button
                onClick={() => setShowViewersModal(!showViewersModal)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Eye size={14} className="text-emerald-400" />
                <span>{viewersCount} view{viewersCount !== 1 ? "s" : ""}</span>
              </button>

              <div className="text-white/60 text-xs">
                Visible for 24 hours
              </div>
            </div>
          ) : (
            /* If Contact: Reply Bar & Comments Drawer Button */
            <div>
              {/* Optional Photo thumbnail to send with reply */}
              {replyImage && (
                <div className="relative inline-block mb-2 ml-2">
                  <img
                    src={replyImage}
                    alt=""
                    className="w-14 h-14 object-cover rounded-lg border-2 border-emerald-500"
                  />
                  <button
                    onClick={() => setReplyImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendPrivateReply} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCommentsDrawer(!showCommentsDrawer)}
                  className="relative p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="View comments"
                >
                  <MessageSquare size={16} />
                  {comments.length > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                      {comments.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Attach Photo"
                >
                  <Camera size={16} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoReplySelect}
                  className="hidden"
                />

                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply privately..."
                  className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/50 text-xs px-3.5 py-2.5 rounded-full outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={isSendingReply || (!replyText.trim() && !replyImage)}
                  className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white transition-colors"
                  title="Send Reply"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Viewers Modal Drawer (For My Status) */}
        {showViewersModal && isMine && (
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-slate-900 border-t border-white/20 p-4 z-40 rounded-t-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-white">
              <h4 className="font-semibold text-sm flex items-center gap-1.5">
                <Eye size={16} className="text-emerald-400" />
                Viewed by ({viewersCount})
              </h4>
              <button
                onClick={() => setShowViewersModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 text-white/80 text-xs divide-y divide-white/5">
              {viewersCount > 0 ? (
                Object.keys(currentStatus.viewers || {}).map((vid) => (
                  <div key={vid} className="py-2 flex items-center justify-between">
                    <span>{vid === currentUser.uid ? "You" : `@${vid.slice(0, 10)}`}</span>
                    <span className="text-[10px] text-white/50">Seen</span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-white/50">
                  No views yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comments Drawer */}
        {showCommentsDrawer && (
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-slate-900 border-t border-white/20 p-4 z-40 rounded-t-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-white">
              <h4 className="font-semibold text-sm flex items-center gap-1.5">
                <MessageSquare size={16} className="text-emerald-400" />
                Comments ({comments.length})
              </h4>
              <button
                onClick={() => setShowCommentsDrawer(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      {c.senderAvatar ? (
                        <img src={c.senderAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        c.senderName?.slice(0, 2).toUpperCase() || "U"
                      )}
                    </div>
                    <div className="bg-white/10 p-2 rounded-xl text-white flex-1 break-words">
                      <div className="font-semibold text-emerald-400 text-[11px] mb-0.5">
                        {c.senderName}
                      </div>
                      <div>{c.text}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-white/50 text-xs">
                  No comments yet. Start the conversation!
                </div>
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-white/10">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add a public comment..."
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-xs font-semibold"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
