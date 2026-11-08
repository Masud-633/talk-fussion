import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  auth,
  db,
  ref,
  set,
  get,
  serverTimestamp,
  sanitizeId
} from "../firebase";
import { Moon, Sun, Lock, Mail, User as UserIcon } from "lucide-react";

interface AuthScreenProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  isDarkMode,
  onToggleTheme,
}) => {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [chatId, setChatId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please enter email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setErrorMsg("Incorrect email or password.");
      } else if (err.code === "auth/user-not-found") {
        setErrorMsg("No account found with this email.");
      } else {
        setErrorMsg(err.message.replace("Firebase: ", ""));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = sanitizeId(chatId.trim());
    if (id.length < 3) {
      setErrorMsg("Chat ID must be at least 3 characters.");
      return;
    }
    if (!email.trim() || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      // Check if Chat ID already taken
      const idSnap = await get(ref(db, `ids/${id}`));
      if (idSnap.exists()) {
        setErrorMsg("That Chat ID is already taken. Try another.");
        setIsLoading(false);
        return;
      }

      // Create user
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCred.user.uid;

      // Save mapping and user record
      await set(ref(db, `ids/${id}`), { uid, createdAt: serverTimestamp() });
      await set(ref(db, `users/${uid}`), {
        id,
        email: email.trim(),
        displayName: id,
        bio: "Hey there! I am using TalkFussion.",
        avatar: null,
        createdAt: serverTimestamp(),
      });

      setSuccessMsg("Account created! Logging you in...");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setErrorMsg("This email is already registered.");
      } else {
        setErrorMsg(err.message.replace("Firebase: ", ""));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#d1d7db] dark:bg-[#0c1317] relative select-none">
      {/* Theme toggle in corner */}
      <button
        onClick={onToggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-md hover:bg-slate-100 transition-colors"
        title="Toggle Theme"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-sm bg-white dark:bg-[#111b21] rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-[#2a3942] space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo_talkfussion.jpg"
            alt="TalkFussion Logo"
            className="w-20 h-20 rounded-2xl object-cover shadow-lg mb-3 ring-4 ring-emerald-500/20"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            TalkFussion
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            Communicate & Connect
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-[#202c33] rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === "login"
                ? "bg-white dark:bg-[#111b21] text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === "signup"
                ? "bg-white dark:bg-[#111b21] text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-medium text-center">
            {successMsg}
          </div>
        )}

        {/* Login Form */}
        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a3942] bg-slate-50 dark:bg-[#202c33] text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a3942] bg-slate-50 dark:bg-[#202c33] text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 transition-colors"
            >
              {isLoading ? "Signing in..." : "Secure Log In"}
            </button>
          </form>
        ) : (
          /* Signup Form */
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Unique Chat ID
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="e.g. JOHN123"
                  maxLength={20}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a3942] bg-slate-50 dark:bg-[#202c33] text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500 uppercase"
                  required
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Friends will find and message you using this ID
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a3942] bg-slate-50 dark:bg-[#202c33] text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#2a3942] bg-slate-50 dark:bg-[#202c33] text-slate-900 dark:text-slate-100 text-sm outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 transition-colors"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-[#2a3942]">
          Secured by Firebase Realtime Authentication
        </div>
      </div>
    </div>
  );
};
