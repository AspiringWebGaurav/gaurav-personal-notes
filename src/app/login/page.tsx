"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { loginWithGoogle } from "@/features/auth/AuthProvider";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const port = searchParams.get("port");
  const queryTheme = searchParams.get("theme");

  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    queryTheme === "dark" ? "dark" : "light"
  );

  const { user, loading } = useAuthStore();
  const [isTransferring, setIsTransferring] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync theme to DOM on mount and client storage safely
  useEffect(() => {
    setMounted(true);
    if (queryTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else if (queryTheme === "light") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    } else {
      try {
        const saved = localStorage.getItem("app-theme");
        if (saved === "dark" || saved === "light") {
          setTheme(saved);
          if (saved === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          setTheme("dark");
          document.documentElement.classList.add("dark");
        } else {
          setTheme("light");
          document.documentElement.classList.remove("dark");
        }
      } catch {}
    }
  }, [queryTheme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (next === "dark") {
        document.documentElement.classList.add("dark");
        try {
          localStorage.setItem("app-theme", "dark");
        } catch {}
      } else {
        document.documentElement.classList.remove("dark");
        try {
          localStorage.setItem("app-theme", "light");
        } catch {}
      }
      return next;
    });
  };

  const handleConnectToDesktop = async (targetUser = user) => {
    if (!targetUser || !port) return;
    setIsTransferring(true);
    setStatusText("Connecting to desktop app...");

    try {
      const idToken = await targetUser.getIdToken(true);
      // @ts-expect-error stsTokenManager may contain refreshToken
      const refreshToken = targetUser.refreshToken || targetUser.stsTokenManager?.refreshToken || "";

      const targetUrl = new URL(`http://127.0.0.1:${port}/callback`);
      targetUrl.searchParams.set("uid", targetUser.uid);
      targetUrl.searchParams.set("email", targetUser.email || "");
      if (targetUser.displayName) targetUrl.searchParams.set("displayName", targetUser.displayName);
      if (targetUser.photoURL) targetUrl.searchParams.set("photoUrl", targetUser.photoURL);
      targetUrl.searchParams.set("idToken", idToken);
      if (refreshToken) targetUrl.searchParams.set("refreshToken", refreshToken);
      targetUrl.searchParams.set("theme", theme);

      setStatusText("Redirecting to desktop app...");
      window.location.href = targetUrl.toString();
    } catch (err) {
      console.error("Desktop auth transfer failed:", err);
      setStatusText(null);
      setErrorMessage("Could not connect to desktop app. Please make sure the app is open.");
      setIsTransferring(false);
    }
  };

  const handleCancelDesktopConnect = async () => {
    if (!port) return;
    setIsTransferring(true);
    setStatusText("Cancelling connection...");
    try {
      await fetch(`http://127.0.0.1:${port}/cancel`, { mode: "no-cors" });
    } catch {}
    router.push("/");
  };

  const handleSignIn = async () => {
    setErrorMessage(null);
    try {
      await loginWithGoogle();
      if (port) {
        const { auth } = await import("@/core/config/firebase");
        if (auth.currentUser) {
          await handleConnectToDesktop(auth.currentUser);
        }
      }
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (authErr?.code !== "auth/popup-closed-by-user" && authErr?.code !== "auth/cancelled-popup-request") {
        setErrorMessage(authErr?.message || "Sign in failed. Please try again.");
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
      setErrorMessage(authErr?.message || "Could not switch account. Please try again.");
    }
  };

  const handleLogout = async () => {
    setErrorMessage(null);
    setIsTransferring(false);
    setStatusText(null);
    try {
      const { signOut } = await import("firebase/auth");
      const { auth } = await import("@/core/config/firebase");
      await signOut(auth);
      router.push(`/logged-out?mode=keep_notes&theme=${theme}`);
    } catch (err: unknown) {
      console.error("Failed to log out:", err);
      const authErr = err as { message?: string };
      setErrorMessage(authErr?.message || "Could not sign out. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* -------------------- 1. EDGE-TO-EDGE TOP NAVBAR -------------------- */}
      <header className="w-full h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-6 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs tracking-wider">
            GPN
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
            Gaurav Personal Notes
          </span>
        </div>

        {/* Navbar Right: Sun / Moon Toggle */}
        <div className="flex items-center gap-3">
          {port && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Desktop app</span>
            </span>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={mounted ? (theme === "dark" ? "Light theme" : "Dark theme") : "Toggle theme"}
            suppressHydrationWarning
            className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700 transition-transform duration-200 hover:-rotate-12" />
              )
            ) : (
              <span className="w-4 h-4 block" />
            )}
          </button>
        </div>
      </header>

      {/* -------------------- 2. CENTRALLY FOCUSED CONTENT -------------------- */}
      <main className="flex-1 w-full flex items-center justify-center px-6 py-12 md:py-20">
        <div className="w-full max-w-sm space-y-6 text-center">
          {/* Header Title & Subtext */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {port ? "Sign in to desktop app" : "Sign in to your account"}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
              {port
                ? "Sign in to sync your notes with the Windows app."
                : "Sign in to view and edit your notes across your devices."}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs text-left">
              {errorMessage}
            </div>
          )}

          {/* Loading / Connecting State */}
          {loading || isTransferring ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 border-y border-zinc-100 dark:border-zinc-850">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-700 dark:text-zinc-300" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {statusText || "Connecting..."}
              </p>
            </div>
          ) : user ? (
            /* Signed in user state: clean open layout, perfectly centered */
            <div className="space-y-5">
              <div className="border-y border-zinc-200 dark:border-zinc-800 py-4 space-y-3">
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-base shadow-2xs">
                    {user.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoURL}
                        alt={user.displayName || user.email || "Profile"}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{(user.displayName || user.email || "G")[0].toUpperCase()}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {user.displayName || "User"}
                  </div>
                  <div className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {user.email}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 pt-1 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready to connect</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-1">
                {port ? (
                  <button
                    type="button"
                    onClick={() => handleConnectToDesktop()}
                    disabled={isTransferring}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      Continue as {user.displayName?.split(" ")[0] || "this account"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Go to notes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  disabled={isTransferring}
                  className="w-full py-2.5 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 text-center"
                >
                  Use another account
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isTransferring}
                  className="w-full py-2 text-xs font-medium text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>

                {port && (
                  <button
                    type="button"
                    onClick={handleCancelDesktopConnect}
                    disabled={isTransferring}
                    className="w-full py-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 text-center"
                  >
                    Cancel and return to home
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Signed out state: clean Google button */
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer shadow-2xs"
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
                <span>Sign in with Google</span>
              </button>

              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">
                Choose your Google account to sign in.
              </p>

              {port && (
                <button
                  type="button"
                  onClick={handleCancelDesktopConnect}
                  disabled={isTransferring}
                  className="w-full text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer pt-1 text-center"
                >
                  Cancel and return to home
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* -------------------- 3. EDGE-TO-EDGE FOOTER -------------------- */}
      <footer className="w-full h-12 border-t border-zinc-200/80 dark:border-zinc-800/80 px-6 md:px-12 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
        <span>&copy; Gaurav Personal Notes</span>
        <span>Notes sync to your account</span>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-700 dark:text-zinc-300" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
