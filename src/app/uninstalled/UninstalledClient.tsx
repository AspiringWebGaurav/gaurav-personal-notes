"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function UninstalledClient() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isWiped = mode === "wiped";

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center select-none bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* 1. Brand Logo + Title */}
      <Link
        href="/"
        className="inline-flex items-center gap-3 mb-6 group cursor-pointer"
      >
        <Image
          src="/icon.svg"
          alt="Gaurav Personal Notes"
          width={32}
          height={32}
          className="w-8 h-8 rounded-lg shadow-sm group-hover:scale-105 transition-transform"
          priority
        />
        <span className="text-2xl sm:text-[26px] font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
          Gaurav Personal Notes
        </span>
      </Link>

      {/* 2. Main Status Heading */}
      <h1 className="text-2xl sm:text-[34px] font-normal tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug mb-3 max-w-2xl">
        {isWiped
          ? "Gaurav Personal Notes has been completely wiped."
          : "Gaurav Personal Notes has been uninstalled."}
      </h1>

      {/* 3. Subtle Explanatory Subtitle with Action Link */}
      <p className="text-sm sm:text-[15px] text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed mb-6 sm:mb-8 max-w-xl">
        {isWiped ? (
          <>
            All local application files, SQLite database, and shortcuts have been permanently removed.{" "}
            <Link
              href="/download"
              className="text-blue-600 dark:text-blue-400 hover:underline font-normal"
            >
              Click here
            </Link>{" "}
            if you want to reinstall.
          </>
        ) : (
          <>
            Your local notes and database remain safely preserved on this computer.{" "}
            <Link
              href="/download"
              className="text-blue-600 dark:text-blue-400 hover:underline font-normal"
            >
              Click here
            </Link>{" "}
            to reinstall anytime.
          </>
        )}
      </p>

      {/* 4. Minimalist Centered Navigation Links */}
      <nav aria-label="Footer Navigation" className="flex items-center justify-center text-sm font-normal text-blue-600 dark:text-blue-400">
        <Link href="/docs" className="hover:underline">
          Docs
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700 mx-3 select-none">|</span>
        <Link href="/dashboard" className="hover:underline">
          App
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700 mx-3 select-none">|</span>
        <a
          href="https://gauravpatil.site"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Portfolio
        </a>
      </nav>
    </div>
  );
}

