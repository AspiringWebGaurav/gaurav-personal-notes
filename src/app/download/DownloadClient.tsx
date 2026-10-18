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

export function DownloadClient({
  desktopDownloadUrl,
  desktopShareUrl,
  desktopEmbedUrl,
  mobileDownloadUrl,
  mobileShareUrl,
  mobileEmbedUrl,
}: DownloadClientProps) {
  const [detectedOS, setDetectedOS] = useState<DetectedPlatform>("other");

  useEffect(() => {
    setDetectedOS(detectPlatform());
  }, []);

  return (
    <>
      {/* =========================================================================
          1. DEDICATED MOBILE LAYOUT (Strict 100dvh, Fits Entirely In Viewport, Zero Scroll)
          ========================================================================= */}
      <div className="flex md:hidden h-dvh max-h-dvh w-full flex-col justify-between overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none p-3.5 font-sans antialiased">
        
        {/* Mobile Header */}
        <header className="w-full h-10 flex items-center justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-900 pb-1">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              G
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              Gaurav Notes
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v0.0.0
            </span>
            <Link
              href="/dashboard"
              className="px-2 py-0.5 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Web App
            </Link>
          </div>
        </header>

        {/* Mobile Main Body (Naturally balanced vertically) */}
        <div className="flex-1 min-h-0 flex flex-col justify-evenly py-1 gap-2">
          
          {/* Mobile Hero Header */}
          <div className="shrink-0 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-[10px] font-semibold mb-1">
              <Sparkles className="w-3 h-3 text-violet-500" />
              <span>
                {detectedOS === "android"
                  ? "Android Detected • Recommended Below"
                  : detectedOS === "windows"
                  ? "Windows PC Detected"
                  : detectedOS === "ios"
                  ? "iOS Detected • Web App Available"
                  : "Cross-Platform Native Apps"}
              </span>
            </div>

            <h1 className="text-xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
              <span>Download </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
                Personal Notes
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 font-normal max-w-xs mx-auto line-clamp-1">
              Offline-first encrypted notes with instant search &amp; cloud sync.
            </p>
          </div>

          {/* Mobile Card 1: GPN for Android */}
          <div
            className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
              detectedOS === "android"
                ? "border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/25 shadow-xs ring-1 ring-emerald-500/30"
                : "border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/60 dark:bg-zinc-900/40"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        GPN for Android
                      </h2>
                      {detectedOS === "android" && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white">
                          Your Device
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Android 10+ • Universal APK • ~4.1 MB
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 shrink-0">
                  v0.0.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-1 mb-2.5">
                Touch gestures, offline SQLite vault, edge-to-edge layout &amp; instant sync.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <a
                href={mobileDownloadUrl}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download APK (~4.1 MB)</span>
              </a>
              <a
                href={mobileShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all shrink-0"
                title="Download Mirror"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px]">Mirror</span>
              </a>
            </div>
          </div>

          {/* Mobile Card 2: GPN for Windows */}
          <div
            className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
              detectedOS === "windows"
                ? "border-violet-500/80 bg-violet-50/50 dark:bg-violet-950/25 shadow-xs ring-1 ring-violet-500/30"
                : "border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/60 dark:bg-zinc-900/40"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs shrink-0">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        GPN for Windows
                      </h2>
                      {detectedOS === "windows" && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-violet-600 text-white">
                          Your PC
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Windows 10 &amp; 11 • 64-bit EXE • ~3.7 MB
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100/80 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 shrink-0">
                  v0.0.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-1 mb-2.5">
                System tray, keyboard shortcuts (Ctrl+N/S) &amp; high-performance SQLite FTS5.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <a
                href={desktopDownloadUrl}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 active:scale-[0.98] text-xs font-semibold shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .exe (~3.7 MB)</span>
              </a>
              <a
                href={desktopShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all shrink-0"
                title="Download Mirror"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px]">Mirror</span>
              </a>
            </div>
          </div>

          {/* Browser Web App Banner */}
          <Link
            href="/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800/70 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 text-violet-500 shrink-0" />
              <span>Use in Browser (Chrome, Safari, Edge)</span>
            </span>
            <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0 ml-1" />
          </Link>

        </div>

        {/* Mobile Footer */}
        <footer className="w-full h-7 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-900 shrink-0">
          <div>&copy; {new Date().getFullYear()} Gaurav Personal Notes</div>
          <div className="flex items-center gap-3">
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
          2. DESKTOP LAYOUT (Clean, Full-featured, Enhanced with OS Detection)
          ========================================================================= */}
      <div className="hidden md:flex min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex-col justify-between selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900 font-sans antialiased">
        
        {/* Desktop Navbar */}
        <header className="w-full px-6 lg:px-8 h-18 lg:h-20 flex items-center justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-900/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              G
            </div>
            <span className="font-semibold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
              Gaurav Personal Notes
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              ● Live • v0.0.0
            </span>
          </nav>
        </header>

        {/* Desktop Main Content */}
        <main className="w-full flex-1 flex flex-col justify-center py-10 lg:py-14 px-6 lg:px-8 max-w-7xl mx-auto">
          
          {/* Headline Section */}
          <div className="mb-10 lg:mb-12 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
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

            <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
              <span>Download </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
                Gaurav Personal Notes
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-base mt-3 font-normal max-w-2xl">
              Offline-first architecture with instant full-text search, encrypted local vaults, and optional account sync across all your devices.
            </p>
          </div>

          {/* Dual Platform Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            
            {/* Card 1: Windows Desktop */}
            <div
              className={`relative rounded-2xl border p-7 lg:p-8 flex flex-col justify-between transition-all shadow-sm hover:shadow-md ${
                detectedOS === "windows"
                  ? "border-violet-500/80 bg-violet-50/20 dark:bg-violet-950/20 ring-1 ring-violet-500/30"
                  : "border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-sm shrink-0">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                          GPN for Windows
                        </h2>
                        {detectedOS === "windows" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-600 text-white shadow-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Your Device</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Windows 10 &amp; 11 (64-bit)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-900/60">
                    v0.0.0
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                  Native desktop experience with instant SQLite full-text search, keyboard shortcuts (<code className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-xs font-mono">Ctrl+N</code>, <code className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-xs font-mono">Ctrl+S</code>), and seamless system tray integration.
                </p>
              </div>

              {/* Actions & Specs */}
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <a
                    href={desktopDownloadUrl}
                    className="inline-flex items-center justify-center gap-2.5 px-6 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-sm font-semibold shadow-md active:scale-[0.99] transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download for Windows (.exe)</span>
                  </a>

                  <a
                    href={desktopShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 h-12 rounded-xl bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 text-sm font-semibold transition-all border border-zinc-200/90 dark:border-zinc-700/90"
                    title="Download Mirror"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Mirror</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>
                </div>

                <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
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
              className={`relative rounded-2xl border p-7 lg:p-8 flex flex-col justify-between transition-all shadow-sm hover:shadow-md ${
                detectedOS === "android"
                  ? "border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30"
                  : "border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                          GPN for Android
                        </h2>
                        {detectedOS === "android" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Your Device</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Android 10+ (API 29–35)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60">
                    v0.0.0 APK
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                  Handheld notes with touch gestures, smooth edge-to-edge Android viewport, bottom tab navigation, dynamic storage insights, and scoped offline data security.
                </p>
              </div>

              {/* Actions & Specs */}
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <a
                    href={mobileDownloadUrl}
                    className="inline-flex items-center justify-center gap-2.5 px-6 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md active:scale-[0.99] transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download for Android (.apk)</span>
                  </a>

                  <a
                    href={mobileShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 h-12 rounded-xl bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 text-sm font-semibold transition-all border border-zinc-200/90 dark:border-zinc-700/90"
                    title="Download Mirror"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Mirror</span>
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>
                </div>

                <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
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
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left bg-zinc-50/40 dark:bg-zinc-900/20">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-500" />
                <span>Prefer working directly in your browser?</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Access your synchronized notes from Chrome, Edge, Safari, or Firefox without installing anything.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shrink-0"
            >
              <span>Launch Web App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </main>

        {/* Desktop Footer */}
        <footer className="w-full px-6 lg:px-8 h-14 border-t border-zinc-100 dark:border-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
          <div>&copy; {new Date().getFullYear()} Gaurav Personal Notes</div>
          <div className="flex items-center gap-6">
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
    </>
  );
}
