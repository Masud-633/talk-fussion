// ============ FIREBASE IMPORTS ============
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  onAuthStateChanged, signOut, deleteUser
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase, ref, set, get, onValue, push, serverTimestamp, remove, onDisconnect, update
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDe74oi5M2F-fm6PYqtweZqBT0c3hZLF30",
    authDomain: "chatwave-884b6.firebaseapp.com",
    databaseURL: "https://chatwave-884b6-default-rtdb.firebaseio.com",
    projectId: "chatwave-884b6",
    storageBucket: "chatwave-884b6.firebasestorage.app",
    messagingSenderId: "304685044989",
    appId: "1:304685044989:web:e155ab7b8bbb4c5462da94",
    measurementId: "G-1H7BF12XVT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ============ STATE ============
let myId = "";            
let myUid = "";           
let activeChatId = "";    
let activeChatUid = "";   
let isGroupChat = false;  
let contacts = [];        
let contactData = {};     
let pinnedChats = {};     
let blockedUsers = {};    
let unsubMessages = null; 
let unsubContacts = null;
let unsubTyping = null;
let presenceListeners = {}; 
let typingListeners = {}; 
let unreadData = {}; 
let typingTimeout = null;
let activeContextMenu = null;
let replyingTo = null;
let previousMsgCount = 0; 
let lastReadMsgCount = 0; 
let currentPinnedMsg = null;
let currentAllMsgs = [];

// Live per-contact listeners (profile pic + id sync)
let contactUserListeners = {};   
let contactGroupListeners = {};  

// New feature state
let starredMessages = {};
let nicknames = {};
let quickReplies = [];
let archivedChats = {};
let typingUsers = {};
let messageDrafts = {};

// ============ NEW WHATSAPP FEATURES STATE ============
let mutedChats = {};
let chatWallpapers = {};
let disappearingSettings = {};
let currentLocation = null;
let locationWatchId = null;
let groupAdmins = {};

const notifSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// ============ OFFLINE MESSAGING STATE ============
let offlineQueue = JSON.parse(localStorage.getItem("chatbuzz_offline_queue") || "[]");
let isOnline = navigator.onLine;

// ============ DOM ============
const $ = (id) => document.getElementById(id);
const loginScreen = $("loginScreen");
const unpinBtn = $("unpinBtn");
const appContainer = $("appContainer");
const chatPanelMain = $("chatPanelMain");
const inCallControls = document.getElementById("inCallControls");
const incomingCallActions = document.getElementById("incomingCallActions");
const muteBtn = document.getElementById("muteBtn");
const speakerBtn = document.getElementById("speakerBtn");
const endCallBtnActive = document.getElementById("endCallBtnActive");
const authMessage = $("authMessage");
const tabLogin = $("tabLogin");
const tabSignup = $("tabSignup");
const loginForm = $("loginForm");
const signupForm = $("signupForm");
const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginBtn = $("loginBtn");
const signupId = $("signupId");
const signupEmail = $("signupEmail");
const signupPassword = $("signupPassword");
const signupBtn = $("signupBtn");
const myIdDisplay = $("myIdDisplay");
const emptyMyId = $("emptyMyId");
const searchIdInput = $("searchIdInput");
const addContactBtn = $("addContactBtn");
const searchChatInput = $("searchChatInput"); 
const contactList = $("contactList");
const emptyChat = $("emptyChat");
const activeChatView = $("activeChatView");
const headerAvatar = $("headerAvatar");
const headerName = $("headerName");
const headerInfoClick = $("headerInfoClick");
const headerStatusContainer = $("headerStatusContainer");
const headerStatus = $("headerStatus");
const messagesContainer = $("messagesContainer");
const messageInput = $("messageInput");
const sendBtn = $("sendBtn");
const logoutBtn = $("logoutBtn");
const deleteAccBtn = $("deleteAccBtn");
const mobileBackBtn = $("mobileBackBtn");
const emojiBtn = $("emojiBtn");
const emojiPicker = $("emojiPicker");
const clearChatBtn = $("clearChatBtn");
const blockUserBtn = $("blockUserBtn");
const chatInputArea = $("chatInputArea");
const blockedMessage = $("blockedMessage");
const themeToggleLogin = $("themeToggleLogin");
const themeToggleApp = $("themeToggleApp");
const activeNowBar = $("activeNowBar");
const recordBtn = $("recordBtn");
const imageBtn = $("imageBtn");
const imageInput = $("imageInput");
const pinnedMessageArea = $("pinnedMessageArea");
const pinnedMessageText = $("pinnedMessageText");
const chatSearchBtn = $("chatSearchBtn");
const chatSearchBar = $("chatSearchBar");
const chatSearchInput = $("chatSearchInput");
const analyticsBtn = $("analyticsBtn");
const wallpaperBtn = $("wallpaperBtn");

const imageModal = $("imageModal");
const fullScreenImage = $("fullScreenImage");
const downloadImageBtn = $("downloadImageBtn");
const closeImageBtn = $("closeImageBtn");

const analyticsModal = $("analyticsModal");
const analyticsContent = $("analyticsContent");
const closeAnalyticsBtn = $("closeAnalyticsBtn");

const contactInfoModal = $("contactInfoModal");
const contactInfoPicContainer = $("contactInfoPicContainer");
const contactInfoName = $("contactInfoName");
const contactInfoId = $("contactInfoId");
const contactInfoBio = $("contactInfoBio");
const contactInfoStatus = $("contactInfoStatus");
const closeContactInfoBtn = $("closeContactInfoBtn");

const groupInfoModal = $("groupInfoModal");
const groupInfoName = $("groupInfoName");
const groupInfoCount = $("groupInfoCount");
const groupMembersList = $("groupMembersList");
const closeGroupInfoBtn = $("closeGroupInfoBtn");

const myProfileBtn = $("myProfileBtn");
const profileModal = $("profileModal");
const closeProfileBtn = $("closeProfileBtn");
const saveProfileBtn = $("saveProfileBtn");
const displayNameInput = $("displayNameInput");
const bioInput = $("bioInput");
const uploadPicBtn = $("uploadPicBtn");
const profilePicInput = $("profilePicInput");
const profilePicPreview = $("profilePicPreview");
const myAvatar = $("myAvatar");
const copyInviteBtn = $("copyInviteBtn");

const openGroupBtn = $("openGroupBtn");
const groupModal = $("groupModal");
const closeGroupBtn = $("closeGroupBtn");
const createGroupBtn = $("createGroupBtn");
const groupNameInput = $("groupNameInput");
const groupMembersInput = $("groupMembersInput");

const infoModal = $("infoModal");
const infoContent = $("infoContent");
const closeInfoBtn = $("closeInfoBtn");

const replyPreviewContainer = $("replyPreviewContainer");
const replyToName = $("replyToName");
const replyToText = $("replyToText");
const cancelReplyBtn = $("cancelReplyBtn");

// New feature DOM
const starredBtn = $("starredBtn");
const quickReplyBtn = $("quickReplyBtn");
const pollBtn = $("pollBtn");
const archiveBtn = $("archiveBtn");
const starredModal = $("starredModal");
const starredList = $("starredList");
const closeStarredBtn = $("closeStarredBtn");
const nicknameModal = $("nicknameModal");
const nicknameInput = $("nicknameInput");
const saveNicknameBtn = $("saveNicknameBtn");
const closeNicknameBtn = $("closeNicknameBtn");
const quickRepliesModal = $("quickRepliesModal");
const quickRepliesList = $("quickRepliesList");
const newQuickReplyInput = $("newQuickReplyInput");
const addQuickReplyBtn = $("addQuickReplyBtn");
const closeQuickRepliesBtn = $("closeQuickRepliesBtn");
const pollModal = $("pollModal");
const pollQuestionInput = $("pollQuestionInput");
const pollOptionsContainer = $("pollOptionsContainer");
const addPollOptionBtn = $("addPollOptionBtn");
const createPollBtn = $("createPollBtn");
const closePollBtn = $("closePollBtn");

// WhatsApp-liked feature DOM
const contactCardModal = $("contactCardModal");
const contactCardIdInput = $("contactCardIdInput");
const sendContactCardBtn = $("sendContactCardBtn");
const closeContactCardBtn = $("closeContactCardBtn");
const liveLocationModal = $("liveLocationModal");
const locationStatus = $("locationStatus");
const sendLocationBtn = $("sendLocationBtn");
const closeLocationBtn = $("closeLocationBtn");
const disappearingModal = $("disappearingModal");
const closeDisappearingBtn = $("closeDisappearingBtn");
const disappearingBtn = $("disappearingBtn");
const exportBtn = $("exportBtn");
const locationBtn = $("locationBtn");
const contactCardBtn = $("contactCardBtn");
const wallpaperPickerModal = $("wallpaperPickerModal");
const closeWallpaperBtn = $("closeWallpaperBtn");

// Change Chat ID DOM
const changeIdBtn = $("changeIdBtn");
const changeIdInput = $("changeIdInput");

// Attachment Menu DOM
const attachBtn = $("attachBtn");
const attachMenu = $("attachMenu");

// New DOM for Mute from Chat Header
const muteStatusHeaderBtn = $("muteStatusHeaderBtn");

// New DOM for Status Reply with Photo
const statusReplyImgBtn = $("statusReplyImgBtn");
const statusReplyImageInput = $("statusReplyImageInput");
const statusReplyImgPreview = $("statusReplyImgPreview");
const statusReplyImgPreviewThumb = $("statusReplyImgPreviewThumb");
const statusReplyImgRemoveBtn = $("statusReplyImgRemoveBtn");

// ============ HELPERS ============
function escapeHtml(t) {
  const d = document.createElement("div"); d.textContent = String(t ?? ""); return d.innerHTML;
}
function chatKey(a, b) { return [a, b].sort().join("__"); }
function sanitizeId(id) { return id.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 20); }
function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatLastSeen(ts) {
  if (!ts) return "Offline";
  const diff = Date.now() - ts;
  if (diff < 60000) return "Last seen just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours/24)}d ago`;
}
function showMessage(text, type = "error") {
  authMessage.textContent = text;
  authMessage.className = `auth-message ${type}`;
  setTimeout(() => { authMessage.className = "auth-message"; }, 5000);
}

// ============ HEADER DROPDOWN MENU LOGIC ============
const chatHeaderOptionsBtn = $("chatHeaderOptionsBtn");
const chatHeaderDropdown = $("chatHeaderDropdown");

if (chatHeaderOptionsBtn && chatHeaderDropdown) {
  chatHeaderOptionsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (chatHeaderDropdown.style.display === "flex") {
      chatHeaderDropdown.style.display = "none";
    } else {
      chatHeaderDropdown.style.display = "flex";
    }
  });

  document.addEventListener("click", (e) => {
    if (chatHeaderDropdown.style.display === "flex" && !chatHeaderDropdown.contains(e.target) && e.target !== chatHeaderOptionsBtn) {
      chatHeaderDropdown.style.display = "none";
    }
  });

  chatHeaderDropdown.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      chatHeaderDropdown.style.display = "none";
    });
  });
}

// ============ ATTACHMENT MENU LOGIC ============
if (attachBtn && attachMenu) {
  attachBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    attachMenu.style.display = attachMenu.style.display === "flex" ? "none" : "flex";
  });

  document.addEventListener("click", (e) => {
    if (attachMenu.style.display === "flex" && !attachMenu.contains(e.target) && !attachBtn.contains(e.target)) {
      attachMenu.style.display = "none";
    }
  });

  attachMenu.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      attachMenu.style.display = "none";
    });
  });
}

// ============ RICH TEXT HELPERS ============
function formatRichText(text) {
  if (!text) return "";
  
  let out = escapeHtml(text);

  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<strong>$1</strong>');
  out = out.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');
  out = out.replace(/~([^~\n]+)~/g, '<del>$1</del>');
  out = out.replace(/`([^`\n]+)`/g, '<code style="background:rgba(0,0,0,0.08); padding:1px 4px; border-radius:4px; font-family:monospace;">$1</code>');
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  out = out.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:underline;">$1</a>');

  return out;
}

// ============ TOAST ============
function showToast(senderName, messageText) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <i class="fas fa-comment-dots"></i>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(senderName)}</div>
      <div class="toast-text">${escapeHtml(messageText)}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 5000);
}

// ============ THEME ============
function initTheme() {
  const isDark = localStorage.getItem("chatbuzz_theme") === "dark";
  if (isDark) {
    document.body.classList.add("dark-mode");
    themeToggleLogin.innerHTML = '<i class="fas fa-sun"></i>';
    themeToggleApp.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("chatbuzz_theme", isDark ? "dark" : "light");
  const icon = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  themeToggleLogin.innerHTML = icon;
  themeToggleApp.innerHTML = icon;
}
themeToggleLogin.addEventListener("click", toggleTheme);
themeToggleApp.addEventListener("click", toggleTheme);

initTheme();

// ============ IMAGE MODAL ============
window.openImageModal = function(url) {
  fullScreenImage.src = url;
  downloadImageBtn.href = url;
  downloadImageBtn.download = `ChatBuzz_${Date.now()}.jpg`;
  imageModal.style.display = "flex";
};
closeImageBtn.addEventListener("click", () => {
  imageModal.style.display = "none";
  fullScreenImage.src = "";
});

// ============ SEARCH MESSAGES ============
chatSearchBtn.addEventListener("click", () => {
  if (chatSearchBar.style.display === "none") {
    chatSearchBar.style.display = "block";
    chatSearchInput.focus();
  } else {
    chatSearchBar.style.display = "none";
    chatSearchInput.value = "";
    renderMessages(currentAllMsgs); 
  }
});

chatSearchInput.addEventListener("input", () => {
  const term = chatSearchInput.value.trim().toLowerCase();
  if (!term) { renderMessages(currentAllMsgs); return; }
  const filtered = currentAllMsgs.filter(m => (m.text || "").toLowerCase().includes(term));
  renderMessages(filtered, true); 
});

// ============ ANALYTICS ============
analyticsBtn.addEventListener("click", () => {
  if (currentAllMsgs.length === 0) {
    analyticsContent.innerHTML = `<div style="text-align:center; padding:20px;">No messages yet to analyze.</div>`;
  } else {
    let sent = 0, received = 0, images = 0, audio = 0;
    currentAllMsgs.forEach(m => {
      if (m.senderUid === myUid) sent++; else received++;
      if (m.imageUrl) images++;
      if (m.audioUrl) audio++;
    });
    analyticsContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>Total Messages:</span> <strong>${currentAllMsgs.length}</strong></div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #3fcf8e;"><span>Sent:</span> <strong>${sent}</strong></div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #7f9aaf;"><span>Received:</span> <strong>${received}</strong></div>
      <hr style="border:0; border-top: 1px solid #eef2f5; margin: 10px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>📷 Photos Shared:</span> <strong>${images}</strong></div>
      <div style="display: flex; justify-content: space-between;"><span>🎤 Voice Notes:</span> <strong>${audio}</strong></div>
    `;
  }
  analyticsModal.style.display = "flex";
});
closeAnalyticsBtn.addEventListener("click", () => analyticsModal.style.display = "none");

// ============ INFO MODAL ============
window.openInfoModal = async function() {
  if (!activeChatUid) return;
  
  if (isGroupChat) {
    try {
      const gSnap = await get(ref(db, `groups/${activeChatUid}`));
      if (gSnap.exists()) {
        const group = gSnap.val();
        groupInfoName.textContent = group.name || "Group Chat";
        const memberIds = Object.keys(group.members || {});
        groupInfoCount.textContent = `${memberIds.length} members`;
        groupMembersList.innerHTML = ""; 
        
        for (let mid of memberIds) {
           const idSnap = await get(ref(db, `ids/${mid}`));
           if (idSnap.exists()) {
              const uid = idSnap.val().uid;
              const uSnap = await get(ref(db, `users/${uid}`));
              const bio = uSnap.exists() ? (uSnap.val().bio || "Hey there!") : "Hey there!";
              groupMembersList.innerHTML += `
                <div class="member-item">
                  <div class="member-avatar">${escapeHtml(mid.substring(0,2).toUpperCase())}</div>
                  <div>
                    <div class="member-name">${escapeHtml(mid)}</div>
                    <div style="font-size:11px; color:#7f9aaf;">${escapeHtml(bio)}</div>
                  </div>
                </div>
              `;
           }
        }
        groupInfoModal.style.display = "flex";
      }
    } catch (e) { console.error("Error loading group info:", e); }
    return;
  }
  
  try {
    const snap = await get(ref(db, `users/${activeChatUid}`));
    if (snap.exists()) {
      const data = snap.val();
      contactInfoName.textContent = nicknames[activeChatUid] || data.displayName || data.id;
      contactInfoId.textContent = `@${data.id}`;
      contactInfoBio.textContent = data.bio || "Hey there! I am using ChatBuzz.";
      
      if (data.avatar) {
         contactInfoPicContainer.innerHTML = `<img src="${data.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`;
      } else {
         contactInfoPicContainer.innerHTML = `<span id="contactInfoAvatar">${data.id.substring(0, 2).toUpperCase()}</span>`;
      }
      
      const sSnap = await get(ref(db, `status/${activeChatUid}`));
      if (sSnap.exists()) {
         const st = sSnap.val();
         if (st.state === 'online') {
            contactInfoStatus.textContent = "Online";
            contactInfoStatus.style.color = "#3fcf8e";
         } else {
            contactInfoStatus.textContent = formatLastSeen(st.last_changed);
            contactInfoStatus.style.color = "#7f9aaf";
         }
      } else {
         contactInfoStatus.textContent = "Offline";
         contactInfoStatus.style.color = "#7f9aaf";
      }
      
      contactInfoModal.style.display = "flex";
    }
  } catch (error) { console.error(error); }
};

closeContactInfoBtn.addEventListener("click", () => contactInfoModal.style.display = "none");
closeGroupInfoBtn.addEventListener("click", () => groupInfoModal.style.display = "none");

// ============ PINNED MESSAGES ============
pinnedMessageArea.addEventListener("click", (e) => {
  if (e.target.closest("#unpinBtn")) return; 
  if (currentPinnedMsg) {
    const el = document.querySelector(`[data-msgid="${currentPinnedMsg.id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

unpinBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  if (!activeChatUid) return;
  try {
    await remove(ref(db, `users/${myUid}/pinnedMessages/${activeChatUid}`));
    pinnedMessageArea.style.display = "none";
    currentPinnedMsg = null;
  } catch (error) { console.error("Error unpinning message: ", error); }
});

// ============ PROFILE (DB-BACKED, SYNCED TO ALL USERS) ============
let currentProfilePic = null;

async function loadProfile() {
  const snap = await get(ref(db, `users/${myUid}`));
  const data = snap.exists() ? snap.val() : {};
  const savedName = data.displayName || data.id || myId;
  const savedBio = data.bio || "Hey there! I am using ChatBuzz.";
  currentProfilePic = data.avatar || null;

  myIdDisplay.textContent = savedName;
  bioInput.value = savedBio;
  if (displayNameInput) displayNameInput.value = savedName;

  if (currentProfilePic) {
    myAvatar.innerHTML = `<img src="${currentProfilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`;
    profilePicPreview.innerHTML = `<img src="${currentProfilePic}" />`;
  } else {
    myAvatar.innerHTML = `<i class="fas fa-user"></i>`;
    profilePicPreview.innerHTML = `<i class="fas fa-user"></i>`;
  }
}

myProfileBtn.addEventListener("click", () => {
  displayNameInput.value = myIdDisplay.textContent;
  profileModal.style.display = "flex";
});
closeProfileBtn.addEventListener("click", () => profileModal.style.display = "none");
uploadPicBtn.addEventListener("click", () => profilePicInput.click());

profilePicInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 500000) { alert("Image too large. Please choose an image under 500KB."); return; }
  const reader = new FileReader();
  reader.onload = (event) => {
    currentProfilePic = event.target.result;
    profilePicPreview.innerHTML = `<img src="${currentProfilePic}" />`;
  };
  reader.readAsDataURL(file);
});

saveProfileBtn.addEventListener("click", async () => {
  const newName = displayNameInput.value.trim() || myId;
  const newBio = bioInput.value.trim() || "Hey there! I am using ChatBuzz.";

  await update(ref(db, `users/${myUid}`), {
    bio: newBio,
    avatar: currentProfilePic || null,
    displayName: newName
  });

  myIdDisplay.textContent = newName;
  if (currentProfilePic) {
    myAvatar.innerHTML = `<img src="${currentProfilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`;
  }

  profileModal.style.display = "none";
  showToast("Profile", "Profile updated for everyone.");
});

// ============ CHANGE CHAT ID (ATOMIC, SYNCED TO ALL USERS) ============
if (changeIdBtn) {
  changeIdBtn.addEventListener("click", async () => {
    const raw = (changeIdInput?.value || "").trim();
    const newId = sanitizeId(raw);
    if (newId.length < 3) return alert("Chat ID must be at least 3 characters.");
    if (newId === myId) return alert("That's already your Chat ID.");

    try {
      const existing = await get(ref(db, `ids/${newId}`));
      if (existing.exists()) return alert("That Chat ID is already taken.");

      const oldId = myId;

      await set(ref(db, `ids/${newId}`), { uid: myUid, createdAt: serverTimestamp() });
      await update(ref(db, `users/${myUid}`), { id: newId });
      if (oldId) await remove(ref(db, `ids/${oldId}`));

      myId = newId;
      emptyMyId.textContent = newId;

      const uSnap = await get(ref(db, `users/${myUid}`));
      const dispName = uSnap.val()?.displayName;
      if (!dispName || dispName === oldId) {
        await update(ref(db, `users/${myUid}`), { displayName: newId });
        myIdDisplay.textContent = newId;
      }

      if (changeIdInput) changeIdInput.value = "";
      alert(`Chat ID changed from ${oldId} to ${newId}. All your contacts will see the new ID automatically.`);
    } catch (e) {
      console.error("Change ID failed:", e);
      alert("Failed to change Chat ID: " + e.message);
    }
  });
}

copyInviteBtn.addEventListener("click", () => {
  const link = `Join me on ChatBuzz! My Chat ID is: ${myId}`;
  navigator.clipboard.writeText(link);
  copyInviteBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
  setTimeout(() => copyInviteBtn.innerHTML = '<i class="fas fa-link"></i> Copy Invite Link', 2000);
});

// ============ CREATE GROUP ============
openGroupBtn.addEventListener("click", () => groupModal.style.display = "flex");
closeGroupBtn.addEventListener("click", () => groupModal.style.display = "none");

createGroupBtn.addEventListener("click", async () => {
  const groupName = groupNameInput.value.trim();
  const membersRaw = groupMembersInput.value.trim();
  
  if (!groupName) return alert("Please enter a group name.");
  if (!membersRaw) return alert("Please enter at least one member's Chat ID.");

  const memberIds = membersRaw.split(",").map(m => sanitizeId(m.trim())).filter(m => m);
  const groupId = "GROUP_" + Date.now(); 

  try {
    createGroupBtn.disabled = true;
    createGroupBtn.textContent = "Creating...";

    await set(ref(db, `groups/${groupId}`), {
      name: groupName,
      creator: myId,
      createdAt: serverTimestamp(),
      members: { [myId]: true }
    });

    const groupChatKey = chatKey(groupId, groupId);

    for (let mid of memberIds) {
      const snap = await get(ref(db, `ids/${mid}`));
      if (snap.exists()) {
        await update(ref(db, `groups/${groupId}/members`), { [mid]: true });
        await set(ref(db, `users/${snap.val().uid}/contacts/${groupId}`), true);
        await set(ref(db, `chats/${groupChatKey}`), { init: true });
      }
    }

    await set(ref(db, `users/${myUid}/contacts/${groupId}`), true);
    await set(ref(db, `chats/${groupChatKey}`), { init: true });

    groupModal.style.display = "none";
    groupNameInput.value = "";
    groupMembersInput.value = "";
    createGroupBtn.disabled = false;
    createGroupBtn.textContent = "Create Group";

    await loadContacts();
    openChat(groupId, groupName, true);

  } catch (error) {
    alert("Error creating group: " + error.message);
    createGroupBtn.disabled = false;
    createGroupBtn.textContent = "Create Group";
  }
});

