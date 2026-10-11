"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Check,
  ArrowRight,
  Sun,
  Moon,
  BookOpen,
} from "lucide-react";

function LoggedOutContent() {
  const searchParams = useSearchParams();
  const queryMode = searchParams.get("mode");
  const queryTheme = searchParams.get("theme");
  const queryEmail = searchParams.get("email");

  const isPurge =
    queryMode === "purge_all" || queryMode === "purge" || queryMode === "remove";

  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    queryTheme === "dark" ? "dark" : "light"
  );

  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    }

    if (queryTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else if (queryTheme === "light") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    } else {
      try {
        const saved = localStorage.getItem("app-theme");
        if (saved === "dark" || saved === "light") {
          setTheme(saved);
          if (saved === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          setTheme("dark");
          document.documentElement.classList.add("dark");
        } else {
          setTheme("light");
          document.documentElement.classList.remove("dark");
        }
      } catch {}
    }
  }, [queryTheme]);

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


  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* -------------------- 1. EDGE-TO-EDGE TOP NAVBAR -------------------- */}
      <header className="w-full h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-6 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-7 h-7 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs tracking-wider group-hover:opacity-90 transition-opacity">
            GPN
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
            Gaurav Personal Notes
          </span>
        </Link>

        {/* Navbar Right: Desktop indicator, Docs link, Theme toggle */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <span>Desktop app</span>
          </span>

          <Link
            href="/docs"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Docs</span>
          </Link>

          <Link
            href="/"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors hidden sm:inline-block"
          >
            Website
          </Link>

          <span className="hidden sm:inline-block h-3.5 w-px bg-zinc-200 dark:bg-zinc-800" />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={mounted ? (theme === "dark" ? "Light theme" : "Dark theme") : "Toggle theme"}
            suppressHydrationWarning
            className="w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700 transition-transform duration-200 hover:-rotate-12" />
              )
            ) : (
              <span className="w-4 h-4 block" />
            )}
          </button>
        </div>
      </header>

      {/* -------------------- 2. PROPER EDITORIAL CONFIRMATION (MATCHES SUCCESS PAGE) -------------------- */}
      <main className="flex-1 w-full flex items-center justify-center px-6 py-12 md:py-20">
        <div className="w-full max-w-sm text-center space-y-6">
          {/* Avatar Icon Container with Checkmark */}
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shadow-2xs">
              <LogOut className="w-7 h-7" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 text-white flex items-center justify-center">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          {/* Heading and Clean Simple Explanation */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              You're logged out
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
              {isPurge
                ? "Your account was disconnected and notes were cleared from this computer. All your notes remain safe in your account."
                : "Your account was disconnected. Your notes stay saved on this computer so you can continue viewing and editing them offline."}
            </p>
          </div>

          {/* Email Pill (if user email was passed) */}
          {queryEmail && (
            <div className="inline-block font-mono text-xs px-3 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
              {queryEmail}
            </div>
          )}

          {/* Relevant Action Area - Real Website Navigation (No confusing partial redirects) */}
          <div className="space-y-3 pt-1">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Go to Homepage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center justify-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Read Documentation
              </Link>
              <span>&bull;</span>
              <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                Sign In
              </Link>
            </div>
          </div>

          {/* Safe Tab Close Hint */}
          <p className="text-xs text-zinc-400 dark:text-zinc-500 pt-1">
            You can safely close this tab • or press{" "}
            <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
              {isMac ? "⌘" : "Ctrl"}
            </kbd>{" "}
            +{" "}
            <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
              W
            </kbd>
          </p>
        </div>
      </main>

      {/* -------------------- 3. EDGE-TO-EDGE FOOTER (WITH DOCS, PRIVACY, TERMS) -------------------- */}
      <footer className="w-full h-12 border-t border-zinc-200/80 dark:border-zinc-800/80 px-6 md:px-12 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
        <span>&copy; Gaurav Personal Notes</span>

        <div className="flex items-center gap-4">
          <Link href="/docs" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Docs
          </Link>
          <Link href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Terms
          </Link>
          <span className="hidden sm:inline-block h-3 w-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="hidden sm:inline-block">Notes sync to your account</span>
        </div>
      </footer>
    </div>
  );
}

export default function LoggedOutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100 rounded-full animate-spin" />
        </div>
      }
    >
      <LoggedOutContent />
    </Suspense>
  );
}
