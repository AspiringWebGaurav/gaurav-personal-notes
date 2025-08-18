// src/components/PostLogoutGlassLoader.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  open: boolean;
  workPromise?: Promise<void>;
  onDone: () => void;
  steps: string[];
  stepDurationMs: number;
}

const PostLogoutGlassLoader: React.FC<Props> = ({
  open,
  workPromise,
  onDone,
  steps,
  stepDurationMs,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const doneRef = useRef(false);

  // Stepper (advances text/progress)
  useEffect(() => {
    if (!open) return;
    let s = 0;
    const id = window.setInterval(() => {
      s += 1;
      if (s < steps.length) setCurrentStep(s);
      else window.clearInterval(id);
    }, stepDurationMs);
    return () => window.clearInterval(id);
  }, [open, steps.length, stepDurationMs]);

  // Finish when background "work" completes, with guard against double-calls
  useEffect(() => {
    if (!open || !workPromise) return;
    let cancelled = false;
    workPromise.then(() => {
      if (cancelled || doneRef.current) return;
      doneRef.current = true;
      onDone();
    });
    return () => {
      cancelled = true;
    };
  }, [open, workPromise, onDone]);

  if (!open) return null;

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center text-white bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100vh",
        height: "100dvh",
        paddingTop: "max(0px, env(safe-area-inset-top))",
        paddingBottom: "max(0px, env(safe-area-inset-bottom))",
        paddingLeft: "max(0px, env(safe-area-inset-left))",
        paddingRight: "max(0px, env(safe-area-inset-right))",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-7 sm:p-8 shadow-2xl w-[min(560px,92vw)] text-center"
      >
        <div className="text-3xl mb-3" aria-hidden>
          👋
        </div>
        <h2 className="text-[18px] sm:text-[20px] font-semibold mb-1">
          Signing you out
        </h2>
        <p className="text-white/85 mb-5 min-h-[1.6em] text-[14px] sm:text-[15px] leading-snug">
          {steps[currentStep] || steps[steps.length - 1]}
        </p>

        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-2 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,.95), rgba(255,255,255,.55))",
              width: `${progress}%`,
              willChange: "width",
            }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          />
        </div>

        <p className="mt-3 text-[12px] text-white/75">
          You’ll be redirected to login in a moment…
        </p>

        <style jsx>{`
          @media (prefers-reduced-motion: reduce) {
            :global(div[role="status"]) * {
              transition: none !important;
              animation: none !important;
            }
          }
        `}</style>
      </motion.div>
    </div>
  );
};

export default PostLogoutGlassLoader;
