// src/app/postlogout/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import PostLogoutGlassLoader from "@/components/PostLogoutGlassLoader";

/**
 * Robust post-logout flow:
 * - Navigate here first from the navbar.
 * - Trigger signOut() once (StrictMode-safe).
 * - Keep animation up ~3.8–4.0s while signOut runs.
 * - If signOut hangs, use a max timeout fallback.
 * - Redirect to /login exactly once.
 */
const STEPS = [
  "Saving your changes…",
  "Clearing session…",
  "Securing your data…",
  "Signing you out…",
  "Redirecting to login…",
];
const STEP_DURATION_MS = 750; // 5 * 750 ~= 3750ms

export default function PostLogoutPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [workPromise, setWorkPromise] = useState<Promise<void> | undefined>();
  const HOLD_MS = useMemo(
    () => STEPS.length * STEP_DURATION_MS + 200, // small buffer to let last step render fully
    []
  );

  // guard against StrictMode double-mount
  const startedRef = useRef(false);
  // make sure we only navigate once
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // 1) Start signOut with a MAX timeout fallback so it can never hang the UI.
    const signOutMax = Promise.race([
      (async () => {
        try {
          await signOut();
        } catch (e) {
          console.error("signOut error (non-fatal):", e);
        }
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)), // max wait 5s
    ]);

    // 2) UI hold for full step duration (prevents cutting mid-step).
    const uiHold = new Promise<void>((resolve) => setTimeout(resolve, HOLD_MS));

    // 3) We complete when BOTH finish.
    const both = Promise.allSettled([signOutMax, uiHold]).then(() => {});

    setWorkPromise(both);

    // Prefetch target for snappier transition
    router.prefetch("/login");

    // 4) Absolute failsafe — navigate even if above somehow doesn't fire.
    const hardFailSafe = setTimeout(() => {
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        router.replace("/login");
      }
    }, HOLD_MS + 6000); // UI hold + max signOut + buffer

    return () => clearTimeout(hardFailSafe);
  }, [router, signOut, HOLD_MS]);

  const handleDone = useCallback(() => {
    if (!navigatedRef.current) {
      navigatedRef.current = true;
      router.replace("/login");
    }
  }, [router]);

  return (
    <PostLogoutGlassLoader
      open={true}
      workPromise={workPromise}
      onDone={handleDone}
      steps={STEPS}
      stepDurationMs={STEP_DURATION_MS}
    />
  );
}