// ============ ACTIVE NOW ============
function renderActiveNow() {
  activeNowBar.innerHTML = "";
  let activeCount = 0;
  
  contacts.forEach(uid => {
    if (uid.startsWith("GROUP_")) return; 
    const dot = document.getElementById(`dot-${uid}`);
    if (dot && dot.classList.contains("online")) {
      activeCount++;
      const displayId = nicknames[uid] || (contactData[uid] ? (contactData[uid].displayName || contactData[uid].id) : "?");
      const av = contactData[uid]?.avatar;
      const avatarHtml = av
        ? `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
        : escapeHtml(displayId.substring(0, 2).toUpperCase());

      const el = document.createElement("div");
      el.className = "active-user";
      el.onclick = () => openChat(uid, contactData[uid]?.id || displayId);
      el.innerHTML = `
        <div class="active-avatar">${avatarHtml}</div>
        <div class="active-name">${escapeHtml(displayId)}</div>
      `;
      activeNowBar.appendChild(el);
    }
  });

  if (activeCount === 0) {
    activeNowBar.innerHTML = `<div style="font-size:12px; color:#7f9aaf; padding:10px;">No one is online right now.</div>`;
  }
}

// ============ VOICE RECORDING ============
recordBtn.addEventListener("mousedown", startRecording);
recordBtn.addEventListener("mouseup", stopRecording);
recordBtn.addEventListener("mouseleave", stopRecording);
recordBtn.addEventListener("touchstart", (e) => { e.preventDefault(); startRecording(); });
recordBtn.addEventListener("touchend", (e) => { e.preventDefault(); stopRecording(); });

async function startRecording() {
  if (isRecording || !activeChatUid) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = event => { audioChunks.push(event.data); };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
        const msgRef = push(ref(db, `chats/${key}`));
        await set(msgRef, {
          senderUid: myUid,
          senderName: myIdDisplay.textContent,
          text: "🎤 Voice Message",
          audioUrl: base64Audio,
          ts: Date.now(),
          read: false,
          readBy: { [myUid]: true }
        });
      };
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    recordBtn.classList.add("recording");
    recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
  } catch (err) {
    alert("Microphone access denied or not available.");
  }
}

function stopRecording() {
  if (!isRecording || !mediaRecorder) return;
  mediaRecorder.stop();
  isRecording = false;
  recordBtn.classList.remove("recording");
  recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
}

// ============ IMAGE UPLOAD ============
imageBtn.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file || !activeChatUid) return;
  if (file.size > 500000) return alert("Image is too large. Please choose an image under 500KB.");

  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64Image = event.target.result;
    const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
    const msgRef = push(ref(db, `chats/${key}`));
    await set(msgRef, {
      senderUid: myUid,
      senderName: myIdDisplay.textContent,
      text: "📷 Photo",
      imageUrl: base64Image,
      ts: Date.now(),
      read: false,
      readBy: { [myUid]: true }
    });
    imageInput.value = "";
  };
  reader.readAsDataURL(file);
});

// ============ MOBILE BACK & CLICK AWAY ============
mobileBackBtn.addEventListener("click", () => {
  appContainer.classList.remove("show-chat");
  activeChatUid = ""; 
});
document.addEventListener("click", (e) => {
  if (activeContextMenu && !activeContextMenu.contains(e.target)) {
    activeContextMenu.remove();
    activeContextMenu = null;
  }
  if (emojiPicker.style.display === "block" && !emojiPicker.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)) {
    emojiPicker.style.display = "none";
  }
});

closeInfoBtn.addEventListener("click", () => infoModal.style.display = "none");

// ============ TABS ============
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active"); tabSignup.classList.remove("active");
  loginForm.style.display = "block"; signupForm.style.display = "none";
  authMessage.className = "auth-message";
});
tabSignup.addEventListener("click", () => {
  tabSignup.classList.add("active"); tabLogin.classList.remove("active");
  signupForm.style.display = "block"; loginForm.style.display = "none";
  authMessage.className = "auth-message";
});

// ============ SEARCH CHATS ============
searchChatInput.addEventListener("input", () => { renderContactList(); });

// ============ EMOJI PICKER ============
const emojis = ["😀","😂","🥰","😎","😭","😡","👍","🙏","🔥","❤️","💯","🎉","✨","👀","💀","🤔","🙌","😊","😍","🤣","😘","😜","🤩","😇","🤗","🤫","🤭","🥳","😏","😒","🙄","😬","🤐","🤥","😴","🤤","🤒","🤕","🤢","🤮","🤧","😷","🤠","🤑","🤓","😈","👿","👹","👺","💩","👻","👽","👾","🤖","🎃","😺","😸","😹","😻","😼","😽","🙀","😿","😾"];
emojis.forEach(emoji => {
  const span = document.createElement("span");
  span.textContent = emoji;
  span.onclick = () => {
    messageInput.value += emoji;
    messageInput.focus();
    emojiPicker.style.display = "none";
  };
  emojiPicker.appendChild(span);
});

emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  emojiPicker.style.display = emojiPicker.style.display === "block" ? "none" : "block";
});

// ============ REPLY ============
cancelReplyBtn.addEventListener("click", () => {
  replyingTo = null;
  replyPreviewContainer.style.display = "none";
});

function setReply(msg) {
  replyingTo = msg;
  replyToName.textContent = msg.senderName || (msg.senderUid === myUid ? "Yourself" : activeChatId);
  
  let quoteText = msg.text || (msg.deleted ? "Deleted message" : "...");
  if (msg.imageUrl) quoteText = "📷 Photo";
  if (msg.audioUrl) quoteText = "🎤 Voice Message";
  if (msg.location) quoteText = "📍 Location";
  if (msg.liveLocation) quoteText = "📍 Live Location";

  replyToText.textContent = quoteText;
  replyPreviewContainer.style.display = "flex";
  messageInput.focus();
}

// ============ DELETE CHAT FOR ME ============
async function deleteChatForMe(uid) {
  if (!confirm("Are you sure you want to delete this chat for yourself? The other person will still have their copy.")) return;
  try {
    await remove(ref(db, `users/${myUid}/contacts/${uid}`));
    await loadContacts();
    if (activeChatUid === uid) {
       appContainer.classList.remove("show-chat");
       activeChatUid = "";
       activeChatId = "";
       emptyChat.style.display = "flex";
       activeChatView.style.display = "none";
    }
  } catch (e) { alert(e.message); }
}

// ============ CLEAR CHAT BUTTON ============
clearChatBtn.addEventListener("click", async () => {
  if (!activeChatUid) return;
  if (!confirm("Clear all messages in this chat for yourself? The other person will still have their copy.")) return;
  
  try {
    const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
    const snap = await get(ref(db, `chats/${key}`));
    const data = snap.val() || {};
    
    const ids = Object.keys(data);
    if (ids.length === 0) {
      messagesContainer.innerHTML = `<div style="text-align:center;color:#809aad;margin-top:30px;">
        <i class="fas fa-comment" style="font-size:36px;opacity:0.5;"></i>
        <p style="margin-top:12px;">Chat is already empty.</p></div>`;
      return;
    }
    
    for (const id of ids) {
      await remove(ref(db, `chats/${key}/${id}`));
    }
    
    currentAllMsgs = [];
    messagesContainer.innerHTML = `<div style="text-align:center;color:#809aad;margin-top:30px;">
      <i class="fas fa-broom" style="font-size:36px;opacity:0.5;"></i>
      <p style="margin-top:12px;">Chat cleared.</p></div>`;
  } catch (e) {
    alert("Could not clear chat: " + e.message);
  }
});

// ============ BLOCK/UNBLOCK ============
blockUserBtn.addEventListener("click", async () => {
  if (!activeChatUid) return;
  if (isGroupChat) return alert("You cannot block a group chat.");
  const isBlocked = blockedUsers[activeChatUid];
  const action = isBlocked ? "unblock" : "block";
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;
  
  if (isBlocked) {
    await remove(ref(db, `users/${myUid}/blocked/${activeChatUid}`));
    blockUserBtn.style.color = "#ff4d4d";
    blockUserBtn.title = "Block User";
    blockedMessage.style.display = "none";
  } else {
    await set(ref(db, `users/${myUid}/blocked/${activeChatUid}`), true);
    blockUserBtn.style.color = "#7f9aaf";
    blockUserBtn.title = "Unblock User";
    blockedMessage.style.display = "block";
  }
});

// ============ PRESENCE ============
function setupPresence(uid) {
  const userStatusRef = ref(db, `status/${uid}`);
  const isOffline = { state: 'offline', last_changed: Date.now() };
  const isOnline = { state: 'online', last_changed: Date.now() };
  onDisconnect(userStatusRef).set(isOffline).then(() => {
    set(userStatusRef, isOnline);
  });
}

// ============ MERGED TYPING + DRAFT HANDLER ============
messageInput.addEventListener("input", () => {
  if (!activeChatUid) return;
  
  const text = messageInput.value.trim();
  if (text) {
    messageDrafts[activeChatUid] = text;
  } else {
    delete messageDrafts[activeChatUid];
  }
  localStorage.setItem(`chatbuzz_draft_${myUid}_${activeChatUid}`, messageInput.value);
  
  const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
  const typingRef = ref(db, `typing/${key}/${myUid}`);
  set(typingRef, true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => { set(typingRef, false); }, 2000);
});

// ============ AUTH ============
signupBtn.addEventListener("click", async () => {
  const id = sanitizeId(signupId.value.trim());
  const email = signupEmail.value.trim();
  const pass = signupPassword.value;

  // 1. Client-side validation
  if (id.length < 3) return showMessage("Chat ID must be at least 3 characters.");
  if (!email || !pass) return showMessage("Please fill in all fields.");
  if (pass.length < 6) return showMessage("Password must be at least 6 characters.");

  try {
    signupBtn.disabled = true; signupBtn.textContent = "Creating...";
    
    // 2. Check if ID is taken
    const idSnap = await get(ref(db, `ids/${id}`));
    if (idSnap.exists()) {
      showMessage("That Chat ID is already taken. Try another.");
      signupBtn.disabled = false; signupBtn.textContent = "Create Account";
      return;
    }

    // 3. Create Firebase Auth User
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCred.user.uid;

    // 4. Save to Realtime Database
    await set(ref(db, `ids/${id}`), { uid, createdAt: serverTimestamp() });
    await set(ref(db, `users/${uid}`), {
      id, email, createdAt: serverTimestamp(),
      bio: "Hey there! I am using ChatBuzz.",
      displayName: id,
      avatar: null
    });

    // 5. Enter App
    myUid = uid; myId = id; enterApp();
    
  } catch (error) {
    // 6. Show precise Firebase error
    console.error("Signup error:", error);
    if (error.code === 'auth/email-already-in-use') {
      showMessage("This email is already registered.");
    } else if (error.code === 'auth/weak-password') {
      showMessage("Password is too weak. Use at least 6 characters.");
    } else if (error.code === 'auth/invalid-email') {
      showMessage("Invalid email address format.");
    } else {
      showMessage(error.message.replace("Firebase: ", ""));
    }
    
    signupBtn.disabled = false; signupBtn.textContent = "Create Account";
  }
});

loginBtn.addEventListener("click", async () => {
  const email = loginEmail.value.trim();
  const pass = loginPassword.value;
  
  if (!email || !pass) return showMessage("Please enter email and password.");
  
  try {
    loginBtn.disabled = true; loginBtn.textContent = "Logging in...";
    const userCred = await signInWithEmailAndPassword(auth, email, pass);
    const uid = userCred.user.uid;
    
    const snap = await get(ref(db, `users/${uid}`));
    if (snap.exists()) {
      myUid = uid; myId = snap.val().id; enterApp();
    } else {
      showMessage("Account data missing."); 
      loginBtn.disabled = false; loginBtn.textContent = "Secure Log In";
    }
  } catch (error) {
    console.error("Login error:", error);
    if (error.code === 'auth/wrong-password') {
      showMessage("Incorrect password.");
    } else if (error.code === 'auth/user-not-found') {
      showMessage("No account found with this email.");
    } else {
      showMessage("Invalid email or password.");
    }
    loginBtn.disabled = false; loginBtn.textContent = "Secure Log In";
  }
});

deleteAccBtn.addEventListener("click", async () => {
  if (!confirm("WARNING: This will permanently delete your account and data. Are you sure?")) return;
  try {
    deleteAccBtn.disabled = true;
    const user = auth.currentUser;
    await remove(ref(db, `ids/${myId}`));
    await remove(ref(db, `users/${myUid}`));
    await remove(ref(db, `status/${myUid}`));
    await deleteUser(user);
    alert("Account deleted."); location.reload();
  } catch (error) {
    alert(error.code === 'auth/requires-recent-login' ? "Please log out and log back in to delete." : error.message);
    deleteAccBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to log out?")) return;
  try {
    if (myUid) await set(ref(db, `status/${myUid}`), { state: 'offline', last_changed: Date.now() });
  } catch (error) { console.log("Could not set offline status."); }
  
  if (unsubMessages) unsubMessages(); 
  if (unsubContacts) unsubContacts();
  if (unsubTyping) unsubTyping();
  
  try { await signOut(auth); } catch (e) { console.log(e); }
  location.reload();
});

onAuthStateChanged(auth, async (user) => {
  if (user && appContainer.style.display === "none") {
    myUid = user.uid;
    const snap = await get(ref(db, `users/${myUid}`));
    if (snap.exists()) { myId = snap.val().id; enterApp(); }
  } else if (!user) {
    loginScreen.style.display = "flex"; appContainer.style.display = "none";
  }
});

// ============ ENTER APP ============
async function enterApp() {
  loginScreen.style.display = "none"; appContainer.style.display = "flex";
  emptyMyId.textContent = myId;
  await loadProfile();
  loadQuickReplies();
  setupPresence(myUid); 
  await loadContacts(); 
  listenToContacts(); 
  listenToUnread(); 
  listenToPins(); 
  listenToBlocks();
  listenToStarred();
  listenToNicknames();
  listenToArchive();
  listenToMuted();
  listenToWallpapers();
  listenToDisappearing();
  listenForUnknownSenders();
  startDisappearingCleanup();
  
  window.addEventListener("online", flushOfflineQueue);
  window.addEventListener("offline", () => { isOnline = false; });
  if (navigator.onLine) flushOfflineQueue();
}

// ============ CONTACTS ============
async function loadContacts() {
  const snap = await get(ref(db, `users/${myUid}/contacts`));
  contacts = snap.exists() ? Object.keys(snap.val()) : [];
  for (let uid of contacts) {
    if (uid.startsWith("GROUP_")) {
      const gSnap = await get(ref(db, `groups/${uid}`));
      if (gSnap.exists()) contactData[uid] = { id: gSnap.val().name, isGroup: true };
    } else {
      const uSnap = await get(ref(db, `users/${uid}`));
      if (uSnap.exists()) {
        const u = uSnap.val();
        contactData[uid] = {
          id: u.id,
          avatar: u.avatar || null,
          displayName: u.displayName || u.id,
          bio: u.bio || ""
        };
      }
    }
  }
  renderContactList();
  renderActiveNow();
}

function listenToContacts() {
  if (unsubContacts) unsubContacts();

  const r = ref(db, `users/${myUid}/contacts`);
  unsubContacts = onValue(r, async (snap) => {
    contacts = snap.exists() ? Object.keys(snap.val()) : [];

    for (const uid of Object.keys(contactUserListeners)) {
      if (!contacts.includes(uid)) {
        contactUserListeners[uid]();
        delete contactUserListeners[uid];
        delete contactData[uid];
      }
    }
    for (const gid of Object.keys(contactGroupListeners)) {
      if (!contacts.includes(gid)) {
        contactGroupListeners[gid]();
        delete contactGroupListeners[gid];
        delete contactData[gid];
      }
    }

    for (const uid of contacts) {
      if (uid.startsWith("GROUP_")) {
        if (!contactGroupListeners[uid]) {
          contactGroupListeners[uid] = onValue(ref(db, `groups/${uid}`), (gSnap) => {
            if (gSnap.exists()) {
              const g = gSnap.val();
              contactData[uid] = { id: g.name, isGroup: true };
            } else {
              contactData[uid] = { id: "Group", isGroup: true };
            }
            renderContactList();
          });
        }
      } else {
        if (!contactUserListeners[uid]) {
          contactUserListeners[uid] = onValue(ref(db, `users/${uid}`), (uSnap) => {
            if (uSnap.exists()) {
              const u = uSnap.val();
              contactData[uid] = {
                id: u.id,
                avatar: u.avatar || null,
                displayName: u.displayName || u.id,
                bio: u.bio || ""
              };
            } else {
              contactData[uid] = { id: "Unknown" };
            }
            renderContactList();

            if (activeChatUid === uid && !isGroupChat) {
              const dn = nicknames[uid] || contactData[uid].displayName || contactData[uid].id;
              headerName.textContent = dn;
              if (contactData[uid].avatar) {
                headerAvatar.innerHTML = `<img src="${contactData[uid].avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
              } else {
                headerAvatar.textContent = dn.substring(0, 2).toUpperCase();
              }
            }
          });
        }
      }
    }

    renderContactList();
    renderActiveNow();
  });
}

function listenToUnread() {
  onValue(ref(db, `unread/${myUid}`), (snap) => {
    unreadData = snap.val() || {};
    renderContactList();
  });
}

function listenToPins() {
  onValue(ref(db, `users/${myUid}/pinned`), (snap) => {
    pinnedChats = snap.val() || {};
    renderContactList();
  });
}

function listenToBlocks() {
  onValue(ref(db, `users/${myUid}/blocked`), (snap) => {
    blockedUsers = snap.val() || {};
    if (activeChatUid && !isGroupChat) {
      if (blockedUsers[activeChatUid]) {
        blockUserBtn.style.color = "#7f9aaf";
        blockedMessage.style.display = "block";
      } else {
        blockUserBtn.style.color = "#ff4d4d";
        blockedMessage.style.display = "none";
      }
    }
  });
}

async function addContact(targetId) {
  targetId = sanitizeId(targetId);
  if (targetId === myId) return alert("That's your own ID 🙂");
  const snap = await get(ref(db, `ids/${targetId}`));
  if (!snap.exists()) return alert(`No user found with ID "${targetId}".`);
  const targetUid = snap.val().uid;
  if (contacts.includes(targetUid)) { openChat(targetUid, targetId); return; }
  await set(ref(db, `users/${myUid}/contacts/${targetUid}`), true);
  await set(ref(db, `users/${targetUid}/contacts/${myUid}`), true);
  openChat(targetUid, targetId);
}

addContactBtn.addEventListener("click", () => {
  const id = searchIdInput.value.trim();
  if (id) { addContact(id); searchIdInput.value = ""; }
});

// ============ STARRED ============
function listenToStarred() {
  onValue(ref(db, `users/${myUid}/starred`), (snap) => {
    starredMessages = snap.val() || {};
    if (activeChatUid) renderMessages(currentAllMsgs);
  });
}

async function toggleStarMessage(msgId, msgObj) {
  if (starredMessages[msgId]) {
    await remove(ref(db, `users/${myUid}/starred/${msgId}`));
  } else {
    await set(ref(db, `users/${myUid}/starred/${msgId}`), {
      text: msgObj.text || "Media Message",
      senderName: msgObj.senderName || "Unknown",
      chatId: activeChatId,
      chatUid: activeChatUid,
      ts: msgObj.ts,
      senderUid: msgObj.senderUid
    });
  }
}

starredBtn.addEventListener("click", () => {
  starredList.innerHTML = "";
  const entries = Object.entries(starredMessages);
  if (!entries.length) {
    starredList.innerHTML = `<div style="text-align:center; padding:20px; color:#7f9aaf;">No starred messages yet. Hover a message and click the ⭐ or right-click → "Star Message".</div>`;
  } else {
    entries.sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0)).forEach(([id, data]) => {
      const item = document.createElement("div");
      item.className = "quick-reply-item";
      item.innerHTML = `
        <div>
          <div style="font-size:11px; color:#3fcf8e; font-weight:700;">${escapeHtml(data.senderName)} · ${formatTime(data.ts)}</div>
          <div style="font-size:13px; color:#13212e; margin-top:2px;">${escapeHtml(data.text)}</div>
        </div>
        <button title="Unstar" data-star-id="${id}"><i class="fas fa-star" style="color:#f5c518;"></i></button>
      `;
      item.querySelector("button").onclick = async (e) => {
        e.stopPropagation();
        await remove(ref(db, `users/${myUid}/starred/${id}`));
        starredBtn.click();
      };
      item.onclick = () => {
        openChat(data.chatUid, data.chatId);
        starredModal.style.display = "none";
      };
      starredList.appendChild(item);
    });
  }
  starredModal.style.display = "flex";
});
closeStarredBtn.addEventListener("click", () => starredModal.style.display = "none");

// ============ NICKNAMES ============
function listenToNicknames() {
  onValue(ref(db, `users/${myUid}/nicknames`), (snap) => {
    nicknames = snap.val() || {};
    renderContactList();
    if (activeChatUid && nicknames[activeChatUid]) {
      headerName.textContent = nicknames[activeChatUid];
    }
  });
}

window.openNicknameModal = function() {
  if (!activeChatUid || isGroupChat) return;
  nicknameInput.value = nicknames[activeChatUid] || contactData[activeChatUid]?.id || "";
  nicknameModal.style.display = "flex";
  nicknameInput.focus();
};

saveNicknameBtn.addEventListener("click", async () => {
  if (!activeChatUid) { nicknameModal.style.display = "none"; return; }
  const nick = nicknameInput.value.trim();
  if (nick) {
    await set(ref(db, `users/${myUid}/nicknames/${activeChatUid}`), nick);
    headerName.textContent = nick;
  } else {
    await remove(ref(db, `users/${myUid}/nicknames/${activeChatUid}`));
    headerName.textContent = contactData[activeChatUid]?.id || "Unknown";
  }
  nicknameModal.style.display = "none";
  renderContactList();
});
closeNicknameBtn.addEventListener("click", () => nicknameModal.style.display = "none");

// ============ QUICK REPLIES ============
function loadQuickReplies() {
  quickReplies = JSON.parse(localStorage.getItem("chatbuzz_quick_replies") || "[]");
  if (quickReplies.length === 0) {
    quickReplies = ["On my way!", "I'll check and get back to you.", "Thanks!", "Yes, sounds good.", "Can we talk later?"];
    localStorage.setItem("chatbuzz_quick_replies", JSON.stringify(quickReplies));
  }
}

quickReplyBtn.addEventListener("click", () => {
  renderQuickReplies();
  quickRepliesModal.style.display = "flex";
});

