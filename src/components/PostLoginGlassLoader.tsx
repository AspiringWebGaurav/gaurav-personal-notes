"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  workPromise?: Promise<unknown>;
  onDone?: () => void;
  stepDurationMs?: number;
  steps?: string[];
  brandNode?: React.ReactNode;
};

const DEFAULT_STEPS = [
  "Preparing dashboard…",
  "Loading preferences…",
  "Optimizing experience…",
  "Handshaking with server…",
  "Finalizing & opening…",
];

export default function PostLoginGlassLoader({
  open,
  workPromise,
  onDone,
  stepDurationMs = 600,
  steps = DEFAULT_STEPS,
  brandNode,
}: Props) {
  const totalSteps = useMemo(() => Math.max(1, steps.length), [steps.length]);

  const [step, setStep] = useState(0); // 0..totalSteps
  const [finishing, setFinishing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  // advance steps (timer) while open
  useEffect(() => {
    if (!open) return;

    // reset each time we open
    setStep(1);
    setFinishing(false);
    doneRef.current = false;

    const tick = () => {
      setStep((s) => {
        if (s >= totalSteps) {
          if (!doneRef.current) {
            doneRef.current = true;
            setFinishing(true);
            window.setTimeout(() => onDone?.(), 200); // small fade-out budget
          }
          return s;
        }
        return s + 1;
      });
    };

    timerRef.current = window.setInterval(
      tick,
      stepDurationMs
    ) as unknown as number;

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, stepDurationMs, totalSteps, onDone]);

  // finish early if background work resolves
  useEffect(() => {
    if (!open || !workPromise) return;
    let cancelled = false;
    workPromise.finally(() => {
      if (cancelled) return;
      if (!doneRef.current) {
        doneRef.current = true;
        setStep(totalSteps);
        setFinishing(true);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        window.setTimeout(() => onDone?.(), 200);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, workPromise, totalSteps, onDone]);

  const percent = Math.min(100, Math.max(0, (step / totalSteps) * 100));
  const visible = open && (!finishing || (finishing && !doneRef.current));
  if (!visible) return null;

  return (
    <div
      className="plgl__overlay"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${Math.round(percent)}%`}
    >
      <div
        className="plgl__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Please wait"
      >
        <div className="plgl__brand">
          {brandNode ?? <div className="plgl__dot" aria-hidden />}
        </div>

        {/* step pills (hidden on very small screens) */}
        <div
          className="plgl__stepsRow"
          aria-label={`Step ${Math.min(step, totalSteps)} of ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }, (_, i) => {
            const idx = i + 1;
            const state =
              idx < step ? "done" : idx === step ? "active" : "todo";
            return (
              <span key={idx} className={`plgl__step ${state}`} aria-hidden>
                {idx}
              </span>
            );
          })}
        </div>

        <div className="plgl__barWrap" aria-hidden>
          <div className="plgl__bar" style={{ width: `${percent}%` }} />
        </div>

        <div className="plgl__headline">
          {steps[Math.min(step - 1, steps.length - 1)] ??
            steps[steps.length - 1]}
        </div>

        <div className="plgl__footer" aria-hidden>
          Secure handshake in progress — do not close
        </div>
      </div>

      <style jsx>{`
        /* overlay uses modern viewport units with fallbacks + safe areas */
        .plgl__overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;

          /* ✨ match your logout look */
          background-image: linear-gradient(
            135deg,
            #1e1b4b,
            #581c87 50%,
            #831843
          ); /* from-indigo-900 via-purple-900 to-pink-900 */
          color: #fff;

          /* keep a subtle glass feel over the gradient */
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);

          min-height: 100vh;
          height: 100dvh; /* mobile-friendly */
          padding-top: max(0px, env(safe-area-inset-top));
          padding-bottom: max(0px, env(safe-area-inset-bottom));
          padding-left: max(0px, env(safe-area-inset-left));
          padding-right: max(0px, env(safe-area-inset-right));
          animation: plgl_fade_in 160ms ease-out;
          will-change: opacity, transform;
        }

        .plgl__panel {
          width: min(560px, 92vw);
          max-width: 560px;
          border-radius: 16px;
          background: rgba(20, 20, 24, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
          padding: clamp(18px, 4.5vw, 28px) clamp(16px, 4vw, 24px);
          color: #fff;
          text-align: center;
          backdrop-filter: saturate(120%) blur(10px);
          -webkit-backdrop-filter: saturate(120%) blur(10px);
        }

        .plgl__brand {
          display: grid;
          place-items: center;
          margin-bottom: clamp(10px, 2.5vw, 18px);
        }
        .plgl__dot {
          width: clamp(14px, 3.6vw, 18px);
          height: clamp(14px, 3.6vw, 18px);
          border-radius: 999px;
          background: #fff;
          opacity: 0.95;
          animation: plgl_pulse 900ms ease-in-out infinite;
          will-change: transform, opacity;
        }

        .plgl__stepsRow {
          display: flex;
          justify-content: center;
          gap: clamp(6px, 1.8vw, 10px);
          font-variant-numeric: tabular-nums;
          margin-bottom: 10px;
        }
        /* hide pills on very small screens for readability */
        @media (max-width: 360px) {
          .plgl__stepsRow {
            display: none;
          }
        }
        .plgl__step {
          width: clamp(22px, 6.5vw, 28px);
          height: clamp(22px, 6.5vw, 28px);
          border-radius: 8px;
          display: grid;
          place-items: center;
          font-weight: 600;
          font-size: clamp(11px, 3.1vw, 14px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.68);
          background: rgba(255, 255, 255, 0.06);
          transition: transform 120ms ease, background 120ms ease,
            color 120ms ease, border-color 120ms ease;
        }
        .plgl__step.active {
          color: #fff;
          border-color: rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-1px);
        }
        .plgl__step.done {
          color: rgba(255, 255, 255, 0.45);
          background: rgba(255, 255, 255, 0.06);
          border-style: dashed;
        }

        .plgl__barWrap {
          position: relative;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
          margin: 4px auto 12px;
        }
        .plgl__bar {
          height: 100%;
          width: 0%;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.9),
            rgba(255, 255, 255, 0.55)
          );
          border-radius: inherit;
          transition: width 280ms ease;
          will-change: width;
        }

        .plgl__headline {
          font-size: clamp(14px, 3.7vw, 16px);
          font-weight: 600;
          letter-spacing: 0.15px;
          margin-bottom: 8px;
          line-height: 1.25;
        }
        .plgl__footer {
          font-size: clamp(11px, 3.1vw, 12px);
          color: rgba(255, 255, 255, 0.68);
        }

        /* prefers-reduced-motion: slow down or remove nonessential motion */
        @media (prefers-reduced-motion: reduce) {
          .plgl__dot {
            animation: none;
          }
          .plgl__step,
          .plgl__bar {
            transition: none !important;
          }
        }

        @keyframes plgl_pulse {
          0% {
            transform: scale(0.96);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.04);
            opacity: 1;
          }
          100% {
            transform: scale(0.96);
            opacity: 0.8;
          }
        }
        @keyframes plgl_fade_in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}