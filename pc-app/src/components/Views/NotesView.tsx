import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNotesStore } from '../../stores/notesStore';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import { NoteEditor, NoteViewMode } from '../Editor/NoteEditor';
import type { LocalNote } from '../../types/note';
import {
  Plus,
  Search,
  Trash2,
  FileText,
  Lock,
  Flame,
  Columns2,
  PenLine,
  Eye,
  Copy,
  Info,
  ListTree,
  Zap,
  Check,
  CheckCircle2,
  X,
  RefreshCw,
  User,
  Database,
  ShieldCheck,
  Menu,
  HelpCircle,
  SlidersHorizontal,
  ChevronDown,
  Download,
  Sun,
  Moon,
  LogOut,
  Home,
  PanelLeft,
  MousePointerClick,
} from 'lucide-react';
import type { GpnTab } from '../GpnLayout/GpnSidebar';

export interface NotesViewProps {
  onSelectTab?: (tab: GpnTab) => void;
  isAuthenticated?: boolean;
  isOnline?: boolean;
  trashCount?: number;
  onOpenSearchModal: () => void;
  onOpenSmartBurn?: () => void;
  onOpenQuickCapture?: () => void;
  onOpenShortcuts?: () => void;
  onOpenAuthModal?: (mode?: 'default' | 'logout') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onQuit?: () => void;
}

// Helper: Download a file in browser / WebView
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper: Sanitize filename
function sanitizeFilename(name?: string): string {
  if (!name || !name.trim()) return 'untitled-note';
  return name.trim().replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '-').toLowerCase() || 'note';
}

