import type { Metadata } from "next";
import Link from "next/link";
import { Download, Monitor, CheckCircle2, ArrowRight, HardDrive, RefreshCw, Zap } from "lucide-react";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Download for Windows | Gaurav Personal Notes",
  description: "Download Gaurav Personal Notes for Windows 10 and Windows 11. Free, fast notes app with offline support.",
};

// Direct CDN download link and public share link from GPHost
export const DESKTOP_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
  "https://gphost.eu.cc/raw/gpn-app";

export const DESKTOP_SHARE_URL = "https://gphost.eu.cc/f/gpn-app";

export default function DownloadPage() {
  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-violet-500/20 selection:text-violet-900 dark:selection:text-violet-200 relative select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full border-b border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-xl px-5 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between shrink-0 z-20">
        <Link href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm group-hover:scale-105 transition-transform">
            G
          </div>
          <span className="font-bold text-sm sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
            Gaurav Personal Notes
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium">
          <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold">
            <Monitor className="w-3.5 h-3.5 text-violet-500" />
            <span>Windows 10 &amp; 11</span>
          </div>
          <Link
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Open Web App
          </Link>
          <Link
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors hidden sm:inline"
          >
            Docs
          </Link>
        </div>
      </header>

      {/* Main Single-View Section (Strict One-View on both Mobile & Desktop) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-3 sm:py-6 lg:py-8 flex flex-col justify-center min-h-0 z-10 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-14 items-center">
          
          {/* Left / Main Hero & Download Action */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Simple Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2.5 sm:mb-4 lg:mb-5 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Windows App • Free Download
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-4xl lg:text-6xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.1] mb-2 sm:mb-3 lg:mb-4">
              Gaurav Personal Notes <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
                for Windows
              </span>
            </h1>

            {/* Simple Everyday Language */}
            <p className="text-xs sm:text-base lg:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mb-4 sm:mb-6 lg:mb-7 font-normal">
              Your notes on your computer. Write and search your notes offline, and sync with your account whenever you connect to the internet.
            </p>

            {/* Download Button Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
              <a
                href={DESKTOP_DOWNLOAD_URL}
                className="inline-flex items-center justify-center gap-2.5 sm:gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-sm sm:text-base shadow-md sm:shadow-lg shadow-zinc-900/10 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group text-center"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-0.5 transition-transform shrink-0" />
                <span>Download for Windows (.exe)</span>
              </a>

              <Link
                href="/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-4 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors text-center"
              >
                <span>Open in browser</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <a
                href={DESKTOP_SHARE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-center"
                title="Public share page on GPHost"
              >
                <span>Mirror</span>
              </a>
            </div>

            {/* Mobile-Only Compact 3-Step Strip */}
            <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-zinc-200/80 dark:border-zinc-800/80 lg:hidden">
              <div className="flex flex-col items-center text-center">
                <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold flex items-center justify-center mb-1">1</span>
                <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">Download</span>
                <span className="text-[10px] text-zinc-500">~3.5 MB file</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold flex items-center justify-center mb-1">2</span>
                <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">Install</span>
                <span className="text-[10px] text-zinc-500">Takes 5 sec</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold flex items-center justify-center mb-1">3</span>
                <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">Write</span>
                <span className="text-[10px] text-zinc-500">Works offline</span>
              </div>
            </div>

            {/* Desktop Specs Strip */}
            <div className="hidden lg:grid grid-cols-4 gap-4 pt-5 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <div>
                <span className="block text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">
                  System
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Windows 10 &amp; 11
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">
                  File Size
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  ~3.5 MB
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">
                  File Type
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Setup file (.exe)
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">
                  Processor
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  64-bit (x64)
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Setup Steps & Features (Desktop Only, keeps mobile 1-view clean) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-5 lg:pl-8 lg:border-l border-zinc-200/80 dark:border-zinc-800/80">
            
            {/* Quick Setup (3 Steps) */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                Quick Setup
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Download the setup file
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Click the button to download the app (~3.5 MB).
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Install in seconds
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Double-click the file to install. No admin rights needed.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Open and start writing
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Launch from your desktop or Start Menu. Sign in once to keep notes synced.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Plain Highlights */}
            <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                Why use this app
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <HardDrive className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Works offline</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Read and write notes without internet</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Syncs automatically</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Updates your notes when connected online</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Runs quietly</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Closes to taskbar tray for fast access</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simple System Requirements */}
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Works on Windows 10 &amp; Windows 11 (64-bit)</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200/80 dark:border-zinc-800/80 px-5 sm:px-8 lg:px-12 h-10 sm:h-12 flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 shrink-0 z-20">
        <div>
          &copy; {new Date().getFullYear()} Gaurav Personal Notes
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Privacy
          </Link>
          <span>•</span>
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
