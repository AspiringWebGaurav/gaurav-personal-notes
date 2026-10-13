import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { PatchNotesClient } from "./PatchNotesClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Patch Notes & Release Changelog | Gaurav Personal Notes",
  description:
    "Official release notes and changelog for Gaurav Personal Notes desktop app and web. View features, bug fixes, and performance updates.",
  openGraph: {
    title: "Patch Notes | Gaurav Personal Notes",
    description: "Official release notes and changelog for Gaurav Personal Notes desktop app and web.",
    url: "https://gpnotes.eu.cc/patch-notes",
  },
};

export const DESKTOP_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
  "https://gphost.eu.cc/raw/gpn-app";

export default function PatchNotesPage() {
  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden bg-[#ffffff] dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] flex flex-col justify-between selection:bg-[#c2e7ff] selection:text-[#001d35] dark:selection:bg-[#004a77] dark:selection:text-[#c2e7ff] font-sans antialiased">
      {/* 1. Google Product App Bar */}
      <header className="w-full px-4 sm:px-6 h-16 flex items-center justify-between shrink-0 border-b border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            title="Gaurav Personal Notes Home"
          >
            {/* Google 4-Color Dots Grid */}
            <div className="w-7 h-7 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-[#dadce0] dark:border-[#3c4043] flex items-center justify-center p-1 shadow-2xs group-hover:scale-105 transition-transform">
              <div className="grid grid-cols-2 gap-1 w-full h-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              </div>
            </div>
            <span className="font-semibold text-base tracking-tight text-[#202124] dark:text-[#e8eaed]">
              Gaurav Personal Notes
            </span>
          </Link>
          <span className="hidden sm:inline-block text-[#dadce0] dark:text-[#5f6368] font-light">|</span>
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f0fe] text-[#1967d2] dark:bg-[#1a3a60] dark:text-[#8ab4f8]">
            Release Notes
          </span>
        </div>

        <nav className="flex items-center gap-3 sm:gap-4 text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#303134] text-[#202124] dark:text-[#e8eaed] transition-colors"
          >
            Web App
          </Link>
          <Link
            href="/docs"
            className="hidden sm:inline px-3 py-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#303134] text-[#202124] dark:text-[#e8eaed] transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/download"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Get Desktop</span>
          </Link>
        </nav>
      </header>

      {/* 2. Interactive Patch Notes Content Area (Single Viewport Flex) */}
      <main className="w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-[#ffffff] dark:bg-[#202124]">
        <PatchNotesClient />
      </main>

      {/* 3. Google Minimalist Footer */}
      <footer className="w-full px-4 sm:px-6 h-10 border-t border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between text-[11px] text-[#5f6368] dark:text-[#9aa0a6] bg-[#f8f9fa] dark:bg-[#202124] shrink-0">
        <div>&copy; {new Date().getFullYear()} Gaurav Personal Notes • All systems operational</div>
        <div className="flex items-center gap-4 sm:gap-5">
          <Link
            href="/download"
            className="hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors"
          >
            Desktop Releases
          </Link>
          <Link
            href="/docs"
            className="hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors"
          >
            Documentation
          </Link>
          <Link
            href="/privacy"
            className="hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors"
          >
            Terms
          </Link>
          <span className="text-[#dadce0] dark:text-[#3c4043]">|</span>
          <a
            href="https://gphost.eu.cc"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1a73e8] dark:text-[#8ab4f8] font-medium hover:underline transition-all"
          >
            GPHost Edge
          </a>
        </div>
      </footer>
    </div>
  );
}
