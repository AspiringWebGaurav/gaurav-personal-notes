"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Bug,
  Download,
  Copy,
  Check,
  Search,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  ExternalLink,
  Info,
  RefreshCw,
} from "lucide-react";
import { PATCH_NOTES, ReleasePatchNote, PatchNoteCategory } from "@/data/patchNotes";

type CategoryFilter = "all" | "feature" | "improvement" | "security" | "fix";

function PatchNotesContent() {
  const searchParams = useSearchParams();
  const requestedVersion = searchParams.get("v") || searchParams.get("version");

  const initialVersion = useMemo(() => {
    if (requestedVersion) {
      const match = PATCH_NOTES.find(
        (n) => n.version === requestedVersion.replace(/^v/, "")
      );
      if (match) return match.version;
    }
    return PATCH_NOTES[0]?.version || "0.0.3";
  }, [requestedVersion]);

  const [selectedVersion, setSelectedVersion] = useState<string>(initialVersion);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (requestedVersion) {
      const match = PATCH_NOTES.find(
        (n) => n.version === requestedVersion.replace(/^v/, "")
      );
      if (match) {
        setSelectedVersion(match.version);
      }
    }
  }, [requestedVersion]);

  const filteredNotes = useMemo(() => {
    let list = PATCH_NOTES;

    if (activeCategory !== "all") {
      list = list.filter((note) =>
        note.categories.some((cat) => cat.type === activeCategory)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (note) =>
          note.version.toLowerCase().includes(q) ||
          note.title.toLowerCase().includes(q) ||
          note.summary.toLowerCase().includes(q) ||
          note.categories.some((cat) =>
            cat.items.some((item) => item.toLowerCase().includes(q))
          )
      );
    }

    return list;
  }, [searchQuery, activeCategory]);

  const activeNote: ReleasePatchNote = useMemo(() => {
    return (
      filteredNotes.find((n) => n.version === selectedVersion) ||
      filteredNotes[0] ||
      PATCH_NOTES[0]
    );
  }, [selectedVersion, filteredNotes]);

  const copyShareLink = async (version: string) => {
    try {
      const url = `${window.location.origin}/patch-notes?v=${version}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const renderCategoryIcon = (type: PatchNoteCategory["type"]) => {
    switch (type) {
      case "feature":
        return <Sparkles className="w-4 h-4 text-[#1a73e8] shrink-0" />;
      case "improvement":
        return <Zap className="w-4 h-4 text-[#0f9d58] shrink-0" />;
      case "security":
        return <ShieldCheck className="w-4 h-4 text-[#f9ab00] shrink-0" />;
      case "fix":
        return <Bug className="w-4 h-4 text-[#ea4335] shrink-0" />;
      default:
        return <Layers className="w-4 h-4 text-[#5f6368] shrink-0" />;
    }
  };

  const getCategoryTheme = (type: PatchNoteCategory["type"]) => {
    switch (type) {
      case "feature":
        return {
          border: "border-l-4 border-l-[#1a73e8] border-[#dadce0] dark:border-[#3c4043]",
          badge: "bg-[#e8f0fe] text-[#1967d2] dark:bg-[#1a3a60] dark:text-[#8ab4f8] border border-[#d2e3fc] dark:border-[#1e4976]",
          dot: "bg-[#1a73e8]",
        };
      case "improvement":
        return {
          border: "border-l-4 border-l-[#0f9d58] border-[#dadce0] dark:border-[#3c4043]",
          badge: "bg-[#e6f4ea] text-[#137333] dark:bg-[#133d28] dark:text-[#81c995] border border-[#ceead6] dark:border-[#1b5037]",
          dot: "bg-[#0f9d58]",
        };
      case "security":
        return {
          border: "border-l-4 border-l-[#f9ab00] border-[#dadce0] dark:border-[#3c4043]",
          badge: "bg-[#fef7e0] text-[#b06000] dark:bg-[#413310] dark:text-[#fdd663] border border-[#feefc3] dark:border-[#584414]",
          dot: "bg-[#f9ab00]",
        };
      case "fix":
        return {
          border: "border-l-4 border-l-[#ea4335] border-[#dadce0] dark:border-[#3c4043]",
          badge: "bg-[#fce8e6] text-[#c5221f] dark:bg-[#441a1a] dark:text-[#f28b82] border border-[#fad2cf] dark:border-[#5c2323]",
          dot: "bg-[#ea4335]",
        };
      default:
        return {
          border: "border-l-4 border-l-[#5f6368] border-[#dadce0] dark:border-[#3c4043]",
          badge: "bg-[#f1f3f4] text-[#3c4043] dark:bg-[#303134] dark:text-[#bdc1c6] border border-[#dadce0] dark:border-[#3c4043]",
          dot: "bg-[#5f6368]",
        };
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-3 overflow-hidden bg-[#ffffff] dark:bg-[#202124]">
      {/* 1. Google Search & Category Filter Bar */}
      <div className="shrink-0 mb-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-[#dadce0] dark:border-[#3c4043] pb-3">
        {/* Google Style Search Pill */}
        <div className="relative w-full md:w-80 lg:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5f6368] dark:text-[#9aa0a6]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search releases, features, security fixes..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-full bg-[#f1f3f4] dark:bg-[#303134] border border-transparent text-[#202124] dark:text-[#e8eaed] placeholder-[#5f6368] dark:placeholder-[#9aa0a6] focus:outline-hidden focus:bg-white dark:focus:bg-[#202124] focus:border-[#1a73e8] focus:shadow-[0_1px_3px_0_rgba(60,64,67,0.3)] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5f6368] hover:text-[#202124] dark:hover:text-[#e8eaed]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Google Material Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              activeCategory === "all"
                ? "bg-[#e8f0fe] text-[#1967d2] border-[#d2e3fc] dark:bg-[#1a3a60] dark:text-[#8ab4f8] dark:border-[#1e4976]"
                : "bg-transparent text-[#5f6368] dark:text-[#9aa0a6] border-[#dadce0] dark:border-[#3c4043] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
            }`}
          >
            <span>All Releases</span>
            <span className="text-[10px] font-mono opacity-80">({PATCH_NOTES.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("feature")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              activeCategory === "feature"
                ? "bg-[#e8f0fe] text-[#1967d2] border-[#d2e3fc] dark:bg-[#1a3a60] dark:text-[#8ab4f8] dark:border-[#1e4976]"
                : "bg-transparent text-[#5f6368] dark:text-[#9aa0a6] border-[#dadce0] dark:border-[#3c4043] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#1a73e8]" />
            <span>Features</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("improvement")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              activeCategory === "improvement"
                ? "bg-[#e6f4ea] text-[#137333] border-[#ceead6] dark:bg-[#133d28] dark:text-[#81c995] dark:border-[#1b5037]"
                : "bg-transparent text-[#5f6368] dark:text-[#9aa0a6] border-[#dadce0] dark:border-[#3c4043] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#0f9d58]" />
            <span>Improvements</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("security")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              activeCategory === "security"
                ? "bg-[#fef7e0] text-[#b06000] border-[#feefc3] dark:bg-[#413310] dark:text-[#fdd663] dark:border-[#584414]"
                : "bg-transparent text-[#5f6368] dark:text-[#9aa0a6] border-[#dadce0] dark:border-[#3c4043] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#f9ab00]" />
            <span>Security</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("fix")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
              activeCategory === "fix"
                ? "bg-[#fce8e6] text-[#c5221f] border-[#fad2cf] dark:bg-[#441a1a] dark:text-[#f28b82] dark:border-[#5c2323]"
                : "bg-transparent text-[#5f6368] dark:text-[#9aa0a6] border-[#dadce0] dark:border-[#3c4043] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#ea4335]" />
            <span>Fixes</span>
          </button>
        </div>
      </div>

      {/* 2. Main One-View Flex Layout: Left Timeline Rail + Right Detail Canvas */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 overflow-hidden">
        
        {/* Left Pane: Google Workspace Style Version Navigation Rail */}
        <aside className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col min-h-0 bg-[#f8f9fa] dark:bg-[#2d2f31] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] p-2.5 overflow-hidden">
          <div className="px-2 py-1 mb-1 text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] uppercase tracking-wider flex items-center justify-between">
            <span>Releases</span>
            <span className="font-mono">{filteredNotes.length} versions</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                No releases match the selected filters.
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = note.version === activeNote.version;
                return (
                  <button
                    key={note.version}
                    type="button"
                    onClick={() => setSelectedVersion(note.version)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-start justify-between gap-2.5 cursor-pointer border ${
                      isSelected
                        ? "bg-[#e8f0fe] dark:bg-[#1a3a60] text-[#1967d2] dark:text-[#8ab4f8] border-[#d2e3fc] dark:border-[#1e4976] shadow-xs font-medium"
                        : "bg-transparent border-transparent text-[#202124] dark:text-[#e8eaed] hover:bg-white dark:hover:bg-[#202124] hover:border-[#dadce0] dark:hover:border-[#3c4043]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Status Indicator Dot */}
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            note.isLatest
                              ? "bg-[#1a73e8]"
                              : note.version === "0.0.0"
                              ? "bg-[#0f9d58]"
                              : "bg-[#9aa0a6]"
                          }`}
                        />
                        <span className="font-bold font-mono text-[13px]">
                          v{note.version}
                        </span>
                        {note.isLatest && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-[#1a73e8] text-white">
                            Latest
                          </span>
                        )}
                        {note.version === "0.0.0" && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-[#0f9d58] text-white">
                            Base
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{note.releaseDate}</span>
                      </div>
                      <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-1 line-clamp-1 leading-snug">
                        {note.title}
                      </p>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform mt-1 ${
                        isSelected
                          ? "text-[#1a73e8] dark:text-[#8ab4f8] translate-x-0.5"
                          : "text-[#dadce0] dark:text-[#5f6368]"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Google Material Detail Canvas Card */}
        <section className="flex-1 min-h-0 flex flex-col bg-white dark:bg-[#202124] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] overflow-hidden">
          
          {/* Card Header Strip */}
          <div className="shrink-0 p-4 sm:p-5 border-b border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#2d2f31] flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xl sm:text-2xl font-black font-mono text-[#202124] dark:text-[#e8eaed]">
                  v{activeNote.version}
                </span>
                {activeNote.isLatest && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f0fe] text-[#1967d2] dark:bg-[#1a3a60] dark:text-[#8ab4f8] border border-[#d2e3fc] dark:border-[#1e4976]">
                    Active OTA Build
                  </span>
                )}
                {activeNote.version === "0.0.0" && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] dark:bg-[#133d28] dark:text-[#81c995] border border-[#ceead6] dark:border-[#1b5037]">
                    Base Offline Installer
                  </span>
                )}
                <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Released {activeNote.releaseDate}</span>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#202124] dark:text-[#e8eaed] mt-1">
                {activeNote.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 max-w-3xl leading-relaxed">
                {activeNote.summary}
              </p>
            </div>

            {/* Action Buttons: Google Blue Download + Share */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => copyShareLink(activeNote.version)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] border border-[#dadce0] dark:border-[#3c4043] transition-colors"
                title="Copy direct link to this version"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0f9d58]" />
                    <span className="text-[#0f9d58]">Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </>
                )}
              </button>

              {/* Action Buttons: Download Latest / Download Base v0.0.0 / OTA Indicator */}
              {activeNote.isLatest ? (
                <Link
                  href="/download"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
                  title={`Download active release v${activeNote.version}`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Latest (v{activeNote.version})</span>
                </Link>
              ) : activeNote.version === "0.0.0" ? (
                <a
                  href="https://gphost.eu.cc/raw/gpn-app?v=0.0.0"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
                  title="Official permanent Base v0.0.0 installer for desktop setup"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Base v0.0.0</span>
                </a>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f1f3f4] dark:bg-[#303134] text-[#5f6368] dark:text-[#9aa0a6] text-[11px] font-medium border border-[#dadce0] dark:border-[#3c4043]"
                    title="Past standalone binaries are not archived. GPN utilizes continuous Over-The-Air (OTA) updates."
                  >
                    <RefreshCw className="w-3 h-3 text-[#1a73e8]" />
                    <span>OTA Update Only</span>
                  </div>
                  <a
                    href="https://gphost.eu.cc/raw/gpn-app?v=0.0.0"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all"
                    title="Download permanent Base v0.0.0 installer. You can use your app normally and update to the latest release at any time."
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Get Base v0.0.0</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* User-Friendly Opt-In Architecture Notice for Historical Releases */}
          {!activeNote.isLatest && activeNote.version !== "0.0.0" && (
            <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-[#e8f0fe] dark:bg-[#1a3a60]/30 border border-[#d2e3fc] dark:border-[#1e4976] flex items-start gap-2.5 text-xs text-[#1967d2] dark:text-[#8ab4f8]">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1a73e8]" />
              <div className="space-y-0.5 leading-relaxed">
                <p className="font-semibold text-[#174ea6] dark:text-[#aecbfa]">
                  Continuous Over-The-Air (OTA) Release Architecture
                </p>
                <p className="text-[11px] text-[#3c4043] dark:text-[#bdc1c6]">
                  Historical standalone binaries are not archived on edge storage to maintain strict 2-file storage integrity. Install <strong>Base v0.0.0</strong> to get started. You can use your application normally at all times, and opt in to download and apply the latest release whenever you choose.
                </p>
              </div>
            </div>
          )}

          {/* Categorized Changes List (Internal smooth scroll strictly inside card) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
            {activeNote.categories
              .filter(
                (cat) =>
                  activeCategory === "all" || cat.type === activeCategory
              )
              .map((cat, idx) => {
                const theme = getCategoryTheme(cat.type);
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl bg-[#ffffff] dark:bg-[#202124] border ${theme.border} shadow-2xs transition-all`}
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      {renderCategoryIcon(cat.type)}
                      <h3 className="text-xs sm:text-sm font-bold text-[#202124] dark:text-[#e8eaed]">
                        {cat.title}
                      </h3>
                      <span
                        className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${theme.badge}`}
                      >
                        {cat.type}
                      </span>
                    </div>

                    <ul className="space-y-1.5 text-xs sm:text-sm text-[#3c4043] dark:text-[#bdc1c6]">
                      {cat.items.map((item, itemIdx) => (
                        <li
                          key={itemIdx}
                          className="flex items-start gap-2 leading-relaxed"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${theme.dot}`}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

            {/* Manifest Payload Note in Google Cloud Console aesthetic */}
            {activeNote.rawNotes && (
              <div className="p-3.5 rounded-xl bg-[#f8f9fa] dark:bg-[#2d2f31] border border-[#dadce0] dark:border-[#3c4043] text-xs text-[#5f6368] dark:text-[#9aa0a6] font-mono">
                <span className="font-semibold text-[#202124] dark:text-[#e8eaed] block mb-1">
                  Cryptographic Release Signature &amp; Manifest:
                </span>
                <p className="whitespace-pre-wrap">{activeNote.rawNotes}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function PatchNotesClient() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex-1 flex items-center justify-center p-8 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
          Loading release history...
        </div>
      }
    >
      <PatchNotesContent />
    </Suspense>
  );
}