function renderQuickReplies() {
  quickRepliesList.innerHTML = "";
  quickReplies.forEach((qr, idx) => {
    const item = document.createElement("div");
    item.className = "quick-reply-item";
    item.innerHTML = `
      <span>${escapeHtml(qr)}</span>
      <button data-qr-idx="${idx}"><i class="fas fa-trash"></i></button>
    `;
    item.querySelector("button").onclick = (e) => {
      e.stopPropagation();
      quickReplies.splice(idx, 1);
      localStorage.setItem("chatbuzz_quick_replies", JSON.stringify(quickReplies));
      renderQuickReplies();
    };
    item.onclick = () => {
      messageInput.value = qr;
      messageInput.focus();
      quickRepliesModal.style.display = "none";
    };
    quickRepliesList.appendChild(item);
  });
}

addQuickReplyBtn.addEventListener("click", () => {
  const text = newQuickReplyInput.value.trim();
  if (text && !quickReplies.includes(text)) {
    quickReplies.push(text);
    localStorage.setItem("chatbuzz_quick_replies", JSON.stringify(quickReplies));
    newQuickReplyInput.value = "";
    renderQuickReplies();
  }
});
closeQuickRepliesBtn.addEventListener("click", () => quickRepliesModal.style.display = "none");

// ============ POLLS ============
pollBtn.addEventListener("click", () => {
  if (!isGroupChat) {
    attachMenu.style.display = "none";
    return alert("Polls are only available in group chats.");
  }
  pollQuestionInput.value = "";
  pollOptionsContainer.innerHTML = `
    <div class="input-group"><i class="fas fa-circle" style="font-size:10px;"></i><input type="text" class="poll-option" placeholder="Option 1" maxlength="50" /></div>
    <div class="input-group"><i class="fas fa-circle" style="font-size:10px;"></i><input type="text" class="poll-option" placeholder="Option 2" maxlength="50" /></div>
  `;
  pollModal.style.display = "flex";
});

addPollOptionBtn.addEventListener("click", () => {
  const count = pollOptionsContainer.querySelectorAll(".poll-option").length;
  if (count >= 6) return alert("Maximum 6 options.");
  const div = document.createElement("div");
  div.className = "input-group";
  div.innerHTML = `<i class="fas fa-circle" style="font-size:10px;"></i><input type="text" class="poll-option" placeholder="Option ${count + 1}" maxlength="50" />`;
  pollOptionsContainer.appendChild(div);
});

createPollBtn.addEventListener("click", async () => {
  const question = pollQuestionInput.value.trim();
  const options = Array.from(pollOptionsContainer.querySelectorAll(".poll-option"))
    .map(i => i.value.trim()).filter(v => v);
  
  if (!question || options.length < 2) return alert("Please enter a question and at least 2 options.");
  
  const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
  const msgRef = push(ref(db, `chats/${key}`));
  await set(msgRef, {
    senderUid: myUid,
    senderName: myIdDisplay.textContent,
    text: "📊 Poll: " + question,
    poll: { question, options, votes: {} },
    ts: Date.now(),
    read: false,
    readBy: { [myUid]: true }
  });
  pollModal.style.display = "none";
});
closePollBtn.addEventListener("click", () => pollModal.style.display = "none");

// ============ ARCHIVE ============
function listenToArchive() {
  onValue(ref(db, `users/${myUid}/archived`), (snap) => {
    archivedChats = snap.val() || {};
    renderContactList();
  });
}

archiveBtn.addEventListener("click", async () => {
  if (!activeChatUid) return;
  const isArchived = archivedChats[activeChatUid];
  if (isArchived) {
    await remove(ref(db, `users/${myUid}/archived/${activeChatUid}`));
  } else {
    await set(ref(db, `users/${myUid}/archived/${activeChatUid}`), true);
  }
  renderContactList();
});

// ============ DRAFT RESTORE ============
function restoreDraft(chatUid) {
  const draft = localStorage.getItem(`chatbuzz_draft_${myUid}_${chatUid}`) || "";
  messageInput.value = draft;
}

// ============ POLL RENDER ============
function renderPollMessage(msg, msgId) {
  const poll = msg.poll;
  if (!poll) return "";
  const myVote = poll.votes?.[myUid];
  const totalVotes = Object.keys(poll.votes || {}).length;
  
  let optionsHtml = poll.options.map((opt, idx) => {
    const voteCount = Object.values(poll.votes || {}).filter(v => v === idx).length;
    return `
      <button class="poll-option ${myVote === idx ? 'voted' : ''}" data-poll-id="${msgId}" data-opt-idx="${idx}">
        ${escapeHtml(opt)} ${voteCount > 0 ? `<span style="float:right; color:#3fcf8e; font-weight:700;">${voteCount}</span>` : ""}
      </button>
    `;
  }).join("");
  
  return `
    <div class="poll-message">
      <div class="poll-question">📊 ${escapeHtml(poll.question)}</div>
      ${optionsHtml}
      <div class="poll-votes">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</div>
    </div>
  `;
}

function attachPollHandlers() {
  document.querySelectorAll(".poll-option").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!activeChatUid) return;
      const msgId = btn.dataset.pollId;
      const optIdx = parseInt(btn.dataset.optIdx);
      const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
      await update(ref(db, `chats/${key}/${msgId}/poll/votes`), { [myUid]: optIdx });
    });
  });
}

// ============ RECALL ============
function canRecallMessage(msg) {
  if (msg.senderUid !== myUid) return false;
  const age = Date.now() - (msg.ts || 0);
  return age < 2 * 60 * 1000;
}

// ============ MUTE / WALLPAPER HELPERS ============
function listenToMuted() {
  onValue(ref(db, `users/${myUid}/muted`), (snap) => {
    mutedChats = snap.val() || {};
    renderContactList();
  });
}

function listenToWallpapers() {
  onValue(ref(db, `users/${myUid}/wallpapers`), (snap) => {
    chatWallpapers = snap.val() || {};
    if (activeChatUid) applyChatWallpaper(activeChatUid);
  });
}

function listenToDisappearing() {
  onValue(ref(db, `users/${myUid}/disappearing`), (snap) => {
    disappearingSettings = snap.val() || {};
  });
}

// ✅ AUTO-ADD UNKNOWN SENDERS
function listenForUnknownSenders() {
  const allChatsRef = ref(db, "chats");
  onValue(allChatsRef, async (snap) => {
    if (!snap.exists()) return;
    const allChats = snap.val();

    for (const [chatKeyStr, messages] of Object.entries(allChats)) {
      const parts = chatKeyStr.split("__");
      if (parts.length !== 2) continue;
      if (parts[0].startsWith("GROUP_") || parts[1].startsWith("GROUP_")) continue;

      const myIdInKey = parts.find(p => p === myUid);
      if (!myIdInKey) continue;

      const otherUid = parts.find(p => p !== myUid);
      if (!otherUid) continue;

      if (contacts.includes(otherUid)) continue;

      const msgList = Object.values(messages || {});
      const hasReceivedMsg = msgList.some(m => m && m.senderUid === otherUid);
      if (!hasReceivedMsg) continue;

      try {
        const userSnap = await get(ref(db, `users/${otherUid}`));
        if (!userSnap.exists()) continue;
        const userData = userSnap.val();
        const senderId = userData.id;
        if (!senderId) continue;

        await set(ref(db, `users/${myUid}/contacts/${otherUid}`), true);
        await set(ref(db, `users/${otherUid}/contacts/${myUid}`), true);

        contactData[otherUid] = {
          id: senderId,
          avatar: userData.avatar || null,
          displayName: userData.displayName || senderId,
          bio: userData.bio || ""
        };
        if (!contacts.includes(otherUid)) contacts.push(otherUid);

        renderContactList();
        renderActiveNow();
        showToast("New Chat", `${senderId} messaged you`);
      } catch (err) {
        console.error("Auto-add unknown sender failed:", err);
      }
    }
  });
}

function applyChatWallpaper(chatUid) {
  const wp = chatWallpapers[chatUid] || "light";
  
  chatPanelMain.style.setProperty("background-image", "none", "important");
  chatPanelMain.style.setProperty("background-color", "#f4f7fb", "important");
  
  if (wp === "dark") {
    chatPanelMain.style.setProperty("background-color", "#182531", "important");
  } else if (wp === "nature") {
    chatPanelMain.style.setProperty("background-image", "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", "important");
    chatPanelMain.style.setProperty("background-color", "#efeae2", "important");
  }
}

// ============ CONTACT CARD SHARING ============
if (contactCardBtn) {
  contactCardBtn.addEventListener("click", () => {
    if (!activeChatUid) return;
    contactCardIdInput.value = "";
    contactCardModal.style.display = "flex";
    contactCardIdInput.focus();
  });

  sendContactCardBtn.addEventListener("click", async () => {
    const targetId = sanitizeId(contactCardIdInput.value.trim());
    if (!targetId) return alert("Please enter a Chat ID.");
    
    const idSnap = await get(ref(db, `ids/${targetId}`));
    if (!idSnap.exists()) return alert(`No user found with ID "${targetId}".`);
    
    const targetUid = idSnap.val().uid;
    const userSnap = await get(ref(db, `users/${targetUid}`));
    const userData = userSnap.exists() ? userSnap.val() : { id: targetId };
    
    const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
    await push(ref(db, `chats/${key}`), {
      senderUid: myUid,
      senderName: myIdDisplay.textContent,
      text: `📇 Contact: ${targetId}`,
      contactCard: {
        id: targetId,
        uid: targetUid,
        bio: userData.bio || "Hey there!",
        avatar: userData.avatar || null
      },
      ts: Date.now(),
      read: false,
      readBy: { [myUid]: true }
    });
    
    contactCardModal.style.display = "none";
  });
  closeContactCardBtn.addEventListener("click", () => contactCardModal.style.display = "none");
}

// ============ LIVE LOCATION (REAL-TIME TRACKING) ============
let liveLocationInterval = null;
let currentLiveMsgId = null;
let currentLocationDuration = 0;

if (locationBtn) {
  locationBtn.addEventListener("click", () => {
    if (!activeChatUid) return;
    
    locationStatus.textContent = "Fetching current GPS location...";
    locationStatus.style.color = "#7f9aaf";
    document.getElementById("locationSetupState").style.display = "block";
    document.getElementById("locationActiveState").style.display = "none";
    liveLocationModal.style.display = "flex";
    
    if (!navigator.geolocation) {
      locationStatus.textContent = "❌ Geolocation not supported by your browser.";
      locationStatus.style.color = "#ff4d4d";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locationStatus.innerHTML = `
          <i class="fas fa-check-circle" style="color:#3fcf8e; font-size:24px;"></i><br>
          Location ready<br>
          <span style="font-size:11px;">${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}</span>
        `;
        locationStatus.style.color = "#3fcf8e";
      },
      (err) => {
        locationStatus.textContent = "❌ " + err.message;
        locationStatus.style.color = "#ff4d4d";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  document.querySelectorAll('.location-duration-btn').forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!activeChatUid) return;
      currentLocationDuration = parseInt(btn.dataset.duration);
      
      document.getElementById("locationSetupState").style.display = "none";
      document.getElementById("locationActiveState").style.display = "block";

      const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
      const msgRef = push(ref(db, `chats/${key}`));
      currentLiveMsgId = msgRef.key;
      
      const endTime = Date.now() + currentLocationDuration;
      
      await set(msgRef, {
        senderUid: myUid,
        senderName: myIdDisplay.textContent,
        text: "📍 Live Location",
        liveLocation: {
          lat: 0,
          lng: 0,
          endTime: endTime,
          active: true
        },
        ts: Date.now(),
        read: false,
        readBy: { [myUid]: true }
      });

      if (locationWatchId) navigator.geolocation.clearWatch(locationWatchId);
      
      locationWatchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          await update(ref(db, `chats/${key}/${currentLiveMsgId}/liveLocation`), {
            lat: latitude,
            lng: longitude
          });
        },
        (err) => { console.error("Location update error:", err); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );

      if (liveLocationInterval) clearTimeout(liveLocationInterval);
      liveLocationInterval = setTimeout(async () => {
        await update(ref(db, `chats/${key}/${currentLiveMsgId}/liveLocation`), { active: false });
        stopLiveLocation();
      }, currentLocationDuration);
    });
  });

  document.getElementById("stopSharingLocationBtn").addEventListener("click", async () => {
    if (!activeChatUid || !currentLiveMsgId) return;
    const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
    
    await update(ref(db, `chats/${key}/${currentLiveMsgId}/liveLocation`), { active: false });
    stopLiveLocation();
    liveLocationModal.style.display = "none";
  });

  closeLocationBtn.addEventListener("click", () => {
    liveLocationModal.style.display = "none";
  });
}

function stopLiveLocation() {
  if (locationWatchId) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
  if (liveLocationInterval) {
    clearTimeout(liveLocationInterval);
    liveLocationInterval = null;
  }
  currentLiveMsgId = null;
  currentLocationDuration = 0;
}

// ============ DISAPPEARING MESSAGES ============
if (disappearingBtn) {
  disappearingBtn.addEventListener("click", () => {
    if (!activeChatUid) return;
    disappearingModal.style.display = "flex";
  });

  document.querySelectorAll('[data-duration]').forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!activeChatUid) return;
      const duration = parseInt(btn.dataset.duration);
      
      if (duration === 0) {
        await remove(ref(db, `users/${myUid}/disappearing/${activeChatUid}`));
        if (isGroupChat) {
          await remove(ref(db, `groups/${activeChatUid}/disappearing`));
        }
      } else {
        await set(ref(db, `users/${myUid}/disappearing/${activeChatUid}`), duration);
        if (isGroupChat) {
          await set(ref(db, `groups/${activeChatUid}/disappearing`), duration);
        }
      }
      
      disappearingModal.style.display = "none";
      alert(duration === 0 ? "Disappearing messages turned off." : "Disappearing messages enabled.");
    });
  });
  closeDisappearingBtn.addEventListener("click", () => disappearingModal.style.display = "none");
}

function startDisappearingCleanup() {
  setInterval(async () => {
    if (!activeChatUid) return;
    const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
    const duration = disappearingSettings[activeChatUid];
    if (!duration) return;
    
    try {
      const snap = await get(ref(db, `chats/${key}`));
      const data = snap.val() || {};
      const now = Date.now();
      
      for (const [msgId, msg] of Object.entries(data)) {
        if (msg.ts && (now - msg.ts) > duration) {
          await remove(ref(db, `chats/${key}/${msgId}`));
        }
      }
    } catch (e) { /* silent */ }
  }, 60000);
}

// ============ PER-CHAT WALLPAPER ============
if (wallpaperBtn) {
  wallpaperBtn.addEventListener("click", () => {
    if (!activeChatUid) return;
    wallpaperPickerModal.style.display = "flex";
  });

  document.querySelectorAll('.wallpaper-option[data-wp]').forEach(el => {
    el.addEventListener("click", async () => {
      if (!activeChatUid) return;
      const wp = el.dataset.wp;
      await set(ref(db, `users/${myUid}/wallpapers/${activeChatUid}`), wp);
      chatWallpapers[activeChatUid] = wp;
      applyChatWallpaper(activeChatUid);
      wallpaperPickerModal.style.display = "none";
    });
  });
  if (closeWallpaperBtn) closeWallpaperBtn.addEventListener("click", () => wallpaperPickerModal.style.display = "none");
}

