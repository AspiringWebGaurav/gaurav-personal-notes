// /app/(auth)/login/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import PostLoginGlassLoader from "@/components/PostLoginGlassLoader";

const POST_AUTH_FLAG = "postAuthPending"; // survives redirect round-trip

export default function LoginPage() {
  const {
    user,
    loading,
    signIn,
    error,
    isNewUser,
    userFirstName,
    hasVisitedBefore,
    userDisplayName,
    authMethod,
  } = useAuth();

  const router = useRouter();
  const [welcomeMessage, setWelcomeMessage] = useState("Welcome");

  // --- Loader timing constants (NEW) ---
  const LOADER_STEPS = [
    "Preparing dashboard…",
    "Loading preferences…",
    "Optimizing experience…",
    "Handshaking with server…",
    "Finalizing & opening…",
  ];
  const STEP_DURATION_MS = 1800; // slower, readable steps
  const TOTAL_HOLD_MS = LOADER_STEPS.length * STEP_DURATION_MS + 200; // small buffer

  // Glass loader controls
  const [showLoader, setShowLoader] = useState(false);
  const [workPromise, setWorkPromise] = useState<Promise<void> | undefined>();

  // Guards
  const replacedRef = useRef(false);
  const clickedRef = useRef(false);

  // Prefetch dashboard for background warm-up
  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  // Friendly header text
  useEffect(() => {
    if (user && userDisplayName) {
      if (isNewUser) setWelcomeMessage("Welcome");
      else if (hasVisitedBefore)
        setWelcomeMessage(
          `Welcome back, ${userFirstName || userDisplayName.split(" ")[0]}`
        );
      else setWelcomeMessage("Welcome");
    } else {
      const hasVisited =
        typeof window !== "undefined"
          ? localStorage.getItem("hasVisited")
          : null;
      if (hasVisited) setWelcomeMessage("Welcome Back");
      else {
        setWelcomeMessage("Welcome");
        if (typeof window !== "undefined")
          localStorage.setItem("hasVisited", "true");
      }
    }
  }, [user, userDisplayName, userFirstName, isNewUser, hasVisitedBefore]);

  // 1) Click → start Firebase auth (do NOT show loader yet)
  const handleSignIn = useCallback(async () => {
    try {
      clickedRef.current = true;
      if (typeof window !== "undefined")
        sessionStorage.setItem(POST_AUTH_FLAG, "1");
      await signIn();
    } catch (err) {
      console.error("Sign in error:", err);
      clickedRef.current = false;
      setShowLoader(false);
      setWorkPromise(undefined);
      if (typeof window !== "undefined")
        sessionStorage.removeItem(POST_AUTH_FLAG);
    }
  }, [signIn]);

  // 2) After Firebase confirms (user truthy) → hide login, show loader for FULL step time, prefetch dashboard
  useEffect(() => {
    if (!user || replacedRef.current) return;

    const fromRedirect =
      typeof window !== "undefined" &&
      sessionStorage.getItem(POST_AUTH_FLAG) === "1";

    // Already signed in on arrival → straight to dashboard
    if (!clickedRef.current && !fromRedirect) {
      replacedRef.current = true;
      router.replace("/dashboard");
      return;
    }

    // Show full-screen loader once
    if (!showLoader) {
      setShowLoader(true);
      router.prefetch("/dashboard"); // background warm-up during loader

      // HOLD for the full duration of the steps (FIX)
      const delay = new Promise<void>((r) => setTimeout(r, TOTAL_HOLD_MS));
      setWorkPromise(delay);

      if (fromRedirect) sessionStorage.setItem(POST_AUTH_FLAG, "consumed");
    }
  }, [user, router, showLoader, TOTAL_HOLD_MS]);

  // 3) Loader completes → navigate to dashboard, clear flags
  const handleLoaderDone = useCallback(() => {
    if (typeof window !== "undefined")
      sessionStorage.removeItem(POST_AUTH_FLAG);
    if (!replacedRef.current) {
      replacedRef.current = true;
      router.replace("/dashboard");
    }
  }, [router]);

  // While loader is visible, hide the login UI entirely
  if (showLoader) {
    return (
      <PostLoginGlassLoader
        open={true}
        workPromise={workPromise}
        onDone={handleLoaderDone}
        steps={LOADER_STEPS}
        stepDurationMs={STEP_DURATION_MS}
      />
    );
  }

  // ---- Login Page UI ----
  return (
    <div className="h-dvh w-full overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white relative">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-40 h-40 sm:w-48 sm:h-48 bg-gradient-to-r from-blue-400/15 to-purple-400/15 rounded-full blur-xl"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], rotate: [360, 180, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-44 h-44 sm:w-56 sm:h-56 bg-gradient-to-r from-pink-400/15 to-indigo-400/15 rounded-full blur-xl"
        />
      </div>

      {/* Two rows: (content group) / (footer) */}
      <div className="relative z-10 grid h-full grid-rows-[1fr,auto] px-4">
        {/* CONTENT GROUP — header + card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-3xl flex flex-col items-center gap-[clamp(10px,2.2vh,20px)]">
            {/* Header */}
            <header className="text-center select-none">
              <div className="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
                <span className="text-lg sm:text-xl" aria-hidden>
                  📝
                </span>
                <span className="sr-only">App logo</span>
              </div>
              <h1 className="font-bold leading-tight text-[clamp(1.4rem,3.2vw,2.4rem)]">
                {welcomeMessage}
              </h1>
              <p className="text-white/85 text-[clamp(.9rem,2vw,1.125rem)]">
                Your personal notes & money tracker
              </p>

              <div className="mt-1 flex justify-center gap-5">
                <div className="text-center">
                  <div className="mb-0.5" aria-hidden>
                    ⚡
                  </div>
                  <p className="text-[11px] text-white/80">Real-time</p>
                </div>
                <div className="text-center">
                  <div className="mb-0.5" aria-hidden>
                    🔒
                  </div>
                  <p className="text-[11px] text-white/80">Secure</p>
                </div>
                <div className="text-center">
                  <div className="mb-0.5" aria-hidden>
                    📱
                  </div>
                  <p className="text-[11px] text-white/80">Offline</p>
                </div>
              </div>
            </header>

            {/* Card */}
            <main className="w-full max-w-xl">
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5 shadow-2xl"
                aria-label="Sign in"
              >
                <h2 className="text-center font-semibold mb-3 text-[clamp(1rem,2.2vw,1.25rem)]">
                  Sign in to continue
                </h2>

                {error && (
                  <div
                    role="alert"
                    className="mb-3 rounded-lg border border-red-400/30 bg-red-500/20 px-3 py-2 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <span aria-hidden>⚠️</span>
                      <p className="font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {authMethod === "redirect" && (
                  <div className="mb-3 rounded-lg border border-blue-400/30 bg-blue-500/20 px-3 py-2 text-sm text-blue-100">
                    <div className="flex items-start gap-2">
                      <span aria-hidden>ℹ️</span>
                      <p>Using secure redirect authentication method.</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full select-none rounded-xl bg-white px-4 py-3 text-gray-800 font-medium shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label={loading ? "Signing in" : "Continue with Google"}
                >
                  {loading ? (
                    <>
                      <motion.span
                        aria-hidden
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="mr-3 inline-block h-5 w-5 rounded-full border-2 border-gray-400 border-t-transparent"
                      />
                      <span>
                        {authMethod === "redirect"
                          ? "Redirecting."
                          : "Signing in."}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-3 h-5 w-5"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
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
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>

                {/* Features 2x2 inside the card */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  {[
                    { icon: "📝", title: "Smart Notes", sub: "25+ templates" },
                    {
                      icon: "💰",
                      title: "Money Tracker",
                      sub: "Track expenses",
                    },
                    { icon: "☁️", title: "Cloud Sync", sub: "Access anywhere" },
                    { icon: "🤝", title: "Collaboration", sub: "Share notes" },
                  ].map((f) => (
                    <div
                      key={f.title}
                      className="bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/10 flex flex-col items-center justify-center gap-0.5"
                    >
                      <div className="text-[15px]" aria-hidden>
                        {f.icon}
                      </div>
                      <h3 className="text-[12px] font-medium leading-tight">
                        {f.title}
                      </h3>
                      <p className="text-[10px] text-white/70 leading-tight">
                        {f.sub}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.section>
            </main>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="pb-3 text-center">
          <div className="flex flex-wrap justify-center gap-2 mb-1">
            <span className="px-2 py-1 rounded bg-white/10 border border-white/10 text-[11px] text-white/70">
              Reliable
            </span>
            <span className="px-2 py-1 rounded bg-white/10 border border-white/10 text-[11px] text-white/70">
              Server Sync
            </span>
            <span className="px-2 py-1 rounded bg-white/10 border border-white/10 text-[11px] text-white/70">
              Made by Gaurav from scratch
            </span>
          </div>
          <p className="text-[10px] text-white/70">
            By signing in, you agree to our Terms and Privacy Policy.
          </p>
        </footer>
      </div>
    </div>
  );
}
