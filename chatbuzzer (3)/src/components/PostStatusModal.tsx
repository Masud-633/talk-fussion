import React, { useState, useRef } from "react";
import { X, Image as ImageIcon, Palette, Type, Upload } from "lucide-react";
import { push, set, ref, db, serverTimestamp } from "../firebase";
import { UserProfile } from "../types";

interface PostStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  currentGroupId?: string | null;
  onStatusPublished: () => void;
}

const BG_COLORS = [
  "#00a884",
  "#8a3bd1",
  "#e67e22",
  "#2980b9",
  "#c0392b",
  "#2c3e50",
  "#16a085",
  "#d35400",
];

export const PostStatusModal: React.FC<PostStatusModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentGroupId,
  onStatusPublished,
}) => {
  const [tab, setTab] = useState<"text" | "photo">("text");
  const [statusText, setStatusText] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [postToGroup, setPostToGroup] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 700000) {
      alert("Image is too large. Please select an image under 700KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSelectedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = statusText.trim();
    if (!text && !selectedImage) {
      alert("Please enter text or choose an image for your status.");
      return;
    }

    setIsPublishing(true);
    try {
      const targetPath = postToGroup && currentGroupId
        ? `statuses/${currentGroupId}`
        : `statuses/${currentUser.uid}`;

      const newStatusRef = push(ref(db, targetPath));
      const payload: any = {
        text: text,
        image: selectedImage || null,
        bg: selectedBg,
        ts: Date.now(),
        serverTs: serverTimestamp(),
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || currentUser.id,
        isGroupStatus: postToGroup && !!currentGroupId,
        groupId: postToGroup && currentGroupId ? currentGroupId : null,
        viewers: { [currentUser.uid]: true },
        reactions: {},
        comments: {},
      };

      await set(newStatusRef, payload);

      // Reset
      setStatusText("");
      setSelectedImage(null);
      setPostToGroup(false);
      onStatusPublished();
      onClose();
    } catch (err: any) {
      alert("Failed to publish status: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">
              Add to Status
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1.5 mx-4 mt-4 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("text")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === "text"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Type size={14} />
            <span>Text Status</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("photo")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === "photo"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <ImageIcon size={14} />
            <span>Photo Status</span>
          </button>
        </div>

        {/* Content Area */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {tab === "text" ? (
            <div className="space-y-3">
              <div
                className="h-44 rounded-xl p-4 flex items-center justify-center transition-colors relative"
                style={{ backgroundColor: selectedBg }}
              >
                <textarea
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="Type a status..."
                  maxLength={280}
                  className="w-full h-full bg-transparent text-white font-bold text-lg md:text-xl text-center resize-none outline-none placeholder-white/70"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-white/70">
                  {statusText.length}/280
                </span>
              </div>

              {/* Color Swatches */}
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Palette size={13} />
                  <span>Choose Background Color</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {BG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedBg(color)}
                      className={`w-7 h-7 rounded-full shrink-0 transition-transform ${
                        selectedBg === color ? "scale-125 ring-2 ring-offset-2 ring-emerald-500" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedImage ? (
                <div className="relative h-44 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-44 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
                >
                  <Upload size={28} className="text-emerald-500" />
                  <span className="text-xs font-medium">Click to select photo</span>
                  <span className="text-[10px] text-slate-400">Max size 700KB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="Add a caption..."
                maxLength={120}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Post to Group Toggle if in group */}
          {currentGroupId && (
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={postToGroup}
                onChange={(e) => setPostToGroup(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Post as Group Status (shared in current group)
              </span>
            </label>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing || (tab === "text" && !statusText.trim()) || (tab === "photo" && !selectedImage)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-md shadow-emerald-600/20"
            >
              {isPublishing ? "Publishing..." : "Publish Status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
