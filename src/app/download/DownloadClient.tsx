"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Monitor,
  Smartphone,
  ExternalLink,
  Download,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Globe,
  CheckCircle2,
  Laptop,
  Layers,
} from "lucide-react";

export type DetectedPlatform = "android" | "windows" | "ios" | "mac" | "linux" | "other";

function detectPlatform(): DetectedPlatform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/win(dows|32|64|95|98|nt)/i.test(ua)) return "windows";
  if (/mac(intosh|os)/i.test(ua)) return "mac";
  if (/linux/i.test(ua)) return "linux";
  return "other";
}

interface DownloadClientProps {
  desktopDownloadUrl: string;
  desktopShareUrl: string;
  desktopEmbedUrl: string;
  mobileDownloadUrl: string;
  mobileShareUrl: string;
  mobileEmbedUrl: string;
}

type MobileTab = "all" | "android" | "windows";

export function DownloadClient({
  desktopDownloadUrl,
  desktopShareUrl,
  desktopEmbedUrl: _desktopEmbedUrl,
  mobileDownloadUrl,
  mobileShareUrl,
  mobileEmbedUrl: _mobileEmbedUrl,
}: DownloadClientProps) {
  const [detectedOS, setDetectedOS] = useState<DetectedPlatform>("other");
  const [mobileTab, setMobileTab] = useState<MobileTab>("all");

  useEffect(() => {
    const platform = detectPlatform();
    setDetectedOS(platform);
  }, []);

  return (
    <div className="relative w-full h-dvh max-h-dvh overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none font-sans antialiased">
      {/* Background Ambient Glow (Subtle & Lightweight) */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-tr from-violet-600/15 via-indigo-500/10 to-cyan-500/15 blur-3xl rounded-full dark:opacity-40 opacity-30" 
      />

      {/* =========================================================================
          1. DEDICATED MOBILE LAYOUT (Strict 100dvh, Fits Entirely In Viewport, Zero Scroll)
          ========================================================================= */}
      <div className="flex md:hidden h-full max-h-dvh w-full flex-col justify-between overflow-hidden p-3 relative z-10">
        
        {/* Mobile Header */}
        <header className="w-full h-9 flex items-center justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-900/80 pb-1">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-violet-600 to-cyan-500 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
              G
            </div>
            <span className="font-bold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
              Gaurav Notes
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v0.0.0
            </span>
            <Link
              href="/dashboard"
              className="px-2 py-0.5 rounded-md text-[10px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Web App
            </Link>
          </div>
        </header>

        {/* Mobile Main Body */}
        <div className="flex-1 min-h-0 flex flex-col justify-evenly py-1 gap-1.5">
          
          {/* Mobile Hero Header */}
          <div className="shrink-0 text-center">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-[9px] font-semibold mb-0.5">
              <Sparkles className="w-2.5 h-2.5 text-violet-500" />
              <span>
                {detectedOS === "android"
                  ? "Android Device Detected"
                  : detectedOS === "windows"
                  ? "Windows PC Detected"
                  : detectedOS === "ios"
                  ? "iOS Device • Web Ready"
                  : "Native Cross-Platform Apps"}
              </span>
            </div>

            <h1 className="text-lg font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
              <span>Download </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
                Personal Notes
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-normal max-w-xs mx-auto line-clamp-1">
              Offline-first encrypted notes • Instant SQLite search • Cloud sync
            </p>

            {/* Mobile View Switcher Tabs */}
            <div className="mt-1.5 inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 text-[10px] font-medium shadow-2xs">
              <button
                type="button"
                onClick={() => setMobileTab("all")}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all ${
                  mobileTab === "all"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Layers className="w-2.5 h-2.5" />
                <span>All Apps</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("android")}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all ${
                  mobileTab === "android"
                    ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Smartphone className="w-2.5 h-2.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("windows")}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all ${
                  mobileTab === "windows"
                    ? "bg-white dark:bg-zinc-800 text-violet-600 dark:text-violet-400 font-semibold shadow-2xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Laptop className="w-2.5 h-2.5" />
                <span>Windows</span>
              </button>
            </div>
          </div>

          {/* TAB 1: ALL APPS (Sleek Compact Dual Widgets) */}
          {mobileTab === "all" && (
            <div className="flex flex-col gap-1.5 flex-1 min-h-0 justify-center">
              {/* Android Compact Card */}
              <div
                className={`rounded-xl border p-2.5 flex flex-col justify-between transition-all ${
                  detectedOS === "android"
                    ? "border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500/20"
                    : "border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            GPN for Android
                          </h2>
                          {detectedOS === "android" && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-600 text-white">
                              Your Device
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-400">
                          Universal APK • ~4.1 MB • Android 10+
                        </p>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 shrink-0">
                      v0.0.0
                    </span>
                  </div>

                  {/* Micro Chips */}
                  <div className="flex items-center gap-1 mb-2">
                    <span className="px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 text-[9px] font-medium">
                      Offline SQLite
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 text-[9px] font-medium">
                      Instant Search
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 text-[9px] font-medium">
                      Edge Gestures
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <a
                    href={mobileDownloadUrl}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-[11px] font-semibold shadow-xs transition-all"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download APK (~4.1 MB)</span>
                  </a>
                  <a
                    href={mobileShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold transition-all shrink-0"
                    title="Download Mirror"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Mirror</span>
                  </a>
                </div>
              </div>

              {/* Windows Compact Card */}
              <div
                className={`rounded-xl border p-2.5 flex flex-col justify-between transition-all ${
                  detectedOS === "windows"
                    ? "border-violet-500/70 bg-violet-50/40 dark:bg-violet-950/20 shadow-xs ring-1 ring-violet-500/20"
                    : "border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs shrink-0">
                        <Monitor className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            GPN for Windows
                          </h2>
                          {detectedOS === "windows" && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-violet-600 text-white">
                              Your PC
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-400">
                          64-bit EXE • ~3.7 MB • Win 10 &amp; 11
                        </p>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-violet-100/70 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 shrink-0">
                      v0.0.0
                    </span>
                  </div>

                  {/* Micro Chips */}
                  <div className="flex items-center gap-1 mb-2">
                    <span className="px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 text-[9px] font-medium">
                      SQLite FTS5
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 text-[9px] font-medium">
                      Ctrl+N Shortcuts
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 text-[9px] font-medium">
                      System Tray
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <a
                    href={desktopDownloadUrl}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 active:scale-[0.98] text-[11px] font-semibold shadow-xs transition-all"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .exe (~3.7 MB)</span>
                  </a>
                  <a
                    href={desktopShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold transition-all shrink-0"
                    title="Download Mirror"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Mirror</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FOCUSED ANDROID SHOWCASE */}
          {mobileTab === "android" && (
            <div className="flex flex-col gap-2 flex-1 min-h-0 justify-center">
              <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-50/50 via-emerald-50/20 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-transparent p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Smartphone className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                          GPN for Android
                        </h2>
                        {detectedOS === "android" && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-600 text-white">
                            Your Device
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Universal APK • ~4.1 MB • Target ARM64 / x86_64
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    v0.0.0
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Instant offline SQLite</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Native gesture layout</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Encrypted local storage</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Seamless cloud sync</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={mobileDownloadUrl}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download APK (4.1 MB)</span>
                  </a>
                  <a
                    href={mobileShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 h-10 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all shrink-0"
                    title="Download Mirror"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Mirror</span>
                  </a>
                </div>
              </div>

              {/* Quick Switch to Windows */}
              <button
                type="button"
                onClick={() => setMobileTab("windows")}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-[10px] text-zinc-600 dark:text-zinc-400"
              >
                <span className="flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-violet-500" />
                  <span>Looking for Windows PC? (.exe ~3.7 MB)</span>
                </span>
                <span className="font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-0.5">
                  Switch <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </button>
            </div>
          )}

          {/* TAB 3: FOCUSED WINDOWS SHOWCASE */}
          {mobileTab === "windows" && (
            <div className="flex flex-col gap-2 flex-1 min-h-0 justify-center">
              <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-50/50 via-violet-50/20 to-transparent dark:from-violet-950/30 dark:via-violet-950/10 dark:to-transparent p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs shrink-0">
                      <Monitor className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                          GPN for Windows
                        </h2>
                        {detectedOS === "windows" && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-violet-600 text-white">
                            Your PC
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        64-bit EXE • ~3.7 MB • Windows 10 &amp; 11
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                    v0.0.0
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px] text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-violet-500" />
                    <span>Instant SQLite search</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-violet-500" />
                    <span>Ctrl+N / Ctrl+S shortcuts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-violet-500" />
                    <span>System tray background run</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-violet-500" />
                    <span>Atomic shadow auto-updates</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={desktopDownloadUrl}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 active:scale-[0.98] text-xs font-semibold shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .exe (3.7 MB)</span>
                  </a>
                  <a
                    href={desktopShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 h-10 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all shrink-0"
                    title="Download Mirror"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Mirror</span>
                  </a>
                </div>
              </div>

              {/* Quick Switch to Android */}
              <button
                type="button"
                onClick={() => setMobileTab("android")}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-[10px] text-zinc-600 dark:text-zinc-400"
              >
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Looking for Android? (APK ~4.1 MB)</span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  Switch <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </button>
            </div>
          )}

          {/* Browser Web App Banner */}
          <Link
            href="/dashboard"
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/70 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Globe className="w-3 h-3 text-violet-500 shrink-0" />
              <span>Prefer browser? Use Web App (Chrome, Safari, Edge)</span>
            </span>
            <ArrowRight className="w-2.5 h-2.5 text-zinc-400 shrink-0 ml-1" />
          </Link>

        </div>

        {/* Mobile Footer */}
        <footer className="w-full h-6 flex items-center justify-between text-[9px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-900 shrink-0">
          <div>&copy; {new Date().getFullYear()} Gaurav Personal Notes</div>
          <div className="flex items-center gap-2.5">
            <Link href="/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-600 dark:hover:text-zinc-300">
              Terms
            </Link>
            <span>•</span>
            <a
              href="https://gphost.eu.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              GPHost
            </a>
          </div>
        </footer>

      </div>


      {/* =========================================================================
          2. DESKTOP LAYOUT (Strict 100vh, Single View, Zero Vertical Scroll)
          ========================================================================= */}
      <div className="hidden md:flex h-full max-h-screen w-full flex-col justify-between overflow-hidden relative z-10">
        
        {/* Desktop Navbar */}
        <header className="w-full px-6 lg:px-8 h-14 lg:h-16 flex items-center justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-900/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
              G
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              Gaurav Personal Notes
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <Link 
              href="/dashboard" 
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Open Web App
            </Link>
            <Link 
              href="/docs" 
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Docs
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live • v0.0.0
            </span>
          </nav>
        </header>

        {/* Desktop Main Content - Carefully budgeted vertically to guarantee NO vertical scrollbar */}
        <main className="w-full flex-1 min-h-0 flex flex-col justify-evenly py-2 lg:py-4 px-6 lg:px-8 max-w-6xl mx-auto">
          
          {/* Headline Section */}
          <div className="text-left shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-[11px] font-semibold mb-2">
              <Sparkles className="w-3 h-3 text-violet-500" />
              <span>Cross-Platform Native Apps</span>
              {detectedOS !== "other" && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="text-zinc-700 dark:text-zinc-300 capitalize font-medium">
                    Detected: {detectedOS}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-3xl lg:text-4xl 2xl:text-5xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
              <span>Download </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
                Gaurav Personal Notes
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs lg:text-sm mt-1 font-normal max-w-2xl">
              Offline-first architecture with instant full-text search, encrypted local vaults, and optional account sync across all your devices.
            </p>
          </div>

          {/* Dual Platform Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 shrink-0">
            
            {/* Card 1: Windows Desktop */}
            <div
              className={`relative rounded-2xl border p-5 lg:p-6 flex flex-col justify-between transition-all shadow-xs hover:shadow-md ${
                detectedOS === "windows"
                  ? "border-violet-500/70 bg-violet-50/20 dark:bg-violet-950/20 ring-1 ring-violet-500/30"
                  : "border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/40 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs shrink-0">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                          GPN for Windows
                        </h2>
                        {detectedOS === "windows" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-violet-600 text-white shadow-2xs">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Your Device</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Windows 10 &amp; 11 (64-bit)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-900/60">
                    v0.0.0
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs lg:text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                  Native desktop experience with instant SQLite full-text search, keyboard shortcuts (<code className="px-1 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-[11px] font-mono">Ctrl+N</code>, <code className="px-1 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-[11px] font-mono">Ctrl+S</code>), and seamless system tray integration.
                </p>
              </div>

              {/* Actions & Specs */}
              <div>
                <div className="flex items-center gap-2.5 mb-3.5">
                  <a
                    href={desktopDownloadUrl}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 lg:h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-xs lg:text-sm font-semibold shadow-xs active:scale-[0.99] transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download for Windows (.exe)</span>
                  </a>

                  <a
                    href={desktopShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 h-10 lg:h-11 rounded-xl bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all border border-zinc-200/90 dark:border-zinc-700/90 shrink-0"
                    title="Download Mirror"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Mirror</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>
                </div>

                <div className="pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-x-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Architecture:</span> x64</div>
                  <div className="text-zinc-300 dark:text-zinc-700">•</div>
                  <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Storage:</span> Encrypted SQLite</div>
                  <div className="text-zinc-300 dark:text-zinc-700">•</div>
                  <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Size:</span> ~3.7 MB</div>
                </div>
              </div>
            </div>

            {/* Card 2: Android Mobile */}
            <div
              className={`relative rounded-2xl border p-5 lg:p-6 flex flex-col justify-between transition-all shadow-xs hover:shadow-md ${
                detectedOS === "android"
                  ? "border-emerald-500/70 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                  : "border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/40 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                          GPN for Android
                        </h2>
                        {detectedOS === "android" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Your Device</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Android 10+ (API 29–35)</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">
                    v0.0.0 APK
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs lg:text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                  Handheld notes with touch gestures, smooth edge-to-edge Android viewport, bottom tab navigation, dynamic storage insights, and scoped offline data security.
                </p>
              </div>

              {/* Actions & Specs */}
              <div>
                <div className="flex items-center gap-2.5 mb-3.5">
                  <a
                    href={mobileDownloadUrl}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 lg:h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs lg:text-sm font-semibold shadow-xs active:scale-[0.99] transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download for Android (.apk)</span>
                  </a>

                  <a
                    href={mobileShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 h-10 lg:h-11 rounded-xl bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all border border-zinc-200/90 dark:border-zinc-700/90 shrink-0"
                    title="Download Mirror"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Mirror</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>
                </div>

                <div className="pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-x-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Package:</span> Universal APK</div>
                  <div className="text-zinc-300 dark:text-zinc-700">•</div>
                  <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Target:</span> ARM64 / x86_64</div>
                  <div className="text-zinc-300 dark:text-zinc-700">•</div>
                  <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Size:</span> ~4.1 MB</div>
                </div>
              </div>
            </div>

          </div>

          {/* Web App Alternate Option */}
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 py-2.5 px-4 flex items-center justify-between gap-4 text-left bg-zinc-50/40 dark:bg-zinc-900/20 shrink-0">
            <div>
              <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-violet-500" />
                <span>Prefer working directly in your browser?</span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Access your synchronized notes from Chrome, Edge, Safari, or Firefox without installing anything.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shrink-0"
            >
              <span>Launch Web App</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

        </main>

        {/* Desktop Footer */}
        <footer className="w-full px-6 lg:px-8 h-10 border-t border-zinc-100 dark:border-zinc-900/60 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">
          <div>&copy; {new Date().getFullYear()} Gaurav Personal Notes</div>
          <div className="flex items-center gap-5">
            <Link 
              href="/privacy" 
              className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Privacy
            </Link>
            <Link 
              href="/terms" 
              className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Terms
            </Link>
            <span className="text-zinc-200 dark:text-zinc-800">|</span>
            <a
              href="https://gphost.eu.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              Powered by GPHost Cloud Engine
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
}

