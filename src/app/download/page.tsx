import type { Metadata } from "next";
import Link from "next/link";
import { Monitor, ExternalLink, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Download for Windows | Gaurav Personal Notes",
  description: "Download Gaurav Personal Notes for Windows 10 and 11. Simple, clean offline notes app.",
};

export const DESKTOP_DOWNLOAD_URL = "#";
export const DESKTOP_SHARE_URL = "#";
export const DESKTOP_EMBED_URL = "#";

export default function DownloadPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900 font-sans antialiased">
      
      {/* 1. True Edge-to-Edge Navbar */}
      <header className="w-full px-4 sm:px-6 md:px-8 h-16 sm:h-20 flex items-center justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-900/60">
        <Link 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer" 
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
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Open Web App
          </Link>
          <Link 
            href="/docs" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors hidden sm:inline"
          >
            Docs
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold">
            ● Temporarily Down
          </span>
        </nav>
      </header>

      {/* 2. Main Edge-to-Edge Content */}
      <main className="w-full flex-1 flex flex-col justify-center py-2 sm:py-4">
        
        {/* Headline Section */}
        <div className="w-full px-4 sm:px-6 md:px-8 mb-5 sm:mb-6">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
            <span>Download </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
              Gaurav Personal Notes
            </span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-base mt-2 font-normal whitespace-normal lg:whitespace-nowrap">
            Write notes on your computer. Works offline and syncs when online.
          </p>
        </div>

        {/* High-Visibility Maintenance Banner */}
        <div className="w-full px-4 sm:px-6 md:px-8 mb-6">
          <div className="max-w-2xl p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-sm flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm sm:text-base text-amber-950 dark:text-amber-100 mb-1">
                Downloads Temporarily Disabled — Working on Fix
              </div>
              <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                We are currently rolling out a critical fix for the desktop application updater engine. Downloads are temporarily paused to ensure no one downloads an unstable build. Please use the Web App in the meantime.
              </p>
            </div>
          </div>
        </div>

        {/* Windows Platform Indicator */}
        <div className="w-full px-4 sm:px-6 md:px-8 mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm">
            <Monitor className="w-3.5 h-3.5" />
            <span>Windows 10 &amp; 11</span>
          </div>
        </div>

        {/* Full-Width Divider & Release Block */}
        <div className="w-full border-t border-zinc-200/80 dark:border-zinc-800/80 pt-6 sm:pt-7 px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              GPN Desktop for Windows
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/80 dark:border-red-900/60">
              Temporarily Offline
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {/* Disabled Download Button */}
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2.5 px-7 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 text-sm font-semibold cursor-not-allowed shadow-none"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Temporarily Down • Working on Fix</span>
            </button>

            {/* Open Web App Button */}
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-sm font-semibold transition-all shadow-md"
            >
              <span>Open Web App Instead</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Short Specs Strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">System:</span> Windows 10 &amp; 11
            </div>
            <div className="text-zinc-300 dark:text-zinc-700">•</div>
            <div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Status:</span> Engine fix in progress
            </div>
            <div className="text-zinc-300 dark:text-zinc-700">•</div>
            <div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Web App:</span> Fully Available
            </div>
          </div>
        </div>

      </main>

      {/* 3. True Edge-to-Edge Footer */}
      <footer className="w-full px-4 sm:px-6 md:px-8 h-14 border-t border-zinc-100 dark:border-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
        <div>&copy; {new Date().getFullYear()} Gaurav Personal Notes</div>
        <div className="flex items-center gap-5 sm:gap-6">
          <Link 
            href="/privacy" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Privacy
          </Link>
          <Link 
            href="/terms" 
            target="_blank" 
            rel="noopener noreferrer" 
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
  );
}
