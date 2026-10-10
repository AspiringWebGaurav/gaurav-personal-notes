"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { loginWithGoogle } from "@/features/auth/AuthProvider";
import { Laptop, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

function DesktopAuthContent() {
  const searchParams = useSearchParams();
  const port = searchParams.get("port");
  const queryTheme = searchParams.get("theme");
  const promptParam = searchParams.get("prompt");
  const isLight = queryTheme === "light";
  const { user, loading } = useAuthStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!user || !port) return;
    setIsConnecting(true);
    setStatus("Generating secure desktop token...");

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
      targetUrl.searchParams.set("theme", isLight ? "light" : "dark");

      setStatus("Redirecting to local desktop application...");
      window.location.href = targetUrl.toString();
    } catch (err) {
      console.error("Desktop auth transfer failed:", err);
      setStatus("Failed to connect. Please check if desktop app is running.");
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    // If user is already authenticated and port is provided, auto-trigger connect ONLY if not asked to select account
    if (!loading && user && port && !isConnecting && !status && promptParam !== "select_account") {
      handleConnect();
    }
  }, [loading, user, port, promptParam]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
        isLight ? "bg-slate-100 text-zinc-900" : "bg-zinc-950 text-zinc-100"
      }`}
    >
      <div
        className={`w-full max-w-md border rounded-xl p-6 shadow-2xl space-y-6 transition-colors duration-200 ${
          isLight
            ? "bg-white border-zinc-200 shadow-slate-200/50"
            : "bg-zinc-900 border-zinc-800 shadow-black/80"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isLight
                ? "bg-violet-100 border border-violet-200 text-violet-600"
                : "bg-violet-600/20 border border-violet-500/30 text-violet-400"
            }`}
          >
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-base font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>
              Desktop App Authentication
            </h1>
            <p className={`text-xs ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
              Gaurav Personal Notes Windows Bridge
            </p>
          </div>
        </div>

        {!port ? (
          <div
            className={`p-4 rounded-lg text-xs leading-relaxed border ${
              isLight
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-amber-950/30 border-amber-900/50 text-amber-300"
            }`}
          >
            Missing loopback port parameter. Please initiate sign-in directly from the GPN Desktop application.
          </div>
        ) : loading ? (
          <div
            className={`flex items-center justify-center gap-2 py-8 text-xs ${
              isLight ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Checking authentication state...</span>
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border space-y-2 ${
                isLight
                  ? "bg-slate-50 border-zinc-200"
                  : "bg-zinc-800/60 border-zinc-700/60"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={isLight ? "text-zinc-500" : "text-zinc-400"}>Signed In As:</span>
                <span className={`font-semibold ${isLight ? "text-zinc-900" : "text-white"}`}>
                  {user.displayName || "GPN User"}
                </span>
              </div>
              <div className={`text-xs font-mono ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                {user.email}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Account verified and ready to sync</span>
              </div>
            </div>

            {status && (
              <div
                className={`text-xs flex items-center gap-2 ${
                  isLight ? "text-zinc-600" : "text-zinc-400"
                }`}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                <span>{status}</span>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>CONNECT TO DESKTOP (PORT {port})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={isConnecting}
              onClick={async () => {
                try {
                  const { signOut } = await import("firebase/auth");
                  const { auth } = await import("@/core/config/firebase");
                  await signOut(auth);
                  await loginWithGoogle();
                } catch (e) {
                  console.error("Switch account error:", e);
                }
              }}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-medium border transition-colors cursor-pointer disabled:opacity-50 ${
                isLight
                  ? "bg-white hover:bg-slate-50 text-zinc-700 border-zinc-300"
                  : "bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700"
              }`}
            >
              <span>Sign in with another account</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className={`text-xs leading-relaxed ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              Sign in with your Google account to connect your cloud notes with your Windows desktop app.
            </p>

            <button
              onClick={() => loginWithGoogle()}
              className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                isLight
                  ? "bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300 shadow-sm"
                  : "bg-white hover:bg-zinc-100 text-zinc-900 border-transparent shadow"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>SIGN IN TO CONNECT DESKTOP</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DesktopAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
          <div className="flex items-center gap-2 text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
            <span>Initializing desktop bridge...</span>
          </div>
        </div>
      }
    >
      <DesktopAuthContent />
    </Suspense>
  );
}
