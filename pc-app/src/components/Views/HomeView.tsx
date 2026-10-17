import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  CheckSquare,
  Calendar,
  Flame,
  Plus,
  Search,
  ArrowRight,
  RefreshCw,
  Cloud,
  Laptop,
  Download,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Layers,
  Lightbulb,
  GraduationCap,
  Bookmark,
  Bug,
  Code,
  Activity,
  DollarSign,
  Compass,
  Scale,
  Users,
} from 'lucide-react';
import { useNotesStore } from '../../stores/notesStore';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import { syncService } from '../../services/syncService';
import type { GpnTab } from '../GpnLayout/GpnSidebar';
import { BackupModal } from '../BackupModal';

export interface NoteTemplate {
  id: string;
  title: string;
  tag: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  getContent: () => string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting',
    title: 'Meeting Notes',
    tag: 'Team',
    desc: 'Agenda, discussion & actions',
    icon: Calendar,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    getContent: () => {
      const today = new Date().toLocaleDateString();
      return `<h2>Meeting Notes</h2><p><strong>Date:</strong> ${today} &bull; <strong>Time:</strong> ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p><p><strong>Attendees:</strong> </p><hr/><h3>1. Agenda & Goals</h3><ul><li>Objective 1</li><li>Objective 2</li></ul><h3>2. Discussion Notes</h3><p>Key takeaways and decisions...</p><h3>3. Action Items</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Assignee: Task item 1</li><li class="task-list-item"><input type="checkbox"/> Assignee: Follow-up item 2</li></ul>`;
    },
  },
  {
    id: 'todo',
    title: 'To-Do List',
    tag: 'Tasks',
    desc: 'Prioritized checklist',
    icon: CheckSquare,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    getContent: () => {
      return `<h2>To-Do List</h2><p><em>Created on ${new Date().toLocaleDateString()}</em></p><h3>🔥 Urgent & Important</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> High priority task</li></ul><h3>📋 Today's Tasks</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Task item 1</li><li class="task-list-item"><input type="checkbox"/> Task item 2</li><li class="task-list-item"><input type="checkbox"/> Task item 3</li></ul><h3>⏳ Backlog / Later</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Low priority idea</li></ul>`;
    },
  },
  {
    id: 'journal',
    title: 'Daily Journal',
    tag: 'Daily',
    desc: 'Focus, thoughts & gratitude',
    icon: BookOpen,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    getContent: () => {
      return `<h2>Daily Journal &mdash; ${new Date().toLocaleDateString()}</h2><h3>🎯 Today's Main Focus</h3><p>What is the single most important priority today?</p><h3>💡 Thoughts & Reflections</h3><p>How did today go? What went well and what can be improved?</p><h3>✨ 3 Things I am Grateful For</h3><ol><li></li><li></li><li></li></ol>`;
    },
  },
  {
    id: 'roadmap',
    title: 'Project Plan',
    tag: 'Project',
    desc: 'Milestones & deliverables',
    icon: Layers,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    getContent: () => {
      return `<h2>Project Plan: [Project Name]</h2><p><strong>Owner:</strong> &bull; <strong>Target Date:</strong> </p><hr/><h3>🎯 Scope & Objective</h3><p>Briefly describe the purpose of this project...</p><h3>🚩 Milestones</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Phase 1: Planning & Architecture</li><li class="task-list-item"><input type="checkbox"/> Phase 2: Core Implementation</li><li class="task-list-item"><input type="checkbox"/> Phase 3: Testing & Delivery</li></ul><h3>⚠️ Risks & Notes</h3><p>Any obstacles or dependencies...</p>`;
    },
  },
  {
    id: 'weekly',
    title: 'Weekly Review',
    tag: 'Review',
    desc: 'Wins, learnings & goals',
    icon: Activity,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    getContent: () => {
      return `<h2>Weekly Review &mdash; Week of ${new Date().toLocaleDateString()}</h2><h3>🏆 Top Wins & Accomplishments</h3><ul><li>Key win 1</li><li>Key win 2</li></ul><h3>🔍 Challenges & Lessons</h3><p>What friction occurred and how can it be avoided?</p><h3>🚀 Top 3 Priorities for Next Week</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Priority goal 1</li><li class="task-list-item"><input type="checkbox"/> Priority goal 2</li><li class="task-list-item"><input type="checkbox"/> Priority goal 3</li></ul>`;
    },
  },
  {
    id: 'ideas',
    title: 'Idea Dump',
    tag: 'Creative',
    desc: 'Brainstorming & exploration',
    icon: Lightbulb,
    color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    getContent: () => {
      return `<h2>Idea Dump &amp; Brainstorming</h2><p><strong>Topic / Theme:</strong> </p><hr/><h3>💡 Core Concept</h3><p>Explain the idea in simple terms...</p><h3>🔍 Problem It Solves</h3><p></p><h3>🌱 Angles & Possibilities</h3><ul><li>Possibility 1</li><li>Possibility 2</li></ul><h3>⏭️ Next Step to Test</h3><p></p>`;
    },
  },
  {
    id: 'study',
    title: 'Study Guide',
    tag: 'Learning',
    desc: 'Key concepts & review questions',
    icon: GraduationCap,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    getContent: () => {
      return `<h2>Study Guide: [Subject Name]</h2><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><hr/><h3>📚 Key Concepts</h3><ul><li><strong>Concept 1:</strong> Definition and notes...</li><li><strong>Concept 2:</strong> Definition and notes...</li></ul><h3>📝 Summary in Plain Words</h3><p></p><h3>❓ Self-Test Questions</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Question 1</li><li class="task-list-item"><input type="checkbox"/> Question 2</li></ul>`;
    },
  },
  {
    id: 'book',
    title: 'Book Summary',
    tag: 'Reading',
    desc: 'Key takeaways & quotes',
    icon: Bookmark,
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    getContent: () => {
      return `<h2>Book Summary: [Book Title]</h2><p><strong>Author:</strong> &bull; <strong>Rating:</strong> ⭐⭐⭐⭐⭐</p><hr/><h3>💡 Core Message in One Sentence</h3><p></p><h3>🔑 Top Takeaways</h3><ol><li>Key takeaway 1</li><li>Key takeaway 2</li><li>Key takeaway 3</li></ol><h3>💬 Favorite Quote</h3><blockquote>Quote text...</blockquote>`;
    },
  },
  {
    id: 'bug',
    title: 'Bug Report',
    tag: 'Dev',
    desc: 'Reproduction steps & logs',
    icon: Bug,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    getContent: () => {
      return `<h2>Bug Report: [Issue Title]</h2><p><strong>Severity:</strong> Medium &bull; <strong>Environment:</strong> Windows</p><hr/><h3>🐞 Description</h3><p>What unexpected behavior happened?</p><h3>🔄 Steps to Reproduce</h3><ol><li>Step 1</li><li>Step 2</li><li>Step 3</li></ol><h3>✅ Expected vs ❌ Actual</h3><p><strong>Expected:</strong> </p><p><strong>Actual:</strong> </p><h3>🛠️ Investigation & Fix Plan</h3><p></p>`;
    },
  },
  {
    id: 'techspec',
    title: 'Technical Spec',
    tag: 'Dev',
    desc: 'Architecture & API spec',
    icon: Code,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    getContent: () => {
      return `<h2>Technical Spec: [Feature Name]</h2><p><strong>Status:</strong> Draft &bull; <strong>Date:</strong> ${new Date().toLocaleDateString()}</p><hr/><h3>1. Overview & Goals</h3><p></p><h3>2. Architecture & Data Flow</h3><p></p><h3>3. API / Contract</h3><pre><code>// code snippet here</code></pre><h3>4. Testing Checklist</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Unit tests</li><li class="task-list-item"><input type="checkbox"/> Integration check</li></ul>`;
    },
  },
  {
    id: 'habits',
    title: 'Habit Tracker',
    tag: 'Routine',
    desc: 'Morning & evening checklist',
    icon: Sparkles,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    getContent: () => {
      return `<h2>Habit Tracker &mdash; ${new Date().toLocaleDateString()}</h2><h3>🌅 Morning Routine</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Drink water & stretch</li><li class="task-list-item"><input type="checkbox"/> Review daily goals</li></ul><h3>🌙 Evening Routine</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Plan tomorrow's priorities</li><li class="task-list-item"><input type="checkbox"/> 15 min wind down</li></ul>`;
    },
  },
  {
    id: 'budget',
    title: 'Budget Plan',
    tag: 'Finance',
    desc: 'Income, bills & savings',
    icon: DollarSign,
    color: 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20',
    getContent: () => {
      return `<h2>Budget Plan &mdash; ${new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2><h3>💰 Expected Income</h3><p>$</p><hr/><h3>🏠 Fixed Bills</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Rent / Housing: $</li><li class="task-list-item"><input type="checkbox"/> Utilities / Internet: $</li></ul><h3>🎯 Savings Goal</h3><p>Target: $</p>`;
    },
  },
  {
    id: 'trip',
    title: 'Trip Planner',
    tag: 'Travel',
    desc: 'Itinerary & packing checklist',
    icon: Compass,
    color: 'text-blue-600 bg-blue-600/10 border-blue-600/20',
    getContent: () => {
      return `<h2>Trip Planner: [Destination]</h2><p><strong>Dates:</strong> &bull; <strong>Travelers:</strong> </p><hr/><h3>✈️ Flight & Stay</h3><p>Flight details: </p><p>Hotel address: </p><h3>🎒 Packing Checklist</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"/> Passport / ID</li><li class="task-list-item"><input type="checkbox"/> Phone charger & adapter</li><li class="task-list-item"><input type="checkbox"/> Clothes & toiletries</li></ul><h3>🗺️ Daily Plans</h3><p>Day 1: </p><p>Day 2: </p>`;
    },
  },
  {
    id: 'decision',
    title: 'Pros & Cons',
    tag: 'Decision',
    desc: 'Weigh options & decide',
    icon: Scale,
    color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    getContent: () => {
      return `<h2>Decision Matrix: [Decision Question]</h2><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><hr/><h3>Context & Goal</h3><p></p><h3>Option A: [Option Name]</h3><p><strong>Pros:</strong></p><ul><li>Advantage 1</li><li>Advantage 2</li></ul><p><strong>Cons:</strong></p><ul><li>Disadvantage 1</li></ul><h3>Final Verdict</h3><p></p>`;
    },
  },
];

