"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Code2,
  Terminal,
  Cpu,
  Database,
  Cloud,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Sun,
  Moon,
  Sparkles,
  Server,
  Layers,
  FileCode,
  Zap,
  Globe,
  Radio,
  BookOpen,
} from "lucide-react";

export function DevelopersClient() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sampleManifest = `{
  "version": "0.0.5",
  "binaryFileId": "2KuX0uDopFSZ",
  "downloadUrl": "https://gphost.eu.cc/raw/2KuX0uDopFSZ",
  "signature": "MC4CAQACBQDY...single-line-base64...",
  "notes": "v0.0.5: Clean minimalistic notification UI and async multi-device rollout engine.",
  "isBigUpdate": false,
  "size": 439002,
  "minSupportedVersion": "0.0.1",
  "publishedAt": "2026-10-20T06:18:23.000Z"
}`;

  const sampleCurl = `# 1. Fetch latest active release manifest
curl -s https://gpnotes.eu.cc/api/releases/mobile/latest

# 2. Check binary health status
curl -I https://gphost.eu.cc/raw/2KuX0uDopFSZ`;

  const sampleTypeScript = `import { cleanVersion } from './utils/version';

interface ReleaseManifest {
  version: string;
  downloadUrl: string;
  signature: string;
  notes: string;
  isBigUpdate?: boolean;
}

export async function checkLatestUpdate(curVersion: string): Promise<ReleaseManifest | null> {
  const res = await fetch('https://gpnotes.eu.cc/api/releases/mobile/latest', {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store'
  });
  if (!res.ok) return null;
  const manifest: ReleaseManifest = await res.json();
  return cleanVersion(manifest.version) > cleanVersion(curVersion) ? manifest : null;
}`;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-cyan-500/20 transition-colors">
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
            <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-zinc-600 dark:text-zinc-400">gpn</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">developers</span>
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
            href="/how-it-works"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
          >
            <span>How It Works</span>
          </Link>
          <a
            href="https://github.com/AspiringWebGaurav"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white font-medium transition-colors shadow-2xs"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
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

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800 py-16 sm:py-20 px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-cyan-500/10 dark:bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/60 text-xs font-semibold text-cyan-700 dark:text-cyan-300 shadow-2xs">
            <Code2 className="w-3.5 h-3.5 text-cyan-600" />
            <span>Developer API &amp; Architecture Reference</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            GPN Developer Portal
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            API endpoints, Over-The-Air release delivery manifests, Cloudflare R2 storage schemas,
            and cryptographic payload structures.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Section 1: Endpoints Overview */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Globe className="w-4 h-4 text-cyan-600" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Release Delivery Endpoints
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Gaurav Personal Notes publishes atomic release manifests consumed directly by desktop and mobile updater engines.
          </p>

          <div className="space-y-2.5">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  GET
                </span>
                <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  /api/releases/mobile/latest
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-medium">Returns active mobile OTA manifest</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  GET
                </span>
                <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  /api/releases/desktop/latest
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-medium">Returns active desktop OTA manifest</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                  EDGE
                </span>
                <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  https://gphost.eu.cc/raw/:slug
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-medium">High-speed Edge CDN binary mirror</span>
            </div>
          </div>
        </section>

        {/* Section 2: Manifest Schema */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-600" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Release Manifest Schema (JSON)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => copyCode(sampleManifest, "manifest")}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              {copiedId === "manifest" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>

          <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-100 p-4 font-mono text-xs overflow-x-auto shadow-inner">
            <pre>{sampleManifest}</pre>
          </div>
        </section>

        {/* Section 3: Integration Code Sample */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-600" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                cURL &amp; Client Integration
              </h2>
            </div>
            <button
              type="button"
              onClick={() => copyCode(sampleCurl, "curl")}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              {copiedId === "curl" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy cURL</span>
                </>
              )}
            </button>
          </div>

          <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-emerald-400 p-4 font-mono text-xs overflow-x-auto shadow-inner">
            <pre>{sampleCurl}</pre>
          </div>
        </section>

        {/* Section 4: GPHost Cloud & Media Storage API */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Cloud className="w-4 h-4 text-cyan-600" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              GPHost Hierarchical Folder Management API
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            GPN organizes notes, backups, attachments, and exports into nested Cloudflare R2 hierarchies using the GPHost API.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
              <span className="font-mono text-[10px] text-cyan-600 font-bold block mb-1">POST /api/v1/folders</span>
              <span className="font-bold text-zinc-900 dark:text-white">Create Nested Folders</span>
              <p className="text-zinc-500 mt-1">Accepts <code className="text-zinc-700 dark:text-zinc-300 font-mono">{"{\"path\": \"gpn/backups\"}"}</code> and automatically constructs parent directory trees.</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
              <span className="font-mono text-[10px] text-emerald-600 font-bold block mb-1">POST /api/v1/upload</span>
              <span className="font-bold text-zinc-900 dark:text-white">Direct-to-Folder Upload</span>
              <p className="text-zinc-500 mt-1">Multi-part payload with <code className="text-zinc-700 dark:text-zinc-300 font-mono">-F &quot;folder=gpn/attachments&quot;</code> directly into R2 edge storage.</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
              <span className="font-mono text-[10px] text-indigo-600 font-bold block mb-1">GET /api/v1/folders</span>
              <span className="font-bold text-zinc-900 dark:text-white">Folder Hierarchy &amp; Tree</span>
              <p className="text-zinc-500 mt-1">Query with <code className="text-zinc-700 dark:text-zinc-300 font-mono">?tree=true</code> to receive full recursive structure, file sizes, and breadcrumbs.</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
              <span className="font-mono text-[10px] text-red-600 font-bold block mb-1">DELETE /api/v1/folders</span>
              <span className="font-bold text-zinc-900 dark:text-white">Recursive Hierarchy Purge</span>
              <p className="text-zinc-500 mt-1">Cleanly purges folders with <code className="text-zinc-700 dark:text-zinc-300 font-mono">?recursive=true</code> while guaranteeing Base installer permanence.</p>
            </div>
          </div>
        </section>

        {/* Section 5: Real-time Discovery & Telemetry */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <Radio className="w-4 h-4 text-cyan-600" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Multi-Device Real-Time Discovery Engine
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Active GPN installations receive new update notifications through a redundant multi-tiered channel architecture:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
              <span className="font-bold text-zinc-900 dark:text-white block mb-1">1. Firebase Realtime DB</span>
              <p className="text-zinc-500">Instant WebSocket broadcast triggering top header pill and background notification in ~0.2s.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
              <span className="font-bold text-zinc-900 dark:text-white block mb-1">2. Cloud Firestore Mirror</span>
              <p className="text-zinc-500">Persistent collection mirror at <code className="font-mono text-zinc-700 dark:text-zinc-300">system/mobile_releases</code> for offline snapshot reconciliation.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
              <span className="font-bold text-zinc-900 dark:text-white block mb-1">3. Jittered Polling</span>
              <p className="text-zinc-500">Periodic asynchronous background query ensuring zero silent release misses across multiple devices.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 px-6 mt-12 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">Gaurav Personal Notes</span>
            <span>•</span>
            <span>Developer Ecosystem</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              App
            </Link>
            <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Documentation
            </Link>
            <Link href="/how-it-works" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              How It Works
            </Link>
            <Link href="/download" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Downloads
            </Link>
            <a
              href="https://github.com/AspiringWebGaurav"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              GitHub Profile
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