// Helper: Convert HTML to simple Markdown
function htmlToMarkdownSimple(html: string): string {
  if (!html) return '';
  let md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<img[^>]*src=["'](.*?)["'][^>]*alt=["'](.*?)["'][^>]*>/gi, '![$2]($1)\n\n')
    .replace(/<img[^>]*alt=["'](.*?)["'][^>]*src=["'](.*?)["'][^>]*>/gi, '![$1]($2)\n\n')
    .replace(/<img[^>]*src=["'](.*?)["'][^>]*>/gi, '![]($1)\n\n')
    .replace(/<a[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n\n');
  const temp = document.createElement('div');
  temp.innerHTML = md;
  return (temp.textContent || temp.innerText || '').trim();
}

// Helper: HTML to plain text
function htmlToPlainText(html: string): string {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return (temp.textContent || temp.innerText || '').trim();
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(content: string): HeadingItem[] {
  if (!content) return [];
  const temp = document.createElement('div');
  temp.innerHTML = content;
  const elements = temp.querySelectorAll('h1, h2, h3, h4');
  const headings: HeadingItem[] = [];
  elements.forEach((el, idx) => {
    const text = el.textContent?.trim() || '';
    if (text) {
      headings.push({
        id: `heading-${idx}`,
        text,
        level: parseInt(el.tagName.substring(1), 10) || 1,
      });
    }
  });
  return headings;
}

export const NotesView: React.FC<NotesViewProps> = ({
  onSelectTab,
  isAuthenticated: propIsAuth,
  isOnline = true,
  trashCount,
  onOpenSearchModal,
  onOpenSmartBurn,
  onOpenQuickCapture,
  onOpenShortcuts,
  onOpenAuthModal,
  isDarkMode = false,
  onToggleDarkMode,
  onQuit,
}) => {
  const {
    notes,
    activeNoteId,
    selectNote,
    createNote,
    moveToTrash,
    saveStatus,
    toggleNoteSyncMode,
  } = useNotesStore();

  const { user, isAuthenticated: storeIsAuth } = useAuthStore();
  const { isManualSyncing } = useSyncStore();

  const effectiveIsAuth = propIsAuth ?? storeIsAuth;

  // Left Pane & Layout States
  const [isNotesListOpen, setIsNotesListOpen] = useState(true);

  // Views switcher dropdown state
  const [isViewsMenuOpen, setIsViewsMenuOpen] = useState(false);
  const viewsMenuRef = useRef<HTMLDivElement>(null);

  // Notes Navbar Menu & Mode States
  const [viewMode, setViewMode] = useState<NoteViewMode>('edit');
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);

  // Active note lookup (null if deselected, e.g. clicking Home)
  const activeNote = activeNoteId ? notes.find((n) => n.id === activeNoteId) || null : null;

  const handleGoHome = () => {
    selectNote(null);
    if (onSelectTab) {
      onSelectTab('home');
    }
  };

  // Status badge computation
  let statusText = 'LOCAL';
  let badgeStyle =
    'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700';
  let dotElement: React.ReactNode = (
    <span className="relative flex h-2 w-2">
      <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-400 dark:bg-zinc-500" />
    </span>
  );

  if (!isOnline) {
    statusText = 'OFFLINE';
    badgeStyle =
      'border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400';
    dotElement = (
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
    );
  } else if (isManualSyncing) {
    statusText = 'SYNCING';
    badgeStyle =
      'border-sky-300 dark:border-sky-800/80 bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400';
    dotElement = (
      <RefreshCw className="w-2.5 h-2.5 animate-spin text-sky-600 dark:text-sky-400" />
    );
  } else if (effectiveIsAuth) {
    statusText = 'LIVE';
    badgeStyle =
      'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400';
    dotElement = (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    );
  }

  // Auto-dismiss feedback toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setIsActionsMenuOpen(false);
      }
      if (outlineRef.current && !outlineRef.current.contains(target)) {
        setIsOutlineOpen(false);
      }
      if (viewsMenuRef.current && !viewsMenuRef.current.contains(target)) {
        setIsViewsMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsActionsMenuOpen(false);
        setIsOutlineOpen(false);
        setIsViewsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Sorted notes (most recently updated first) matching website Image 3
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [notes]);

  // Headings extracted for the Table of Contents outline
  const headings = useMemo(() => {
    if (!activeNote?.content) return [];
    return extractHeadings(activeNote.content);
  }, [activeNote?.content]);

  // Jump smoothly to heading
  const handleJumpToHeading = (headingText: string) => {
    setIsOutlineOpen(false);
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4');
    for (const h of Array.from(allHeadings)) {
      if (h.textContent?.trim() === headingText) {
        h.scrollIntoView({ behavior: 'smooth', block: 'center' });
        h.classList.add('bg-amber-100', 'dark:bg-amber-950/60', 'transition-colors');
        setTimeout(() => {
          h.classList.remove('bg-amber-100', 'dark:bg-amber-950/60');
        }, 1500);
        break;
      }
    }
  };

  // Note Action Handlers
  const handleCopyMarkdown = async () => {
    if (!activeNote) return;
    setIsActionsMenuOpen(false);
    const md = htmlToMarkdownSimple(activeNote.content);
    const fullMd = `# ${activeNote.title || 'Untitled Note'}\n\n${md}`;
    await navigator.clipboard.writeText(fullMd);
    showToast('Copied Note as Markdown');
  };

  const handleCopyPlainText = async () => {
    if (!activeNote) return;
    setIsActionsMenuOpen(false);
    const text = `${activeNote.title || 'Untitled Note'}\n\n${htmlToPlainText(activeNote.content)}`;
    await navigator.clipboard.writeText(text);
    showToast('Copied Plain Text');
  };

  const handleDuplicateNote = async (noteToDuplicate?: LocalNote) => {
    const target = noteToDuplicate || activeNote;
    if (!target) return;
    setIsActionsMenuOpen(false);
    const copy = await createNote(`${target.title} (Copy)`, target.content);
    selectNote(copy.id);
    showToast('Duplicated Note in Vault');
  };

  const handleExportMarkdown = () => {
    if (!activeNote) return;
    setIsActionsMenuOpen(false);
    const md = htmlToMarkdownSimple(activeNote.content);
    const fullMd = `# ${activeNote.title || 'Untitled Note'}\n\n${md}`;
    downloadFile(fullMd, `${sanitizeFilename(activeNote.title)}.md`, 'text/markdown;charset=utf-8');
    showToast('Exported Markdown (.md)');
  };

  const handleExportHtml = () => {
    if (!activeNote) return;
    setIsActionsMenuOpen(false);
    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${activeNote.title || 'Untitled Note'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1e293b; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    pre { background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: Consolas, monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${activeNote.title || 'Untitled Note'}</h1>
  <div>${activeNote.content}</div>
</body>
</html>`;
    downloadFile(htmlDoc, `${sanitizeFilename(activeNote.title)}.html`, 'text/html;charset=utf-8');
    showToast('Exported HTML document (.html)');
  };

  const handleExportText = () => {
    if (!activeNote) return;
    setIsActionsMenuOpen(false);
    const text = `${activeNote.title || 'Untitled Note'}\n\n${htmlToPlainText(activeNote.content)}`;
    downloadFile(text, `${sanitizeFilename(activeNote.title)}.txt`, 'text/plain;charset=utf-8');
    showToast('Exported Plain Text (.txt)');
  };

  const handleExportJson = () => {
    if (!activeNote) return;
    setIsActionsMenuOpen(false);
    const jsonStr = JSON.stringify(activeNote, null, 2);
    downloadFile(jsonStr, `${sanitizeFilename(activeNote.title)}.json`, 'application/json;charset=utf-8');
    showToast('Exported JSON data (.json)');
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-white dark:bg-zinc-950 select-none relative transition-colors">
      {/* ========================================================================= */}
      {/* 1. SINGULAR FULL-WIDTH APP NAVBAR (SPANS WHOLE APP WIDTH, NOT RIGHT-FITTED) */}
      {/* ========================================================================= */}
      <header className="h-11 border-b border-zinc-200 dark:border-zinc-800/80 px-3 sm:px-4 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0 select-none z-30 gap-2 transition-colors w-full">
        {/* Left Group: GPN Brand + Home Button + Views Switcher + Status Pill + Explorer Toggle + Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Brand GPN: Clicking returns to Home / Main Menu */}
          <button
            type="button"
            onClick={handleGoHome}
            className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 hover:opacity-75 transition cursor-pointer flex items-center gap-1 shrink-0 font-sans pr-1"
            title="GPN Home (Click to return to home)"
          >
            <span>gpn</span>
          </button>

          {/* Dedicated Home Button */}
          <button
            type="button"
            onClick={handleGoHome}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 ${
              !activeNote ? 'ring-1 ring-violet-500/40 text-violet-700 dark:text-violet-300 font-semibold bg-violet-50/50 dark:bg-violet-950/20' : ''
            }`}
            title="Home / Main Menu"
          >
            <Home size={13} className={!activeNote ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-500'} />
            <span>Home</span>
          </button>

          {/* App Views / Navigation Dropdown */}
          <div className="relative" ref={viewsMenuRef}>
            <button
              type="button"
              onClick={() => setIsViewsMenuOpen((p) => !p)}
              title="Navigation (Account, Database, Trash, etc.)"
              className="flex items-center gap-1 px-2 py-1 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
            >
              <Menu size={13} />
              <span className="text-[11px] hidden sm:inline">Views</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {isViewsMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
                  Navigation
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewsMenuOpen(false);
                    handleGoHome();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                >
                  <Home size={14} className="text-zinc-500" />
                  <span>Home / Main Menu</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewsMenuOpen(false);
                    if (onOpenAuthModal) {
                      onOpenAuthModal();
                    } else {
                      onSelectTab?.('account');
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                >
                  <User size={14} className="text-zinc-500" />
                  <span>{user ? user.displayName || user.email || 'My Account' : 'Sign In'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsViewsMenuOpen(false); onSelectTab?.('database'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                >
                  <Database size={14} className="text-zinc-500" />
                  <span>Database</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsViewsMenuOpen(false); onSelectTab?.('permissions'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                >
                  <ShieldCheck size={14} className="text-zinc-500" />
                  <span>Permissions</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsViewsMenuOpen(false); onSelectTab?.('trash'); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 size={14} className="text-zinc-500" />
                    <span>Trash</span>
                  </div>
                  {trashCount !== undefined && trashCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {trashCount}
                    </span>
                  )}
                </button>
                <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                {onOpenSmartBurn && (
                  <button
                    type="button"
                    onClick={() => { setIsViewsMenuOpen(false); onOpenSmartBurn(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer text-left font-medium"
                  >
                    <Flame size={14} className="text-amber-500" />
                    <span>Smart Burn Note</span>
                  </button>
                )}
                {onOpenShortcuts && (
                  <button
                    type="button"
                    onClick={() => { setIsViewsMenuOpen(false); onOpenShortcuts(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                  >
                    <HelpCircle size={14} className="text-zinc-500" />
                    <span>Shortcuts</span>
                  </button>
                )}
                {onToggleDarkMode && (
                  <button
                    type="button"
                    onClick={() => { setIsViewsMenuOpen(false); onToggleDarkMode(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                  >
                    {isDarkMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-zinc-500" />}
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                )}
                {onQuit && (
                  <button
                    type="button"
                    onClick={() => { setIsViewsMenuOpen(false); onQuit(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-left"
                  >
                    <LogOut size={14} className="text-rose-500" />
                    <span>Quit GPN</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Interactive Status Pill */}
          <button
            type="button"
            onClick={() => {
              if (effectiveIsAuth) {
                onOpenAuthModal?.('logout');
              } else {
                onOpenAuthModal?.('default');
              }
            }}
            className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border text-[10px] font-mono font-medium tracking-wider cursor-pointer select-none transition-all active:scale-95 shadow-2xs ${badgeStyle}`}
            title={effectiveIsAuth ? 'Synced • Click to manage' : 'Local notes • Click to sign in'}
          >
            {dotElement}
            <span>{statusText}</span>
          </button>

          {/* Divider */}
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5 shrink-0" />

          {/* Toggle Notes List Sidebar */}
          <button
            type="button"
            onClick={() => setIsNotesListOpen((p) => !p)}
            title={isNotesListOpen ? "Hide Notes List (Ctrl+\\)" : "Show Notes List (Ctrl+\\)"}
            className={`flex items-center gap-1 px-2 py-1 rounded-[4px] border transition cursor-pointer text-xs shrink-0 ${
              isNotesListOpen
                ? "border-violet-300/60 dark:border-violet-700/60 bg-violet-50/50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300"
                : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <PanelLeft size={13} />
            <span className="text-[11px] font-mono hidden md:inline">Notes</span>
          </button>

          {/* Breadcrumb Title */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-zinc-400 text-xs hidden lg:inline">Notes /</span>
            <span className="font-bold text-xs truncate max-w-[110px] sm:max-w-[150px] md:max-w-[200px] text-zinc-900 dark:text-zinc-100">
              {activeNote ? activeNote.title || 'Untitled Note' : 'All Notes'}
            </span>
          </div>

          {/* Dynamic Sync Mode Badge / Toggle */}
          {activeNote && (
            <button
              type="button"
              onClick={() => toggleNoteSyncMode(activeNote.id)}
              title={
                activeNote.syncState === 'local_only'
                  ? 'Note is saved locally. Click to sync with account.'
                  : 'Note is synced. Click to keep local only.'
              }
              className={`hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-semibold transition cursor-pointer select-none border ${
                activeNote.syncState === 'local_only'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {activeNote.syncState === 'local_only' ? (
                <>
                  <Lock className="w-2.5 h-2.5 text-amber-500" />
                  <span>LOCAL</span>
                </>
              ) : isManualSyncing ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-500" />
                  <span>SYNCING</span>
                </>
              ) : (
                <>
                  <Check className="w-2.5 h-2.5 text-emerald-500" />
                  <span>{effectiveIsAuth ? 'SYNCED' : 'OFFLINE'}</span>
                </>
              )}
            </button>
          )}

          {/* Auto-save Status */}
          {activeNote && (
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 hidden 2xl:inline">
              • {saveStatus}
            </span>
          )}
        </div>

        {/* Right Group: Search + Capture + Burn + Active Note Tools + New Note */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Search */}
          <button
            type="button"
            onClick={onOpenSearchModal}
            title="Search Notes (Ctrl+K)"
            className="flex items-center gap-1 px-2 py-1 rounded-[3px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px] hidden sm:inline">Ctrl+K</span>
          </button>

          {/* Capture */}
          {onOpenQuickCapture && (
            <button
              type="button"
              onClick={onOpenQuickCapture}
              title="Gaurav Personal Notes Capture (Ctrl+Shift+N / Ctrl+Shift+C)"
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-[3px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-medium hidden lg:inline">Capture</span>
            </button>
          )}

          {/* Smart Burn View-Once Secret */}
          {onOpenSmartBurn && (
            <button
              type="button"
              onClick={onOpenSmartBurn}
              title="Create View-Once Encrypted Burn Note"
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-[3px] border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] hidden lg:inline">Burn Note</span>
            </button>
          )}

          {/* Active Note Specific Options: Outline + View Mode + Actions Menu */}
          {activeNote && (
            <>
              {/* Outline / Table of Contents */}
              <div className="relative" ref={outlineRef}>
                <button
                  type="button"
                  onClick={() => setIsOutlineOpen((p) => !p)}
                  title="Table of Contents & Heading Jump Links"
                  className={`flex items-center gap-1 px-2 py-1 rounded-[3px] border text-xs transition cursor-pointer ${
                    isOutlineOpen
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ListTree className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] hidden md:inline">Outline</span>
                  <span className="text-[9px] font-mono text-zinc-400">({headings.length})</span>
                </button>

                {isOutlineOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs font-bold font-mono uppercase tracking-wide">Note Outline</span>
                      <span className="text-[10px] font-mono text-zinc-400">{headings.length} headings</span>
                    </div>

                    {headings.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {headings.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => handleJumpToHeading(h.text)}
                            className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 truncate transition block ${
                              h.level === 1
                                ? 'font-bold text-zinc-900 dark:text-zinc-100'
                                : h.level === 2
                                ? 'pl-4 font-medium text-zinc-800 dark:text-zinc-200'
                                : 'pl-6 text-zinc-600 dark:text-zinc-400 text-[11px]'
                            }`}
                          >
                            {h.text}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                        <p>No headings in this note.</p>
                        <p className="text-[10px] mt-1 text-zinc-500">Type # or ## in your text to generate an outline.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center p-0.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  title="Write / Edit Mode"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-medium transition cursor-pointer ${
                    viewMode === 'edit'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                >
                  <PenLine className="w-3 h-3" />
                  <span className="hidden sm:inline">Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  title="Side-by-side Split View (Edit + Live Preview)"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-medium transition cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                >
                  <Columns2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Split</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  title="Formatted Reader Preview Mode"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-medium transition cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              </div>

              {/* Note Actions Menu */}
              <div className="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsActionsMenuOpen((p) => !p)}
                  title="Note Actions & Export Menu"
                  className={`flex items-center gap-1 px-2 py-1 rounded-[3px] border text-xs transition cursor-pointer ${
                    isActionsMenuOpen
                      ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {isActionsMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-2 z-50 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs animate-in fade-in zoom-in-95 duration-100">
                    {/* Section 1: Quick Actions & Copy */}
                    <div className="pb-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicateNote()}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5 text-blue-500" />
                          <span>Duplicate Note</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">CLONE</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyMarkdown}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5 text-violet-500" />
                          <span>Copy Markdown</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">MD</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyPlainText}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Copy Plain Text</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">TXT</span>
                      </button>
                    </div>

                    {/* Section 2: File Exports */}
                    <div className="py-1.5 space-y-0.5">
                      <div className="px-2.5 py-1 text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
                        Export As
                      </div>

                      <button
                        type="button"
                        onClick={handleExportMarkdown}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Download className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Markdown Document</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">.md</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportHtml}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Download className="w-3.5 h-3.5 text-blue-500" />
                          <span>Standalone HTML</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">.html</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportText}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Download className="w-3.5 h-3.5 text-purple-500" />
                          <span>Plain Text File</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">.txt</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportJson}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Download className="w-3.5 h-3.5 text-amber-500" />
                          <span>JSON Note Object</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">.json</span>
                      </button>
                    </div>

                    {/* Section 3: Metadata Info & Move to Trash */}
                    <div className="pt-1.5 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsActionsMenuOpen(false);
                          setIsInfoModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition text-left cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5 text-sky-500" />
                        <span>Note Information</span>
                      </button>

                      {activeNote && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsActionsMenuOpen(false);
                            moveToTrash(activeNote.id);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition text-left cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Move to Trash</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Primary Action Button: + NEW NOTE */}
          <button
            type="button"
            onClick={() => createNote()}
            title="Create New Note (Ctrl+N)"
            className="flex items-center gap-1.5 px-3 py-1 rounded-[3px] bg-violet-600 hover:bg-violet-700 text-white text-xs font-mono font-bold tracking-wide transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">NEW</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. LOWER SPLIT: LEFT COMPACT NOTES LIST & RIGHT EDITOR WORKSPACE CANVAS   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full relative">
        {/* Compact Notes Explorer (10char limit with auto horizontal scroll) */}
        {isNotesListOpen && (
          <aside className="w-44 sm:w-48 h-full border-r border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-950/40 flex flex-col shrink-0 select-none transition-colors z-10">
            {/* Header: Title + Count + Quick New Button */}
            <div className="p-2.5 px-3 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText size={15} className="text-violet-500 shrink-0" />
                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 tracking-tight">Notes</span>
                {notes.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {notes.length}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => createNote()}
                className="w-6 h-6 flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white rounded-md shadow-2xs transition active:scale-95 cursor-pointer"
                title="Create New Note (Ctrl+N)"
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>

            {/* Note Cards List */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              {sortedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center select-none">
                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center text-zinc-400 mb-2">
                    <FileText size={16} />
                  </div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">No notes</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Click + to create</p>
                </div>
              ) : (
                sortedNotes.map((note) => {
                  const isActive = activeNote?.id === note.id;
                  const isLocalOnly = note.syncState === 'local_only';
                  const noteTitle = note.title || 'Untitled Note';
                  const isLong = noteTitle.length > 10;

                  // Format timestamp helper
                  const dateObj = new Date(note.updatedAt || Date.now());
                  const isToday = new Date().toDateString() === dateObj.toDateString();
                  const timeStr = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const formattedTime = isToday ? timeStr : dateStr;

                  return (
                    <div
                      key={note.id}
                      onClick={() => selectNote(note.id)}
                      className={`group block mx-0.5 p-2 rounded-lg transition-all relative overflow-hidden cursor-pointer select-none ${
                        isActive
                          ? "bg-white dark:bg-zinc-900 shadow-xs border border-zinc-200/80 dark:border-zinc-800/80 is-active-card"
                          : "border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-cyan-500 to-violet-500 rounded-r-full" />
                      )}

                      <div className="flex items-center gap-2 pr-5 relative z-10 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                          }`}
                        >
                          <FileText size={14} className={isActive ? "stroke-[2.5]" : "stroke-[2]"} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* 10char max container with auto horizontal scroll for long names */}
                          <div className="title-container-10ch" title={noteTitle}>
                            <span
                              className={`title-scroll-content text-xs transition-colors ${
                                isLong ? "is-long" : ""
                              } ${
                                isActive
                                  ? "font-semibold text-zinc-900 dark:text-zinc-100"
                                  : "font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
                              }`}
                            >
                              {noteTitle}
                            </span>
                          </div>

                          <p
                            className={`text-[10px] mt-0.5 truncate flex items-center gap-1 ${
                              isActive
                                ? "font-medium text-violet-600/80 dark:text-violet-400/80"
                                : "font-medium text-zinc-400 dark:text-zinc-500"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isLocalOnly ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                            />
                            <span className="truncate">{isLocalOnly ? "Local" : "Synced"} • {formattedTime}</span>
                          </p>
                        </div>
                      </div>

                      {/* Quick hover trash action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveToTrash(note.id);
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 transition z-20 cursor-pointer"
                        title="Move to trash"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Right Canvas: Dedicated Editor or Home Workspace Landing */}
        <section className="flex-1 h-full overflow-hidden flex flex-col bg-white dark:bg-zinc-950 transition-colors min-w-0">
          {!activeNote ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center select-none bg-white dark:bg-zinc-950">
              <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4 shadow-2xs">
                <MousePointerClick size={28} strokeWidth={1.75} className="opacity-70 text-zinc-700 dark:text-zinc-300 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-1.5">
                Click to load notes here
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
                Click any note from the list on the left to load and edit it here, or create a new note to start writing.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => createNote()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Create New Note</span>
                  <kbd className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-1 font-mono">Ctrl+N</kbd>
                </button>
                <button
                  type="button"
                  onClick={onOpenSearchModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition cursor-pointer"
                >
                  <Search size={14} />
                  <span>Search Vault (Ctrl+K)</span>
                </button>
              </div>

              {/* Quick links to recent notes */}
              {sortedNotes.length > 0 && (
                <div className="mt-8 max-w-md w-full text-left">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
                      Or click a note to load:
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {sortedNotes.length} note{sortedNotes.length === 1 ? '' : 's'} in vault
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {sortedNotes.slice(0, 5).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => selectNote(n.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 transition text-left cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 shrink-0 transition-colors" />
                          <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-zinc-950 dark:group-hover:text-white">
                            {n.title || 'Untitled Note'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                          {new Date(n.updatedAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <NoteEditor viewMode={viewMode} />
          )}
        </section>
      </div>

      {/* Feedback Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900/95 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium shadow-xl border border-zinc-700/40 dark:border-zinc-300 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Note Metadata Details Modal */}
      {isInfoModalOpen && activeNote && (
        <div
          onClick={() => setIsInfoModalOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 space-y-4 text-xs animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Note Information
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInfoModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 font-mono">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-400">Title:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]">
                  {activeNote.title || 'Untitled Note'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-400">Note ID:</span>
                <span className="text-[11px] truncate max-w-[200px]">{activeNote.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-400">Words / Characters:</span>
                <span>
                  {activeNote.wordCount || 0} words • {activeNote.content.length} chars
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-400">Reading Time:</span>
                <span>{Math.max(1, Math.ceil((activeNote.wordCount || 0) / 200))} min read</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-400">Sync Status:</span>
                <span
                  className={
                    activeNote.syncState === 'local_only' ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'
                  }
                >
                  {activeNote.syncState === 'local_only' ? 'Local Vault Only' : 'Cloud Synced'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-400">Created:</span>
                <span>{new Date(activeNote.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-400">Last Modified:</span>
                <span>{new Date(activeNote.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Storage Engine:</span>
                <span className="text-zinc-500">SQLite (gpn_local.db)</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInfoModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesView;
