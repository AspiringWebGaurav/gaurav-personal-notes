import type { Metadata } from "next";
import Link from "next/link";
import { Monitor, Smartphone, ExternalLink, Download, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Download Apps | Gaurav Personal Notes (Windows & Android)",
  description: "Download Gaurav Personal Notes for Windows 10/11 and Android. Offline-first encrypted notes with instant search and secure cloud sync.",
};

const baseDesktopDownloadUrl = (
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
  "https://gphost.eu.cc/raw/gpn-app"
).split("?")[0];

export const DESKTOP_DOWNLOAD_URL = `${baseDesktopDownloadUrl}?v=0.0.0-fresh-${Date.now()}`;
export const DESKTOP_SHARE_URL = `https://gphost.eu.cc/f/gpn-app?v=0.0.0-fresh-${Date.now()}`;
export const DESKTOP_EMBED_URL = "https://gphost.eu.cc/f/gpn-app/preview";

const baseMobileDownloadUrl = (
  process.env.NEXT_PUBLIC_MOBILE_DOWNLOAD_URL ||
  "https://gphost.eu.cc/raw/iJPHSVkH7snq"
).split("?")[0];

export const MOBILE_DOWNLOAD_URL = `${baseMobileDownloadUrl}?v=0.0.0-fresh-${Date.now()}`;
export const MOBILE_SHARE_URL = `https://gphost.eu.cc/f/iJPHSVkH7snq?v=0.0.0-fresh-${Date.now()}`;
export const MOBILE_EMBED_URL = "https://gphost.eu.cc/f/iJPHSVkH7snq/preview";

export default function DownloadPage() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900 font-sans antialiased">
      
      {/* 1. True Edge-to-Edge Navbar */}
      <header className="w-full px-4 sm:px-6 md:px-8 h-16 sm:h-20 flex items-center justify-between shrink-0 border-b border-zinc-100 dark:border-zinc-900/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            ● Live • v0.0.0
          </span>
        </nav>
      </header>

      {/* 2. Main Content */}
      <main className="w-full flex-1 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
        
        {/* Headline Section */}
        <div className="mb-8 sm:mb-12 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cross-Platform Native Apps</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
            <span>Download </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
              Gaurav Personal Notes
            </span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-base mt-3 font-normal max-w-2xl">
            Offline-first architecture with instant full-text search, encrypted local vaults, and optional account sync across all your devices.
          </p>
        </div>

        {/* Dual Platform Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-10">
          
          {/* Card 1: Windows Desktop */}
          <div className="relative rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/50 dark:bg-zinc-900/40 p-6 sm:p-8 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      GPN for Windows
                    </h2>
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
                  href={DESKTOP_DOWNLOAD_URL}
                  className="inline-flex items-center justify-center gap-2.5 px-6 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-sm font-semibold shadow-md active:scale-[0.99] transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download for Windows (.exe)</span>
                </a>

                <a
                  href={DESKTOP_SHARE_URL}
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
          <div className="relative rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-zinc-50/50 dark:bg-zinc-900/40 p-6 sm:p-8 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      GPN for Android
                    </h2>
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
                  href={MOBILE_DOWNLOAD_URL}
                  className="inline-flex items-center justify-center gap-2.5 px-6 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md active:scale-[0.99] transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download for Android (.apk)</span>
                </a>

                <a
                  href={MOBILE_SHARE_URL}
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
                <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Size:</span> ~4.5 MB</div>
              </div>
            </div>
          </div>

        </div>

        {/* Web App Alternate Option */}
        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left bg-zinc-50/40 dark:bg-zinc-900/20">
          <div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Prefer working directly in your browser?
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
