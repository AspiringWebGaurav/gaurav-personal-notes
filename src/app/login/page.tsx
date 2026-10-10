"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { loginWithGoogle } from "@/features/auth/AuthProvider";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const port = searchParams.get("port");
  const queryTheme = searchParams.get("theme");
  const promptParam = searchParams.get("prompt");

  const [theme, setTheme] = useState<"light" | "dark">(queryTheme === "dark" ? "dark" : "light");
  const { user, loading } = useAuthStore();
  const [isTransferring, setIsTransferring] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync theme from query parameter on mount
  useEffect(() => {
    if (queryTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else if (queryTheme === "light") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, [queryTheme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  const handleConnectToDesktop = async () => {
    if (!user || !port) return;
    setIsTransferring(true);
    setStatusText("Transferring authentication to desktop app...");

    try {
      const idToken = await user.getIdToken(true);
      // @ts-expect-error stsTokenManager may contain refreshToken
      const refreshToken = user.refreshToken || user.stsTokenManager?.refreshToken || "";

      const targetUrl = new URL(`http://127.0.0.1:${port}/callback`);
      targetUrl.searchParams.set("uid", user.uid);
      targetUrl.searchParams.set("email", user.email || "");
      if (user.displayName) targetUrl.searchParams.set("displayName", user.displayName);
      if (user.photoURL) targetUrl.searchParams.set("photoUrl", user.photoURL);
      targetUrl.searchParams.set("idToken", idToken);
      if (refreshToken) targetUrl.searchParams.set("refreshToken", refreshToken);
      targetUrl.searchParams.set("theme", theme);

      setStatusText("Redirecting to local desktop application...");
      window.location.href = targetUrl.toString();
    } catch (err) {
      console.error("Desktop auth transfer failed:", err);
      setStatusText(null);
      setErrorMessage("Failed to transfer credentials to desktop app. Please make sure GPN Desktop is running.");
      setIsTransferring(false);
    }
  };

  // If user is already authenticated and port is present, only auto-transfer if NOT explicitly asked to select/switch account
  useEffect(() => {
    if (!loading && user) {
      if (port && !isTransferring && !statusText && promptParam !== "select_account") {
        handleConnectToDesktop();
      } else if (!port) {
        router.push("/dashboard");
      }
    }
  }, [loading, user, port, promptParam]);

  const handleSignIn = async () => {
    setErrorMessage(null);
    try {
      await loginWithGoogle();
      // On success, the above useEffect or user action will handle transfer
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (authErr?.code !== "auth/popup-closed-by-user") {
        setErrorMessage(authErr?.message || "Google sign-in failed. Please try again.");
      }
    }
  };

  const handleSwitchAccount = async () => {
    setErrorMessage(null);
    setIsTransferring(false);
    setStatusText(null);
    try {
      const { signOut } = await import("firebase/auth");
      const { auth } = await import("@/core/config/firebase");
      await signOut(auth);
      await handleSignIn();
    } catch (err: unknown) {
      console.error("Failed to switch account:", err);
      const authErr = err as { message?: string };
      setErrorMessage(authErr?.message || "Failed to switch account. Please try again.");
    }
  };

  const isLight = theme === "light";

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
        isLight ? "bg-[#f8fafc] text-[#0f172a]" : "bg-[#090a0f] text-[#f8fafc]"
      }`}
    >
      <div
        className={`relative w-full max-w-[390px] rounded-2xl p-8 border transition-all duration-200 shadow-xl ${
          isLight
            ? "bg-white border-[#e2e8f0] shadow-slate-200/50"
            : "bg-[#12131a] border-[#262836] shadow-black/80"
        }`}
      >
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className={`absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center border text-sm transition-colors cursor-pointer ${
            isLight
              ? "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
              : "bg-[#1c1d27] border-[#2b2d3d] text-slate-400 hover:text-white"
          }`}
        >
          🌓
        </button>

        {/* Brand Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mb-3 border ${
              isLight
                ? "bg-[#0f172a] text-white border-[#1e293b]"
                : "bg-[#1c1d27] text-white border-[#33374b]"
            }`}
          >
            GPN
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${isLight ? "text-[#0f172a]" : "text-white"}`}>
            {port ? "Sign in to GPN Desktop" : "Sign in to Gaurav Notes"}
          </h1>
          <p className={`text-xs mt-1.5 ${isLight ? "text-[#64748b]" : "text-[#94a3b8]"}`}>
            {port
              ? "Connect your notes securely with the Windows desktop application."
              : "Access and sync your notes seamlessly anywhere."}
          </p>
        </div>

        {/* Content State */}
        {loading || isTransferring ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3.5">
            <div className="relative w-11 h-11 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
            <div className="text-center space-y-1">
              <p className={`text-xs font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>
                {statusText || "Verifying Authentication..."}
              </p>
              {port && (
                <p className="text-[11px] font-mono text-emerald-500 font-medium">
                  Loopback Bridge • 127.0.0.1:{port}
                </p>
              )}
            </div>
            {isTransferring && (
              <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-gradient-to-r from-emerald-500 to-[#76b900] h-full w-full animate-pulse" />
              </div>
            )}
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-[#1c1d27] border-[#2b2d3d]"
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                ACTIVE BROWSER ACCOUNT
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center font-bold text-white text-xs border border-zinc-700">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || user.email || ""}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(user.displayName || user.email || "U")[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{user.displayName || "GPN User"}</div>
                  <div className="font-mono text-[11px] opacity-80 truncate">{user.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-500 pt-1 text-[11px] font-medium border-t border-slate-200 dark:border-zinc-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready to link with desktop app</span>
              </div>
            </div>

            {port && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleConnectToDesktop}
                  disabled={isTransferring}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>CONTINUE AS {user.displayName?.split(" ")[0]?.toUpperCase() || "THIS ACCOUNT"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  disabled={isTransferring}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium border transition-all cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                      : "bg-[#1c1d27] hover:bg-[#252736] text-slate-300 border-[#2b2d3d]"
                  }`}
                >
                  <span>Sign in with another account</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleSignIn}
              className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] ${
                isLight
                  ? "bg-white hover:bg-slate-50 text-[#0f172a] border-[#cbd5e1]"
                  : "bg-[#1c1d27] hover:bg-[#262838] text-white border-[#2b2d3d]"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {errorMessage && (
              <p className="text-center text-xs text-rose-500 pt-1 font-medium">{errorMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#090a0f] text-white">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
