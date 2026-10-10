"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Hash,
  Search,
  Shield,
  Database,
  Cloud,
  Sparkles,
  Image as ImageIcon,
  Keyboard,
  Info,
  Lightbulb,
  AlertTriangle,
  ArrowUpRight,
  GitBranch,
  ArrowLeft,
  Terminal,
} from "lucide-react";

interface DocSection {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const sections: DocSection[] = [
    { id: "overview", title: "Overview & Philosophy", category: "Getting Started", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "sync-engine", title: "Sync & Cloud Mirror Engine", category: "Core Architecture", icon: <Cloud className="w-3.5 h-3.5" /> },
    { id: "account-lifecycle", title: "Account & Multi-User Separation", category: "Core Architecture", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "database-sqlite", title: "Local SQLite & Zero-Stale DB", category: "Storage", icon: <Database className="w-3.5 h-3.5" /> },
    { id: "gphost-media", title: "GPHost Image & Video Storage", category: "Integrations", icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: "formatting-chatgpt", title: "Rich Formatting & ChatGPT Engine", category: "Editor", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "desktop-shortcuts", title: "System Tray & Desktop Hotkeys", category: "Desktop", icon: <Keyboard className="w-3.5 h-3.5" /> },
    { id: "external-links", title: "Official Links & Web Portals", category: "Resources", icon: <ExternalLink className="w-3.5 h-3.5" /> },
  ];

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-zinc-100 flex flex-col">
      {/* GitHub Repository-style Top Bar */}
      <header className="sticky top-0 z-40 h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors mr-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>App</span>
          </Link>
          <div className="h-4 w-[1px] bg-zinc-800" />
          <div className="flex items-center gap-2 text-xs font-mono">
            <BookOpen className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400">gpn</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-400">docs</span>
            <span className="text-zinc-700">/</span>
            <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              README.md
            </span>
            <span className="ml-2 px-1.5 py-0.5 rounded-[2px] bg-zinc-800 text-[10px] text-zinc-300">
              v0.0.1
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400">
              <GitBranch className="w-3 h-3 text-zinc-500" />
              main
            </span>
          </div>
        </div>

        {/* Action Redirect Links */}
        <div className="flex items-center gap-2">
          <a
            href="https://gphost.eu.cc/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs rounded-[2px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium transition-colors"
          >
            <span>GPHost Docs</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
          </a>
          <a
            href="https://github.com/AspiringWebGaurav/gaurav-personal-notes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-[2px] bg-zinc-100 text-zinc-950 hover:bg-white font-medium transition-colors shadow-2xs"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Container with Sticky TOC */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex gap-12 flex-1">
        {/* Main Markdown Content */}
        <main ref={contentRef} className="flex-1 max-w-3xl flex flex-col gap-10 pb-24">
          {/* Title Header */}
          <div className="border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-[2px] bg-emerald-950/60 border border-emerald-800 text-[11px] font-mono text-emerald-300 font-semibold">
                CENTRALIZED DOCUMENTATION
              </span>
              <span className="text-xs text-zinc-500 font-mono">Updated for GPN v0.0.1</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-50">
              Gaurav Personal Notes (GPN) Documentation
            </h1>
            <p className="text-sm text-zinc-400 mt-2.5 leading-relaxed">
              Official centralized documentation for the Gaurav Personal Notes workspace engine.
              Covers local-first SQLite offline caching, cloud Firestore mirror syncing, GPHost media integration,
              ChatGPT clipboard parsing, and desktop tray hotkeys.
            </p>
          </div>

          {/* Section 1: Overview */}
          <section id="overview" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                Overview & Philosophy
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Gaurav Personal Notes is built on the <strong>Local-First Principle</strong>. Your notes exist directly in a
              native SQLite database on your device first. The app is completely operational offline with 0ms local latency.
            </p>