export interface HomeViewProps {
  onSelectTab?: (tab: GpnTab) => void;
  onOpenNotes: () => void;
  onOpenNote: (noteId: string) => void;
  onOpenSearchModal: () => void;
  onOpenQuickCapture?: () => void;
  onOpenSmartBurn?: () => void;
  onOpenAuthModal?: () => void;
  onOpenShortcuts?: () => void;
}

// Friendly human-readable time formatter
function formatFriendlyTime(timestamp?: number): string {
  if (!timestamp) return 'Just now';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  const date = new Date(timestamp);
  const isToday = new Date().toDateString() === date.toDateString();
  if (isToday) {
    return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  const yesterday = new Date(now - 86400000);
  if (yesterday.toDateString() === date.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectTab,
  onOpenNotes,
  onOpenNote,
  onOpenSearchModal,
  onOpenSmartBurn,
  onOpenAuthModal,
  onOpenShortcuts,
}) => {
  const { notes, trashNotes, createNote, setNoteSyncMode, toggleNoteSyncMode, loadNotes } = useNotesStore();
  const { user, isAuthenticated } = useAuthStore();
  const { isSyncing, triggerSync, status: syncStatus } = useSyncStore();

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Default saving mode for newly created notes ('synced' | 'local')
  const [defaultSaveMode, setDefaultSaveMode] = useState<'synced' | 'local'>(() => {
    try {
      return (localStorage.getItem('gpn_default_save_mode') as 'synced' | 'local') || 'synced';
    } catch {
      return 'synced';
    }
  });

  // Recent notes category filter ('all' | 'local' | 'synced')
  const [noteFilter, setNoteFilter] = useState<'all' | 'local' | 'synced'>('all');

  // Dynamic automatic pagination (scroll-as-you-load)
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Bulk action feedback toast
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  // 1. Smart non-polling fetch on mount: loads fresh from SQLite local storage cache silently
  useEffect(() => {
    loadNotes(true);
  }, [loadNotes]);

  // 2. Smart event-driven reactive sync listener: NO dumb polling loops!
  // Updates only when the Tauri backend background worker emits a remote delta change event
  useEffect(() => {
    let isMounted = true;
    const unlistenPromise = syncService.onSyncStatusChanged((summary) => {
      if (isMounted && summary.hasRemoteChanges) {
        loadNotes(true);
      }
    });

    return () => {
      isMounted = false;
      unlistenPromise.then((unlisten) => unlisten?.()).catch(() => {});
    };
  }, [loadNotes]);

  // Reset pagination count whenever category filter switches
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [noteFilter]);


  // Handle changing default save mode
  const handleToggleDefaultMode = (mode: 'synced' | 'local') => {
    setDefaultSaveMode(mode);
    try {
      localStorage.setItem('gpn_default_save_mode', mode);
    } catch {}
    setBulkNotice(mode === 'local' ? 'New notes will save on this PC only' : 'New notes will sync to cloud');
    setTimeout(() => setBulkNotice(null), 3000);
  };

  // Dynamic real-time greeting based on local time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  };

  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    const timer = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Storage counts
  const localOnlyCount = notes.filter((n) => n.syncState === 'local_only').length;
  const syncedCount = notes.length - localOnlyCount;

  // Filtered notes list
  const filteredNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (noteFilter === 'local') return sorted.filter((n) => n.syncState === 'local_only');
    if (noteFilter === 'synced') return sorted.filter((n) => n.syncState !== 'local_only');
    return sorted;
  }, [notes, noteFilter]);

  // Dynamically paginated notes
  const displayedNotes = useMemo(
    () => filteredNotes.slice(0, visibleCount),
    [filteredNotes, visibleCount]
  );
  const hasMore = visibleCount < filteredNotes.length;

  // 3. Automatic scroll-as-you-load pagination via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredNotes.length && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredNotes.length));
            setIsLoadingMore(false);
          }, 120);
        }
      },
      {
        root: container,
        rootMargin: '30px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredNotes.length, isLoadingMore]);

  // Native scroll fallback handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 30) {
      if (visibleCount < filteredNotes.length && !isLoadingMore) {
        setIsLoadingMore(true);
        setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredNotes.length));
          setIsLoadingMore(false);
        }, 120);
      }
    }
  };

  // Create note with specified template
  const handleCreateTemplateNote = async (
    type: 'blank' | 'todo' | 'meeting'
  ) => {
    let title = 'Untitled Note';
    let content = '';

    if (type === 'todo') {
      title = 'To-Do List';
      content =
        '<h3>To-Do List</h3><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" /> First task</li><li class="task-list-item"><input type="checkbox" /> Second task</li></ul>';
    } else if (type === 'meeting') {
      title = 'Meeting Notes';
      content = `<h3>Meeting Notes</h3><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><p><strong>Attendees:</strong> </p><h4>Agenda</h4><p></p><h4>Action Items</h4><ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" /> Follow up item</li></ul>`;
    }

    const newNote = await createNote(title, content);
    if (defaultSaveMode === 'local') {
      await setNoteSyncMode(newNote.id, true);
    }
    onOpenNote(newNote.id);
  };

  // Horizontal scroll ref and handler for template gallery
  const templateScrollRef = useRef<HTMLDivElement>(null);

  const scrollTemplates = (direction: 'left' | 'right') => {
    if (templateScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      templateScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Select and immediately instantiate rich template
  const handleSelectTemplate = async (tmpl: NoteTemplate) => {
    const newNote = await createNote(tmpl.title, tmpl.getContent());
    if (defaultSaveMode === 'local') {
      await setNoteSyncMode(newNote.id, true);
    }
    onOpenNote(newNote.id);
  };



  return (
    <div className="flex-1 h-full flex flex-col p-3 sm:p-3.5 overflow-hidden select-none bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors gap-2 sm:gap-2.5">
      {/* 1. TOP HEADER: SLEEK SYMMETRICAL ROW */}
      <div className="shrink-0 flex items-center justify-between gap-3 pb-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate whitespace-nowrap">
            {greeting}
          </h1>

          {/* Clean connection badge - says Online/Offline, not duplicate Sync */}
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0 select-none whitespace-nowrap"
            title={isAuthenticated && user?.email ? `Signed in (${user.email})` : 'Saved locally on this PC'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isAuthenticated ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{isAuthenticated ? 'Online' : 'Offline'}</span>
          </span>

          {bulkNotice && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 animate-in fade-in shrink-0 truncate max-w-[160px]">
              {bulkNotice}
            </span>
          )}
        </div>

        {/* Right Action Controls: Symmetrically aligned on the exact same row */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearchModal}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium transition cursor-pointer shadow-2xs"
            title="Search notes (Ctrl+K)"
          >
            <Search size={13} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700">
              Ctrl+K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => handleCreateTemplateNote('blank')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>New Note</span>
          </button>

          <button
            type="button"
            onClick={onOpenNotes}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <FileText size={13} className="text-zinc-400" />
            <span>All Notes</span>
            <ArrowRight size={12} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {/* 2. FAST ACTION ROW: BLANK NOTE, BURNING NOTE & CO-OP NOTE */}
      <div className="shrink-0">
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1: Blank Note */}
          <button
            type="button"
            onClick={() => handleCreateTemplateNote('blank')}
            className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 transition flex items-center justify-between cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText size={14} className="text-zinc-500 group-hover:text-black dark:group-hover:text-white transition-colors shrink-0" />
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                Blank Note
              </span>
            </div>
            <Plus size={13} className="text-zinc-400 group-hover:text-black dark:group-hover:text-white shrink-0 ml-1" />
          </button>

          {/* 2: Burning Note */}
          <button
            type="button"
            onClick={() => onOpenSmartBurn?.()}
            className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-rose-400 dark:hover:border-rose-600 transition flex items-center justify-between cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Flame size={14} className="text-rose-500 shrink-0" />
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                Burning Note
              </span>
            </div>
            <ArrowRight size={13} className="text-zinc-400 group-hover:text-rose-500 shrink-0 ml-1" />
          </button>

          {/* 3: Co-op Note */}
          <button
            type="button"
            onClick={() => onSelectTab?.('collab')}
            className="h-9 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-violet-400 dark:hover:border-violet-600 transition flex items-center justify-between cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Users size={14} className="text-violet-500 shrink-0" />
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                Co-op Note
              </span>
            </div>
            <ArrowRight size={13} className="text-zinc-400 group-hover:text-violet-500 shrink-0 ml-1" />
          </button>
        </div>
      </div>

      {/* 3. TEMPLATES GALLERY: CLICK & SCROLL PLETHORA OF TEMPLATES */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-500 shrink-0" />
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Templates
            </span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
              ({NOTE_TEMPLATES.length})
            </span>
          </div>

          {/* Symmetrical Left/Right Scroll Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollTemplates('left')}
              className="w-5.5 h-5.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center transition cursor-pointer shadow-2xs"
              title="Scroll left"
            >
              <ChevronLeft size={12} />
            </button>
            <button
              type="button"
              onClick={() => scrollTemplates('right')}
              className="w-5.5 h-5.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center transition cursor-pointer shadow-2xs"
              title="Scroll right"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Smooth Horizontal Scrollable Carousel */}
        <div
          ref={templateScrollRef}
          className="flex items-center gap-2 overflow-x-auto scroll-smooth scrollbar-none py-0.5 px-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {NOTE_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tmpl)}
                className="shrink-0 w-44 sm:w-48 h-[54px] p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs transition text-left cursor-pointer group flex items-center gap-2.5 active:scale-[0.98]"
              >
                <div
                  className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 border ${tmpl.color}`}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                      {tmpl.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                    {tmpl.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. SYMMETRICAL 50/50 WORKSTATION GRID: ONE CLEAN VIEW */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
        {/* LEFT COLUMN: RECENT NOTES */}
        <div className="flex flex-col min-h-0 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/90 dark:border-zinc-800 p-3 shadow-2xs overflow-hidden">
          {/* Header & Filter Tabs */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0 gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                Recent Notes
              </span>
              {filteredNotes.length > PAGE_SIZE && (
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                  ({displayedNotes.length}/{filteredNotes.length})
                </span>
              )}
            </div>

            {/* Symmetrical Filter Pills */}
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] shrink-0">
              <button
                type="button"
                onClick={() => setNoteFilter('all')}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition cursor-pointer whitespace-nowrap ${
                  noteFilter === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                All ({notes.length})
              </button>
              <button
                type="button"
                onClick={() => setNoteFilter('local')}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition cursor-pointer whitespace-nowrap ${
                  noteFilter === 'local'
                    ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-400 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Local ({localOnlyCount})
              </button>
              <button
                type="button"
                onClick={() => setNoteFilter('synced')}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition cursor-pointer whitespace-nowrap ${
                  noteFilter === 'synced'
                    ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Synced ({syncedCount})
              </button>
            </div>
          </div>

          {/* Notes List (scrollable with automatic pagination scroll-as-load) */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto space-y-1.5 custom-scrollbar py-2 pr-0.5"
          >
            {displayedNotes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                <FileText size={24} className="text-zinc-400 mb-1.5 opacity-40" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {noteFilter === 'all'
                    ? 'No notes written yet'
                    : noteFilter === 'local'
                    ? 'No local-only notes'
                    : 'No cloud-synced notes'}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Click Blank Note above to start writing.
                </p>
              </div>
            ) : (
              <>
                {displayedNotes.map((note) => {
                  const isLocalOnly = note.syncState === 'local_only';
                  const formattedTime = formatFriendlyTime(note.updatedAt);

                  return (
                    <div
                      key={note.id}
                      onClick={() => onOpenNote(note.id)}
                      className="group p-2 px-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-white dark:bg-zinc-800 text-zinc-500 group-hover:text-black dark:group-hover:text-white flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-700">
                          <FileText size={13} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                            {note.title || 'Untitled Note'}
                          </h4>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium ${
                                isLocalOnly
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
                                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                              }`}
                            >
                              <span
                                className={`w-1 h-1 rounded-full ${
                                  isLocalOnly ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                              />
                              <span>{isLocalOnly ? 'This PC' : 'Synced'}</span>
                            </span>
                            <span>•</span>
                            <span>{formattedTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Sync Switcher Button */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNoteSyncMode(note.id);
                          }}
                          title={
                            isLocalOnly
                              ? 'Saved on this PC. Click to sync with cloud.'
                              : 'Synced to cloud. Click to save only on this PC.'
                          }
                          className="p-1 rounded hover:bg-white dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
                        >
                          {isLocalOnly ? (
                            <Laptop size={13} className="text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Cloud size={13} className="text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>

                        <ArrowRight
                          size={12}
                          className="text-zinc-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Sentinel for infinite scroll / automatic pagination */}
                <div ref={sentinelRef} className="h-4 flex items-center justify-center pt-0.5">
                  {isLoadingMore && (
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                      <RefreshCw size={10} className="animate-spin text-zinc-400" />
                      Loading more...
                    </span>
                  )}
                  {!hasMore && filteredNotes.length > PAGE_SIZE && (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      All {filteredNotes.length} notes loaded
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: STORAGE & SYNC (CLEAN, SYMMETRICAL, SINGLE UNIQUE SYNC BUTTON) */}
        <div className="flex flex-col min-h-0 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/90 dark:border-zinc-800 p-3 shadow-2xs overflow-hidden justify-between">
          {/* Header: Symmetrical clean single row with single unique Sync button */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <HardDrive size={13} className="text-zinc-500 shrink-0" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  Storage & Sync
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono whitespace-nowrap truncate">
                • {syncStatus?.lastSyncedAt
                  ? `Synced ${formatFriendlyTime(syncStatus.lastSyncedAt)}`
                  : 'Ready'}
              </span>
            </div>

            {/* THE SINGLE UNIQUE SYNC BUTTON */}
            <button
              type="button"
              onClick={triggerSync}
              disabled={isSyncing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 h-7"
              title="Sync notes with your account"
            >
              <RefreshCw size={11} className={`shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>

          {/* Symmetrical 4-Stat Section */}
          <div className="space-y-2 py-1.5 shrink-0">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80">
                <span className="block text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {notes.length}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Notes</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80">
                <span className="block text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {syncedCount}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Synced</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80">
                <span className="block text-base font-bold text-amber-600 dark:text-amber-400">
                  {localOnlyCount}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Local</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/80">
                <span className="block text-base font-bold text-zinc-600 dark:text-zinc-400">
                  {trashNotes.length}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Trash</span>
              </div>
            </div>

            {/* Sync Distribution Progress Bar */}
            <div className="p-2 rounded-lg bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
                <span>Storage Distribution</span>
                <span className="font-mono text-[10px]">
                  {notes.length > 0 ? Math.round((syncedCount / notes.length) * 100) : 100}% Cloud
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${notes.length > 0 ? (syncedCount / notes.length) * 100 : 100}%`,
                  }}
                  title={`Synced: ${syncedCount}`}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{
                    width: `${notes.length > 0 ? (localOnlyCount / notes.length) * 100 : 0}%`,
                  }}
                  title={`Local: ${localOnlyCount}`}
                />
              </div>
            </div>
          </div>

          {/* Storage Mode Toggle */}
          <div className="p-2.5 rounded-lg bg-zinc-50/60 dark:bg-zinc-950/40 border border-zinc-200/70 dark:border-zinc-800 space-y-1 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Default Save Location
              </span>
              <div className="inline-flex rounded-lg p-0.5 bg-zinc-200/70 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => handleToggleDefaultMode('local')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    defaultSaveMode === 'local'
                      ? 'bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <Laptop size={11} />
                  <span>This PC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDefaultMode('synced')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    defaultSaveMode === 'synced'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <Cloud size={11} />
                  <span>Cloud</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {defaultSaveMode === 'synced'
                ? 'New notes are synced to your account.'
                : 'New notes are saved on this PC only.'}
            </p>
          </div>

          {/* Vault Backup Action Button */}
          <div className="py-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="w-full py-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center justify-center gap-1.5 text-center truncate font-medium text-xs shadow-2xs"
              title="Backup all notes to a zip file on your computer"
            >
              <Download size={13} className="text-zinc-500" />
              <span>Backup Vault (ZIP)</span>
            </button>
          </div>

          {/* Symmetrical Bottom Account Indicator (Zero Jargon) */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 text-[11px]">
            <div
              onClick={() => {
                if (onOpenAuthModal) onOpenAuthModal();
                else if (onSelectTab) onSelectTab('account');
              }}
              className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition"
              title="Manage Account"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isAuthenticated ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                {isAuthenticated && user?.email ? user.email : 'Local Guest Account'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onOpenShortcuts && (
                <button
                  type="button"
                  onClick={onOpenShortcuts}
                  className="text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer font-sans"
                  title="View keyboard shortcuts"
                >
                  Shortcuts
                </button>
              )}
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                {isAuthenticated ? 'Up to date' : 'Saved locally'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Force Full Vault Backup Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
};

export default HomeView;
