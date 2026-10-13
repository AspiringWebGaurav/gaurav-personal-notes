"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download, Database, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function UninstalledClient() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isWiped = mode === "wiped";

  return (
    <div className="h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900 font-sans antialiased">
      {/* 1. Header */}
      <header className="w-full px-4 sm:px-6 md:px-8 h-16 sm:h-20 flex items-center justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-900/60">
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

        <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link 
            href="/dashboard" 
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Open Web App
          </Link>
          <Link 
            href="/download" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Reinstall</span>
          </Link>
        </nav>
      </header>

      {/* 2. Main One-View Content (Strictly fits viewport with zero scrolling) */}
      <main className="w-full flex-1 flex flex-col justify-center px-4 sm:px-6 md:px-8 max-w-5xl mx-auto">
        {/* Dynamic Status Pill */}
        <div className="mb-4">
          {isWiped ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Full Teardown Completed • All Local Data Wiped</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 shadow-sm">
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Safe Uninstall • Your Local Notes &amp; Database Are Preserved</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
          <span>GPN has been </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
            uninstalled
          </span>
        </h1>

        {/* Dynamic Context Description */}
        <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base mt-3 sm:mt-4 max-w-2xl font-normal leading-relaxed">
          {isWiped
            ? "The desktop application, shortcuts, local SQLite database, and cached settings have been completely removed from your PC."
            : "The application binaries and desktop shortcuts were removed. Your local SQLite database and notes remain safely untouched in your user folder if you ever decide to reinstall."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-8">
          <Link
            href="/download"
            className="inline-flex items-center justify-center gap-2.5 px-7 h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-sm font-semibold shadow-lg shadow-zinc-900/10 hover:shadow-zinc-900/20 active:scale-[0.99] transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download GPN Again</span>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 h-12 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold transition-all border border-zinc-200/80 dark:border-zinc-800"
          >
            <span>Continue on Web</span>
            <ArrowRight className="w-4 h-4 text-zinc-400" />
          </Link>
        </div>

        {/* Subtle Specs Strip */}
        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500 mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Clean Teardown</span>
          </div>
          <span>•</span>
          <div>Zero background processes remaining</div>
          <span>•</span>
          <div>Reinstall anytime in seconds</div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="w-full px-4 sm:px-6 md:px-8 h-14 border-t border-zinc-100 dark:border-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
        <div>&copy; {new Date().getFullYear()} Gaurav Personal Notes</div>
        <div className="flex items-center gap-5 sm:gap-6">
          <Link 
            href="/download" 
            className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Download
          </Link>
          <Link 
            href="/docs" 
            className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Docs
          </Link>
          <Link 
            href="/privacy" 
            className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Privacy
          </Link>
          <span className="text-zinc-200 dark:text-zinc-800">|</span>
          <a
            href="https://gpnotes.eu.cc"
            className="text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            gpnotes.eu.cc
          </a>
        </div>
      </footer>
    </div>
  );
}