            {/* GitHub Note Alert */}
            <div className="rounded-[4px] border-l-4 border-blue-500 bg-blue-950/20 p-4 text-xs text-blue-300 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold tracking-wide uppercase text-[11px] block mb-1">
                  NOTE
                </span>
                <span>
                  When unauthenticated or offline, GPN operates as a standalone encrypted vault. Cloud features
                  only activate when you intentionally connect your account.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div className="border border-zinc-800 rounded-[3px] p-3.5 bg-zinc-900/40">
                <span className="font-mono text-xs font-bold text-zinc-100 flex items-center gap-1.5 mb-1.5">
                  <Database className="w-3.5 h-3.5 text-zinc-400" /> Standalone Local Mode
                </span>
                <p className="text-xs text-zinc-400 leading-normal">
                  0ms latency, zero tracking, local SQLite database on disk. Completely functional offline.
                </p>
              </div>
              <div className="border border-zinc-800 rounded-[3px] p-3.5 bg-zinc-900/40">
                <span className="font-mono text-xs font-bold text-zinc-100 flex items-center gap-1.5 mb-1.5">
                  <Cloud className="w-3.5 h-3.5 text-zinc-400" /> Cloud Mirroring
                </span>
                <p className="text-xs text-zinc-400 leading-normal">
                  Real-time mirror with Firebase Firestore. Your local database serves as the fast cache and primary source.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Sync Engine */}
          <section id="sync-engine" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                Sync & Cloud Mirror Engine
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              The sync engine runs as an event-driven background worker. It monitors local updates and synchronizes them
              bidirectionally with Firestore using Last-Write-Wins (LWW) resolution and monotonic version clocks.
            </p>

            {/* GitHub Tip Alert */}
            <div className="rounded-[4px] border-l-4 border-emerald-500 bg-emerald-950/20 p-4 text-xs text-emerald-300 flex items-start gap-3">
              <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold tracking-wide uppercase text-[11px] block mb-1">
                  TIP: PER-NOTE LOCAL ONLY PRIVACY
                </span>
                <span>
                  Need a confidential note that should never leave your machine? Click the <code>CLOUD SYNC</code> pill
                  in the editor header to toggle it to <code>LOCAL ONLY</code>. Even when logged into a cloud account,
                  that note is strictly barred from syncing.
                </span>
              </div>
            </div>

            {/* Code Snippet */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Firestore Sync Model: users/&#123;uid&#125;/notes/&#123;noteId&#125;</span>
                <button
                  type="button"
                  onClick={() =>
                    copyCode(
                      `// Cloud Firestore Mirror Schema\n{\n  "title": string,\n  "content": string,\n  "wordCount": number,\n  "isArchived": boolean,\n  "isDeleted": boolean,\n  "updatedAt": timestamp (ms),\n  "syncVersion": number\n}`,
                      "schema-code"
                    )
                  }
                  className="flex items-center gap-1 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  {copiedCodeId === "schema-code" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 rounded-[4px] bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto border border-zinc-800">
                <code>{`// Cloud Firestore Mirror Schema
{
  "title": string,
  "content": string,
  "wordCount": number,
  "isArchived": boolean,
  "isDeleted": boolean,
  "updatedAt": timestamp (ms),
  "syncVersion": number
}`}</code>
              </pre>
            </div>
          </section>

          {/* Section 3: Account Lifecycle */}
          <section id="account-lifecycle" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                Account & Multi-User Separation
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              When sharing a PC across multiple accounts, privacy is strictly guaranteed. GPN implements a
              <strong> Clean Logout Lifecycle</strong>.
            </p>

            {/* GitHub Important Alert */}
            <div className="rounded-[4px] border-l-4 border-purple-500 bg-purple-950/20 p-4 text-xs text-purple-300 flex items-start gap-3">
              <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold tracking-wide uppercase text-[11px] block mb-1">
                  IMPORTANT: ZERO LOCAL DATA LEAKAGE
                </span>
                <span>
                  When an account logs out, all synced local cache rows and session keys are wiped cleanly.
                  When another user logs in, they receive only their own cloud files with zero residual contamination.
                </span>
              </div>
            </div>

            <div className="border border-zinc-800 rounded-[3px] p-4 bg-zinc-900/30 flex flex-col gap-2">
              <h3 className="text-xs font-bold font-mono uppercase text-zinc-300">
                Desktop OAuth Web Bridge
              </h3>
              <p className="text-xs text-zinc-400 leading-normal">
                Desktop sign-in does not require entering Google credentials inside webviews. It launches your system browser to
                <Link
                  href="/desktop-auth"
                  className="inline-flex items-center gap-0.5 text-blue-400 hover:underline mx-1 font-mono font-medium"
                >
                  /desktop-auth <ArrowUpRight className="w-2.5 h-2.5" />
                </Link>
                and delivers the authentication token securely via a single-use loopback socket on <code>127.0.0.1</code>.
              </p>
            </div>
          </section>

          {/* Section 4: Local SQLite */}
          <section id="database-sqlite" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                Local SQLite & Zero-Stale Database
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              The local database runs SQLite in <strong>WAL (Write-Ahead Logging)</strong> mode with auto-vacuuming and clean start lifecycles.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-zinc-800 p-3 rounded-[3px] bg-zinc-900/30">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Journal Mode</span>
                <span className="font-mono text-xs font-bold text-zinc-100">WAL (Concurrency)</span>
              </div>
              <div className="border border-zinc-800 p-3 rounded-[3px] bg-zinc-900/30">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Auto-Vacuum</span>
                <span className="font-mono text-xs font-bold text-zinc-100">Incremental & Full</span>
              </div>
              <div className="border border-zinc-800 p-3 rounded-[3px] bg-zinc-900/30">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Clean State</span>
                <span className="font-mono text-xs font-bold text-zinc-100">Zero Stale Records</span>
              </div>
            </div>

            {/* GitHub Warning Alert */}
            <div className="rounded-[4px] border-l-4 border-amber-500 bg-amber-950/20 p-4 text-xs text-amber-300 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold tracking-wide uppercase text-[11px] block mb-1">
                  WARNING: DATABASE PURGE
                </span>
                <span>
                  Purging notes in the Database tab deletes all local rows and triggers vacuuming.
                  If logged into Cloud Sync, notes are soft-deleted in Firestore unless local-only privacy is set.
                </span>
              </div>
            </div>
          </section>

          {/* Section 5: GPHost Media */}
          <section id="gphost-media" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                GPHost Image & Video Storage
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              To eliminate Firebase Storage billing, GPN integrates directly with <strong>GPHost</strong> (
              <a
                href="https://gphost.eu.cc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline font-mono"
              >
                https://gphost.eu.cc
              </a>
              ). Uploads and pasted media are hosted via your GPHost API token.
            </p>

            {/* Code Snippet */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Direct Upload Endpoint (cURL)</span>
                <button
                  type="button"
                  onClick={() =>
                    copyCode(
                      `curl -H "Authorization: Bearer YOUR_GPHOST_API_KEY" \\\n  -F "file=@screenshot.png" \\\n  https://gphost.eu.cc/api/v1/upload`,
                      "gphost-curl"
                    )
                  }
                  className="flex items-center gap-1 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  {copiedCodeId === "gphost-curl" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 rounded-[4px] bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto border border-zinc-800">
                <code>{`curl -H "Authorization: Bearer YOUR_GPHOST_API_KEY" \\
  -F "file=@screenshot.png" \\
  https://gphost.eu.cc/api/v1/upload`}</code>
              </pre>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              <strong>Automatic Deletion &amp; Zero Stale Files:</strong> When you click &quot;Remove&quot; on an image or video, or when a note / view-once burn note is deleted permanently, GPN automatically dispatches a GPHost delete request to ensure no stale or orphaned files linger on your CDN storage.
            </p>
          </section>

          {/* Section 6: Formatting & ChatGPT */}
          <section id="formatting-chatgpt" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                Rich Formatting & ChatGPT Engine
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              When copying responses from ChatGPT, Claude, or Notion, traditional editors distort spacing and break lists.
              GPN includes a specialized clipboard parser that preserves headings, code fences, task lists, markdown tables, bold/italics, and emojis seamlessly.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-[2px] border border-zinc-800 bg-zinc-900/40">
                ✅ Headings & Titles
              </div>
              <div className="p-2.5 rounded-[2px] border border-zinc-800 bg-zinc-900/40">
                ✅ Fenced Code Blocks
              </div>
              <div className="p-2.5 rounded-[2px] border border-zinc-800 bg-zinc-900/40">
                ✅ Bulleted & Task Lists
              </div>
              <div className="p-2.5 rounded-[2px] border border-zinc-800 bg-zinc-900/40">
                ✅ Markdown Tables
              </div>
              <div className="p-2.5 rounded-[2px] border border-zinc-800 bg-zinc-900/40">
                ✅ Bold, Italic, Code
              </div>
              <div className="p-2.5 rounded-[2px] border border-zinc-800 bg-zinc-900/40">
                ✅ Emojis & Blockquotes
              </div>
            </div>
          </section>

          {/* Section 7: Desktop Shortcuts */}
          <section id="desktop-shortcuts" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                System Tray & Desktop Hotkeys
              </h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              GPN desktop minimizes directly to the Win32 system tray with quick capture shortcuts.
            </p>

            {/* GitHub Table */}
            <div className="border border-zinc-800 rounded-[3px] overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 font-mono text-[11px] text-zinc-300">
                    <th className="py-2.5 px-4 font-semibold">Shortcut</th>
                    <th className="py-2.5 px-4 font-semibold">Action</th>
                    <th className="py-2.5 px-4 font-semibold">Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 font-mono text-[11px]">
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-2.5 px-4 font-bold text-zinc-100">Ctrl + Shift + N</td>
                    <td className="py-2.5 px-4 text-zinc-300">Instant Quick Capture Modal</td>
                    <td className="py-2.5 px-4 text-emerald-400">Global Windows</td>
                  </tr>
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-2.5 px-4 font-bold text-zinc-100">Ctrl + N</td>
                    <td className="py-2.5 px-4 text-zinc-300">Create New Note</td>
                    <td className="py-2.5 px-4 text-zinc-500">App Window</td>
                  </tr>
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-2.5 px-4 font-bold text-zinc-100">Ctrl + K</td>
                    <td className="py-2.5 px-4 text-zinc-300">Search Notes Across Vault</td>
                    <td className="py-2.5 px-4 text-zinc-500">App Window</td>
                  </tr>
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-2.5 px-4 font-bold text-zinc-100">Ctrl + ,</td>
                    <td className="py-2.5 px-4 text-zinc-300">Toggle Permissions / Settings</td>
                    <td className="py-2.5 px-4 text-zinc-500">App Window</td>
                  </tr>
                  <tr className="hover:bg-zinc-900/40">
                    <td className="py-2.5 px-4 font-bold text-zinc-100">Esc</td>
                    <td className="py-2.5 px-4 text-zinc-300">Dismiss Open Modals & Search</td>
                    <td className="py-2.5 px-4 text-zinc-500">App Window</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8: External Links */}
          <section id="external-links" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                Official Links & Web Portals
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://gpnotes.eu.cc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-[3px] border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 transition-colors group"
              >
                <div>
                  <span className="text-xs font-bold font-mono text-zinc-100 group-hover:text-blue-400 transition-colors">
                    GPN Web Application
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">gpnotes.eu.cc</span>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
              </a>

              <a
                href="https://gphost.eu.cc/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-[3px] border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 transition-colors group"
              >
                <div>
                  <span className="text-xs font-bold font-mono text-zinc-100 group-hover:text-blue-400 transition-colors">
                    GPHost API Documentation
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">gphost.eu.cc/docs</span>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
              </a>
            </div>
          </section>
        </main>

        {/* Right Sticky Table of Contents (Index) */}
        <aside className="w-64 hidden lg:block shrink-0 select-none">
          <div className="sticky top-20 flex flex-col gap-4">
            {/* Filter input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter topics..."
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-[2px] bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-mono"
              />
            </div>

            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-500">
                On this page
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {filteredSections.length} topics
              </span>
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col gap-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {filteredSections.map((section) => {
                const isSelected = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-[2px] text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-zinc-800 text-zinc-100 font-semibold"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 font-normal"
                    }`}
                  >
                    <span className={isSelected ? "text-zinc-100" : "text-zinc-500"}>
                      {section.icon}
                    </span>
                    <span className="truncate">{section.title}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Scroll-spy active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
