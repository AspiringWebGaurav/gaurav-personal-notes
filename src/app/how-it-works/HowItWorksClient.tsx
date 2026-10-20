"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cpu,
  Database,
  Cloud,
  ShieldCheck,
  RefreshCw,
  Zap,
  Lock,
  Smartphone,
  Laptop,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ArrowLeft,
  Sun,
  Moon,
  Layers,
  Sparkles,
  Server,
  FileCode2,
  GitBranch,
} from "lucide-react";

export function HowItWorksClient() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("app-theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        if (saved === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, []);

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

  const architectureLayers = [
    {
      step: "01",
      title: "Local-First Native Engine",
      subtitle: "Instant response with zero network latency",
      icon: <Database className="w-5 h-5 text-emerald-500" />,
      color: "emerald",
      badge: "Offline-First",
      description:
        "Every keystroke, note creation, edit, and search executes 100% locally on your device first. Desktop utilizes native SQLite embedded via Rust Tauri v2; Android runs an encrypted local store. You never wait for cloud roundtrips.",
      bullets: [
        "Sub-millisecond local reads and writes",
        "Full capability offline without internet connectivity",
        "Zero UI locking, spinlock delays, or network stalls",
      ],
    },
    {
      step: "02",
      title: "End-to-End Cryptography",
      subtitle: "AES-256-GCM encryption & Ed25519 signatures",
      icon: <Lock className="w-5 h-5 text-cyan-500" />,
      color: "cyan",
      badge: "Zero-Knowledge",
      description:
        "All note content, backups, and confidential payloads are sealed with military-grade AES-256-GCM encryption before sync. OTA binary packages are cryptographically signed with Ed25519 keys so only authentic code can run.",
      bullets: [
        "Hardware-accelerated AES-256-GCM payload containers",
        "Ed25519 signature verification before package install",
        "Confidential notes toggleable for strictly local storage",
      ],
    },
    {
      step: "03",
      title: "Dynamic Cloud Sync Engine",
      subtitle: "Bidirectional delta replication & conflict resolution",
      icon: <Cloud className="w-5 h-5 text-indigo-500" />,
      color: "indigo",
      badge: "Real-time Sync",
      description:
        "When an internet connection is active, GPN safely mirrors changed blocks to the Cloudflare R2 and Firebase sync cloud. Changes propagate across active desktop, mobile, and web companions in ~0.2s without overwriting newer work.",
      bullets: [
        "Lightweight delta updates minimize battery & data usage",
        "Conflict-free timestamp resolution for seamless multidevice editing",
        "Zero data loss if connectivity drops mid-session",
      ],
    },
    {
      step: "04",
      title: "In-Process Atomic Updates",
      subtitle: "Windows NTFS shadow swap & atomic mobile staging",
      icon: <RefreshCw className="w-5 h-5 text-violet-500" />,
      color: "violet",
      badge: "Zero Downtime",
      description:
        "Forget lengthy installers and intrusive UAC elevation dialogs. Desktop updates perform an in-process atomic NTFS file swap in under 1 second. Android updates stage transparently, preserving user sessions and preferences.",
      bullets: [
        "No NSIS installer wizards or noisy terminal flashes",
        "Transparent, opt-in update checks with polite notifications",
        "Single active OTA binary footprint prevents storage bloat",
      ],
    },
    {
      step: "05",
      title: "Completely Detached Platforms",
      subtitle: "Dedicated desktop, mobile, and web pipelines",
      icon: <Layers className="w-5 h-5 text-amber-500" />,
      color: "amber",
      badge: "Strict Isolation",
      description:
        "Desktop (Windows Tauri), Mobile (Android Capacitor), and Web Companion (Next.js) live in completely detached, self-contained environments. Zero cross-platform code bleeding ensures rock-solid stability and tailored native UX.",
      bullets: [
        "Windows: Native Rust Tauri backend with deep OS integration",
        "Android: Native Capacitor shell with system tray alerts & haptics",
        "Web: High-performance Next.js Turbopack companion",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/20 transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-40 h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mr-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to GPN</span>
          </Link>
          <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-2 text-xs font-mono">
            <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-zinc-600 dark:text-zinc-400">gpn</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">how-it-works</span>
          </div>
        </div>

        {/* Action Links & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/docs"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
          >
            <span>Docs</span>
          </Link>
          <Link
            href="/developers"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
          >
            <span>Developers</span>
          </Link>
          <Link
            href="/download"
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-xs transition-colors"
          >
            <span>Get App</span>
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer ml-1"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )
            ) : (
              <span className="w-4 h-4 block" />
            )}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800 py-16 sm:py-24 px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Architecture &amp; Engineering</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            How Gaurav Personal Notes Works
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Engineered with an offline-first philosophy, military-grade encryption, and seamless edge cloud sync.
            Discover how GPN delivers uncompromising speed, privacy, and continuous reliability.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/download"
              className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-semibold text-xs hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
            >
              <span>Download GPN Client</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/developers"
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors flex items-center gap-2"
            >
              <FileCode2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Explore Developer API</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Architecture Flow Diagram */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            End-to-End System Flow
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
            How data moves from your fingers to local storage and the encrypted cloud mirror
          </p>
        </div>

        {/* Visual Flow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-4">
                <Laptop className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600">Step 1 • Local Execution</span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-1">Instant Local Write</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                When you type or format text, changes commit directly to SQLite / native store in milliseconds. Full offline capability guaranteed.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Latency</span>
              <span className="font-semibold text-emerald-600">&lt; 2ms</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600">Step 2 • Encryption</span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-1">Payload Sealing</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Confidential content is sealed with AES-256-GCM. Unencrypted plaintext is never transmitted or exposed to intermediate proxy relays.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Standard</span>
              <span className="font-semibold text-cyan-600">AES-256-GCM</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 flex items-center justify-center mb-4">
                <Cloud className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-violet-600">Step 3 • Edge Mirror</span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-1">Real-time Delta Sync</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Lightweight deltas replicate across Cloudflare R2 and Firebase. Connected mobile and companion apps synchronize without collisions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Delivery</span>
              <span className="font-semibold text-violet-600">~ 200ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Dive Architecture Layers */}
      <section className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Architecture Pillars &amp; Deep-Dive
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            The core engineering principles ensuring stability, security, and lightning speed
          </p>
        </div>

        <div className="space-y-6">
          {architectureLayers.map((layer) => (
            <div
              key={layer.step}
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-sm transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    {layer.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-400">
                        {layer.step}
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                        {layer.title}
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {layer.subtitle}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {layer.badge}
                </span>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {layer.description}
              </p>

              <div className="mt-4 pt-4 border-t border-zinc-150 dark:border-zinc-800/80">
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {layer.bullets.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Specifications Matrix */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Technical Specifications</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-mono block">Desktop Engine</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">Tauri v2 + Rust</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-mono block">Mobile Shell</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">Capacitor 6 Native</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-mono block">Cryptography</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">AES-256 + Ed25519</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-mono block">Cloud Storage</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">Cloudflare R2 Edge</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Navigation */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 px-6 mt-12 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">Gaurav Personal Notes</span>
            <span>•</span>
            <span>Created by Gaurav Patil</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              App
            </Link>
            <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Documentation
            </Link>
            <Link href="/developers" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Developers
            </Link>
            <Link href="/download" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Downloads
            </Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
