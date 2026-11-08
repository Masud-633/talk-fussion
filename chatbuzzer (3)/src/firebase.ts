import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  deleteUser,
  type User
} from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
  serverTimestamp,
  remove,
  onDisconnect,
  update,
  type Unsubscribe
} from "firebase/database";

export const firebaseConfig = {
  apiKey: "AIzaSyDe74oi5M2F-fm6PYqtweZqBT0c3hZLF30",
  authDomain: "chatwave-884b6.firebaseapp.com",
  databaseURL: "https://chatwave-884b6-default-rtdb.firebaseio.com",
  projectId: "chatwave-884b6",
  storageBucket: "chatwave-884b6.firebasestorage.app",
  messagingSenderId: "304685044989",
  appId: "1:304685044989:web:e155ab7b8bbb4c5462da94",
  measurementId: "G-1H7BF12XVT"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getDatabase(app);

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  deleteUser,
  ref,
  set,
  get,
  onValue,
  push,
  serverTimestamp,
  remove,
  onDisconnect,
  update,
  type User,
  type Unsubscribe
};

export function chatKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}

export function sanitizeId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 20);
}

export function formatTime(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatLastSeen(ts?: number): string {
  if (!ts) return "Offline";
  const diff = Date.now() - ts;
  if (diff < 60000) return "Last seen just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
}

export function formatStatusTime(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
