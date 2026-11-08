import React, { useState, useEffect, useRef } from "react";
import {
  auth,
  db,
  ref,
  set,
  get,
  onValue,
  push,
  remove,
  update,
  onDisconnect,
  onAuthStateChanged,
  signOut,
  chatKey,
  sanitizeId,
  type Unsubscribe
} from "./firebase";
import { UserProfile, ContactData, ChatMessage, StatusItem, CallData } from "./types";
import { Sidebar } from "./components/Sidebar";
import { ChatPanel } from "./components/ChatPanel";
import { AuthScreen } from "./components/AuthScreen";
import { StatusViewerModal } from "./components/StatusViewerModal";
import { PostStatusModal } from "./components/PostStatusModal";
import { VoiceCallOverlay } from "./components/VoiceCallOverlay";
import {
  ProfileModal,
  ChatSettingsModal,
  CreateGroupModal,
  ForwardModal,
  StarredMessagesModal,
  QuickRepliesModal,
  CreatePollModal,
  LiveLocationModal,
} from "./components/Modals";
import {
  ImageViewerModal,
  MessageInfoModal,
  DisappearingMessagesModal,
  ContactCardModal,
  AdminDashboardModal,
} from "./components/ExtraModals";

const NOTIF_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const servers: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:global.stun.twilio.com:3478" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("chatbuzz_theme") === "dark";
  });

  // Navigation & Active Chat
  const [activeChatUid, setActiveChatUid] = useState<string | null>(null);
  const [isGroupChat, setIsGroupChat] = useState(false);

  // Data states
  const [contacts, setContacts] = useState<string[]>([]);
  const [contactData, setContactData] = useState<Record<string, ContactData>>({});
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [pinnedChats, setPinnedChats] = useState<Record<string, boolean>>({});
  const [archivedChats, setArchivedChats] = useState<Record<string, boolean>>({});
  const [mutedChats, setMutedChats] = useState<Record<string, boolean>>({});
  const [blockedUsers, setBlockedUsers] = useState<Record<string, boolean>>({});
  const [unreadData, setUnreadData] = useState<Record<string, number>>({});
  const [presenceData, setPresenceData] = useState<Record<string, { state: string; last_changed: number }>>({});
  const [typingData, setTypingData] = useState<Record<string, boolean>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, { text: string; ts?: number; senderUid?: string }>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [wallpapers, setWallpapers] = useState<Record<string, string>>({});
  const [disappearingSettings, setDisappearingSettings] = useState<Record<string, number>>({});
  const [starredMessages, setStarredMessages] = useState<Record<string, any>>({});
  const [quickReplies, setQuickReplies] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("chatbuzz_quick_replies") || '["On my way!", "Thanks!", "Yes, sounds good.", "Can we talk later?"]');
  });

  // Active Chat Messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Statuses
  const [statusesByUser, setStatusesByUser] = useState<Record<string, Record<string, StatusItem>>>({});
  const [mutedStatuses, setMutedStatuses] = useState<Record<string, any>>({});
  const [viewingStatusUid, setViewingStatusUid] = useState<string | null>(null);
  const [isPostStatusOpen, setIsPostStatusOpen] = useState(false);

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [forwardMessageItem, setForwardMessageItem] = useState<ChatMessage | null>(null);
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [isDisappearingOpen, setIsDisappearingOpen] = useState(false);
  const [isContactCardOpen, setIsContactCardOpen] = useState(false);
  const [isLiveLocationOpen, setIsLiveLocationOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedMessageInfo, setSelectedMessageInfo] = useState<ChatMessage | null>(null);

  // Live Location watch ID
  const locationWatchIdRef = useRef<number | null>(null);
  const liveLocationMsgIdRef = useRef<string | null>(null);
  const [isLocationSharingActive, setIsLocationSharingActive] = useState(false);

  // WebRTC Voice Call
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<CallData | null>(null);
  const callUnsubsRef = useRef<Unsubscribe[]>([]);
  const callRingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const notifAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    notifAudioRef.current = new Audio(NOTIF_SOUND_URL);
  }, []);

  // Theme synchronization
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("chatbuzz_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("chatbuzz_theme", "light");
    }
  }, [isDarkMode]);

  // Auth observer
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await get(ref(db, `users/${user.uid}`));
        if (snap.exists()) {
          const data = snap.val();
          setCurrentUser({
            uid: user.uid,
            id: data.id || "USER",
            email: user.email || data.email,
            displayName: data.displayName || data.id,
            bio: data.bio || "Hey there! I am using TalkFussion.",
            avatar: data.avatar || null,
            readReceipts: data.readReceipts !== false,
          });

          // Setup Presence
          const statusRef = ref(db, `status/${user.uid}`);
          onDisconnect(statusRef).set({ state: "offline", last_changed: Date.now() });
          set(statusRef, { state: "online", last_changed: Date.now() });
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Sync User Contacts, Unread, Preferences
  useEffect(() => {
    if (!currentUser) return;

    const unsubs: Unsubscribe[] = [];

    // Contacts
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/contacts`), async (snap) => {
        const contactUids = snap.exists() ? Object.keys(snap.val()) : [];
        setContacts(contactUids);

        // Fetch detail for each contact
        const dataMap: Record<string, ContactData> = {};
        for (const uid of contactUids) {
          if (uid.startsWith("GROUP_")) {
            const gSnap = await get(ref(db, `groups/${uid}`));
            if (gSnap.exists()) {
              dataMap[uid] = { id: gSnap.val().name, isGroup: true };
            }
          } else {
            const uSnap = await get(ref(db, `users/${uid}`));
            if (uSnap.exists()) {
              const u = uSnap.val();
              dataMap[uid] = {
                id: u.id,
                displayName: u.displayName || u.id,
                avatar: u.avatar || null,
                bio: u.bio || "",
              };
            }
          }
        }
        setContactData(dataMap);
      })
    );

    // Unread
    unsubs.push(
      onValue(ref(db, `unread/${currentUser.uid}`), (snap) => {
        setUnreadData(snap.val() || {});
      })
    );

    // Pinned
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/pinned`), (snap) => {
        setPinnedChats(snap.val() || {});
      })
    );

    // Archived
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/archived`), (snap) => {
        setArchivedChats(snap.val() || {});
      })
    );

    // Muted
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/muted`), (snap) => {
        setMutedChats(snap.val() || {});
      })
    );

    // Blocked
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/blocked`), (snap) => {
        setBlockedUsers(snap.val() || {});
      })
    );

    // Starred
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/starred`), (snap) => {
        setStarredMessages(snap.val() || {});
      })
    );

    // Nicknames
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/nicknames`), (snap) => {
        setNicknames(snap.val() || {});
      })
    );

    // Wallpapers
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/wallpapers`), (snap) => {
        setWallpapers(snap.val() || {});
      })
    );

    // Disappearing Settings
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/disappearing`), (snap) => {
        setDisappearingSettings(snap.val() || {});
      })
    );

    // Muted Statuses
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/mutedStatuses`), (snap) => {
        setMutedStatuses(snap.val() || {});
      })
    );

    // Read Receipts Preference
    unsubs.push(
      onValue(ref(db, `users/${currentUser.uid}/readReceipts`), (snap) => {
        const val = snap.val();
        const enabled = val !== false;
        setCurrentUser((prev) => (prev ? { ...prev, readReceipts: enabled } : null));
      })
    );

    // Statuses feed (24h filter)
    unsubs.push(
      onValue(ref(db, "statuses"), (snap) => {
        const val = snap.val() || {};
        const now = Date.now();
        const fresh: Record<string, Record<string, StatusItem>> = {};

        Object.entries(val).forEach(([uid, statusesObj]: [string, any]) => {
          if (!statusesObj) return;
          const userFresh: Record<string, StatusItem> = {};
          Object.entries(statusesObj).forEach(([sid, s]: [string, any]) => {
            if (s && s.ts && now - s.ts < 24 * 60 * 60 * 1000) {
              userFresh[sid] = { id: sid, ...s };
            }
          });
          if (Object.keys(userFresh).length > 0) {
            fresh[uid] = userFresh;
          }
        });
        setStatusesByUser(fresh);
      })
    );

    // Presence & Last Messages for all contacts
    const presenceRef = ref(db, "status");
    unsubs.push(
      onValue(presenceRef, (snap) => {
        setPresenceData(snap.val() || {});
      })
    );

    // Listen for incoming calls
    const callsRef = ref(db, "calls");
    unsubs.push(
      onValue(callsRef, (snap) => {
        const calls = snap.val() || {};
        const currentActive = activeCallRef.current;

        // If currently active call was removed or ended/declined by remote caller
        if (currentActive) {
          const remoteCall = calls[currentActive.id];
          const rawStatus = typeof remoteCall?.status === "string" ? remoteCall.status : remoteCall?.status?.status;
          if (!remoteCall || rawStatus === "ended" || rawStatus === "declined") {
            handleEndVoiceCall();
            return;
          }
        }

        // Check for new incoming call (only ringing calls within last 45 seconds)
        if (!currentActive) {
          const now = Date.now();
          for (const [cId, cData] of Object.entries(calls) as [string, any][]) {
            const rawStatus = typeof cData?.status === "string" ? cData.status : cData?.status?.status;
            if (
              cData &&
              cData.receiverUid === currentUser.uid &&
              rawStatus === "ringing" &&
              cData.timestamp &&
              now - cData.timestamp < 45000 &&
              cData.offer
            ) {
              setActiveCall({ id: cId, ...cData, status: "ringing" });
              setIsIncomingCall(true);
              break;
            }
          }
        }
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [currentUser?.uid]);

  // Listen to typing & last messages across contacts
  useEffect(() => {
    if (!currentUser || contacts.length === 0) return;

    const unsubs: Unsubscribe[] = [];

    contacts.forEach((contactUid) => {
      const isGroup = contactUid.startsWith("GROUP_");
      const key = isGroup ? `${contactUid}__${contactUid}` : chatKey(currentUser.uid, contactUid);

      // Typing
      if (!isGroup) {
        unsubs.push(
          onValue(ref(db, `typing/${key}/${contactUid}`), (snap) => {
            setTypingData((prev) => ({ ...prev, [contactUid]: snap.val() === true }));
          })
        );
      }

      // Last message
      unsubs.push(
        onValue(ref(db, `chats/${key}`), (snap) => {
          const val = snap.val() || {};
          const msgs = Object.values(val).filter((m: any) => m && m.text !== undefined) as any[];
          if (msgs.length > 0) {
            msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
            const last = msgs[msgs.length - 1];
            setLastMessages((prev) => ({
              ...prev,
              [contactUid]: { text: last.text, ts: last.ts, senderUid: last.senderUid },
            }));
          }
        })
      );
    });

    return () => unsubs.forEach((u) => u());
  }, [currentUser?.uid, contacts]);

  // Active Chat Message Stream
  useEffect(() => {
    if (!currentUser || !activeChatUid) {
      setMessages([]);
      return;
    }

    const key = isGroupChat ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
    const messagesRef = ref(db, `chats/${key}`);

    // Clear unread badge for this chat
    remove(ref(db, `unread/${currentUser.uid}/${activeChatUid}`));

    const unsubscribe = onValue(messagesRef, (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val)
        .filter(([id, m]: [string, any]) => m && m.text !== undefined)
        .map(([id, m]: [string, any]) => ({ id, ...m } as ChatMessage));

      list.sort((a, b) => (a.ts || 0) - (b.ts || 0));

      // Play notification if new message received
      if (list.length > messages.length && messages.length > 0) {
        const newest = list[list.length - 1];
        if (newest.senderUid !== currentUser.uid && !newest.silent && !mutedChats[activeChatUid]) {
          notifAudioRef.current?.play().catch(() => {});
        }
      }

      setMessages(list);

      // Mark received messages as read (respecting Read Receipts preference)
      list.forEach((m) => {
        if (m.senderUid !== currentUser.uid) {
          if (isGroupChat) {
            if (!m.readBy?.[currentUser.uid]) {
              update(ref(db, `chats/${key}/${m.id}/readBy`), { [currentUser.uid]: true });
            }
          } else if (currentUser.readReceipts !== false) {
            // Respect Read Receipts: only send read status back to Firebase if enabled!
            if (!m.read) {
              update(ref(db, `chats/${key}/${m.id}`), { read: true, readAt: Date.now() });
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.readReceipts, activeChatUid, isGroupChat]);

  // WebRTC Start Voice Call
  const handleStartVoiceCall = async () => {
    if (!activeChatUid || isGroupChat || !currentUser) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 },
      });
      localStreamRef.current = stream;

      const callId = `${chatKey(currentUser.uid, activeChatUid)}_${Date.now()}`;
      const pc = new RTCPeerConnection(servers);
      peerConnectionRef.current = pc;

      // Add local audio tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Listen for remote audio track for real 2-way calling!
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else if (event.track) {
          const remoteMediaStream = new MediaStream([event.track]);
          setRemoteStream(remoteMediaStream);
        }
      };

      // Push ICE candidates to Firebase
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(db, `calls/${callId}/callerCandidates`), event.candidate.toJSON());
        }
      };

      // Connection state monitors
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          if (callRingTimeoutRef.current) {
            clearTimeout(callRingTimeoutRef.current);
            callRingTimeoutRef.current = null;
          }
          setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
        } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          handleEndVoiceCall();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          if (callRingTimeoutRef.current) {
            clearTimeout(callRingTimeoutRef.current);
            callRingTimeoutRef.current = null;
          }
          setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
        } else if (pc.iceConnectionState === "failed") {
          pc.restartIce?.();
        }
      };

      // Automatically end call if tab closes or connection drops
      onDisconnect(ref(db, `calls/${callId}/status`)).set("ended");

      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      const callData: any = {
        callerUid: currentUser.uid,
        receiverUid: activeChatUid,
        callerName: currentUser.displayName || currentUser.id,
        offer: { type: offer.type, sdp: offer.sdp },
        status: "ringing",
        timestamp: Date.now(),
      };

      await set(ref(db, `calls/${callId}`), callData);

      setActiveCall({ id: callId, ...callData });
      setIsIncomingCall(false);

      // ICE Candidate queue to avoid race conditions before answer is received
      const pendingCandidates: any[] = [];
      let isRemoteDescriptionSet = false;

      // Listen for answer
      const unsubAnswer = onValue(ref(db, `calls/${callId}/answer`), async (snapshot) => {
        const answer = snapshot.val();
        if (answer && pc && pc.signalingState !== "closed" && !isRemoteDescriptionSet) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            isRemoteDescriptionSet = true;
            setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
            if (callRingTimeoutRef.current) {
              clearTimeout(callRingTimeoutRef.current);
              callRingTimeoutRef.current = null;
            }

            // Drain queued ICE candidates
            for (const cand of pendingCandidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch {}
            }
            pendingCandidates.length = 0;
          } catch (e) {
            console.warn("Error setting remote description from answer:", e);
          }
        }
      });
      callUnsubsRef.current.push(unsubAnswer);

      // Listen for remote ICE candidates
      const addedCandidates = new Set<string>();
      const unsubCandidates = onValue(ref(db, `calls/${callId}/receiverCandidates`), async (snapshot) => {
        const val = snapshot.val();
        if (val && pc && pc.signalingState !== "closed") {
          for (const cand of Object.values(val) as any[]) {
            if (cand && cand.candidate && !addedCandidates.has(cand.candidate)) {
              addedCandidates.add(cand.candidate);
              if (isRemoteDescriptionSet && pc.remoteDescription) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch {}
              } else {
                pendingCandidates.push(cand);
              }
            }
          }
        }
      });
      callUnsubsRef.current.push(unsubCandidates);

      // Listen for call status changes (declined / ended)
      const unsubStatus = onValue(ref(db, `calls/${callId}/status`), (snapshot) => {
        const rawVal = snapshot.val();
        const st = typeof rawVal === "string" ? rawVal : rawVal?.status;
        if (st === "declined" || st === "ended") {
          handleEndVoiceCall();
        }
      });
      callUnsubsRef.current.push(unsubStatus);

      // Auto-cancel if not answered within 45 seconds
      callRingTimeoutRef.current = setTimeout(() => {
        if (activeCallRef.current && activeCallRef.current.status === "ringing") {
          handleEndVoiceCall();
        }
      }, 45000);
    } catch (err: any) {
      alert("Microphone access required for voice calls: " + (err.message || err));
      handleEndVoiceCall();
    }
  };

  // Accept incoming call
  const handleAcceptVoiceCall = async () => {
    if (!activeCall || !currentUser) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 },
      });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(servers);
      peerConnectionRef.current = pc;

      // Add local audio tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Listen for remote audio track for real 2-way calling!
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else if (event.track) {
          const remoteMediaStream = new MediaStream([event.track]);
          setRemoteStream(remoteMediaStream);
        }
      };

      // Push ICE candidates to Firebase
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(db, `calls/${activeCall.id}/receiverCandidates`), event.candidate.toJSON());
        }
      };

      // Connection state monitors
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
        } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          handleEndVoiceCall();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));
        } else if (pc.iceConnectionState === "failed") {
          pc.restartIce?.();
        }
      };

      onDisconnect(ref(db, `calls/${activeCall.id}/status`)).set("ended");

      const pendingCallerCandidates: any[] = [];
      let isReceiverRemoteSet = false;

      await pc.setRemoteDescription(new RTCSessionDescription(activeCall.offer));
      isReceiverRemoteSet = true;
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await update(ref(db, `calls/${activeCall.id}`), {
        answer: { type: answer.type, sdp: answer.sdp },
        status: "connected",
      });

      setActiveCall((prev) => (prev ? { ...prev, status: "connected" } : null));

      // Drain any caller candidates that arrived earlier
      for (const cand of pendingCallerCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {}
      }
      pendingCallerCandidates.length = 0;

      // Listen for caller candidates
      const addedCallerCandidates = new Set<string>();
      const unsubCallerCandidates = onValue(ref(db, `calls/${activeCall.id}/callerCandidates`), async (snapshot) => {
        const val = snapshot.val();
        if (val && pc && pc.signalingState !== "closed") {
          for (const cand of Object.values(val) as any[]) {
            if (cand && cand.candidate && !addedCallerCandidates.has(cand.candidate)) {
              addedCallerCandidates.add(cand.candidate);
              if (isReceiverRemoteSet && pc.remoteDescription) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch {}
              } else {
                pendingCallerCandidates.push(cand);
              }
            }
          }
        }
      });
      callUnsubsRef.current.push(unsubCallerCandidates);

      // Listen for remote status change (e.g. caller ended call)
      const unsubReceiverStatus = onValue(ref(db, `calls/${activeCall.id}/status`), (snapshot) => {
        const rawVal = snapshot.val();
        const st = typeof rawVal === "string" ? rawVal : rawVal?.status;
        if (st === "declined" || st === "ended") {
          handleEndVoiceCall();
        }
      });
      callUnsubsRef.current.push(unsubReceiverStatus);
    } catch (err: any) {
      alert("Failed to connect voice call: " + (err.message || err));
      handleEndVoiceCall();
    }
  };

  const handleDeclineVoiceCall = async () => {
    if (activeCall) {
      await update(ref(db, `calls/${activeCall.id}`), { status: "declined" }).catch(() => {});
    }
    handleEndVoiceCall();
  };

  const handleEndVoiceCall = () => {
    if (callRingTimeoutRef.current) {
      clearTimeout(callRingTimeoutRef.current);
      callRingTimeoutRef.current = null;
    }
    callUnsubsRef.current.forEach((u) => {
      try {
        u();
      } catch {}
    });
    callUnsubsRef.current = [];

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {}
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    if (activeCallRef.current) {
      const callId = activeCallRef.current.id;
      update(ref(db, `calls/${callId}`), { status: "ended" }).catch(() => {});
      setTimeout(() => remove(ref(db, `calls/${callId}`)).catch(() => {}), 2000);
      setActiveCall(null);
    }
  };

  // Add Contact by ID
  const handleAddContact = async (rawId: string) => {
    const target = sanitizeId(rawId);
    if (!currentUser) return;
    if (target === currentUser.id) return alert("That's your own ID 🙂");

    const snap = await get(ref(db, `ids/${target}`));
    if (!snap.exists()) return alert(`No user found with Chat ID "${target}".`);

    const targetUid = snap.val().uid;
    await set(ref(db, `users/${currentUser.uid}/contacts/${targetUid}`), true);
    await set(ref(db, `users/${targetUid}/contacts/${currentUser.uid}`), true);

    setActiveChatUid(targetUid);
    setIsGroupChat(false);
  };

  // Toggle Pin Chat
  const handleTogglePin = async (uid: string) => {
    if (!currentUser) return;
    const isPinned = pinnedChats[uid];
    if (isPinned) {
      await remove(ref(db, `users/${currentUser.uid}/pinned/${uid}`));
    } else {
      await set(ref(db, `users/${currentUser.uid}/pinned/${uid}`), true);
    }
  };

  // Toggle Archive Chat
  const handleToggleArchive = async (uid: string) => {
    if (!currentUser) return;
    const isArchived = archivedChats[uid];
    if (isArchived) {
      await remove(ref(db, `users/${currentUser.uid}/archived/${uid}`));
    } else {
      await set(ref(db, `users/${currentUser.uid}/archived/${uid}`), true);
    }
  };

  // Toggle Mute Chat Notifications
  const handleToggleMute = async (uid: string) => {
    if (!currentUser) return;
    const isMuted = mutedChats[uid];
    if (isMuted) {
      await remove(ref(db, `users/${currentUser.uid}/muted/${uid}`));
    } else {
      await set(ref(db, `users/${currentUser.uid}/muted/${uid}`), true);
    }
  };

  // Set Nickname
  const handleSetNickname = async (uid: string) => {
    if (!currentUser) return;
    const currentNick = nicknames[uid] || contactData[uid]?.displayName || contactData[uid]?.id || "";
    const nextNick = prompt("Set custom nickname for this contact:", currentNick);
    if (nextNick !== null) {
      if (nextNick.trim()) {
        await set(ref(db, `users/${currentUser.uid}/nicknames/${uid}`), nextNick.trim());
      } else {
        await remove(ref(db, `users/${currentUser.uid}/nicknames/${uid}`));
      }
    }
  };

  // Delete Chat for Me
  const handleDeleteChat = async (uid: string) => {
    if (!currentUser) return;
    if (confirm("Delete this chat for yourself? The other person will still have their copy.")) {
      await remove(ref(db, `users/${currentUser.uid}/contacts/${uid}`));
      if (activeChatUid === uid) {
        setActiveChatUid(null);
      }
    }
  };

  // Toggle Status Mute
  const handleToggleStatusMute = async (authorUid: string) => {
    if (!currentUser) return;
    const isMuted = !!mutedStatuses[authorUid];
    if (isMuted) {
      await remove(ref(db, `users/${currentUser.uid}/mutedStatuses/${authorUid}`));
    } else {
      await set(ref(db, `users/${currentUser.uid}/mutedStatuses/${authorUid}`), Date.now() + 24 * 60 * 60 * 1000);
    }
  };

  // Toggle / Update Read Receipts Preference
  const handleUpdateReadReceipts = async (enabled: boolean) => {
    if (!currentUser) return;
    await update(ref(db, `users/${currentUser.uid}`), { readReceipts: enabled });
    setCurrentUser((prev) => (prev ? { ...prev, readReceipts: enabled } : null));
  };

  // Start Live Location tracking
  const handleStartLiveLocation = (durationMs: number) => {
    if (!activeChatUid || !currentUser || !navigator.geolocation) return;

    const key = isGroupChat ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
    const msgRef = push(ref(db, `chats/${key}`));
    liveLocationMsgIdRef.current = msgRef.key;

    const endTime = Date.now() + durationMs;

    set(msgRef, {
      senderUid: currentUser.uid,
      senderName: currentUser.displayName || currentUser.id,
      text: "📍 Live Location",
      liveLocation: { lat: 0, lng: 0, endTime, active: true },
      ts: Date.now(),
      read: false,
      readBy: { [currentUser.uid]: true },
    });

    setIsLocationSharingActive(true);

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (liveLocationMsgIdRef.current) {
          update(ref(db, `chats/${key}/${liveLocationMsgIdRef.current}/liveLocation`), {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      },
      (err) => console.error("Location error:", err),
      { enableHighAccuracy: true }
    );

    setTimeout(() => {
      handleStopLiveLocation();
    }, durationMs);
  };

  const handleStopLiveLocation = () => {
    if (locationWatchIdRef.current) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
    if (activeChatUid && liveLocationMsgIdRef.current && currentUser) {
      const key = isGroupChat ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
      update(ref(db, `chats/${key}/${liveLocationMsgIdRef.current}/liveLocation`), { active: false });
    }
    setIsLocationSharingActive(false);
  };

  // Clear chat
  const handleClearChat = async () => {
    if (!activeChatUid || !currentUser) return;
    if (confirm("Clear all messages in this chat for yourself?")) {
      const key = isGroupChat ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
      await remove(ref(db, `chats/${key}`));
      setMessages([]);
    }
  };

  // Block / Unblock user
  const handleToggleBlock = async () => {
    if (!activeChatUid || isGroupChat || !currentUser) return;
    const isBlocked = !!blockedUsers[activeChatUid];
    if (isBlocked) {
      await remove(ref(db, `users/${currentUser.uid}/blocked/${activeChatUid}`));
    } else {
      await set(ref(db, `users/${currentUser.uid}/blocked/${activeChatUid}`), true);
    }
  };

  // Log out
  const handleLogout = async () => {
    if (currentUser) {
      await set(ref(db, `status/${currentUser.uid}`), { state: "offline", last_changed: Date.now() });
    }
    await signOut(auth);
    setCurrentUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#d1d7db] dark:bg-[#0c1317]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Loading TalkFussion...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  // Active statuses to view in Status Viewer Modal
  const currentViewStatuses = viewingStatusUid
    ? Object.values(statusesByUser[viewingStatusUid] || {}).sort((a, b) => a.ts - b.ts)
    : [];
  const statusAuthorData = viewingStatusUid ? contactData[viewingStatusUid] : null;
  const statusAuthorName = viewingStatusUid === currentUser.uid
    ? (currentUser.displayName || currentUser.id)
    : (nicknames[viewingStatusUid || ""] || statusAuthorData?.displayName || statusAuthorData?.id || "User");

  return (
    <div className="w-screen h-screen flex items-center justify-center p-0 md:p-3 bg-[#d1d7db] dark:bg-[#0c1317] overflow-hidden select-none">
      {/* Container simulating WhatsApp Web Desktop & Mobile */}
      <div className="w-full max-w-[1600px] h-full md:h-[94vh] md:max-h-[850px] bg-white dark:bg-[#111b21] md:rounded-2xl shadow-2xl flex overflow-hidden border border-slate-200 dark:border-[#2a3942] relative">
        {/* Sidebar: Chats & Status */}
        <div className={`h-full ${activeChatUid ? "hidden md:flex" : "flex"} w-full md:w-auto`}>
          <Sidebar
            currentUser={currentUser}
            contacts={contacts}
            contactData={contactData}
            nicknames={nicknames}
            pinnedChats={pinnedChats}
            archivedChats={archivedChats}
            mutedChats={mutedChats}
            blockedUsers={blockedUsers}
            unreadData={unreadData}
            presenceData={presenceData}
            typingData={typingData}
            lastMessages={lastMessages}
            drafts={drafts}
            activeChatUid={activeChatUid}
            onSelectChat={(uid, group) => {
              setActiveChatUid(uid);
              setIsGroupChat(!!group);
            }}
            statusesByUser={statusesByUser}
            mutedStatuses={mutedStatuses}
            onOpenStatusViewer={(uid) => setViewingStatusUid(uid)}
            onOpenPostStatus={() => setIsPostStatusOpen(true)}
            onToggleStatusMute={handleToggleStatusMute}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenChatSettings={() => setIsChatSettingsOpen(true)}
            onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onLogout={handleLogout}
            onAddContact={handleAddContact}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onToggleMute={handleToggleMute}
            onSetNickname={handleSetNickname}
            onDeleteChat={handleDeleteChat}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          />
        </div>

        {/* Chat Panel */}
        <div className={`flex-1 h-full min-w-0 min-h-0 w-full flex flex-col ${activeChatUid ? "flex" : "hidden md:flex"}`}>
          <ChatPanel
            activeChatUid={activeChatUid}
            currentUser={currentUser}
            contactData={contactData}
            nicknames={nicknames}
            isGroup={isGroupChat}
            messages={messages}
            presenceData={presenceData}
            typingData={typingData}
            isBlocked={!!(activeChatUid && blockedUsers[activeChatUid])}
            wallpapers={wallpapers}
            onSelectWallpaper={(wp) => {
              if (activeChatUid) {
                set(ref(db, `users/${currentUser.uid}/wallpapers/${activeChatUid}`), wp);
                setWallpapers({ ...wallpapers, [activeChatUid]: wp });
              }
            }}
            onStartVoiceCall={handleStartVoiceCall}
            onOpenStarredModal={() => setIsStarredOpen(true)}
            onOpenQuickReplies={() => setIsQuickRepliesOpen(true)}
            onOpenCreatePoll={() => setIsCreatePollOpen(true)}
            onOpenNotes={() => {
              const notes = prompt("Enter a private note for this chat:");
              if (notes?.trim() && activeChatUid) {
                push(ref(db, `users/${currentUser.uid}/chatNotes/${activeChatUid}`), {
                  text: notes.trim(),
                  ts: Date.now(),
                });
                alert("Note saved!");
              }
            }}
            onOpenSchedule={() => {
              const text = prompt("Enter message to schedule:");
              if (text?.trim() && activeChatUid) {
                const key = isGroupChat ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
                push(ref(db, `chats/${key}`), {
                  senderUid: currentUser.uid,
                  senderName: currentUser.displayName || currentUser.id,
                  text: text.trim(),
                  ts: Date.now(),
                  read: false,
                  scheduled: true,
                  readBy: { [currentUser.uid]: true },
                });
                alert("Scheduled message sent!");
              }
            }}
            onOpenStickers={() => {
              const sticker = prompt("Pick a sticker emoji (e.g. 🔥, 🎉, ❤️, 🚀):", "🔥");
              if (sticker?.trim() && activeChatUid) {
                const key = isGroupChat ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
                push(ref(db, `chats/${key}`), {
                  senderUid: currentUser.uid,
                  senderName: currentUser.displayName || currentUser.id,
                  text: sticker.trim(),
                  sticker: sticker.trim(),
                  ts: Date.now(),
                  read: false,
                  readBy: { [currentUser.uid]: true },
                });
              }
            }}
            onOpenDisappearing={() => setIsDisappearingOpen(true)}
            onOpenContactCard={() => setIsContactCardOpen(true)}
            onOpenLiveLocation={() => setIsLiveLocationOpen(true)}
            onOpenChatSettings={() => setIsChatSettingsOpen(true)}
            onToggleBlockUser={handleToggleBlock}
            onClearChat={handleClearChat}
            onToggleStatusMute={handleToggleStatusMute}
            isStatusMuted={!!(activeChatUid && mutedStatuses[activeChatUid])}
            onOpenInfo={(m) => setSelectedMessageInfo(m)}
            onOpenImage={(url) => setLightboxImage(url)}
            onForwardMessage={(m) => setForwardMessageItem(m)}
            onAddContactFromCard={handleAddContact}
            onBackMobile={() => setActiveChatUid(null)}
          />
        </div>
      </div>

      {/* ===================== STATUS VIEWER ===================== */}
      {viewingStatusUid && (
        <StatusViewerModal
          isOpen={!!viewingStatusUid}
          onClose={() => setViewingStatusUid(null)}
          userUid={viewingStatusUid}
          statuses={currentViewStatuses}
          currentUser={currentUser}
          authorName={statusAuthorName}
          authorAvatar={statusAuthorData?.avatar}
          isMuted={!!mutedStatuses[viewingStatusUid]}
          onToggleMute={handleToggleStatusMute}
          onOpenChatWithContact={(uid, name) => {
            setActiveChatUid(uid);
            setIsGroupChat(false);
          }}
        />
      )}

      {/* ===================== POST STATUS MODAL ===================== */}
      {isPostStatusOpen && (
        <PostStatusModal
          isOpen={isPostStatusOpen}
          onClose={() => setIsPostStatusOpen(false)}
          currentUser={currentUser}
          currentGroupId={isGroupChat ? activeChatUid : null}
          onStatusPublished={() => {}}
        />
      )}

      {/* ===================== VOICE CALL OVERLAY ===================== */}
      {activeCall && (
        <VoiceCallOverlay
          callId={activeCall.id}
          isIncoming={isIncomingCall}
          partnerName={
            isIncomingCall
              ? activeCall.callerName
              : nicknames[activeCall.receiverUid] || contactData[activeCall.receiverUid]?.displayName || contactData[activeCall.receiverUid]?.id || "Contact"
          }
          partnerAvatar={
            isIncomingCall ? null : contactData[activeCall.receiverUid]?.avatar
          }
          status={activeCall.status}
          localStream={localStreamRef.current}
          remoteStream={remoteStream}
          onAccept={handleAcceptVoiceCall}
          onDecline={handleDeclineVoiceCall}
          onEnd={handleEndVoiceCall}
        />
      )}

      {/* ===================== MODALS ===================== */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(up) => setCurrentUser((prev) => (prev ? { ...prev, ...up } : null))}
      />

      <ChatSettingsModal
        isOpen={isChatSettingsOpen}
        onClose={() => setIsChatSettingsOpen(false)}
        currentUser={currentUser}
        onUpdateReadReceipts={handleUpdateReadReceipts}
        wallpaper={activeChatUid ? wallpapers[activeChatUid] || "doodle" : "doodle"}
        onSelectWallpaper={(wp) => {
          if (activeChatUid) {
            set(ref(db, `users/${currentUser.uid}/wallpapers/${activeChatUid}`), wp);
            setWallpapers({ ...wallpapers, [activeChatUid]: wp });
          }
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        currentUser={currentUser}
        onGroupCreated={(gId) => {
          setActiveChatUid(gId);
          setIsGroupChat(true);
        }}
      />

      <ForwardModal
        isOpen={!!forwardMessageItem}
        onClose={() => setForwardMessageItem(null)}
        messageToForward={forwardMessageItem}
        contacts={contacts}
        contactData={contactData}
        nicknames={nicknames}
        currentUser={currentUser}
        onForwardComplete={(count) => alert(`Forwarded to ${count} contact(s)!`)}
      />

      <StarredMessagesModal
        isOpen={isStarredOpen}
        onClose={() => setIsStarredOpen(false)}
        starredMessages={starredMessages}
        onUnstar={(id) => remove(ref(db, `users/${currentUser.uid}/starred/${id}`))}
        onJumpToChat={(uid) => {
          setActiveChatUid(uid);
          setIsGroupChat(uid.startsWith("GROUP_"));
        }}
      />

      <QuickRepliesModal
        isOpen={isQuickRepliesOpen}
        onClose={() => setIsQuickRepliesOpen(false)}
        quickReplies={quickReplies}
        onSelectReply={(text) => {
          if (activeChatUid) {
            const key = isGroupChat ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
            push(ref(db, `chats/${key}`), {
              senderUid: currentUser.uid,
              senderName: currentUser.displayName || currentUser.id,
              text,
              ts: Date.now(),
              read: false,
              readBy: { [currentUser.uid]: true },
            });
          }
        }}
        onAddReply={(newReply) => {
          const updated = [...quickReplies, newReply];
          setQuickReplies(updated);
          localStorage.setItem("chatbuzz_quick_replies", JSON.stringify(updated));
        }}
        onDeleteReply={(index) => {
          const updated = quickReplies.filter((_, i) => i !== index);
          setQuickReplies(updated);
          localStorage.setItem("chatbuzz_quick_replies", JSON.stringify(updated));
        }}
      />

      <CreatePollModal
        isOpen={isCreatePollOpen}
        onClose={() => setIsCreatePollOpen(false)}
        onSubmitPoll={(question, options) => {
          if (!activeChatUid) return;
          const key = isGroupChat ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
          push(ref(db, `chats/${key}`), {
            senderUid: currentUser.uid,
            senderName: currentUser.displayName || currentUser.id,
            text: `📊 Poll: ${question}`,
            poll: { question, options, votes: {} },
            ts: Date.now(),
            read: false,
            readBy: { [currentUser.uid]: true },
          });
        }}
      />

      <LiveLocationModal
        isOpen={isLiveLocationOpen}
        onClose={() => setIsLiveLocationOpen(false)}
        onStartSharing={handleStartLiveLocation}
        onStopSharing={handleStopLiveLocation}
        isSharing={isLocationSharingActive}
      />

      <DisappearingMessagesModal
        isOpen={isDisappearingOpen}
        onClose={() => setIsDisappearingOpen(false)}
        currentDuration={activeChatUid ? disappearingSettings[activeChatUid] || 0 : 0}
        onSelectDuration={(dur) => {
          if (activeChatUid) {
            set(ref(db, `users/${currentUser.uid}/disappearing/${activeChatUid}`), dur);
          }
        }}
      />

      <ContactCardModal
        isOpen={isContactCardOpen}
        onClose={() => setIsContactCardOpen(false)}
        onShareContact={async (targetId) => {
          if (!activeChatUid) return;
          const snap = await get(ref(db, `ids/${targetId}`));
          if (!snap.exists()) return alert(`User @${targetId} not found.`);

          const tUid = snap.val().uid;
          const uSnap = await get(ref(db, `users/${tUid}`));
          const uData = uSnap.val() || {};

          const key = isGroupChat ? `${activeChatUid}__${activeChatUid}` : chatKey(currentUser.uid, activeChatUid);
          push(ref(db, `chats/${key}`), {
            senderUid: currentUser.uid,
            senderName: currentUser.displayName || currentUser.id,
            text: `📇 Contact: @${targetId}`,
            contactCard: {
              id: targetId,
              uid: tUid,
              bio: uData.bio || "TalkFussion user",
              avatar: uData.avatar || null,
            },
            ts: Date.now(),
            read: false,
            readBy: { [currentUser.uid]: true },
          });
        }}
      />

      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        currentUser={currentUser}
      />

      <ImageViewerModal
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      <MessageInfoModal
        isOpen={!!selectedMessageInfo}
        message={selectedMessageInfo}
        onClose={() => setSelectedMessageInfo(null)}
      />
    </div>
  );
}