// ============ EXPORT CHAT ============
if (exportBtn) {
  exportBtn.addEventListener("click", async () => {
    if (!activeChatUid) return;
    
    const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
    const snap = await get(ref(db, `chats/${key}`));
    const data = snap.val() || {};
    
    const msgs = Object.values(data)
      .filter(m => m && m.text !== undefined)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    
    if (!msgs.length) return alert("No messages to export.");
    
    const chatName = nicknames[activeChatUid] || activeChatId;
    let content = `ChatBuzz Export\n`;
    content += `Chat: ${chatName}\n`;
    content += `Exported: ${new Date().toLocaleString()}\n`;
    content += `Total messages: ${msgs.length}\n`;
    content += `========================================\n\n`;
    
    msgs.forEach(m => {
      const time = new Date(m.ts).toLocaleString();
      const sender = m.senderUid === myUid ? "You" : (m.senderName || "Them");
      const text = m.deleted ? "[deleted]" : (m.text || (m.imageUrl ? "[photo]" : m.audioUrl ? "[voice]" : m.poll ? "[poll]" : "[media]"));
      content += `[${time}] ${sender}: ${text}\n`;
    });
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ChatBuzz_${chatName}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// ============ OFFLINE QUEUE ============
function saveOfflineQueue() {
  localStorage.setItem("chatbuzz_offline_queue", JSON.stringify(offlineQueue));
}

async function flushOfflineQueue() {
  if (!myUid) return;
  isOnline = true;
  if (offlineQueue.length === 0) return;

  const toSend = [...offlineQueue];
  offlineQueue = [];
  saveOfflineQueue();

  for (const msg of toSend) {
    try {
      await set(ref(db, `chats/${msg.key}/${msg.refId}`), msg.data);
      if (!msg.isGroup && msg.receiverUid) {
        const receiverUnreadRef = ref(db, `unread/${msg.receiverUid}/${myUid}`);
        const snap = await get(receiverUnreadRef);
        const count = snap.val() || 0;
        await set(receiverUnreadRef, count + 1);
      }
    } catch (err) {
      console.error("Failed to send queued message:", err);
    }
  }
  showToast("ChatBuzz", "Offline messages sent!");
}

// ============ RENDER CONTACT LIST ============
function renderContactList() {
  const searchTerm = searchChatInput.value.trim().toUpperCase();
  
  let filteredContacts = contacts.filter(uid => {
    if (archivedChats[uid]) return false;
    const displayId = nicknames[uid] || (contactData[uid] ? (contactData[uid].displayName || contactData[uid].id) : "");
    return displayId.toUpperCase().includes(searchTerm);
  });

  filteredContacts.sort((a, b) => {
    const aPinned = pinnedChats[a] ? 1 : 0;
    const bPinned = pinnedChats[b] ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return (contactData[a]?.id || "").localeCompare(contactData[b]?.id || "");
  });

  if (!filteredContacts.length) {
    contactList.innerHTML = `<div style="padding:20px;color:#7f9aaf;font-size:13px;text-align:center;">
      ${contacts.length === 0 ? "No chats yet. Search a friend's ID above." : "No matching chats found."}</div>`;
    return;
  }
  
  contactList.innerHTML = "";
  filteredContacts.forEach(uid => {
    const data = contactData[uid] || { id: "Unknown" };
    const actualId = data.id;
    const displayId = nicknames[uid] || data.displayName || actualId;
    const isGroup = data.isGroup;
    const isPinned = pinnedChats[uid];
    const isBlocked = blockedUsers[uid];
    
    const el = document.createElement("div");
    el.className = "contact-item" + (uid === activeChatUid ? " active" : "");
    el.dataset.uid = uid;
    
    const count = unreadData[uid] || 0;
    const badgeHtml = count > 0 ? `<div class="unread-badge">${count}</div>` : "";
    const pinHtml = isPinned ? `<i class="fas fa-thumbtack pin-icon"></i>` : "";
    const blockHtml = isBlocked ? `<i class="fas fa-ban" style="color:#ff4d4d; font-size:12px; margin-left:5px;"></i>` : "";
    const nickBadge = nicknames[uid] && nicknames[uid] !== actualId 
      ? `<span class="nickname-badge">${escapeHtml(actualId)}</span>` 
      : "";
    const muteIconHtml = mutedChats[uid] 
      ? `<i class="fas fa-bell-slash" style="color:#7f9aaf; font-size:11px; margin-left:5px;"></i>` 
      : "";
    
    const avatarClass = isGroup ? "contact-avatar group-icon" : "contact-avatar";
    const avatarImg = (!isGroup && data.avatar)
      ? `<img src="${data.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
      : (isGroup ? `<i class="fas fa-users"></i>` : escapeHtml(displayId.substring(0, 2).toUpperCase()));

    el.innerHTML = `
      <div class="${avatarClass}" style="position: relative; overflow: hidden;">
        ${avatarImg}
        ${!isGroup ? `<div class="status-dot" id="dot-${uid}"></div>` : ''}
      </div>
      <div class="contact-info">
        <div class="contact-name">
          ${escapeHtml(displayId)} ${nickBadge} ${pinHtml} ${blockHtml} ${badgeHtml} ${muteIconHtml}
        </div>
        <div class="contact-lastmsg" id="status-text-${uid}">${isGroup ? 'Group Chat' : 'Offline'}</div>
      </div>`;
    
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (activeContextMenu) activeContextMenu.remove();
      activeContextMenu = document.createElement("div");
      activeContextMenu.className = "context-menu";
      activeContextMenu.style.top = `${e.pageY}px`;
      activeContextMenu.style.left = `${e.pageX}px`;

      const pinBtn = document.createElement("button");
      pinBtn.innerHTML = isPinned ? '<i class="fas fa-thumbtack"></i> Unpin Chat' : '<i class="fas fa-thumbtack"></i> Pin Chat';
      pinBtn.onclick = async () => {
        if (isPinned) await remove(ref(db, `users/${myUid}/pinned/${uid}`));
        else await set(ref(db, `users/${myUid}/pinned/${uid}`), true);
        activeContextMenu.remove(); activeContextMenu = null;
      };
      activeContextMenu.appendChild(pinBtn);

      const archiveItemBtn = document.createElement("button");
      archiveItemBtn.innerHTML = archivedChats[uid] 
        ? '<i class="fas fa-archive"></i> Unarchive Chat' 
        : '<i class="fas fa-archive"></i> Archive Chat';
      archiveItemBtn.style.color = "#7f9aaf";
      archiveItemBtn.onclick = async () => {
        if (archivedChats[uid]) {
          await remove(ref(db, `users/${myUid}/archived/${uid}`));
        } else {
          await set(ref(db, `users/${myUid}/archived/${uid}`), true);
        }
        activeContextMenu.remove(); 
        activeContextMenu = null;
      };
      activeContextMenu.appendChild(archiveItemBtn);

      const muteBtn = document.createElement("button");
      const isMuted = mutedChats[uid];
      muteBtn.innerHTML = isMuted 
        ? '<i class="fas fa-bell"></i> Unmute' 
        : '<i class="fas fa-bell-slash"></i> Mute';
      muteBtn.style.color = "#7f9aaf";
      muteBtn.onclick = async () => {
        if (isMuted) {
          await remove(ref(db, `users/${myUid}/muted/${uid}`));
        } else {
          await set(ref(db, `users/${myUid}/muted/${uid}`), true);
        }
        activeContextMenu.remove();
        activeContextMenu = null;
      };
      activeContextMenu.appendChild(muteBtn);

      if (!isGroup) {
        const nickBtn = document.createElement("button");
        nickBtn.innerHTML = '<i class="fas fa-user-tag"></i> Set Nickname';
        nickBtn.style.color = "#3fcf8e";
        nickBtn.onclick = () => {
          activeChatUid = uid;
          activeChatId = actualId;
          isGroupChat = false;
          window.openNicknameModal();
          activeContextMenu.remove(); 
          activeContextMenu = null;
        };
        activeContextMenu.appendChild(nickBtn);
      }

      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Chat (For Me)';
      deleteBtn.style.color = "#ff4d4d";
      deleteBtn.onclick = () => {
        deleteChatForMe(uid);
        activeContextMenu.remove(); activeContextMenu = null;
      };
      activeContextMenu.appendChild(deleteBtn);
      
      document.body.appendChild(activeContextMenu);
    });

    el.addEventListener("click", () => openChat(uid, actualId, isGroup));
    contactList.appendChild(el);

    if (!isGroup) {
      if (!presenceListeners[uid]) {
        presenceListeners[uid] = onValue(ref(db, `status/${uid}`), (statusSnap) => {
          const status = statusSnap.val() || { state: 'offline', last_changed: Date.now() };
          const dot = document.getElementById(`dot-${uid}`);
          const text = document.getElementById(`status-text-${uid}`);
          if (dot && text && !text.classList.contains("sidebar-typing")) {
            if (status.state === 'online') {
              dot.classList.add("online"); text.textContent = "Online"; text.style.color = "#3fcf8e";
            } else {
              dot.classList.remove("online"); text.textContent = formatLastSeen(status.last_changed); text.style.color = "#7f9aaf";
            }
          }
          if (activeChatUid === uid && !isGroupChat) {
            headerStatus.textContent = status.state === 'online' ? "Online" : formatLastSeen(status.last_changed);
            headerStatus.style.color = status.state === 'online' ? "#3fcf8e" : "#7f8c8d";
          }
          renderActiveNow(); 
        });
      }

      const key = chatKey(myUid, uid);
      if (!typingListeners[uid]) {
        typingListeners[uid] = onValue(ref(db, `typing/${key}/${uid}`), (snap) => {
          const text = document.getElementById(`status-text-${uid}`);
          if (text && snap.val() === true) {
            text.innerHTML = `typing<span class="typing-dots"><span></span><span></span><span></span></span>`;
            text.className = "contact-lastmsg sidebar-typing";
          } else if (text) {
            text.className = "contact-lastmsg";
            const dot = document.getElementById(`dot-${uid}`);
            if (dot && dot.classList.contains("online")) {
               text.textContent = "Online"; text.style.color = "#3fcf8e";
            }
          }
        });
      }
    }

    const key = chatKey(myUid, uid);
    onValue(ref(db, `chats/${key}`), (snap) => {
      const el2 = document.getElementById(`status-text-${uid}`);
      if (!el2) return;
      if (el2.classList.contains("sidebar-typing")) return; 
      
      const chatData = snap.val();
      if (chatData) {
        const msgs = Object.values(chatData).filter(m => m && m.text !== undefined).sort((a, b) => (a.ts || 0) - (b.ts || 0));
        const last = msgs[msgs.length - 1];
        if (last) {
          const dot = document.getElementById(`dot-${uid}`);
          if (isGroup || (dot && !dot.classList.contains("online"))) {
            let prefix = last.senderUid === myUid ? "You: " : (isGroup ? `${last.senderName}: ` : "");
            el2.textContent = prefix + (last.text || "Message deleted");
          }
        }
      }
    });
  });
}

// ============ OPEN CHAT ============
function openChat(contactUid, contactId, isGroup = false) {
  activeChatUid = contactUid; 
  activeChatId = contactId; 
  isGroupChat = isGroup;
  
  const displayName = nicknames[contactUid] || contactData[contactUid]?.displayName || contactId;
  headerName.textContent = displayName; 
  emptyChat.style.display = "none"; activeChatView.style.display = "flex";
  chatSearchBar.style.display = "none";
  chatSearchInput.value = "";
  
  messageInput.value = "";
  restoreDraft(contactUid);
  
  applyChatWallpaper(contactUid);
  
  if (isGroup) {
    headerAvatar.innerHTML = '<i class="fas fa-users"></i>';
    headerStatus.textContent = "Group Chat";
    blockUserBtn.style.display = "none";
    chatInputArea.style.display = "flex";
    blockedMessage.style.display = "none";
    headerInfoClick.style.pointerEvents = "auto";
    analyticsBtn.style.display = "block";
    
    get(ref(db, `groups/${contactUid}/members`)).then(mSnap => {
      const members = mSnap.val() || {};
      let totalCount = Object.keys(members).length;
      let onlineCount = 0;
      
      Object.keys(members).forEach(async (mid) => {
        const idSnap = await get(ref(db, `ids/${mid}`));
        if (idSnap.exists()) {
          const sSnap = await get(ref(db, `status/${idSnap.val().uid}`));
          if (sSnap.exists() && sSnap.val().state === 'online') {
            onlineCount++;
            headerStatus.innerHTML = `<span class="group-online-text"><i class="fas fa-circle" style="font-size:8px;"></i> ${onlineCount} online, ${totalCount} members</span>`;
          }
        }
      });
    });
  } else {
    const cAv = contactData[contactUid]?.avatar;
    if (cAv) {
      headerAvatar.innerHTML = `<img src="${cAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } else {
      headerAvatar.textContent = displayName.substring(0, 2).toUpperCase();
    }
    blockUserBtn.style.display = "block";
    headerInfoClick.style.pointerEvents = "auto";
    analyticsBtn.style.display = "block";
    if (blockedUsers[activeChatUid]) {
      blockUserBtn.style.color = "#7f9aaf";
      blockedMessage.style.display = "block";
    } else {
      blockUserBtn.style.color = "#ff4d4d";
      blockedMessage.style.display = "none";
    }
  }

  appContainer.classList.add("show-chat");
  messageInput.focus();

  replyingTo = null; replyPreviewContainer.style.display = "none";
  remove(ref(db, `unread/${myUid}/${contactUid}`));

  document.querySelectorAll(".contact-item").forEach(el => {
    el.classList.toggle("active", el.dataset.uid === contactUid);
  });

  if (unsubMessages) unsubMessages();
  if (unsubTyping) { unsubTyping(); unsubTyping = null; }
  
  const key = isGroup ? chatKey(contactUid, contactUid) : chatKey(myUid, contactUid);
  
  get(ref(db, `chats/${key}`)).then(snap => {
    const data = snap.val() || {};
    lastReadMsgCount = Object.keys(data).length;
  });

  previousMsgCount = 0;

  unsubMessages = onValue(ref(db, `chats/${key}`), (snap) => {
    const data = snap.val() || {};
    const msgs = Object.entries(data)
      .filter(([id, m]) => m && m.text !== undefined)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
      
    currentAllMsgs = msgs;
    
    if (msgs.length > previousMsgCount && previousMsgCount !== 0) {
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.senderUid !== myUid) {
        const isSilent = !!lastMsg.silent;
        if (!mutedChats[contactUid] && !isSilent) {
          notifSound.play().catch(e => console.log("Audio blocked"));
        }
        const lookingHere = activeChatUid === contactUid && !document.hidden;
        if (!lookingHere && !mutedChats[contactUid] && !isSilent) {
           showToast(displayName, lastMsg.text || "Sent a media file");
        }
      }
    }
    previousMsgCount = msgs.length;

    if (chatSearchBar.style.display === "none" || chatSearchInput.value.trim() === "") {
      renderMessages(msgs);
    }
    
    msgs.forEach(m => {
      if (m.senderUid !== myUid) {
        if (isGroupChat) {
          if (!m.readBy || !m.readBy[myUid]) {
            update(ref(db, `chats/${key}/${m.id}/readBy`), { [myUid]: true });
          }
        } else {
          if (!m.read) {
            update(ref(db, `chats/${key}/${m.id}`), { read: true, readAt: Date.now() });
            remove(ref(db, `unread/${myUid}/${contactUid}`));
          }
        }
      }
    });
  });

  if (!isGroup) {
    unsubTyping = onValue(ref(db, `typing/${key}/${contactUid}`), (snap) => {
      if (snap.val() === true) {
        headerStatus.innerHTML = `typing<span class="typing-dots"><span></span><span></span><span></span></span>`;
        headerStatus.style.color = "#3fcf8e";
      } else {
        onValue(ref(db, `status/${contactUid}`), (s) => {
          const st = s.val() || { state: 'offline', last_changed: Date.now() };
          headerStatus.textContent = st.state === 'online' ? "Online" : formatLastSeen(st.last_changed);
          headerStatus.style.color = st.state === 'online' ? "#3fcf8e" : "#7f8c8d";
        });
      }
    });
  }
  
  currentPinnedMsg = null;
  pinnedMessageArea.style.display = "none";
  onValue(ref(db, `users/${myUid}/pinnedMessages/${activeChatUid}`), (snap) => {
     if (snap.exists()) {
        currentPinnedMsg = snap.val();
        pinnedMessageText.textContent = currentPinnedMsg.text || "Media Message";
        pinnedMessageArea.style.display = "flex"; 
     } else {
        pinnedMessageArea.style.display = "none";
     }
  });
}

// ============ RENDER MESSAGES ============
function renderMessages(msgs, isSearchResult = false) {
  if (!msgs.length) {
    messagesContainer.innerHTML = `<div style="text-align:center;color:#809aad;margin-top:30px;">
      <i class="fas fa-comment" style="font-size:36px;opacity:0.5;"></i>
      <p style="margin-top:12px;">${isSearchResult ? "No messages found." : "No messages yet. Say hi 👋"}</p></div>`;
    return;
  }

  let html = "";
  let unreadDividerInserted = false;
  let localReadCount = lastReadMsgCount;

  msgs.forEach((m, index) => {
    if (!isSearchResult && !unreadDividerInserted && index >= localReadCount && m.senderUid !== myUid) {
      html += `<div class="unread-divider"><span>UNREAD MESSAGES</span></div>`;
      unreadDividerInserted = true;
    }

    const sent = m.senderUid === myUid; 
    const isDeleted = m.deleted;
    
    const ticks = sent ? (
      m.read 
        ? `<button class="info-tick-btn" data-info-id="${m.id}" style="color:#53bdeb;"><i class="fas fa-check-double"></i></button>` 
        : (m.delivered 
            ? '<i class="fas fa-check-double" style="color:#7f98aa;"></i>' 
            : '<i class="fas fa-check" style="color:#7f98aa;"></i>')
    ) : '';
    const editedTag = m.edited ? '<span class="edited-tag">(edited)</span>' : '';

    let quotedHtml = "";
    if (m.replyTo) {
      const isQuotedMe = m.replyTo.senderUid === myUid;
      let quoteContent = m.replyTo.text || "Message deleted";
      
      if (m.replyTo.type === 'image') {
        quoteContent = "📷 Photo";
      } else if (m.replyTo.type === 'audio') {
        quoteContent = "🎤 Voice Message";
      }

      quotedHtml = `
        <div class="quoted-message">
          <strong>${isQuotedMe ? 'You' : escapeHtml(m.replyTo.senderName || activeChatId)}</strong>
          ${formatRichText(quoteContent)}
        </div>`;
    }
    
    let forwardedHtml = "";
    if (m.forwarded) {
      forwardedHtml = `<div class="forwarded-label"><i class="fas fa-share"></i> Forwarded</div>`;
    }

    let senderNameHtml = "";
    if (isGroupChat && !sent) {
      const senderDisplay = nicknames[m.senderUid] || m.senderName || "User";
      senderNameHtml = `<div style="font-size:11px; font-weight:bold; margin-bottom:4px; opacity:0.8;">${escapeHtml(senderDisplay)}</div>`;
    }

    let contentHtml = "";
    if (isDeleted) {
      contentHtml = '<i class="fas fa-ban"></i> This message was deleted';
    } else if (m.poll) {
      contentHtml = renderPollMessage(m, m.id);
    } else if (m.contactCard) {
      contentHtml = `
        <div class="contact-card-message" style="background:#f4f7fb; padding:12px; border-radius:10px; margin-top:5px;">
          <div style="font-size:11px; color:#3fcf8e; font-weight:700; margin-bottom:6px;"><i class="fas fa-address-card"></i> CONTACT</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:40px; height:40px; border-radius:50%; background:linear-gradient(145deg,#3fcf8e,#1d7a52); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; overflow:hidden;">
              ${m.contactCard.avatar ? `<img src="${m.contactCard.avatar}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(m.contactCard.id.substring(0,2).toUpperCase())}
            </div>
            <div>
              <div style="font-weight:700; font-size:14px; color:#13212e;">${escapeHtml(m.contactCard.id)}</div>
              <div style="font-size:11px; color:#7f9aaf;">${escapeHtml(m.contactCard.bio)}</div>
            </div>
          </div>
          <button class="action-btn" style="margin-top:10px; padding:6px 12px; font-size:12px;" onclick="addContactFromCard('${m.contactCard.id}')">
            <i class="fas fa-plus"></i> Add to Contacts
          </button>
        </div>`;
    } else if (m.location) {
      contentHtml = `
        <div style="background:#e8f5ef; padding:10px; border-radius:10px; margin-top:5px;">
          <div style="font-size:11px; color:#3fcf8e; font-weight:700; margin-bottom:6px;"><i class="fas fa-map-marker-alt"></i> LOCATION</div>
          <a href="https://www.google.com/maps?q=${m.location.lat},${m.location.lng}" target="_blank" style="display:inline-block; padding:8px 14px; background:#3fcf8e; color:#0b1a12; border-radius:8px; font-weight:600; text-decoration:none; font-size:13px;">
            <i class="fas fa-external-link-alt"></i> Open in Maps
          </a>
          <div style="font-size:11px; color:#7f9aaf; margin-top:6px;">${m.location.lat.toFixed(4)}, ${m.location.lng.toFixed(4)}</div>
        </div>`;
    } else if (m.liveLocation) {
      const ll = m.liveLocation;
      const isExpired = !ll.active || (ll.endTime && Date.now() > ll.endTime);
      const timeLeft = ll.endTime ? Math.max(0, ll.endTime - Date.now()) : 0;
      const minsLeft = Math.floor(timeLeft / 60000);

      contentHtml = `
        <div style="background:${isExpired ? '#f0f2f5' : '#e8f5ef'}; padding:12px; border-radius:10px; margin-top:5px; border: 1px solid ${isExpired ? '#d9e2ec' : '#3fcf8e'};">
          <div style="font-size:11px; color:${isExpired ? '#7f9aaf' : '#3fcf8e'}; font-weight:700; margin-bottom:6px;">
            <i class="fas fa-map-marker-alt"></i> LIVE LOCATION ${isExpired ? '(Ended)' : ''}
          </div>
          ${!isExpired ? `<div style="font-size:12px; color:#3fcf8e; margin-bottom:8px;"><i class="fas fa-circle" style="font-size:8px; animation: pulse 1.5s infinite;"></i> Live for ${minsLeft} mins</div>` : ''}
          <a href="https://www.google.com/maps?q=${ll.lat},${ll.lng}" target="_blank" style="display:inline-block; padding:8px 14px; background:${isExpired ? '#c1c9d1' : '#3fcf8e'}; color:${isExpired ? '#111b21' : '#0b1a12'}; border-radius:8px; font-weight:600; text-decoration:none; font-size:13px; pointer-events: ${isExpired ? 'none' : 'auto'};">
            <i class="fas fa-external-link-alt"></i> View on Maps
          </a>
        </div>`;
    } else if (m.audioUrl) {
      contentHtml = `<div style="font-weight:600; margin-bottom:5px;">🎤 Voice Message</div>
                     <audio controls src="${m.audioUrl}" class="audio-player" id="audio-${m.id}"></audio>
                     <div style="display:flex; gap:4px; margin-top:6px;">
                       <button class="voice-speed-btn" data-speed="1" data-audio="audio-${m.id}">1x</button>
                       <button class="voice-speed-btn" data-speed="1.5" data-audio="audio-${m.id}">1.5x</button>
                       <button class="voice-speed-btn" data-speed="2" data-audio="audio-${m.id}">2x</button>
                     </div>`;
    } else if (m.imageUrl) {
      contentHtml = `<img src="${m.imageUrl}" class="image-message" onclick="openImageModal(this.src)" />`;
    } else {
      contentHtml = formatRichText(m.text || "") + editedTag;
    }

    let reactionHtml = "";
    if (m.reaction) {
       reactionHtml = `<div class="reaction-badge">${m.reaction}</div>`;
    }

    const isStarred = starredMessages[m.id] ? "starred" : "";

    html += `
      <div class="message-wrapper" data-msgid="${m.id}">
        <div class="message-reply-icon"><i class="fas fa-reply"></i></div>
        
        <div class="message ${sent ? "sent" : "received"} ${isStarred}">
          ${!isDeleted ? `<button class="star-msg-btn" data-star-id="${m.id}" title="Star message"><i class="fas fa-star" style="${starredMessages[m.id] ? 'color:#f5c518;' : ''}"></i></button>` : ""}
          
          <div class="bubble" style="${isDeleted ? 'font-style: italic; color: #7f98aa; background: transparent; border: 1px dashed #d9e2ec;' : ''}">
            ${forwardedHtml}
            ${quotedHtml}
            ${senderNameHtml}
            ${contentHtml}
          </div>
          
          ${reactionHtml}
          
          <div class="message-meta-row">
            ${formatTime(m.ts)} ${ticks}
          </div>
        </div>
      </div>`;
  });

  messagesContainer.innerHTML = html;
  if (!isSearchResult) messagesContainer.scrollTop = messagesContainer.scrollHeight;

  attachPollHandlers();

  document.querySelectorAll(".star-msg-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const msgId = btn.dataset.starId;
      const msgObj = msgs.find(m => m.id === msgId);
      if (msgObj) toggleStarMessage(msgId, msgObj);
    });
  });

  document.querySelectorAll(".voice-speed-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const audioEl = document.getElementById(btn.dataset.audio);
      if (audioEl) audioEl.playbackRate = parseFloat(btn.dataset.speed);
      btn.parentElement.querySelectorAll(".voice-speed-btn").forEach(b => b.style.background = '');
      btn.style.background = '#d9fdd3';
    });
  });

  document.querySelectorAll(".message-wrapper").forEach(wrapper => {
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    const msgId = wrapper.dataset.msgid;
    const msgObj = msgs.find(m => m.id === msgId);
    const bubble = wrapper.querySelector(".message");

    wrapper.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      isSwiping = true;
      bubble.style.transition = "none"; 
    }, { passive: true });

    wrapper.addEventListener("touchmove", (e) => {
      if (!isSwiping) return;
      currentX = e.touches[0].clientX;
      const diff = currentX - startX;

      if (diff > 0) {
        const move = Math.min(diff, 80);
        bubble.style.transform = `translateX(${move}px)`;
        if (move > 40) wrapper.classList.add("swiping");
      }
    }, { passive: true });

    wrapper.addEventListener("touchend", () => {
      if (!isSwiping) return;
      isSwiping = false;
      bubble.style.transition = "transform 0.2s ease-out";
      
      const diff = currentX - startX;
      if (diff > 50 && msgObj) {
        setReply(msgObj);
        if (navigator.vibrate) navigator.vibrate(30);
      }
      
      bubble.style.transform = `translateX(0)`;
      wrapper.classList.remove("swiping");
    });
  });

  document.querySelectorAll(".info-tick-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const msgId = btn.dataset.infoId;
      const msgObj = msgs.find(m => m.id === msgId);
      if (!msgObj) return;

      infoContent.innerHTML = `<div style="text-align:center; padding: 10px; color: #8696a0;">Loading...</div>`;
      infoModal.style.display = "flex";

      if (isGroupChat) {
        const gSnap = await get(ref(db, `groups/${activeChatUid}/members`));
        const members = gSnap.val() || {};
        const readData = msgObj.readBy || {};
        
        let html = `<div style="text-align: left; padding: 10px 0;">`;
        for (const mid of Object.keys(members)) {
          const isRead = readData[mid];
          const statusColor = isRead ? "#53bdeb" : "#8696a0";
          const statusIcon = isRead ? "check-double" : "check";
          
          html += `
            <div class="receipt-item">
              <div class="receipt-avatar">${mid.substring(0,2)}</div>
              <div class="receipt-info">
                <div class="receipt-name">${mid}</div>
              </div>
              <i class="fas fa-${statusIcon}" style="color: ${statusColor}; font-size: 14px;"></i>
            </div>
          `;
        }
        html += `</div>`;
        infoContent.innerHTML = html;
      } else {
        if (msgObj.readAt) {
          infoContent.innerHTML = `
            <i class="fas fa-check-double" style="color:#53bdeb; font-size:32px; margin-bottom:10px;"></i><br>
            <strong style="color:#111b21;">Read</strong><br>
            <span style="font-size:12px; color:#8696a0;">${new Date(msgObj.readAt).toLocaleString()}</span>
          `;
        } else {
          infoContent.innerHTML = `
            <i class="fas fa-check" style="color:#8696a0; font-size:32px; margin-bottom:10px;"></i><br>
            <strong style="color:#111b21;">Delivered</strong><br>
            <span style="font-size:12px; color:#8696a0;">Waiting to be read...</span>
          `;
        }
      }
    });
  });

  document.querySelectorAll(".message").forEach(el => {
    el.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const msgId = el.parentElement.dataset.msgid;
        if (!msgId) return;
        
        if (document.querySelector(".reaction-menu")) document.querySelector(".reaction-menu").remove();
        
        const menu = document.createElement("div");
        menu.className = "reaction-menu";
        menu.style.top = `${e.pageY}px`;
        menu.style.left = `${e.pageX - 50}px`;
        
        const reactions = ["❤️", "👍", "😂", "😮", "😢", "🔥"];
        reactions.forEach(emoji => {
           const span = document.createElement("span");
           span.textContent = emoji;
           span.onclick = async () => {
             if (!activeChatUid) return;
             const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
             await update(ref(db, `chats/${key}/${msgId}`), { reaction: emoji });
             menu.remove();
           };
           menu.appendChild(span);
        });
        
        document.body.appendChild(menu);
        
        setTimeout(() => {
           document.addEventListener("click", function closeMenu() {
              menu.remove();
              document.removeEventListener("click", closeMenu);
           }, { once: true });
        }, 100);
    });

    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const msgId = el.parentElement.dataset.msgid;
      if (!msgId) return;

      if (activeContextMenu) activeContextMenu.remove();
      activeContextMenu = document.createElement("div");
      activeContextMenu.className = "context-menu";
      activeContextMenu.style.top = `${e.pageY}px`;
      activeContextMenu.style.left = `${e.pageX}px`;

      const msgObj = msgs.find(m => m.id === msgId);
      if (!msgObj) return;
      const isMyMsg = msgObj.senderUid === myUid;

      if (!msgObj.deleted) {
        const starBtn = document.createElement("button");
        starBtn.innerHTML = starredMessages[msgId] 
          ? '<i class="fas fa-star"></i> Unstar' 
          : '<i class="far fa-star"></i> Star Message';
        starBtn.style.color = "#f5c518";
        starBtn.onclick = () => {
          toggleStarMessage(msgId, msgObj);
          activeContextMenu.remove(); 
          activeContextMenu = null;
        };
        activeContextMenu.appendChild(starBtn);

        const pinBtn = document.createElement("button");
        pinBtn.innerHTML = '<i class="fas fa-thumbtack"></i> Pin Message';
        pinBtn.style.color = "#3fcf8e";
        pinBtn.onclick = async () => {
          await set(ref(db, `users/${myUid}/pinnedMessages/${activeChatUid}`), { 
             text: msgObj.text || "Media Message",
             id: msgId
          });
          activeContextMenu.remove(); activeContextMenu = null;
        };
        activeContextMenu.appendChild(pinBtn);

        const copyBtn = document.createElement("button");
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.style.color = "#7f9aaf";
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(msgObj.text || "Media Message");
          activeContextMenu.remove(); activeContextMenu = null;
        };
        activeContextMenu.appendChild(copyBtn);

        const fwdBtn = document.createElement("button");
        fwdBtn.innerHTML = '<i class="fas fa-share"></i> Forward';
        fwdBtn.style.color = "#3fcf8e";
        fwdBtn.onclick = async () => {
          const targetId = prompt("Enter Chat ID to forward to:");
          if (targetId && targetId.trim() !== "") {
            const sanitized = sanitizeId(targetId.trim());
            const idSnap = await get(ref(db, `ids/${sanitized}`));
            if (idSnap.exists()) {
              const targetUid = idSnap.val().uid;
              const newKey = chatKey(myUid, targetUid);
              await push(ref(db, `chats/${newKey}`), {
                senderUid: myUid,
                senderName: myIdDisplay.textContent,
                text: msgObj.text,
                ts: Date.now(),
                read: false,
                forwarded: true
              });
              alert(`Message forwarded to ${sanitized}!`);
            } else {
              alert("User not found.");
            }
          }
          activeContextMenu.remove(); activeContextMenu = null;
        };
        activeContextMenu.appendChild(fwdBtn);

        const replyBtn = document.createElement("button");
        replyBtn.innerHTML = '<i class="fas fa-reply"></i> Reply';
        replyBtn.style.color = "#7f9aaf";
        replyBtn.onclick = () => { setReply(msgObj); activeContextMenu.remove(); activeContextMenu = null; };
        activeContextMenu.appendChild(replyBtn);

        if (isMyMsg) {
          const editBtn = document.createElement("button");
          editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
          editBtn.style.color = "#3fcf8e";
          editBtn.onclick = async () => {
            const newText = prompt("Edit your message:", msgObj.text);
            if (newText !== null && newText.trim() !== "" && newText !== msgObj.text) {
              const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
              await update(ref(db, `chats/${key}/${msgId}`), { text: newText.trim(), edited: true });
            }
            activeContextMenu.remove(); activeContextMenu = null;
          };
          activeContextMenu.appendChild(editBtn);

          if (canRecallMessage(msgObj)) {
            const recallBtn = document.createElement("button");
            recallBtn.innerHTML = '<i class="fas fa-undo"></i> Delete for Everyone';
            recallBtn.style.color = "#ff4d4d";
            recallBtn.onclick = async () => {
              const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
              await update(ref(db, `chats/${key}/${msgId}`), { deleted: true, text: "" });
              activeContextMenu.remove(); 
              activeContextMenu = null;
            };
            activeContextMenu.appendChild(recallBtn);
          }
        }

        const deleteMeBtn = document.createElement("button");
        deleteMeBtn.innerHTML = '<i class="fas fa-trash"></i> Delete for Me';
        deleteMeBtn.style.color = "#ff4d4d";
        deleteMeBtn.onclick = async () => {
          const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
          await remove(ref(db, `chats/${key}/${msgId}`));
          activeContextMenu.remove(); activeContextMenu = null;
        };
        activeContextMenu.appendChild(deleteMeBtn);

        if (isMyMsg) {
          const deleteAllBtn = document.createElement("button");
          deleteAllBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Delete for Everyone';
          deleteAllBtn.style.color = "#ff4d4d";
          deleteAllBtn.onclick = async () => {
            const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
            await update(ref(db, `chats/${key}/${msgId}`), { deleted: true, text: "" });
            activeContextMenu.remove(); activeContextMenu = null;
          };
          activeContextMenu.appendChild(deleteAllBtn);
        }
      }

      document.body.appendChild(activeContextMenu);
    });
  });
}

// ============ SEND MESSAGE (OFFLINE SUPPORT) ============
async function sendMessage() {
  if (!activeChatUid) return;
  
  const text = messageInput.value.trim();
  if (!text) return;
  messageInput.value = "";

  delete messageDrafts[activeChatUid];
  localStorage.removeItem(`chatbuzz_draft_${myUid}_${activeChatUid}`);

  const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
  const msgRef = push(ref(db, `chats/${key}`));
  const refId = msgRef.key; 
  
  const msgData = { 
    senderUid: myUid, 
    senderName: myIdDisplay.textContent,
    text, 
    ts: Date.now(), 
    read: false,
    readBy: { [myUid]: true }
  };

  if (replyingTo) {
    msgData.replyTo = { 
      senderUid: replyingTo.senderUid, 
      senderName: replyingTo.senderName,
      text: replyingTo.text,
      type: replyingTo.imageUrl ? 'image' : (replyingTo.audioUrl ? 'audio' : 'text')
    };
    replyingTo = null;
    replyPreviewContainer.style.display = "none";
  }

  if (!navigator.onLine) {
    offlineQueue.push({
      key: key,
      refId: refId,
      data: msgData,
      isGroup: isGroupChat,
      receiverUid: isGroupChat ? null : activeChatUid
    });
    saveOfflineQueue();
    showToast("Offline", "Message queued. Will send when online.");
    return;
  }

  await set(msgRef, msgData);

  if (!isGroupChat) {
    const receiverBlockRef = ref(db, `users/${activeChatUid}/blocked/${myUid}`);
    const blockSnap = await get(receiverBlockRef);
    if (!blockSnap.exists()) {
      const receiverUnreadRef = ref(db, `unread/${activeChatUid}/${myUid}`);
      const snap = await get(receiverUnreadRef);
      const currentCount = snap.val() || 0;
      await set(receiverUnreadRef, currentCount + 1);
    }
  }
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") { e.preventDefault(); sendMessage(); }
});

// ============ ADD CONTACT FROM CARD ============
window.addContactFromCard = async function(contactId) {
  try { await addContact(contactId); } catch (e) { alert(e.message); }
};

// ============ WEBRTC VOICE CALLING ============
let localStream = null;
let peerConnection = null;
let currentCallId = null;
let callListener = null;
let incomingCallListener = null;

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ]
};

const callOverlay = document.getElementById("callOverlay");
const callAvatar = document.getElementById("callAvatar");
const callName = document.getElementById("callName");
const callStatus = document.getElementById("callStatus");
const acceptCallBtn = document.getElementById("acceptCallBtn");
const declineCallBtn = document.getElementById("declineCallBtn");
const endCallBtn = document.getElementById("endCallBtn");

async function getLocalStream() {
  if (localStream) return localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return localStream;
  } catch (err) {
    alert("Microphone access is required for voice calls.");
    throw err;
  }
}

window.startVoiceCall = async function() {
  if (!activeChatUid || isGroupChat) return alert("Voice calls are only for 1-on-1 chats.");
  
  try {
    const callsSnap = await get(ref(db, "calls"));
    const allCalls = callsSnap.val() || {};
    for (const c of Object.values(allCalls)) {
      if ((c.callerUid === activeChatUid || c.receiverUid === activeChatUid) && 
          (c.status === "ringing" || c.status === "connected")) {
        return alert("User is currently on another call. Please try again later.");
      }
    }

    const stream = await getLocalStream();
    currentCallId = chatKey(myUid, activeChatUid) + "_" + Date.now();
    
    const displayName = nicknames[activeChatUid] || contactData[activeChatUid]?.id || "Contact";
    callAvatar.textContent = displayName.substring(0,2).toUpperCase();
    callName.textContent = displayName;
    callStatus.textContent = "Calling...";
    
    incomingCallActions.style.display = "flex";
    acceptCallBtn.style.display = "none";
    declineCallBtn.style.display = "none";
    endCallBtn.style.display = "flex";
    inCallControls.style.display = "none";
    
    callOverlay.style.display = "flex";

    peerConnection = new RTCPeerConnection(servers);
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        push(ref(db, `calls/${currentCallId}/callerCandidates`), event.candidate.toJSON());
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const callData = {
      callerUid: myUid,
      receiverUid: activeChatUid,
      callerName: myIdDisplay.textContent,
      offer: { type: offer.type, sdp: offer.sdp },
      status: "ringing",
      timestamp: Date.now()
    };
    
    await set(ref(db, `calls/${currentCallId}`), callData);

    callListener = onValue(ref(db, `calls/${currentCallId}/answer`), async (snapshot) => {
      const answer = snapshot.val();
      if (answer && peerConnection && !peerConnection.currentRemoteDescription) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        callStatus.textContent = "Connected";
        incomingCallActions.style.display = "none";
        inCallControls.style.display = "flex";
      }
    });

    onValue(ref(db, `calls/${currentCallId}/receiverCandidates`), (snapshot) => {
      const candidate = snapshot.val();
      if (candidate && peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    onValue(ref(db, `calls/${currentCallId}/status`), (snapshot) => {
      const status = snapshot.val();
      if (status === "declined") {
        endCallUI("Call Declined");
      } else if (status === "ended") {
        endCallUI("Call Ended");
      }
    });

  } catch (err) {
    console.error(err);
    endCallUI("Call Failed");
  }
};

function listenForIncomingCalls() {
  onValue(ref(db, "calls"), (snapshot) => {
    const calls = snapshot.val() || {};
    for (const [callId, callData] of Object.entries(calls)) {
      if (callData.receiverUid === myUid && callData.status === "ringing" && !currentCallId) {
        currentCallId = callId;
        
        callAvatar.textContent = callData.callerName.substring(0,2).toUpperCase();
        callName.textContent = callData.callerName;
        callStatus.textContent = "Incoming Voice Call";
        
        incomingCallActions.style.display = "flex";
        acceptCallBtn.style.display = "flex";
        declineCallBtn.style.display = "flex";
        endCallBtn.style.display = "none";
        inCallControls.style.display = "none";
        
        callOverlay.style.display = "flex";

        notifSound.play().catch(e => console.log("Audio blocked"));
        
        acceptCallBtn.onclick = async () => {
          try {
            const stream = await getLocalStream();
            
            incomingCallActions.style.display = "none";
            inCallControls.style.display = "flex";
            
            callStatus.textContent = "Connected";

            peerConnection = new RTCPeerConnection(servers);
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

            peerConnection.onicecandidate = event => {
              if (event.candidate) {
                push(ref(db, `calls/${currentCallId}/receiverCandidates`), event.candidate.toJSON());
              }
            };

            await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            await update(ref(db, `calls/${currentCallId}`), {
              answer: { type: answer.type, sdp: answer.sdp },
              status: "connected"
            });

            onValue(ref(db, `calls/${currentCallId}/callerCandidates`), (snapshot) => {
              const candidate = snapshot.val();
              if (candidate && peerConnection) {
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
              }
            });

          } catch (err) {
            console.error(err);
            endCallUI("Failed to connect");
          }
        };

        declineCallBtn.onclick = async () => {
          await update(ref(db, `calls/${callId}/status`), { status: "declined" });
          endCallUI("Call Declined");
        };
      }
    }
  });
}

endCallBtn.onclick = async () => {
  if (currentCallId) {
    await update(ref(db, `calls/${currentCallId}/status`), { status: "ended" });
  }
  endCallUI("Call Ended");
};

function endCallUI(message) {
  callStatus.textContent = message;
  setTimeout(() => {
    callOverlay.style.display = "none";
    
    incomingCallActions.style.display = "flex";
    inCallControls.style.display = "none";
    acceptCallBtn.style.display = "none";
    declineCallBtn.style.display = "none";
    endCallBtn.style.display = "none";
    
    if (muteBtn) {
      muteBtn.classList.remove("active");
      muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
    if (speakerBtn) {
      speakerBtn.classList.remove("active");
      speakerBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
    }
    isSpeakerOn = false;
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    
    if (currentCallId) {
      setTimeout(() => remove(ref(db, `calls/${currentCallId}`)), 2000);
      currentCallId = null;
    }
  }, 1500);
}

listenForIncomingCalls();

const headerCallBtn = document.getElementById("headerCallBtn");
if (headerCallBtn) {
  headerCallBtn.addEventListener("click", () => {
    if (isGroupChat) {
      alert("Group calls are not supported yet.");
    } else {
      window.startVoiceCall();
    }
  });
}

muteBtn.addEventListener("click", () => {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      muteBtn.classList.toggle("active", !audioTrack.enabled);
      muteBtn.innerHTML = audioTrack.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    }
  }
});

let isSpeakerOn = false;
speakerBtn.addEventListener("click", () => {
  isSpeakerOn = !isSpeakerOn;
  speakerBtn.classList.toggle("active", isSpeakerOn);
  if (isSpeakerOn) {
    speakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
  } else {
    speakerBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
  }
});

endCallBtnActive.addEventListener("click", async () => {
  if (currentCallId) {
    await update(ref(db, `calls/${currentCallId}/status`), { status: "ended" });
  }
  endCallUI("Call Ended");
});

// ==================================================================
// ============ STATUS / UPDATES (WhatsApp-style) ==================
// ==================================================================

const STATUS_TTL_MS = 24 * 60 * 60 * 1000;
let statusUnsub = null;
let currentStatusesByUser = {};
let statusViewerState = null;
let pendingStatusImage = null;
let pendingStatusBg = "#00a884";
const statusSeenTimers = {};

const statusBarEl = document.getElementById("statusBar");
const postStatusBtn = document.getElementById("postStatusBtn");
const postStatusModal = document.getElementById("postStatusModal");
const statusTextInput = document.getElementById("statusTextInput");
const statusPreviewWrap = document.getElementById("statusPreviewWrap");
const statusPreviewImg = document.getElementById("statusPreviewImg");
const removeStatusImgBtn = document.getElementById("removeStatusImgBtn");
const statusAddImageBtn = document.getElementById("statusAddImageBtn");
const statusImageInput = document.getElementById("statusImageInput");
const statusBgBtn = document.getElementById("statusBgBtn");
const statusBgSwatches = document.getElementById("statusBgSwatches");
const publishStatusBtn = document.getElementById("publishStatusBtn");
const closeStatusModalBtn = document.getElementById("closeStatusModalBtn");

const statusViewer = document.getElementById("statusViewer");
const statusProgressWrap = document.getElementById("statusProgressWrap");
const statusViewerAvatar = document.getElementById("statusViewerAvatar");
const statusViewerName = document.getElementById("statusViewerName");
const statusViewerTime = document.getElementById("statusViewerTime");
const statusViewerBody = document.getElementById("statusViewerBody");
const statusViewerClose = document.getElementById("statusViewerClose");
const statusNavPrev = document.getElementById("statusNavPrev");
const statusNavNext = document.getElementById("statusNavNext");
const statusViewersInfo = document.getElementById("statusViewersInfo");
const deleteMyStatusBtn = document.getElementById("deleteMyStatusBtn");

if (postStatusBtn) {
  postStatusBtn.addEventListener("click", () => {
    statusTextInput.value = "";
    pendingStatusImage = null;
    pendingStatusBg = "#00a884";
    statusPreviewWrap.style.display = "none";
    statusBgSwatches.style.display = "none";
    statusTextInput.style.background = "#fff";
    statusTextInput.style.color = "#111b21";
    statusTextInput.style.borderColor = "#e9edef";
    statusTextInput.style.border = "1px solid #e9edef";
    postStatusModal.style.display = "flex";
    setTimeout(() => statusTextInput.focus(), 50);
  });
}
if (closeStatusModalBtn) {
  closeStatusModalBtn.addEventListener("click", () => {
    postStatusModal.style.display = "none";
  });
}

if (statusBgBtn) {
  statusBgBtn.addEventListener("click", () => {
    statusBgSwatches.style.display =
      statusBgSwatches.style.display === "flex" ? "none" : "flex";
  });
}
document.querySelectorAll(".status-bg-swatch").forEach(sw => {
  sw.addEventListener("click", () => {
    pendingStatusBg = sw.dataset.bg;
    statusTextInput.style.background = pendingStatusBg;
    statusTextInput.style.color = "#fff";
    statusTextInput.style.border = "none";
    statusBgSwatches.style.display = "none";
  });
});

if (statusAddImageBtn) {
  statusAddImageBtn.addEventListener("click", () => statusImageInput.click());
}
if (statusImageInput) {
  statusImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 700000) {
      alert("Image too large. Please choose under 700KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      pendingStatusImage = ev.target.result;
      statusPreviewImg.src = pendingStatusImage;
      statusPreviewWrap.style.display = "block";
      statusBgSwatches.style.display = "none";
      statusTextInput.style.background = "#fff";
      statusTextInput.style.color = "#111b21";
      statusTextInput.style.border = "1px solid #e9edef";
    };
    reader.readAsDataURL(file);
  });
}
if (removeStatusImgBtn) {
  removeStatusImgBtn.addEventListener("click", () => {
    pendingStatusImage = null;
    statusPreviewWrap.style.display = "none";
    statusImageInput.value = "";
  });
}

if (publishStatusBtn) {
  publishStatusBtn.addEventListener("click", async () => {
    if (!myUid) return;
    const text = statusTextInput.value.trim();
    if (!text && !pendingStatusImage) {
      alert("Write something or add an image first.");
      return;
    }
    publishStatusBtn.disabled = true;
    publishStatusBtn.textContent = "Publishing...";
    try {
      const statusId = push(ref(db, "statuses/" + myUid)).key;
      const payload = {
        text: text || "",
        image: pendingStatusImage || null,
        bg: pendingStatusBg,
        ts: Date.now(),
        serverTs: serverTimestamp(),
        viewers: {},
      };
      await set(ref(db, `statuses/${myUid}/${statusId}`), payload);
      await set(ref(db, `statuses/${myUid}/${statusId}/viewers/${myUid}`), true);

      postStatusModal.style.display = "none";
      showToast("Status", "Your status is live for 24 hours.");
    } catch (err) {
      alert("Failed to publish: " + err.message);
    } finally {
      publishStatusBtn.disabled = false;
      publishStatusBtn.textContent = "Publish Status";
    }
  });
}

function watchAllStatuses() {
  if (statusUnsub) statusUnsub();
  statusUnsub = onValue(ref(db, "statuses"), (snap) => {
    const all = snap.val() || {};
    const now = Date.now();
    const filtered = {};

    Object.entries(all).forEach(([uid, statusesObj]) => {
      if (!statusesObj) return;
      const fresh = {};
      Object.entries(statusesObj).forEach(([sid, s]) => {
        if (!s || !s.ts) return;
        if (now - s.ts < STATUS_TTL_MS) fresh[sid] = s;
      });
      if (Object.keys(fresh).length) filtered[uid] = fresh;
    });

    currentStatusesByUser = filtered;
    renderStatusBar();
  });
}

function renderStatusBar() {
  if (!statusBarEl) return;
  statusBarEl.innerHTML = "";

  const myStatuses = currentStatusesByUser[myUid] || {};
  const myStatusList = Object.values(myStatuses).sort((a, b) => a.ts - b.ts);
  const hasMyStatus = myStatusList.length > 0;

  const myAvatarSrc = (window.currentProfilePic) ? window.currentProfilePic : null;
  const myDisplayName = (myIdDisplay?.textContent) || "Me";

  const myItem = document.createElement("div");
  myItem.className = "status-item";
  myItem.innerHTML = `
    <div class="status-ring ${hasMyStatus ? "viewed" : ""}">
      <div class="status-ring-inner">
        ${myAvatarSrc
          ? `<img src="${myAvatarSrc}" />`
          : escapeHtml(myDisplayName.substring(0, 2).toUpperCase())}
      </div>
    </div>
    ${!hasMyStatus ? '<div class="status-add-badge"><i class="fas fa-plus"></i></div>' : ""}
    <div class="status-item-name">My Status</div>
  `;
  myItem.addEventListener("click", () => {
    if (hasMyStatus) {
      openStatusViewer(myUid);
    } else {
      postStatusBtn.click();
    }
  });
  statusBarEl.appendChild(myItem);

  const othersWithStatus = Object.entries(currentStatusesByUser)
    .filter(([uid]) => uid !== myUid)
    .filter(([uid]) => {
      return contacts.includes(uid);
    })
    .map(([uid, statusesObj]) => {
      const list = Object.values(statusesObj).sort((a, b) => a.ts - b.ts);
      const latest = list[list.length - 1];
      const unviewed = list.some(s => !s.viewers || !s.viewers[myUid]);
      return { uid, list, latest, unviewed };
    })
    .sort((a, b) => b.latest.ts - a.latest.ts);

  othersWithStatus.forEach(({ uid, latest, unviewed }) => {
    const data = contactData[uid] || {};
    const dispName = nicknames[uid] || data.displayName || data.id || "User";
    const av = data.avatar;

    const el = document.createElement("div");
    el.className = "status-item";
    el.innerHTML = `
      <div class="status-ring ${unviewed ? "unviewed" : "viewed"}">
        <div class="status-ring-inner">
          ${av
            ? `<img src="${av}" />`
            : escapeHtml(dispName.substring(0, 2).toUpperCase())}
        </div>
      </div>
      <div class="status-item-name">${escapeHtml(dispName)}</div>
    `;
    el.addEventListener("click", () => openStatusViewer(uid));
    statusBarEl.appendChild(el);
  });

  if (othersWithStatus.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "font-size:11px; color:#7f9aaf; padding:8px 4px; align-self:center;";
    empty.textContent = "No status updates from contacts";
    statusBarEl.appendChild(empty);
  }
}

function openStatusViewer(userUid) {
  const statusesObj = currentStatusesByUser[userUid];
  if (!statusesObj) return;
  const list = Object.entries(statusesObj)
    .sort((a, b) => a[1].ts - b[1].ts)
    .map(([id, s]) => ({ id, ...s }));

  if (!list.length) return;

  statusViewerState = { userUid, list, index: 0, timer: null };
  statusViewer.style.display = "flex";
  renderStatusViewer();
}

function renderStatusViewer() {
  const st = statusViewerState;
  if (!st) return;
  const item = st.list[st.index];
  const isMine = st.userUid === myUid;

  const data = contactData[st.userUid] || {};
  const dispName = st.userUid === myUid
    ? (myIdDisplay?.textContent || "You")
    : (nicknames[st.userUid] || data.displayName || data.id || "User");

  statusViewerName.textContent = dispName;
  const myAv = st.userUid === myUid ? window.currentProfilePic : data.avatar;
  statusViewerAvatar.innerHTML = myAv
    ? `<img src="${myAv}" />`
    : escapeHtml(dispName.substring(0, 2).toUpperCase());

  statusViewerTime.textContent = new Date(item.ts).toLocaleString();

  statusProgressWrap.innerHTML = "";
  st.list.forEach((_, i) => {
    const seg = document.createElement("div");
    seg.className = "status-progress-seg";
    const fill = document.createElement("div");
    fill.className = "status-progress-fill";
    fill.id = `status-fill-${i}`;
    seg.appendChild(fill);
    statusProgressWrap.appendChild(seg);
  });

  statusViewerBody.innerHTML = "";
  if (item.image) {
    const img = document.createElement("img");
    img.src = item.image;
    img.className = "status-body-img";
    statusViewerBody.appendChild(img);
    if (item.text) {
      const cap = document.createElement("div");
      cap.style.cssText = "position:absolute; bottom:80px; left:20px; right:20px; background:rgba(0,0,0,0.5); padding:10px 14px; border-radius:10px; font-size:14px; text-align:center;";
      cap.textContent = item.text;
      statusViewerBody.appendChild(cap);
    }
  } else {
    const txt = document.createElement("div");
    txt.className = "status-body-text";
    txt.style.background = item.bg || "#00a884";
    txt.textContent = item.text || "";
    statusViewerBody.appendChild(txt);
  }

  deleteMyStatusBtn.style.display = isMine ? "flex" : "none";

  if (isMine) {
    const viewers = item.viewers || {};
    const ids = Object.keys(viewers).filter(uid => uid !== myUid);
    statusViewersInfo.style.display = "block";
    statusViewersInfo.innerHTML = ids.length
      ? `<i class="fas fa-eye"></i> ${ids.length} view${ids.length > 1 ? "s" : ""}`
      : `<i class="fas fa-eye-slash"></i> No views yet`;
  } else {
    statusViewersInfo.style.display = "none";
  }

  if (!isMine && (!item.viewers || !item.viewers[myUid])) {
    set(ref(db, `statuses/${st.userUid}/${item.id}/viewers/${myUid}`), true)
      .catch(() => {});
  }

  const fill = document.getElementById(`status-fill-${st.index}`);
  if (fill) {
    fill.style.transition = "none";
    fill.style.width = "0%";
    void fill.offsetWidth;
    fill.style.transition = "width 5s linear";
    fill.style.width = "100%";
  }

  if (st.timer) clearTimeout(st.timer);
  st.timer = setTimeout(() => {
    advanceStatus(1);
  }, 5000);
}

function advanceStatus(dir) {
  const st = statusViewerState;
  if (!st) return;
  const newIndex = st.index + dir;
  if (newIndex < 0) {
    st.index = 0;
    renderStatusViewer();
    return;
  }
  if (newIndex >= st.list.length) {
    closeStatusViewer();
    return;
  }
  st.index = newIndex;
  renderStatusViewer();
}

function closeStatusViewer() {
  if (statusViewerState?.timer) clearTimeout(statusViewerState.timer);
  statusViewerState = null;
  statusViewer.style.display = "none";
  statusViewerBody.innerHTML = "";
  statusProgressWrap.innerHTML = "";
  pendingStatusImage = null;
  if (statusReplyImgPreview) statusReplyImgPreview.style.display = "none";
}

if (statusViewerClose) statusViewerClose.addEventListener("click", closeStatusViewer);
if (statusNavPrev) statusNavPrev.addEventListener("click", () => advanceStatus(-1));
if (statusNavNext) statusNavNext.addEventListener("click", () => advanceStatus(1));

document.addEventListener("keydown", (e) => {
  if (statusViewer.style.display !== "flex") return;
  if (e.key === "Escape") closeStatusViewer();
  if (e.key === "ArrowRight") advanceStatus(1);
  if (e.key === "ArrowLeft") advanceStatus(-1);
});

if (deleteMyStatusBtn) {
  deleteMyStatusBtn.addEventListener("click", async () => {
    const st = statusViewerState;
    if (!st || st.userUid !== myUid) return;
    if (!confirm("Delete this status?")) return;
    const item = st.list[st.index];
    await remove(ref(db, `statuses/${myUid}/${item.id}`));
    closeStatusViewer();
  });
}

async function cleanupExpiredStatuses() {
  if (!myUid) return;
  try {
    const snap = await get(ref(db, "statuses"));
    const all = snap.val() || {};
    const now = Date.now();
    for (const [uid, statuses] of Object.entries(all)) {
      for (const [sid, s] of Object.entries(statuses || {})) {
        if (!s.ts || (now - s.ts) > STATUS_TTL_MS) {
          await remove(ref(db, `statuses/${uid}/${sid}`));
        }
      }
    }
  } catch (e) { /* silent */ }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    const wait = setInterval(() => {
      if (window.myUid || (typeof myUid !== "undefined" && myUid)) {
        clearInterval(wait);
        watchAllStatuses();
        cleanupExpiredStatuses();
        setInterval(cleanupExpiredStatuses, 5 * 60 * 1000);
      }
    }, 300);
    setTimeout(() => clearInterval(wait), 8000);
  } else {
    if (statusUnsub) { statusUnsub(); statusUnsub = null; }
  }
});

setInterval(() => {
  if (myUid && document.getElementById("statusBar")) {
    if (!statusBarEl.children.length) renderStatusBar();
  }
}, 3000);

// ==================================================================
// ============ STATUS MUTE + REPLY (extensions) ===================
// ==================================================================

let mutedStatuses = {};
let myStatusMuteUnsub = null;

const statusReplyBar = document.getElementById("statusReplyBar");
const statusReplyInput = document.getElementById("statusReplyInput");
const statusReplySendBtn = document.getElementById("statusReplySendBtn");
const statusMuteBtn = document.getElementById("statusMuteBtn");

function isStatusMuted(uid) {
  if (!uid) return false;
  const v = mutedStatuses[uid];
  if (!v) return false;
  if (v === true) return true;
  if (typeof v === "number") {
    if (Date.now() > v) return false;
    return true;
  }
  return false;
}

function statusMuteExpiryText(uid) {
  const v = mutedStatuses[uid];
  if (v === true) return "muted";
  if (typeof v === "number" && v > Date.now()) {
    const mins = Math.round((v - Date.now()) / 60000);
    return `muted ${mins}m`;
  }
  return "";
}

function watchMyMutedStatuses() {
  if (myStatusMuteUnsub) myStatusMuteUnsub();
  if (!myUid) return;
  myStatusMuteUnsub = onValue(ref(db, `users/${myUid}/mutedStatuses`), (snap) => {
    mutedStatuses = snap.val() || {};
    const now = Date.now();
    Object.entries(mutedStatuses).forEach(([uid, v]) => {
      if (typeof v === "number" && v <= now) {
        remove(ref(db, `users/${myUid}/mutedStatuses/${uid}`)).catch(() => {});
      }
    });
    renderStatusBar();
  });
}

const _origRenderStatusBar = window.renderStatusBar || renderStatusBar;
window.renderStatusBar = function patchedRenderStatusBar() {
  _origRenderStatusBar();

  if (!statusBarEl) return;
  const items = statusBarEl.querySelectorAll(".status-item");
  items.forEach((el, i) => { if (i === 0) return; });

  while (statusBarEl.children.length > 1) {
    statusBarEl.removeChild(statusBarEl.lastChild);
  }

  const othersWithStatus = Object.entries(currentStatusesByUser)
    .filter(([uid]) => uid !== myUid)
    .filter(([uid]) => contacts.includes(uid))
    .filter(([uid]) => !isStatusMuted(uid))
    .map(([uid, statusesObj]) => {
      const list = Object.values(statusesObj).sort((a, b) => a.ts - b.ts);
      const latest = list[list.length - 1];
      const unviewed = list.some(s => !s.viewers || !s.viewers[myUid]);
      return { uid, list, latest, unviewed };
    })
    .sort((a, b) => b.latest.ts - a.latest.ts);

  othersWithStatus.forEach(({ uid, latest, unviewed }) => {
    const data = contactData[uid] || {};
    const dispName = nicknames[uid] || data.displayName || data.id || "User";
    const av = data.avatar;

    const el = document.createElement("div");
    el.className = "status-item";
    el.dataset.statusUid = uid;
    el.innerHTML = `
      <div class="status-ring ${unviewed ? "unviewed" : "viewed"}">
        <div class="status-ring-inner">
          ${av
            ? `<img src="${av}" />`
            : escapeHtml(dispName.substring(0, 2).toUpperCase())}
        </div>
      </div>
      <div class="status-item-name">${escapeHtml(dispName)}</div>
    `;
    el.addEventListener("click", () => openStatusViewer(uid));

    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showStatusMuteMenu(e.pageX, e.pageY, uid);
    });
    let pressTimer = null;
    el.addEventListener("touchstart", (ev) => {
      pressTimer = setTimeout(() => {
        const t = ev.touches[0];
        showStatusMuteMenu(t.pageX, t.pageY, uid);
      }, 550);
    }, { passive: true });
    el.addEventListener("touchend", () => clearTimeout(pressTimer));
    el.addEventListener("touchmove", () => clearTimeout(pressTimer));

    statusBarEl.appendChild(el);
  });

  if (othersWithStatus.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "font-size:11px; color:#7f9aaf; padding:8px 4px; align-self:center;";
    empty.textContent = currentStatusesByUser && Object.keys(currentStatusesByUser).length > 1
      ? "All statuses muted"
      : "No status updates from contacts";
    statusBarEl.appendChild(empty);
  }
};

let statusMuteMenuEl = null;
function showStatusMuteMenu(x, y, uid) {
  if (statusMuteMenuEl) statusMuteMenuEl.remove();

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.cssText = `position:fixed; top:${y}px; left:${x}px; z-index:5000;`;

  const isMuted = isStatusMuted(uid);

  const opt1 = document.createElement("button");
  opt1.innerHTML = isMuted
    ? '<i class="fas fa-bell"></i> Unmute status'
    : '<i class="fas fa-bell-slash"></i> Mute for 24h';
  opt1.style.color = isMuted ? "#3fcf8e" : "#7f9aaf";
  opt1.onclick = async () => {
    if (isMuted) {
      await remove(ref(db, `users/${myUid}/mutedStatuses/${uid}`));
    } else {
      await set(ref(db, `users/${myUid}/mutedStatuses/${uid}`), Date.now() + 24 * 60 * 60 * 1000);
    }
    menu.remove(); statusMuteMenuEl = null;
  };
  menu.appendChild(opt1);

  if (!isMuted) {
    const opt2 = document.createElement("button");
    opt2.innerHTML = '<i class="fas fa-bell-slash"></i> Mute forever';
    opt2.style.color = "#ff4d4d";
    opt2.onclick = async () => {
      await set(ref(db, `users/${myUid}/mutedStatuses/${uid}`), true);
      menu.remove(); statusMuteMenuEl = null;
    };
    menu.appendChild(opt2);
  }

  document.body.appendChild(menu);
  statusMuteMenuEl = menu;

  setTimeout(() => {
    document.addEventListener("click", function close() {
      menu.remove();
      statusMuteMenuEl = null;
      document.removeEventListener("click", close);
    }, { once: true });
  }, 100);
}

const _origRenderStatusViewer = window.renderStatusViewer || renderStatusViewer;
window.renderStatusViewer = function patchedRenderStatusViewer() {
  _origRenderStatusViewer();

  if (!statusViewerState) return;
  const isMine = statusViewerState.userUid === myUid;

  if (isMine) {
    statusReplyBar.style.display = "none";
  } else {
    statusReplyBar.style.display = "flex";
    statusReplyInput.value = "";
  }

  if (isMine) {
    statusMuteBtn.style.display = "none";
  } else {
    statusMuteBtn.style.display = "flex";
    const muted = isStatusMuted(statusViewerState.userUid);
    statusMuteBtn.classList.toggle("muted", muted);
    statusMuteBtn.innerHTML = muted
      ? '<i class="fas fa-bell"></i>'
      : '<i class="fas fa-bell-slash"></i>';
    statusMuteBtn.title = muted ? "Unmute status" : "Mute status for 24h";
  }
};

if (statusMuteBtn) {
  statusMuteBtn.addEventListener("click", async () => {
    if (!statusViewerState) return;
    const uid = statusViewerState.userUid;
    if (uid === myUid) return;

    if (isStatusMuted(uid)) {
      await remove(ref(db, `users/${myUid}/mutedStatuses/${uid}`));
    } else {
      await set(ref(db, `users/${myUid}/mutedStatuses/${uid}`), Date.now() + 24 * 60 * 60 * 1000);
    }
    window.renderStatusViewer();
  });
}

if (statusReplySendBtn) {
  statusReplySendBtn.addEventListener("click", sendStatusReply);
  statusReplyInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") { e.preventDefault(); sendStatusReply(); }
  });
}

async function sendStatusReply() {
  if (!statusViewerState) return;
  const text = statusReplyInput.value.trim();
  if (!text) return;

  const st = statusViewerState;
  const authorUid = st.userUid;
  if (authorUid === myUid) return;

  const currentStatus = st.list[st.index];
  const key = chatKey(myUid, authorUid);
  const msgRef = push(ref(db, `chats/${key}`));

  statusReplySendBtn.disabled = true;

  try {
    await set(msgRef, {
      senderUid: myUid,
      senderName: myIdDisplay.textContent,
      text: text,
      ts: Date.now(),
      read: false,
      readBy: { [myUid]: true },
      statusReply: {
        statusId: currentStatus.id,
        statusText: currentStatus.text || "",
        statusImage: currentStatus.image || null,
        statusBg: currentStatus.bg || "#00a884",
        authorUid: authorUid,
        authorName: (nicknames[authorUid] || contactData[authorUid]?.displayName || contactData[authorUid]?.id || "User"),
      }
    });

    const receiverUnreadRef = ref(db, `unread/${authorUid}/${myUid}`);
    const snap = await get(receiverUnreadRef);
    await set(receiverUnreadRef, (snap.val() || 0) + 1);

    statusReplyInput.value = "";
    showToast("Status", "Reply sent to " + (contactData[authorUid]?.id || "contact"));
    closeStatusViewer();
    openChat(authorUid, contactData[authorUid]?.id || authorUid, false);
  } catch (err) {
    alert("Failed to send reply: " + err.message);
  } finally {
    statusReplySendBtn.disabled = false;
  }
}

const _origRenderMessages = window.renderMessages || renderMessages;
window.renderMessages = function patchedRenderMessages(msgs, isSearchResult) {
  _origRenderMessages(msgs, isSearchResult);

  if (!Array.isArray(msgs)) return;
  msgs.forEach(m => {
    if (!m || !m.statusReply) return;
    const wrapper = document.querySelector(`[data-msgid="${m.id}"]`);
    if (!wrapper) return;
    const bubble = wrapper.querySelector(".bubble");
    if (!bubble || bubble.querySelector(".status-reply-quote")) return;

    const sr = m.statusReply;
    const quote = document.createElement("div");
    quote.className = "status-reply-quote";
    quote.innerHTML = `
      ${sr.statusImage
        ? `<img src="${sr.statusImage}" />`
        : ""}
      <div class="status-quote-txt">
        <span class="status-quote-label"><i class="fas fa-circle-notch"></i> Status reply</span>
        ${escapeHtml(sr.statusText || "(media status)")}
      </div>
    `;
    bubble.insertBefore(quote, bubble.firstChild);
  });
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    const wait = setInterval(() => {
      if (window.myUid || (typeof myUid !== "undefined" && myUid)) {
        clearInterval(wait);
        watchMyMutedStatuses();
      }
    }, 300);
    setTimeout(() => clearInterval(wait), 8000);
  } else {
    if (myStatusMuteUnsub) { myStatusMuteUnsub(); myStatusMuteUnsub = null; }
    mutedStatuses = {};
  }
});

document.addEventListener("click", (e) => {
  if (statusMuteMenuEl && !statusMuteMenuEl.contains(e.target)) {
    statusMuteMenuEl.remove();
    statusMuteMenuEl = null;
  }
});

// ==================================================================
// ============ SIDEBAR TABS: CHATS / STATUS =======================
// ==================================================================

const chatsView = document.getElementById("chatsView");
const statusViewEl = document.getElementById("statusView");
const tabViewChats = document.getElementById("tabViewChats");
const tabViewStatus = document.getElementById("tabViewStatus");
const statusTabBadge = document.getElementById("statusTabBadge");

const myStatusRow = document.getElementById("myStatusRow");
const recentUpdatesList = document.getElementById("recentUpdatesList");
const viewedUpdatesList = document.getElementById("viewedUpdatesList");
const mutedUpdatesSection = document.getElementById("mutedUpdatesSection");
const mutedUpdatesList = document.getElementById("mutedUpdatesList");

let currentSidebarView = "chats";

function switchSidebarView(view) {
  currentSidebarView = view;
  if (view === "status") {
    chatsView.style.display = "none";
    statusViewEl.style.display = "flex";
    tabViewChats.classList.remove("active");
    tabViewStatus.classList.add("active");
    renderStatusPage();
  } else {
    chatsView.style.display = "flex";
    statusViewEl.style.display = "none";
    tabViewStatus.classList.remove("active");
    tabViewChats.classList.add("active");
  }
}

if (tabViewChats)  tabViewChats.addEventListener("click",  () => switchSidebarView("chats"));
if (tabViewStatus) tabViewStatus.addEventListener("click", () => switchSidebarView("status"));

function formatStatusTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

function renderStatusPage() {
  if (!myStatusRow || !recentUpdatesList || !viewedUpdatesList) return;

  const myStatuses = currentStatusesByUser[myUid] || {};
  const myList = Object.values(myStatuses).sort((a, b) => a.ts - b.ts);
  const hasMyStatus = myList.length > 0;

  const myAvatarSrc = window.currentProfilePic || null;
  const myDisplayName = (myIdDisplay?.textContent) || "Me";

  myStatusRow.innerHTML = `
    <div class="my-status-avatar-wrap">
      <div class="my-status-avatar">
        ${myAvatarSrc
          ? `<img src="${myAvatarSrc}" />`
          : escapeHtml(myDisplayName.substring(0, 2).toUpperCase())}
      </div>
      ${!hasMyStatus
        ? `<div class="my-status-add"><i class="fas fa-plus"></i></div>`
        : ""}
    </div>
    <div class="my-status-text">
      <div class="my-status-title">My Status</div>
      <div class="my-status-sub">
        ${hasMyStatus
          ? `${myList.length} update${myList.length > 1 ? "s" : ""} · ${formatStatusTime(myList[myList.length-1].ts)}`
          : "Tap to add status update"}
      </div>
    </div>
  `;
  myStatusRow.onclick = () => {
    if (hasMyStatus) openStatusViewer(myUid);
    else postStatusBtn.click();
  };

  const otherUids = Object.keys(currentStatusesByUser).filter(uid => uid !== myUid);

  const recent = [];
  const viewed = [];
  const muted = [];

  otherUids.forEach(uid => {
    const statusesObj = currentStatusesByUser[uid];
    if (!statusesObj) return;
    const list = Object.values(statusesObj).sort((a, b) => a.ts - b.ts);
    if (!list.length) return;
    const latest = list[list.length - 1];
    const unviewed = list.some(s => !s.viewers || !s.viewers[myUid]);
    const isMuted = isStatusMuted(uid);

    const item = { uid, list, latest, unviewed };
    if (isMuted) muted.push(item);
    else if (unviewed) recent.push(item);
    else viewed.push(item);
  });

  const sortDesc = (a, b) => b.latest.ts - a.latest.ts;
  recent.sort(sortDesc);
  viewed.sort(sortDesc);
  muted.sort(sortDesc);

  function buildRow({ uid, latest, unviewed }, isMuted) {
    const data = contactData[uid] || {};
    const dispName = nicknames[uid] || data.displayName || data.id || "User";
    const av = data.avatar;

    const row = document.createElement("div");
    row.className = "status-list-item";
    row.innerHTML = `
      <div class="status-list-ring ${unviewed ? "unviewed" : "viewed"}">
        <div class="status-list-inner">
          ${av
            ? `<img src="${av}" />`
            : escapeHtml(dispName.substring(0, 2).toUpperCase())}
        </div>
      </div>
      <div class="status-list-info">
        <div class="status-list-name">
          ${escapeHtml(dispName)}
          ${isMuted ? '<i class="fas fa-bell-slash" style="font-size:10px; color:#ff4d4d; margin-left:6px;"></i>' : ""}
        </div>
        <div class="status-list-time">${formatStatusTime(latest.ts)}</div>
      </div>
    `;
    row.onclick = () => openStatusViewer(uid);
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showStatusMuteMenu(e.pageX, e.pageY, uid);
    });

    let pressTimer = null;
    row.addEventListener("touchstart", (ev) => {
      pressTimer = setTimeout(() => {
        const t = ev.touches[0];
        showStatusMuteMenu(t.pageX, t.pageY, uid);
      }, 550);
    }, { passive: true });
    row.addEventListener("touchend", () => clearTimeout(pressTimer));
    row.addEventListener("touchmove", () => clearTimeout(pressTimer));

    return row;
  }

  recentUpdatesList.innerHTML = "";
  viewedUpdatesList.innerHTML = "";
  mutedUpdatesList.innerHTML = "";

  recent.forEach(item => recentUpdatesList.appendChild(buildRow(item, false)));
  viewed.forEach(item => viewedUpdatesList.appendChild(buildRow(item, false)));
  muted.forEach(item => mutedUpdatesList.appendChild(buildRow(item, true)));

  mutedUpdatesSection.style.display = muted.length ? "block" : "none";

  const unviewedCount = recent.length;
  if (statusTabBadge) {
    if (unviewedCount > 0) {
      statusTabBadge.style.display = "inline-block";
      statusTabBadge.textContent = unviewedCount;
    } else {
      statusTabBadge.style.display = "none";
    }
  }
}

window.renderStatusBar = function renderStatusBar() {
  if (currentSidebarView === "status") {
    renderStatusPage();
  } else {
    const otherUids = Object.keys(currentStatusesByUser).filter(uid => uid !== myUid);
    let unviewedCount = 0;
    otherUids.forEach(uid => {
      if (isStatusMuted(uid)) return;
      const statusesObj = currentStatusesByUser[uid];
      if (!statusesObj) return;
      const list = Object.values(statusesObj);
      if (list.some(s => !s.viewers || !s.viewers[myUid])) unviewedCount++;
    });
    if (statusTabBadge) {
      if (unviewedCount > 0) {
        statusTabBadge.style.display = "inline-block";
        statusTabBadge.textContent = unviewedCount;
      } else {
        statusTabBadge.style.display = "none";
      }
    }
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    const wait = setInterval(() => {
      if (window.myUid || (typeof myUid !== "undefined" && myUid)) {
        clearInterval(wait);
        if (currentSidebarView === "status") renderStatusPage();
      }
    }, 300);
    setTimeout(() => clearInterval(wait), 8000);
  }
});

// ==================================================================
// ============ NEW: Mute from Chat Header =========================
// ==================================================================
if (muteStatusHeaderBtn) {
  muteStatusHeaderBtn.addEventListener("click", async () => {
    if (!activeChatUid || isGroupChat) return alert("Mute status is only available for 1-on-1 chats.");
    
    if (isStatusMuted(activeChatUid)) {
      await remove(ref(db, `users/${myUid}/mutedStatuses/${activeChatUid}`));
      showToast("Status", "Status unmuted.");
    } else {
      await set(ref(db, `users/${myUid}/mutedStatuses/${activeChatUid}`), Date.now() + 24 * 60 * 60 * 1000);
      showToast("Status", "Status muted for 24h.");
    }
    
    const isMuted = isStatusMuted(activeChatUid);
    muteStatusHeaderBtn.innerHTML = isMuted 
      ? '<i class="fas fa-bell"></i> Unmute Status' 
      : '<i class="fas fa-bell-slash"></i> Mute Status';
  });
}

const originalOpenChat = window.openChat;
window.openChat = function(uid, id, isGroup) {
  originalOpenChat(uid, id, isGroup);
  
  if (muteStatusHeaderBtn) {
    if (isGroup) {
      muteStatusHeaderBtn.style.display = "none";
    } else {
      muteStatusHeaderBtn.style.display = "flex";
      const isMuted = isStatusMuted(uid);
      muteStatusHeaderBtn.innerHTML = isMuted 
        ? '<i class="fas fa-bell"></i> Unmute Status' 
        : '<i class="fas fa-bell-slash"></i> Mute Status';
    }
  }
};

// ==================================================================
// ============ NEW: Reply with Photo ===============================
// ==================================================================
let pendingReplyImage = null;

if (statusReplyImgBtn) {
  statusReplyImgBtn.addEventListener("click", () => {
    if (statusReplyImageInput) statusReplyImageInput.click();
  });
}

if (statusReplyImageInput) {
  statusReplyImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 700000) {
      alert("Image too large. Please choose under 700KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      pendingReplyImage = ev.target.result;
      statusReplyImgPreviewThumb.src = pendingReplyImage;
      statusReplyImgPreview.style.display = "flex";
    };
    reader.readAsDataURL(file);
  });
}

if (statusReplyImgRemoveBtn) {
  statusReplyImgRemoveBtn.addEventListener("click", () => {
    pendingReplyImage = null;
    statusReplyImgPreview.style.display = "none";
    statusReplyImageInput.value = "";
  });
}

const originalSendStatusReply = sendStatusReply;
window.sendStatusReply = async function() {
  if (!statusViewerState) return;
  
  const text = statusReplyInput.value.trim();
  const hasImage = !!pendingReplyImage;
  
  if (!text && !hasImage) return;

  const st = statusViewerState;
  const authorUid = st.userUid;
  if (authorUid === myUid) return;

  const currentStatus = st.list[st.index];
  const key = chatKey(myUid, authorUid);
  const msgRef = push(ref(db, `chats/${key}`));

  statusReplySendBtn.disabled = true;

  try {
    const msgPayload = {
      senderUid: myUid,
      senderName: myIdDisplay.textContent,
      text: text || (hasImage ? "📷 Photo" : ""),
      ts: Date.now(),
      read: false,
      readBy: { [myUid]: true },
      statusReply: {
        statusId: currentStatus.id,
        statusText: currentStatus.text || "",
        statusImage: currentStatus.image || null,
        statusBg: currentStatus.bg || "#00a884",
        authorUid: authorUid,
        authorName: (nicknames[authorUid] || contactData[authorUid]?.displayName || contactData[authorUid]?.id || "User"),
      }
    };
    
    if (hasImage) {
      msgPayload.imageUrl = pendingReplyImage;
    }

    await set(msgRef, msgPayload);

    const receiverUnreadRef = ref(db, `unread/${authorUid}/${myUid}`);
    const snap = await get(receiverUnreadRef);
    await set(receiverUnreadRef, (snap.val() || 0) + 1);

    statusReplyInput.value = "";
    pendingReplyImage = null;
    statusReplyImgPreview.style.display = "none";
    showToast("Status", "Reply sent to " + (contactData[authorUid]?.id || "contact"));
    closeStatusViewer();
    openChat(authorUid, contactData[authorUid]?.id || authorUid, false);
  } catch (err) {
    alert("Failed to send reply: " + err.message);
  } finally {
    statusReplySendBtn.disabled = false;
  }
};

if (statusReplySendBtn) {
  statusReplySendBtn.removeEventListener("click", sendStatusReply);
  statusReplySendBtn.addEventListener("click", window.sendStatusReply);
}

// ==================================================================
// ============ NEW: "X seconds ago" on Status Ring ================
// ==================================================================

const originalRenderStatusPage = renderStatusPage;
window.renderStatusPage = function() {
  originalRenderStatusPage();
  
  const recent = document.getElementById("recentUpdatesList");
  const viewed = document.getElementById("viewedUpdatesList");
  const muted = document.getElementById("mutedUpdatesList");
  
  [recent, viewed, muted].forEach(list => {
    if (!list) return;
    const items = list.querySelectorAll(".status-list-item");
    items.forEach(item => {
      const nameEl = item.querySelector(".status-list-name");
      const timeEl = item.querySelector(".status-list-time");
      if (nameEl && timeEl) {
        nameEl.textContent = timeEl.textContent;
        timeEl.style.display = "none";
      }
    });
  });
  
  const barItems = document.querySelectorAll(".status-item");
  barItems.forEach(item => {
    const nameEl = item.querySelector(".status-item-name");
    if (nameEl && item.dataset.statusUid) {
      const uid = item.dataset.statusUid;
      const statuses = currentStatusesByUser[uid];
      if (statuses) {
        const latest = Object.values(statuses).sort((a, b) => b.ts - a.ts)[0];
        if (latest) {
          nameEl.textContent = formatStatusTime(latest.ts);
        }
      }
    }
  });
};

const originalOverride = window.renderStatusBar;
window.renderStatusBar = function() {
  if (currentSidebarView === "status") {
    window.renderStatusPage();
  } else {
    originalOverride();
  }
};

// ==================================================================
// ============ NEW: Group Statuses ================================
// ==================================================================

const postStatusModalContent = document.querySelector("#postStatusModal .modal-content");
if (postStatusModalContent) {
  const groupToggle = document.createElement("div");
  groupToggle.id = "statusGroupToggle";
  groupToggle.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:12px; padding:8px 12px; background:#f0f2f5; border-radius:8px; cursor:pointer;";
  groupToggle.innerHTML = `
    <input type="checkbox" id="statusToGroupCheckbox" style="cursor:pointer;" />
    <label for="statusToGroupCheckbox" style="cursor:pointer; font-size:13px; color:#111b21;">Post to Group (if in group chat)</label>
  `;
  const modalActions = postStatusModalContent.querySelector(".modal-actions");
  if (modalActions) {
    postStatusModalContent.insertBefore(groupToggle, modalActions);
  }
}

if (publishStatusBtn) {
  const originalPublish = publishStatusBtn.cloneNode(true);
  publishStatusBtn.parentNode.replaceChild(originalPublish, publishStatusBtn);
  
  originalPublish.addEventListener("click", async () => {
    if (!myUid) return;
    const text = statusTextInput.value.trim();
    if (!text && !pendingStatusImage) {
      alert("Write something or add an image first.");
      return;
    }
    
    const toGroup = document.getElementById("statusToGroupCheckbox")?.checked;
    const groupId = toGroup && activeChatUid && isGroupChat ? activeChatUid : null;
    
    originalPublish.disabled = true;
    originalPublish.textContent = "Publishing...";
    try {
      const statusId = push(ref(db, groupId ? `statuses/${groupId}` : `statuses/${myUid}`)).key;
      const payload = {
        text: text || "",
        image: pendingStatusImage || null,
        bg: pendingStatusBg,
        ts: Date.now(),
        serverTs: serverTimestamp(),
        viewers: {},
        isGroupStatus: !!groupId,
        groupId: groupId || null,
        authorUid: myUid,
        authorName: myIdDisplay.textContent,
      };
      await set(ref(db, groupId ? `statuses/${groupId}/${statusId}` : `statuses/${myUid}/${statusId}`), payload);

      await set(ref(db, groupId ? `statuses/${groupId}/${statusId}/viewers/${myUid}` : `statuses/${myUid}/${statusId}/viewers/${myUid}`), true);

      postStatusModal.style.display = "none";
      showToast("Status", groupId ? "Group status is live for 24 hours." : "Your status is live for 24 hours.");
    } catch (err) {
      alert("Failed to publish: " + err.message);
    } finally {
      originalPublish.disabled = false;
      originalPublish.textContent = "Publish Status";
    }
  });
}

function watchAllStatusesUpdated() {
  if (statusUnsub) statusUnsub();
  statusUnsub = onValue(ref(db, "statuses"), (snap) => {
    const all = snap.val() || {};
    const now = Date.now();
    const filtered = {};

    Object.entries(all).forEach(([uid, statusesObj]) => {
      if (!statusesObj) return;
      
      const isGroup = uid.startsWith("GROUP_");
      if (isGroup) {
        if (!contacts.includes(uid)) return;
      }
      
      const fresh = {};
      Object.entries(statusesObj).forEach(([sid, s]) => {
        if (!s || !s.ts) return;
        if (now - s.ts < STATUS_TTL_MS) fresh[sid] = s;
      });
      if (Object.keys(fresh).length) filtered[uid] = fresh;
    });

    currentStatusesByUser = filtered;
    renderStatusBar();
  });
}

watchAllStatuses = watchAllStatusesUpdated;

onAuthStateChanged(auth, (user) => {
  if (user) {
    const wait = setInterval(() => {
      if (window.myUid || (typeof myUid !== "undefined" && myUid)) {
        clearInterval(wait);
        watchAllStatuses();
      }
    }, 300);
    setTimeout(() => clearInterval(wait), 8000);
  }
});

const originalRenderPage = window.renderStatusPage;
window.renderStatusPage = function() {
  originalRenderPage();
  
  const recent = document.getElementById("recentUpdatesList");
  if (!recent) return;
  
  Object.entries(currentStatusesByUser).forEach(([uid, statusesObj]) => {
    if (!uid.startsWith("GROUP_")) return;
    if (!contacts.includes(uid)) return;
    
    const list = Object.values(statusesObj).sort((a, b) => a.ts - b.ts);
    if (!list.length) return;
    const latest = list[list.length - 1];
    const unviewed = list.some(s => !s.viewers || !s.viewers[myUid]);
    
    const existing = recent.querySelector(`[data-group-uid="${uid}"]`);
    if (existing) return;
    
    const groupData = contactData[uid] || { id: "Group" };
    const dispName = groupData.id || "Group";
    const av = null;
    
    const row = document.createElement("div");
    row.className = "status-list-item";
    row.dataset.groupUid = uid;
    row.innerHTML = `
      <div class="status-list-ring ${unviewed ? "unviewed" : "viewed"}">
        <div class="status-list-inner">
          <i class="fas fa-users" style="font-size:18px;"></i>
        </div>
      </div>
      <div class="status-list-info">
        <div class="status-list-name">
          <i class="fas fa-users" style="font-size:10px; color:#00a884; margin-right:4px;"></i>
          ${escapeHtml(dispName)} (Group)
        </div>
        <div class="status-list-time">${formatStatusTime(latest.ts)}</div>
      </div>
    `;
    row.onclick = () => openStatusViewer(uid);
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showStatusMuteMenu(e.pageX, e.pageY, uid);
    });
    
    recent.insertBefore(row, recent.firstChild);
  });
};

setTimeout(() => {
  if (window.renderStatusPage) {
    const oldRender = window.renderStatusPage;
    window.renderStatusPage = function() {
      oldRender();
      const recent = document.getElementById("recentUpdatesList");
      const viewed = document.getElementById("viewedUpdatesList");
      const muted = document.getElementById("mutedUpdatesList");
      
      [recent, viewed, muted].forEach(list => {
        if (!list) return;
        const items = list.querySelectorAll(".status-list-item");
        items.forEach(item => {
          const nameEl = item.querySelector(".status-list-name");
          const timeEl = item.querySelector(".status-list-time");
          if (nameEl && timeEl) {
            if (item.dataset.groupUid) {
              nameEl.textContent = nameEl.textContent.replace(/\d+ (min|hr|d) ago|Just now/, "").trim();
              if (!nameEl.textContent) nameEl.textContent = "Group Status";
              timeEl.style.display = "block";
            } else {
              nameEl.textContent = timeEl.textContent;
              timeEl.style.display = "none";
            }
          }
        });
      });
    };
  }
}, 500);

// ==================================================================
// ============ EXTENDED FEATURES PACK ==============================
// ==================================================================

let pendingForwardMsg = null;
let forwardSelected = new Set();
let pendingScheduleText = "";

const forwardModal = document.getElementById("forwardModal");
const forwardSearchInput = document.getElementById("forwardSearchInput");
const forwardContactList = document.getElementById("forwardContactList");
const confirmForwardBtn = document.getElementById("confirmForwardBtn");
const closeForwardBtn = document.getElementById("closeForwardBtn");

window.openForwardModal = function(msgObj) {
  if (!msgObj) return;
  pendingForwardMsg = msgObj;
  forwardSelected.clear();
  forwardSearchInput.value = "";
  renderForwardContacts();
  forwardModal.style.display = "flex";
};

function renderForwardContacts() {
  if (!forwardContactList) return;
  const term = (forwardSearchInput.value || "").toLowerCase();
  forwardContactList.innerHTML = "";

  const filtered = contacts.filter(uid => {
    const d = contactData[uid] || {};
    const name = nicknames[uid] || d.displayName || d.id || "User";
    return name.toLowerCase().includes(term);
  });

  if (!filtered.length) {
    forwardContactList.innerHTML = `<div style="text-align:center; padding:16px; color:#7f9aaf; font-size:13px;">No contacts found</div>`;
    return;
  }

  filtered.forEach(uid => {
    const d = contactData[uid] || {};
    const name = nicknames[uid] || d.displayName || d.id || "User";
    const av = d.avatar;
    const isSelected = forwardSelected.has(uid);

    const el = document.createElement("div");
    el.className = "forward-item" + (isSelected ? " selected" : "");
    el.innerHTML = `
      <div class="fwd-check">${isSelected ? '<i class="fas fa-check"></i>' : ""}</div>
      <div class="fwd-avatar">
        ${av ? `<img src="${av}" />` : escapeHtml(name.substring(0,2).toUpperCase())}
      </div>
      <div class="fwd-name">${escapeHtml(name)}</div>
    `;
    el.onclick = () => {
      if (forwardSelected.has(uid)) forwardSelected.delete(uid);
      else forwardSelected.add(uid);
      renderForwardContacts();
    };
    forwardContactList.appendChild(el);
  });
}

if (forwardSearchInput) forwardSearchInput.addEventListener("input", renderForwardContacts);
if (closeForwardBtn) closeForwardBtn.addEventListener("click", () => forwardModal.style.display = "none");

if (confirmForwardBtn) {
  confirmForwardBtn.addEventListener("click", async () => {
    if (!pendingForwardMsg || forwardSelected.size === 0) {
      alert("Select at least one chat.");
      return;
    }
    confirmForwardBtn.disabled = true;
    confirmForwardBtn.textContent = "Forwarding...";

    try {
      const m = pendingForwardMsg;
      for (const targetUid of forwardSelected) {
        const key = chatKey(myUid, targetUid);
        const payload = {
          senderUid: myUid,
          senderName: myIdDisplay.textContent,
          text: m.text || "",
          ts: Date.now(),
          read: false,
          forwarded: true,
          readBy: { [myUid]: true }
        };
        if (m.imageUrl) payload.imageUrl = m.imageUrl;
        if (m.audioUrl) payload.audioUrl = m.audioUrl;
        if (m.poll) payload.poll = m.poll;
        if (m.contactCard) payload.contactCard = m.contactCard;
        if (m.location) payload.location = m.location;

        await push(ref(db, `chats/${key}`), payload);

        const uref = ref(db, `unread/${targetUid}/${myUid}`);
        const usnap = await get(uref);
        await set(uref, (usnap.val() || 0) + 1);
      }
      showToast("Forward", `Forwarded to ${forwardSelected.size} chat(s)`);
      forwardModal.style.display = "none";
    } catch (err) {
      alert("Forward failed: " + err.message);
    } finally {
      confirmForwardBtn.disabled = false;
      confirmForwardBtn.textContent = "Forward";
    }
  });
}

const _origPatchedRM = window.renderMessages;
window.renderMessages = function(msgs, isSearchResult) {
  _origPatchedRM(msgs, isSearchResult);
  document.querySelectorAll(".context-menu button").forEach(btn => {
    if (btn.innerHTML.includes("Forward") && !btn.dataset.fwdBound) {
      btn.dataset.fwdBound = "1";
      const msgId = btn.closest(".context-menu")?.dataset?.msgid;
    }
  });
};

const scheduleModal = document.getElementById("scheduleModal");
const schedulePreview = document.getElementById("schedulePreview");
const scheduleTimeInput = document.getElementById("scheduleTimeInput");
const confirmScheduleBtn = document.getElementById("confirmScheduleBtn");
const closeScheduleBtn = document.getElementById("closeScheduleBtn");
const scheduleMsgBtn = document.getElementById("scheduleMsgBtn");

window.openScheduleModal = function() {
  if (!activeChatUid) return;
  const text = messageInput.value.trim();
  if (!text) {
    alert("Type a message first, then tap Schedule.");
    return;
  }
  pendingScheduleText = text;
  schedulePreview.textContent = text;
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setSeconds(0);
  const pad = n => String(n).padStart(2, "0");
  scheduleTimeInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  scheduleModal.style.display = "flex";
};

if (scheduleMsgBtn) scheduleMsgBtn.addEventListener("click", openScheduleModal);
if (closeScheduleBtn) closeScheduleBtn.addEventListener("click", () => scheduleModal.style.display = "none");

document.querySelectorAll(".schedule-quick").forEach(btn => {
  btn.addEventListener("click", () => {
    const min = parseInt(btn.dataset.min);
    const d = new Date(Date.now() + min * 60 * 1000);
    d.setSeconds(0);
    const pad = n => String(n).padStart(2, "0");
    scheduleTimeInput.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
});

if (confirmScheduleBtn) {
  confirmScheduleBtn.addEventListener("click", async () => {
    if (!scheduleTimeInput.value) { alert("Pick a time."); return; }
    const when = new Date(scheduleTimeInput.value).getTime();
    if (when <= Date.now()) { alert("Pick a future time."); return; }
    if (!activeChatUid || !pendingScheduleText) return;

    try {
      const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
      const msgRef = push(ref(db, `scheduled/${myUid}`));
      await set(msgRef, {
        key,
        text: pendingScheduleText,
        ts: when,
        senderUid: myUid,
        senderName: myIdDisplay.textContent,
        isGroup: isGroupChat,
        receiverUid: isGroupChat ? null : activeChatUid,
        createdAt: Date.now(),
      });
      messageInput.value = "";
      delete messageDrafts[activeChatUid];
      localStorage.removeItem(`chatbuzz_draft_${myUid}_${activeChatUid}`);
      scheduleModal.style.display = "none";
      showToast("Scheduled", `Will send at ${new Date(when).toLocaleTimeString()}`);
    } catch (err) {
      alert("Schedule failed: " + err.message);
    }
  });
}

function startScheduledMessageWorker() {
  setInterval(async () => {
    if (!myUid) return;
    try {
      const snap = await get(ref(db, `scheduled/${myUid}`));
      const all = snap.val() || {};
      const now = Date.now();
      for (const [id, s] of Object.entries(all)) {
        if (!s.ts || s.ts > now) continue;
        const msgRef = push(ref(db, `chats/${s.key}`));
        const payload = {
          senderUid: s.senderUid,
          senderName: s.senderName,
          text: s.text,
          ts: Date.now(),
          read: false,
          readBy: { [myUid]: true },
          scheduled: true,
        };
        await set(msgRef, payload);
        if (!s.isGroup && s.receiverUid) {
          const uref = ref(db, `unread/${s.receiverUid}/${myUid}`);
          const u = await get(uref);
          await set(uref, (u.val() || 0) + 1);
        }
        await remove(ref(db, `scheduled/${myUid}/${id}`));
        showToast("Scheduled", "Message sent");
      }
    } catch (e) { /* silent */ }
  }, 30000);
}
onAuthStateChanged(auth, (u) => { if (u) setTimeout(startScheduledMessageWorker, 3000); });

const notesPanel = document.getElementById("notesPanel");
const notesList = document.getElementById("notesList");
const newNoteInput = document.getElementById("newNoteInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const closeNotesBtn = document.getElementById("closeNotesBtn");
const openNotesBtn = document.getElementById("openNotesBtn");

let chatNotes = {};
let unsubNotes = null;

function listenToNotes(chatUid) {
  if (unsubNotes) unsubNotes();
  unsubNotes = onValue(ref(db, `users/${myUid}/chatNotes/${chatUid}`), (snap) => {
    chatNotes[chatUid] = snap.val() || {};
    renderNotes(chatUid);
  });
}

function renderNotes(chatUid) {
  if (!notesList) return;
  notesList.innerHTML = "";
  const notes = chatNotes[chatUid] || {};
  const entries = Object.entries(notes).sort((a, b) => (a[1].ts||0) - (b[1].ts||0));
  if (!entries.length) {
    notesList.innerHTML = `<div style="text-align:center; padding:12px; color:#7f9aaf; font-size:12px;">No notes yet</div>`;
    return;
  }
  entries.forEach(([id, n]) => {
    const el = document.createElement("div");
    el.className = "note-item";
    el.innerHTML = `<span>${escapeHtml(n.text)}</span><button data-nid="${id}"><i class="fas fa-times"></i></button>`;
    el.querySelector("button").onclick = async () => {
      await remove(ref(db, `users/${myUid}/chatNotes/${chatUid}/${id}`));
    };
    notesList.appendChild(el);
  });
}

if (openNotesBtn) {
  openNotesBtn.addEventListener("click", () => {
    if (!activeChatUid) return;
    listenToNotes(activeChatUid);
    notesPanel.style.display = "block";
  });
}
if (closeNotesBtn) closeNotesBtn.addEventListener("click", () => notesPanel.style.display = "none");

if (addNoteBtn) {
  addNoteBtn.addEventListener("click", async () => {
    if (!activeChatUid) return;
    const text = newNoteInput.value.trim();
    if (!text) return;
    const nref = push(ref(db, `users/${myUid}/chatNotes/${activeChatUid}`));
    await set(nref, { text, ts: Date.now() });
    newNoteInput.value = "";
  });
}

const _origRenderMessagesWave = window.renderMessages;
window.renderMessages = function(msgs, isSearchResult) {
  _origRenderMessagesWave(msgs, isSearchResult);

  document.querySelectorAll("audio.audio-player").forEach(audioEl => {
    const parent = audioEl.parentElement;
    if (!parent || parent.querySelector(".voice-note-box")) return;

    const wrap = document.createElement("div");
    wrap.className = "voice-note-box";
    wrap.innerHTML = `
      <button class="voice-play-btn"><i class="fas fa-play"></i></button>
      <div class="voice-wave"><div class="voice-wave-fill"></div></div>
      <div class="voice-duration">0:00</div>
    `;
    parent.insertBefore(wrap, audioEl);
    audioEl.style.display = "none";

    const playBtn = wrap.querySelector(".voice-play-btn");
    const fill = wrap.querySelector(".voice-wave-fill");
    const dur = wrap.querySelector(".voice-duration");

    const fmt = (s) => {
      if (!isFinite(s)) return "0:00";
      const m = Math.floor(s/60), sec = Math.floor(s%60);
      return `${m}:${String(sec).padStart(2,"0")}`;
    };

    audioEl.addEventListener("loadedmetadata", () => { dur.textContent = fmt(audioEl.duration); });
    audioEl.addEventListener("timeupdate", () => {
      if (audioEl.duration) fill.style.width = (audioEl.currentTime / audioEl.duration * 100) + "%";
      dur.textContent = fmt(audioEl.currentTime);
    });
    playBtn.addEventListener("click", () => {
      if (audioEl.paused) { audioEl.play(); playBtn.innerHTML = '<i class="fas fa-pause"></i>'; }
      else { audioEl.pause(); playBtn.innerHTML = '<i class="fas fa-play"></i>'; }
    });
    audioEl.addEventListener("ended", () => { playBtn.innerHTML = '<i class="fas fa-play"></i>'; fill.style.width = "0%"; });

    wrap.querySelector(".voice-wave").addEventListener("click", (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (audioEl.duration) audioEl.currentTime = pct * audioEl.duration;
    });
  });
};

const stickerTray = document.getElementById("stickerTray");
const stickerGrid = document.getElementById("stickerGrid");
const closeStickerTray = document.getElementById("closeStickerTray");
const openStickerBtn = document.getElementById("openStickerBtn");

const STICKER_PACK = [
  "😀","😂","🥰","😎","🤔","🙌","❤️","🔥",
  "🎉","👍","✨","💯","🥳","😴","🤩","😇",
  "🍕","☕","🎈","🚀","🐱","🦄","🌸","⭐",
];

function renderStickerGrid() {
  if (!stickerGrid) return;
  stickerGrid.innerHTML = "";
  STICKER_PACK.forEach(s => {
    const t = document.createElement("div");
    t.className = "sticker-tile";
    t.textContent = s;
    t.onclick = async () => {
      if (!activeChatUid) return;
      const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
      await push(ref(db, `chats/${key}`), {
        senderUid: myUid,
        senderName: myIdDisplay.textContent,
        text: s,
        sticker: s,
        ts: Date.now(),
        read: false,
        readBy: { [myUid]: true }
      });
      if (!isGroupChat) {
        const uref = ref(db, `unread/${activeChatUid}/${myUid}`);
        const u = await get(uref);
        await set(uref, (u.val() || 0) + 1);
      }
      stickerTray.style.display = "none";
    };
    stickerGrid.appendChild(t);
  });
}

if (openStickerBtn) {
  openStickerBtn.addEventListener("click", () => {
    if (!activeChatUid) return;
    renderStickerGrid();
    stickerTray.style.display = "block";
  });
}
if (closeStickerTray) closeStickerTray.addEventListener("click", () => stickerTray.style.display = "none");

const _origRenderStickers = window.renderMessages;
window.renderMessages = function(msgs, isSearchResult) {
  _origRenderMessagesStickers(msgs, isSearchResult);
  document.querySelectorAll(".bubble").forEach(bubble => {
    const txt = bubble.textContent.trim();
    if (STICKER_PACK.includes(txt) && txt.length <= 2) {
      bubble.style.fontSize = "40px";
      bubble.style.background = "transparent";
      bubble.style.boxShadow = "none";
    }
  });
};
const _origRenderMessagesStickers = window.renderMessages;

let sendHoldTimer = null;
let sendWasHeld = false;

const silentIndicator = document.createElement("div");
silentIndicator.className = "send-silent-indicator";
silentIndicator.innerHTML = '<i class="fas fa-bell-slash"></i> Send silently';
sendBtn.parentElement.style.position = "relative";
sendBtn.parentElement.appendChild(silentIndicator);

function beginHold() {
  sendWasHeld = false;
  silentIndicator.classList.add("show");
  sendHoldTimer = setTimeout(() => {
    sendWasHeld = true;
    silentIndicator.innerHTML = '<i class="fas fa-bell-slash"></i> Silent mode ready';
  }, 600);
}
function endHold() {
  silentIndicator.classList.remove("show");
  silentIndicator.innerHTML = '<i class="fas fa-bell-slash"></i> Send silently';
  clearTimeout(sendHoldTimer);
}

sendBtn.addEventListener("mousedown", beginHold);
sendBtn.addEventListener("touchstart", beginHold, { passive: true });
sendBtn.addEventListener("mouseup", endHold);
sendBtn.addEventListener("mouseleave", endHold);
sendBtn.addEventListener("touchend", endHold);

const _origSendMessage = sendMessage;
window.sendMessage = async function() {
  if (!activeChatUid) return;
  const text = messageInput.value.trim();
  if (!text) return;

  const silent = sendWasHeld;
  sendWasHeld = false;
  if (silent) {
    messageInput.value = "";
    delete messageDrafts[activeChatUid];
    localStorage.removeItem(`chatbuzz_draft_${myUid}_${activeChatUid}`);

    const key = isGroupChat ? chatKey(activeChatUid, activeChatUid) : chatKey(myUid, activeChatUid);
    const payload = {
      senderUid: myUid,
      senderName: myIdDisplay.textContent,
      text,
      ts: Date.now(),
      read: false,
      silent: true,
      readBy: { [myUid]: true }
    };
    await push(ref(db, `chats/${key}`), payload);
    if (!isGroupChat) {
      const uref = ref(db, `unread/${activeChatUid}/${myUid}`);
      const u = await get(uref);
      await set(uref, (u.val() || 0) + 1);
    }
    showToast("Silent", "Message sent without sound");
    return;
  }
  return _origSendMessage();
};

sendBtn.addEventListener("click", window.sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") { e.preventDefault(); window.sendMessage(); }
});

sendBtn.addEventListener("touchstart", () => {
  sendHoldTimer = setTimeout(() => { sendWasHeld = true; }, 600);
}, { passive: true });
sendBtn.addEventListener("touchend", () => {
  clearTimeout(sendHoldTimer);
}, { passive: true });

const _origOpenChatExt = window.openChat;
window.openChat = function(uid, id, isGroup) {
  if (notesPanel) notesPanel.style.display = "none";
  if (stickerTray) stickerTray.style.display = "none";
  if (forwardModal) forwardModal.style.display = "none";
  if (scheduleModal) scheduleModal.style.display = "none";
  return _origOpenChatExt(uid, id, isGroup);
};

const _origContextHandler = document.addEventListener;
document.addEventListener("contextmenu", (e) => {
  const btn = e.target.closest(".context-menu button");
  if (!btn) return;
  if (btn.innerHTML.includes("Forward") && pendingForwardMsg === null) {
    // The existing handler sets msgObj first via its own closure; let it run
  }
}, true);

onAuthStateChanged(auth, (user) => {
  if (user) {
    setTimeout(() => {
      if (window.myUid || myUid) {
        // Anything that needs myUid
      }
    }, 500);
  }
});

const statusReactionPill = document.getElementById("statusReactionPill");
const statusCommentToggleBtn = document.getElementById("statusCommentToggleBtn");
const statusCommentCountBadge = document.getElementById("statusCommentCountBadge");
const statusCommentsDrawer = document.getElementById("statusCommentsDrawer");
const statusCommentsList = document.getElementById("statusCommentsList");
const closeStatusComments = document.getElementById("closeStatusComments");

let currentStatusReactions = {};
let currentStatusComments = {};
let unsubStatusComments = null;

const _origRenderStatusViewerReact = window.renderStatusViewer;
window.renderStatusViewer = function() {
  _origRenderStatusViewerReact();
  
  const st = statusViewerState;
  if (!st) return;
  
  const item = st.list[st.index];
  const isMine = st.userUid === myUid;
  
  statusCommentsDrawer.style.display = "none";
  
  if (!isMine) {
    statusReactionPill.style.display = "flex";
    const myReaction = item.reactions?.[myUid];
    statusReactionPill.querySelectorAll("button").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.reaction === myReaction);
    });
  } else {
    statusReactionPill.style.display = "none";
  }

  if (!isMine) {
    statusCommentToggleBtn.style.display = "flex";
  } else {
    statusCommentToggleBtn.style.display = "none";
  }
  
  const commentCount = Object.keys(item.comments || {}).length;
  if (commentCount > 0) {
    statusCommentCountBadge.textContent = commentCount;
    statusCommentCountBadge.style.display = "block";
  } else {
    statusCommentCountBadge.style.display = "none";
  }
  
  if (unsubStatusComments) unsubStatusComments();
  unsubStatusComments = onValue(ref(db, `statuses/${st.userUid}/${item.id}/comments`), (snap) => {
    const comments = snap.val() || {};
    currentStatusComments = comments;
    
    const count = Object.keys(comments).length;
    if (count > 0) {
      statusCommentCountBadge.textContent = count;
      statusCommentCountBadge.style.display = "block";
    } else {
      statusCommentCountBadge.style.display = "none";
    }
    
    if (statusCommentsDrawer.style.display === "flex") {
      renderCommentsList();
    }
  });
};

const _origCloseStatusViewerReact = window.closeStatusViewer;
window.closeStatusViewer = function() {
  if (unsubStatusComments) {
    unsubStatusComments();
    unsubStatusComments = null;
  }
  _origCloseStatusViewerReact();
};

if (statusReactionPill) {
  statusReactionPill.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!statusViewerState) return;
      
      const st = statusViewerState;
      const item = st.list[st.index];
      const emoji = btn.dataset.reaction;
      
      const isSelected = btn.classList.contains("selected");
      statusReactionPill.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
      if (!isSelected) btn.classList.add("selected");
      
      const path = `statuses/${st.userUid}/${item.id}/reactions`;
      
      try {
        if (isSelected) {
          await remove(ref(db, `${path}/${myUid}`));
        } else {
          await set(ref(db, `${path}/${myUid}`), emoji);
        }
      } catch (err) {
        console.error("Failed to react:", err);
      }
    });
  });
}

if (statusCommentToggleBtn) {
  statusCommentToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (statusCommentsDrawer.style.display === "flex") {
      statusCommentsDrawer.style.display = "none";
    } else {
      statusCommentsDrawer.style.display = "flex";
      renderCommentsList();
    }
  });
}

if (closeStatusComments) {
  closeStatusComments.addEventListener("click", () => {
    statusCommentsDrawer.style.display = "none";
  });
}

function renderCommentsList() {
  if (!statusCommentsList) return;
  
  const comments = currentStatusComments || {};
  const entries = Object.entries(comments).sort((a, b) => a[1].ts - b[1].ts);
  
  if (!entries.length) {
    statusCommentsList.innerHTML = `<div style="text-align:center; color:#8696a0; font-size:13px; margin-top:20px;">No comments yet.</div>`;
    return;
  }
  
  statusCommentsList.innerHTML = "";
  
  entries.forEach(([id, c]) => {
    const el = document.createElement("div");
    el.className = "comment-item";
    
    const senderName = c.senderName || "User";
    const av = c.senderAvatar;
    
    el.innerHTML = `
      <div class="comment-avatar">
        ${av ? `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : escapeHtml(senderName.substring(0,2).toUpperCase())}
      </div>
      <div class="comment-bubble">
        <div class="comment-sender">${escapeHtml(senderName)}</div>
        ${escapeHtml(c.text)}
      </div>
    `;
    statusCommentsList.appendChild(el);
  });
  
  statusCommentsList.scrollTop = statusCommentsList.scrollHeight;
}

const _origSendStatusReplyReact = window.sendStatusReply;
window.sendStatusReply = async function() {
  if (!statusViewerState) return;
  
  const text = statusReplyInput.value.trim();
  const hasImage = !!pendingReplyImage;
  
  if (statusCommentsDrawer.style.display === "flex" && text && !hasImage) {
    const st = statusViewerState;
    const item = st.list[st.index];
    
    const commentRef = push(ref(db, `statuses/${st.userUid}/${item.id}/comments`));
    const payload = {
      text: text,
      ts: Date.now(),
      senderUid: myUid,
      senderName: myIdDisplay.textContent,
      senderAvatar: window.currentProfilePic || null
    };
    
    try {
      statusReplySendBtn.disabled = true;
      await set(commentRef, payload);
      statusReplyInput.value = "";
    } catch (err) {
      alert("Failed to post comment.");
    } finally {
      statusReplySendBtn.disabled = false;
    }
    return;
  }
  
  return _origSendStatusReplyReact();
};

const _pill = document.getElementById("statusReactionPill");
const _commentBtn = document.getElementById("statusCommentToggleBtn");
const _commentBadge = document.getElementById("statusCommentCountBadge");
const _commentsDrawer = document.getElementById("statusCommentsDrawer");
const _commentsList = document.getElementById("statusCommentsList");
const _closeComments = document.getElementById("closeStatusComments");

let _unsubComments = null;

function _renderCommentsList() {
  if (!_commentsList) return;
  const comments = currentStatusCommentsCache || {};
  const entries = Object.entries(comments).sort((a, b) => a[1].ts - b[1].ts);

  if (!entries.length) {
    _commentsList.innerHTML = `<div style="text-align:center; color:#8696a0; font-size:13px; margin-top:20px;">No comments yet.</div>`;
    return;
  }

  _commentsList.innerHTML = "";
  entries.forEach(([id, c]) => {
    const name = c.senderName || "User";
    const av = c.senderAvatar;
    const el = document.createElement("div");
    el.className = "comment-item";
    el.innerHTML = `
      <div class="comment-avatar">
        ${av ? `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : escapeHtml(name.substring(0,2).toUpperCase())}
      </div>
      <div class="comment-bubble">
        <div class="comment-sender">${escapeHtml(name)}</div>
        ${escapeHtml(c.text)}
      </div>
    `;
    _commentsList.appendChild(el);
  });
  _commentsList.scrollTop = _commentsList.scrollHeight;
}

let currentStatusCommentsCache = {};

const _finalPill = document.getElementById("statusReactionPill");
const _finalCommentBtn = document.getElementById("statusCommentToggleBtn");
const _finalCommentBadge = document.getElementById("statusCommentCountBadge");
const _finalCommentsDrawer = document.getElementById("statusCommentsDrawer");
const _finalCommentsList = document.getElementById("statusCommentsList");
const _finalCloseComments = document.getElementById("closeStatusComments");

let _finalCommentsCache = {};
let _finalUnsubComments = null;

const _baseRenderViewer = window.renderStatusViewer;
window.renderStatusViewer = function() {
  _baseRenderViewer();
  
  if (!statusViewerState) return;
  const st = statusViewerState;
  const item = st.list[st.index];
  const isMine = st.userUid === myUid;

  if (_finalPill) {
    if (isMine) {
      _finalPill.style.display = "none";
    } else {
      _finalPill.style.display = "flex";
      const myReaction = item.reactions?.[myUid];
      _finalPill.querySelectorAll("button").forEach(b => {
        b.classList.toggle("selected", b.dataset.reaction === myReaction);
      });
    }
  }

  if (statusReplyBar) {
    if (isMine) {
      statusReplyBar.style.display = "none";
    } else {
      statusReplyBar.style.display = "flex";
      if (_finalCommentBtn) _finalCommentBtn.style.display = "flex";
    }
  }

  if (_finalUnsubComments) { _finalUnsubComments(); _finalUnsubComments = null; }
  if (!isMine) {
    _finalUnsubComments = onValue(ref(db, `statuses/${st.userUid}/${item.id}/comments`), (snap) => {
      _finalCommentsCache = snap.val() || {};
      const count = Object.keys(_finalCommentsCache).length;
      
      if (_finalCommentBadge) {
        if (count > 0) {
          _finalCommentBadge.textContent = count;
          _finalCommentBadge.style.display = "block";
        } else {
          _finalCommentBadge.style.display = "none";
        }
      }
      if (_finalCommentsDrawer.style.display === "flex") {
        renderFinalComments();
      }
    });
  }
};

function renderFinalComments() {
  if (!_finalCommentsList) return;
  const entries = Object.entries(_finalCommentsCache).sort((a, b) => a[1].ts - b[1].ts);
  
  if (!entries.length) {
    _finalCommentsList.innerHTML = `<div style="text-align:center; color:#8696a0; font-size:13px; margin-top:20px;">No comments yet.</div>`;
    return;
  }
  _finalCommentsList.innerHTML = "";
  entries.forEach(([id, c]) => {
    const el = document.createElement("div");
    el.className = "comment-item";
    el.innerHTML = `
      <div class="comment-avatar">${escapeHtml(c.senderName.substring(0,2).toUpperCase())}</div>
      <div class="comment-bubble">
        <div class="comment-sender">${escapeHtml(c.senderName)}</div>
        ${escapeHtml(c.text)}
      </div>
    `;
    _finalCommentsList.appendChild(el);
  });
  _finalCommentsList.scrollTop = _finalCommentsList.scrollHeight;
}

if (_finalPill) {
  _finalPill.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!statusViewerState) return;
      const st = statusViewerState;
      const item = st.list[st.index];
      const emoji = btn.dataset.reaction;
      const wasSelected = btn.classList.contains("selected");

      _finalPill.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
      if (!wasSelected) btn.classList.add("selected");

      const path = `statuses/${st.userUid}/${item.id}/reactions/${myUid}`;
      if (wasSelected) await remove(ref(db, path));
      else await set(ref(db, path), emoji);
    });
  });
}

if (_finalCommentBtn) {
  _finalCommentBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (_finalCommentsDrawer.style.display === "flex") {
      _finalCommentsDrawer.style.display = "none";
    } else {
      _finalCommentsDrawer.style.display = "flex";
      renderFinalComments();
    }
  });
}

if (_finalCloseComments) {
  _finalCloseComments.addEventListener("click", () => {
    _finalCommentsDrawer.style.display = "none";
  });
}

const _baseSendReply = window.sendStatusReply;
window.sendStatusReply = async function() {
  if (!statusViewerState) return;
  
  const text = statusReplyInput.value.trim();
  const hasImage = !!pendingReplyImage;
  
  if (_finalCommentsDrawer.style.display === "flex" && text && !hasImage) {
    const st = statusViewerState;
    const item = st.list[st.index];
    try {
      statusReplySendBtn.disabled = true;
      await push(ref(db, `statuses/${st.userUid}/${item.id}/comments`), {
        text, ts: Date.now(), senderUid: myUid, senderName: myIdDisplay.textContent
      });
      statusReplyInput.value = "";
    } catch (err) {
      alert("Failed to post comment.");
    } finally {
      statusReplySendBtn.disabled = false;
    }
    return;
  }
  
  return _baseSendReply();
};

if (statusReplySendBtn) {
  statusReplySendBtn.onclick = null;
  statusReplySendBtn.addEventListener("click", () => window.sendStatusReply());
}

// ==================================================================
// ============ ADMIN DASHBOARD EXTENSION ===========================
// ==================================================================

const ADMIN_ID = "ADMIN";

const adminToggleWrap = document.getElementById("adminToggleWrap");
const adminToggleBtn = document.getElementById("adminToggleBtn");
const adminDashboard = document.getElementById("adminDashboard");
const closeAdminBtn = document.getElementById("closeAdminBtn");
const adminUserList = document.getElementById("adminUserList");
const adminChatHeader = document.getElementById("adminChatHeader");
const adminChatTitle = document.getElementById("adminChatTitle");
const adminMessagesContainer = document.getElementById("adminMessagesContainer");
const adminInterruptBtn = document.getElementById("adminInterruptBtn");
const adminInterruptModal = document.getElementById("adminInterruptModal");
const adminInterruptInput = document.getElementById("adminInterruptInput");
const sendAdminInterruptBtn = document.getElementById("sendAdminInterruptBtn");
const cancelAdminInterruptBtn = document.getElementById("cancelAdminInterruptBtn");

let adminUnsubMessages = null;
let activeAdminChatUid = null;
let activeAdminChatId = "";

function checkAdminAccess() {
  if (myId === ADMIN_ID) {
    if (adminToggleWrap) adminToggleWrap.style.display = "block";
  } else {
    if (adminToggleWrap) adminToggleWrap.style.display = "none";
  }
}

// ✅ FIX: Call checkAdminAccess directly inside the existing enterApp function.
// We are modifying the original enterApp here to ensure it runs.
// (Note: This replaces the broken `window.enterApp` wrapper)
const originalEnterApp = enterApp;
enterApp = async function() {
  await originalEnterApp();
  checkAdminAccess();
};

if (adminToggleBtn) {
  adminToggleBtn.addEventListener("click", () => {
    adminDashboard.style.display = "flex";
    loadAdminUsers();
  });
}

if (closeAdminBtn) {
  closeAdminBtn.addEventListener("click", () => {
    adminDashboard.style.display = "none";
    if (adminUnsubMessages) {
      adminUnsubMessages();
      adminUnsubMessages = null;
    }
    activeAdminChatUid = null;
  });
}

async function loadAdminUsers() {
  adminUserList.innerHTML = `<div style="padding: 15px; text-align: center; color: #94a3b8;">Loading users...</div>`;
  
  try {
    const usersSnap = await get(ref(db, "users"));
    const users = usersSnap.val() || {};
    adminUserList.innerHTML = "";

    Object.entries(users).forEach(([uid, data]) => {
      if (data.id === ADMIN_ID) return;

      const item = document.createElement("div");
      item.className = "admin-user-item";
      item.onclick = () => openAdminChat(uid, data.id, data.displayName);

      item.innerHTML = `
        <div class="admin-user-avatar" style="background: ${data.avatar ? 'transparent' : '#475569'}">
          ${data.avatar ? `<img src="${data.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : data.id.substring(0,2).toUpperCase()}
        </div>
        <div class="admin-user-info">
          <div class="admin-user-name">${escapeHtml(data.displayName || data.id)}</div>
          <div class="admin-user-id">@${escapeHtml(data.id)}</div>
        </div>
      `;
      adminUserList.appendChild(item);
    });

    if (!adminUserList.children.length) {
      adminUserList.innerHTML = `<div style="padding: 15px; text-align: center; color: #94a3b8;">No other users found.</div>`;
    }
  } catch (err) {
    console.error(err);
    adminUserList.innerHTML = `<div style="padding: 15px; text-align: center; color: #ff4d4d;">Failed to load users.</div>`;
  }
}

function openAdminChat(targetUid, targetId, targetName) {
  if (adminUnsubMessages) adminUnsubMessages();
  
  activeAdminChatUid = targetUid;
  activeAdminChatId = targetId;
  
  document.querySelectorAll(".admin-user-item").forEach(el => el.classList.remove("active"));

  adminChatHeader.style.display = "flex";
  adminChatTitle.textContent = `Chat with ${targetName || targetId} (@${targetId})`;
  adminMessagesContainer.innerHTML = `<div style="text-align: center; color: #64748b; margin-top: 20px;">Loading messages...</div>`;

  // Note: Admin chat uses a specific key to avoid mixing with the admin's normal chats
  const key = chatKey(myUid, targetUid);
  
  adminUnsubMessages = onValue(ref(db, `chats/${key}`), (snap) => {
    const data = snap.val() || {};
    const msgs = Object.entries(data)
      .filter(([id, m]) => m && m.text !== undefined)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));

    adminMessagesContainer.innerHTML = "";

    if (!msgs.length) {
      adminMessagesContainer.innerHTML = `<div style="text-align: center; color: #64748b; margin-top: 20px;">No messages in this chat yet.</div>`;
      return;
    }

    msgs.forEach(m => {
      const isSentByUser = m.senderUid === targetUid;
      const isAdminIntervention = m.isAdminIntervention;

      const el = document.createElement("div");
      el.className = `admin-message ${isSentByUser ? "received" : "sent"} ${isAdminIntervention ? "admin-intervention" : ""}`;
      
      el.innerHTML = `
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px; opacity: 0.8;">
          ${escapeHtml(m.senderName)} ${isAdminIntervention ? '<span style="color:#ff4d4d;font-size:10px;">(ADMIN)</span>' : ''}
        </div>
        ${escapeHtml(m.text)}
        <div class="admin-message-meta">${formatTime(m.ts)}</div>
      `;
      adminMessagesContainer.appendChild(el);
    });

    adminMessagesContainer.scrollTop = adminMessagesContainer.scrollHeight;
  });
}

if (adminInterruptBtn) {
  adminInterruptBtn.addEventListener("click", () => {
    if (!activeAdminChatUid) return alert("Select a chat first.");
    adminInterruptInput.value = "";
    adminInterruptModal.style.display = "flex";
  });
}

if (cancelAdminInterruptBtn) {
  cancelAdminInterruptBtn.addEventListener("click", () => {
    adminInterruptModal.style.display = "none";
  });
}

if (sendAdminInterruptBtn) {
  sendAdminInterruptBtn.addEventListener("click", async () => {
    const text = adminInterruptInput.value.trim();
    if (!text) return;

    try {
      sendAdminInterruptBtn.disabled = true;
      const key = chatKey(myUid, activeAdminChatUid);
      const msgRef = push(ref(db, `chats/${key}`));
      
      await set(msgRef, {
        senderUid: myUid,
        senderName: "ADMIN",
        text: text,
        ts: Date.now(),
        read: false,
        readBy: { [myUid]: true },
        isAdminIntervention: true
      });

      const uref = ref(db, `unread/${activeAdminChatUid}/${myUid}`);
      const u = await get(uref);
      await set(uref, (u.val() || 0) + 1);

      adminInterruptModal.style.display = "none";
      showToast("Admin", "Message injected into chat");
    } catch (err) {
      alert("Failed to send admin message: " + err.message);
    } finally {
      sendAdminInterruptBtn.disabled = false;
    }
  });
}