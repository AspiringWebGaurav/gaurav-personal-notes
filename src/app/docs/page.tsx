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
  Sun,
  Moon,
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

  // Default in Light Theme as requested
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

  const sections: DocSection[] = [
    { id: "overview", title: "Overview & Philosophy", category: "Getting Started", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "sync-engine", title: "Sync & Cloud Engine", category: "Core Features", icon: <Cloud className="w-3.5 h-3.5" /> },
    { id: "account-lifecycle", title: "Account & Logout Options", category: "Core Features", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "database-sqlite", title: "Local Database & Storage", category: "Storage", icon: <Database className="w-3.5 h-3.5" /> },
    { id: "gphost-media", title: "Image & Video Storage", category: "Integrations", icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: "formatting-chatgpt", title: "Editor & Formatting", category: "Editor", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "desktop-shortcuts", title: "Desktop Hotkeys", category: "Desktop", icon: <Keyboard className="w-3.5 h-3.5" /> },
    { id: "external-links", title: "Official Links & Portals", category: "Resources", icon: <ExternalLink className="w-3.5 h-3.5" /> },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 flex flex-col transition-colors">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mr-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>App</span>
          </Link>
          <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-2 text-xs font-mono">
            <BookOpen className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-zinc-600 dark:text-zinc-400">gpn</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="text-zinc-600 dark:text-zinc-400">docs</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              README.md
            </span>
            <span className="ml-2 px-1.5 py-0.5 rounded-[2px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300">
              v0.0.1
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <GitBranch className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
              main
            </span>
          </div>
        </div>

        {/* Action Redirect Links & Live Theme Toggle */}
        <div className="flex items-center gap-2">
          <a
            href="https://gphost.eu.cc/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs rounded-[4px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
          >
            <span>GPHost Docs</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
          </a>
          <a
            href="https://github.com/AspiringWebGaurav/gaurav-personal-notes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-[4px] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white font-medium transition-colors shadow-2xs"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={mounted ? (theme === "dark" ? "Light theme" : "Dark theme") : "Toggle theme"}
            suppressHydrationWarning
            className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center ml-1"
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

      {/* Main Container with Sticky TOC */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex gap-12 flex-1">
        {/* Main Markdown Content */}
        <main ref={contentRef} className="flex-1 max-w-3xl flex flex-col gap-10 pb-24">
          {/* Title Header */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold">
                DOCUMENTATION
              </span>
              <span className="text-xs text-zinc-500 font-mono">Updated for GPN v0.0.1</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Gaurav Personal Notes (GPN) Documentation
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2.5 leading-relaxed">
              Official documentation for the Gaurav Personal Notes workspace.
              Covers offline storage on your device, cloud account sync, image hosting,
              editor formatting, and desktop shortcuts.
            </p>
          </div>

          {/* Section 1: Overview */}
          <section id="overview" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Overview & Philosophy
              </h2>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Gaurav Personal Notes is built for speed and privacy. Your notes exist directly on your computer first.
              The application is fully operational offline without any delay.
            </p>

            <div className="rounded-[4px] border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-4 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold tracking-wide uppercase text-[11px] block mb-1">
                  OFFLINE FIRST
                </span>
                <span>
                  Without signing in, GPN works as a fast local notes app. Cloud sync connects only when you log in with your Google account.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-3.5 bg-zinc-50/70 dark:bg-zinc-900/40">
                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-1.5">
                  <Database className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" /> Local Storage
                </span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                  Instant response, zero tracking, notes stored directly on your computer. Fully usable offline.
                </p>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-3.5 bg-zinc-50/70 dark:bg-zinc-900/40">
                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-1.5">
                  <Cloud className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" /> Cloud Sync
                </span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                  Connect your account to back up and sync notes across your devices automatically.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Sync Engine */}
          <section id="sync-engine" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Sync & Cloud Mirror Engine
              </h2>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              When connected to your account, changes sync automatically in the background so your notes are always up to date.
            </p>

            <div className="rounded-[4px] border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-3">
              <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold tracking-wide uppercase text-[11px] block mb-1">
                  KEEP NOTES LOCAL ONLY
                </span>
                <span>
                  Want a confidential note to stay strictly on this device? Toggle the sync badge in the note header to keep it local only.
                </span>
              </div>
            </div>
          </section>

          {/* Section 3: Account Lifecycle */}
          <section id="account-lifecycle" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Account & Logout Options
              </h2>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              When logging out from the desktop app, you have two clear choices:
            </p>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-[4px] p-4 bg-zinc-50/70 dark:bg-zinc-900/30 flex flex-col gap-3">
              <div className="text-xs text-zinc-700 dark:text-zinc-300 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 min-w-[200px]">1. Keep notes on this computer:</span>
                  <span className="text-zinc-600 dark:text-zinc-400">Notes stay saved on your device so you can view and edit offline.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 min-w-[200px]">2. Remove notes from this computer:</span>
                  <span className="text-zinc-600 dark:text-zinc-400">Local notes are cleared from the device for security, staying safe in your account.</span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3 text-xs">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-zinc-900 dark:text-zinc-100 font-semibold hover:underline"
                >
                  Sign in page <ArrowUpRight className="w-3 h-3" />
                </Link>
                <span>&bull;</span>
                <Link
                  href="/logged-out"
                  className="inline-flex items-center gap-1 text-zinc-900 dark:text-zinc-100 font-semibold hover:underline"
                >
                  Logout confirmation page <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </section>

          {/* Section 4: Local Storage */}
          <section id="database-sqlite" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Local Database & Storage
              </h2>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Your notes are stored in a fast local SQLite database file on your device.
            </p>
          </section>

          {/* Section 5: Media */}
          <section id="gphost-media" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Image & Video Storage
              </h2>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Media pasted or uploaded into notes is saved via GPHost media hosting (
              <a
                href="https://gphost.eu.cc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
              >
                https://gphost.eu.cc
              </a>
              ).
            </p>
          </section>

          {/* Section 6: Formatting */}
          <section id="formatting-chatgpt" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Editor & Formatting
              </h2>
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              The editor automatically preserves headings, code blocks, bullet points, checklists, bold text, and markdown tables when pasting from other applications.
            </p>
          </section>

          {/* Section 7: Desktop Shortcuts */}
          <section id="desktop-shortcuts" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Desktop Hotkeys
              </h2>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-[4px] overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                    <th className="py-2.5 px-4 font-semibold">Shortcut</th>
                    <th className="py-2.5 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[11px]">
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">Ctrl + Shift + N</td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-300">Quick Note Capture</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">Ctrl + N</td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-300">New Note</td>
                  </tr>
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">Ctrl + K</td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-300">Search Notes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8: Official Links & Portals */}
          <section id="external-links" className="scroll-mt-20 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Hash className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Official Links & Portals
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/"
                className="flex items-center justify-between p-3.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
              >
                <div>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Website Home
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">/</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </Link>

              <Link
                href="/login"
                className="flex items-center justify-between p-3.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
              >
                <div>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Account Sign In
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">/login</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </Link>

              <Link
                href="/logged-out"
                className="flex items-center justify-between p-3.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
              >
                <div>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Logout Confirmation
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">/logged-out</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </Link>

              <Link
                href="/privacy"
                className="flex items-center justify-between p-3.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
              >
                <div>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Privacy Policy
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">/privacy</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </Link>

              <Link
                href="/terms"
                className="flex items-center justify-between p-3.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
              >
                <div>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Terms of Service
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">/terms</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </Link>

              <a
                href="https://gphost.eu.cc/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
              >
                <div>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    GPHost API
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">gphost.eu.cc/docs</span>
                </div>
                <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </a>
            </div>
          </section>
        </main>

        {/* Right Sticky Table of Contents (Index) */}
        <aside className="w-64 hidden lg:block shrink-0 select-none">
          <div className="sticky top-20 flex flex-col gap-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-mono transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
              <span className="font-semibold uppercase text-[10px] tracking-wider text-zinc-400 dark:text-zinc-500">Index</span>
              <span className="text-[11px]">
                {filteredSections.length} topics
              </span>
            </div>

            <nav className="flex flex-col gap-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {filteredSections.map((section) => {
                const isSelected = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-[4px] text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-normal"
                    }`}
                  >
                    <span className={isSelected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}>
                      {section.icon}
                    </span>
                    <span className="truncate">{section.title}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
              <span>Documentation index</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
