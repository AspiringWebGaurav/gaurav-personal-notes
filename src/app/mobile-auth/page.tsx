"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { auth, googleProvider } from "@/core/config/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { Smartphone, CheckCircle2, ArrowRight, Loader2, LogOut, Sparkles } from "lucide-react";

function MobileAuthContent() {
  const searchParams = useSearchParams();
  const queryTheme = searchParams.get("theme");
  const isLight = queryTheme === "light";
  const { user, loading } = useAuthStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const transferredRef = useRef(false);

  const sendToMobileApp = async (
    targetUser: typeof user,
    googleIdToken = "",
    googleAccessToken = ""
  ) => {
    if (!targetUser) return;
    setIsConnecting(true);
    setStatus("Generating secure mobile session token...");

    try {
      const idToken = await targetUser.getIdToken(true);
      // @ts-expect-error stsTokenManager may contain refreshToken
      const refreshToken = targetUser.refreshToken || targetUser.stsTokenManager?.refreshToken || "";

      const targetUrl = new URL("gpn://auth-callback");
      targetUrl.searchParams.set("uid", targetUser.uid);
      targetUrl.searchParams.set("email", targetUser.email || "");
      if (targetUser.displayName) targetUrl.searchParams.set("displayName", targetUser.displayName);
      if (targetUser.photoURL) targetUrl.searchParams.set("photoUrl", targetUser.photoURL);
      targetUrl.searchParams.set("idToken", idToken);
      if (refreshToken) targetUrl.searchParams.set("refreshToken", refreshToken);
      if (googleIdToken) targetUrl.searchParams.set("googleIdToken", googleIdToken);
      if (googleAccessToken) targetUrl.searchParams.set("googleAccessToken", googleAccessToken);

      const callbackUrl = targetUrl.toString();
      setRedirectUrl(callbackUrl);
      setStatus("Redirecting back to GPN Mobile App...");

      // Trigger custom scheme redirection
      window.location.href = callbackUrl;
    } catch (err) {
      console.error("[MobileAuth] Session transfer failed:", err);
      setStatus("Failed to connect to mobile app. Please tap the button to retry.");
      setIsConnecting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsConnecting(true);
    setStatus("Connecting with Google Account...");
    try {
      googleProvider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const googleIdToken = credential?.idToken || "";
        const googleAccessToken = credential?.accessToken || "";
        await sendToMobileApp(result.user, googleIdToken, googleAccessToken);
      } else {
        setIsConnecting(false);
        setStatus(null);
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        setIsConnecting(false);
        setStatus(null);
        return;
      }
      console.error("[MobileAuth] Google sign-in error:", err);
      setStatus(error?.message || "Sign-in failed. Please try again.");
      setIsConnecting(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 select-none ${
        isLight ? "bg-slate-100 text-zinc-900" : "bg-zinc-950 text-zinc-100"
      }`}
    >
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-500/10 blur-[100px] rounded-full"></div>
      </div>

      <div
        className={`w-full max-w-sm border rounded-2xl p-6 shadow-2xl space-y-6 relative z-10 transition-colors duration-200 ${
          isLight
            ? "bg-white border-zinc-200 shadow-slate-200/50"
            : "bg-zinc-900/90 border-zinc-800 shadow-black/80 backdrop-blur-xl"
        }`}
      >
        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isLight
                ? "bg-violet-100 border border-violet-200 text-violet-600"
                : "bg-violet-600/20 border border-violet-500/30 text-violet-400"
            }`}
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-tight ${isLight ? "text-zinc-900" : "text-white"}`}>
              Mobile App Sign-In
            </h1>
            <p className={`text-xs ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
              Gaurav Personal Notes Android Bridge
            </p>
          </div>
        </div>

        {loading ? (
          <div
            className={`flex items-center justify-center gap-2 py-8 text-xs ${
              isLight ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
            <span>Checking authentication state...</span>
          </div>
        ) : user ? (
          /* User is already signed in on Web */
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border space-y-2 ${
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
              <div className={`text-xs font-mono break-all ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                {user.email}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Account ready to link to mobile app</span>
              </div>
            </div>

            {status && (
              <div
                className={`text-xs flex items-center gap-2 ${
                  isLight ? "text-zinc-600" : "text-zinc-400"
                }`}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500 shrink-0" />
                <span>{status}</span>
              </div>
            )}

            {redirectUrl ? (
              <div className="space-y-3 pt-2">
                <a
                  href={redirectUrl}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 hover:opacity-95 text-white text-xs font-semibold shadow-lg shadow-violet-500/20 transition-all text-center"
                >
                  <span>RETURN TO GPN MOBILE APP</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <p className="text-[11px] text-center text-zinc-500">
                  If the app didn&apos;t open automatically, tap the button above.
                </p>
              </div>
            ) : (
              <button
                onClick={() => handleGoogleSignIn()}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-violet-600/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>CONNECT TO GPN MOBILE APP</span>
              </button>
            )}

            <button
              type="button"
              disabled={isConnecting}
              onClick={() => handleGoogleSignIn()}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium border transition-colors cursor-pointer disabled:opacity-50 ${
                isLight
                  ? "bg-white hover:bg-slate-50 text-zinc-700 border-zinc-300"
                  : "bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700"
              }`}
            >
              <span>Sign in with another account</span>
            </button>

            <button
              type="button"
              disabled={isConnecting}
              onClick={async () => {
                try {
                  await signOut(auth);
                } catch (e) {
                  console.error("Logout error:", e);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        ) : (
          /* User is not logged in yet */
          <div className="space-y-4">
            <p className={`text-xs leading-relaxed ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              Sign in with your Google account to connect your cloud notes and enable real-time sync with your Android app.
            </p>

            {status && (
              <div
                className={`text-xs flex items-center gap-2 ${
                  isLight ? "text-zinc-600" : "text-zinc-400"
                }`}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500 shrink-0" />
                <span>{status}</span>
              </div>
            )}

            {redirectUrl ? (
              <div className="space-y-3 pt-2">
                <a
                  href={redirectUrl}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 hover:opacity-95 text-white text-xs font-semibold shadow-lg shadow-violet-500/20 transition-all text-center"
                >
                  <span>RETURN TO GPN MOBILE APP</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <p className="text-[11px] text-center text-zinc-500">
                  If the app didn&apos;t open automatically, tap the button above.
                </p>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={isConnecting}
                className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-sm ${
                  isLight
                    ? "bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300"
                    : "bg-white hover:bg-zinc-100 text-zinc-900 border-transparent shadow-white/5"
                } disabled:opacity-50`}
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
                <span>SIGN IN WITH GOOGLE</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobileAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
          <div className="flex items-center gap-2 text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
            <span>Initializing mobile bridge...</span>
          </div>
        </div>
      }
    >
      <MobileAuthContent />
    </Suspense>
  );
}
