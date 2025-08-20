"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  PencilLine,
  Wallet,
  LayoutTemplate,
  Sparkles,
  NotepadText,
  PiggyBank,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  LayoutGrid,
  CheckSquare,
  Clock,
} from "lucide-react";

// shadcn/ui imports
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

// app hooks & libs (from your original app)
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "@/components/SyncStatusProvider";
import StaticSyncStatus from "@/components/StaticSyncStatus";
import { TEMPLATES } from "@/lib/templates";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Note, MoneyTracker, Todo } from "@/types";
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";
import { useTodos } from "@/hooks/useTodos";
import { getOverdueTodos, isOverdue } from "@/lib/todoUtils";

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

// motion container w/ reduced motion support
const useContainerMotion = () => {
  const reduced = useReducedMotion();
  return {
    hidden: { opacity: 0, y: reduced ? 0 : 8 },
    show: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.4 } },
  } as const;
};

// ---------------------------------------------------------------------------
// Branded full-page loader (GPN)
// ---------------------------------------------------------------------------

function GPNLoader({
  message = "Loading your dashboard…",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-slate-300/70 dark:border-slate-700/70 border-t-transparent animate-spin" />
          <div className="absolute inset-0 grid place-items-center text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-300">
            GPN
          </div>
        </div>
        <div className="px-3 py-1 rounded-xl bg-white/80 dark:bg-slate-900/70 ring-1 ring-slate-200 dark:ring-slate-800 backdrop-blur">
          <span className="text-sm font-semibold">
            Gaurav&apos;s Personal Notes
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { syncStatus } = useSyncStatus();
  const container = useContainerMotion();

  const [isSyncing, setIsSyncing] = useState(false);
  const [recentSyncAt, setRecentSyncAt] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [moneyTrackers, setMoneyTrackers] = useState<MoneyTracker[]>([]);

  // NEW: gate flags to prevent partial UI before data is ready
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [moneyLoaded, setMoneyLoaded] = useState(false);

  // Todos data
  const { todos } = useTodos();
  const recentTodos = todos.slice(0, 5);
  const overdueTodos = getOverdueTodos(todos);
  const activeTodos = todos.filter(t => !t.isCompleted);

  // Compute dynamic footer text
  const displaySyncText = React.useMemo(() => {
    if (isSyncing) return "Syncing…";
    const s: any = syncStatus as any;
    const raw =
      s?.lastSyncedAt ??
      s?.lastSyncAt ??
      s?.lastSyncTime ??
      s?.updatedAt ??
      s?.timestamp ??
      recentSyncAt;
    if (!raw) return "recently";
    const d = (raw as any)?.toDate?.()
      ? (raw as any).toDate()
      : new Date(raw as any);
    if (!(d instanceof Date) || isNaN(d.getTime())) return "recently";
    const delta = Date.now() - d.getTime();
    if (Math.abs(delta) < 15_000) return "just now";
    return d.toLocaleString();
  }, [isSyncing, syncStatus, recentSyncAt]);

  // redirect & live Firestore listeners
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const notesQuery = query(
        collection(db, "users", user.uid, "notes"),
        orderBy("updatedAt", "desc"),
        limit(5)
      );
      const unsubNotes = onSnapshot(notesQuery, (snapshot) => {
        const notes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        })) as Note[];
        setRecentNotes(notes);
        // mark ready on first delivery (even if empty)
        setNotesLoaded(true);
      });

      const moneyQuery = query(
        collection(db, "users", user.uid, "money"),
        orderBy("updatedAt", "desc"),
        limit(3)
      );
      const unsubMoney = onSnapshot(moneyQuery, (snapshot) => {
        const trackers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        })) as MoneyTracker[];
        setMoneyTrackers(trackers);
        // mark ready on first delivery (even if empty)
        setMoneyLoaded(true);
      });

      return () => {
        unsubNotes();
        unsubMoney();
      };
    }
  }, [user, loading, router]);

  // navigation helpers
  const createNewNote = () => {
    const noteId = `note_${Date.now()}`;
    router.push(`/dashboard/notes/${noteId}`);
  };
  const createMoneyTracker = () => {
    const trackerId = `money_${Date.now()}`;
    router.push(`/dashboard/money/${trackerId}`);
  };
  const goTemplates = () => router.push("/dashboard/templates");
  const viewAllNotes = () => router.push("/dashboard/notes");
  const viewAllMoney = () => router.push("/dashboard/money");
  const viewAllTodos = () => router.push("/dashboard/todos");
  const createTodo = () => router.push("/dashboard/todos");

  const onSearch = () => {
    if (!search.trim()) return;
    router.push(`/dashboard/search?q=${encodeURIComponent(search.trim())}`);
  };

  const onSync = async () => {
    try {
      setIsSyncing(true);
      await new Promise((r) => setTimeout(r, 1200));
      setRecentSyncAt(new Date());
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------------------------
  // Mobile swipe container state
  // ---------------------------
  const swipeRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0); // 0: notes, 1: money, 2: search, 3: create
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const scrollToPage = (idx: number) => {
    const el = swipeRef.current;
    if (!el) return;
    const width = el.clientWidth;
    el.scrollTo({ left: width * idx, behavior: "smooth" });
  };

  useEffect(() => {
    const el = swipeRef.current;
    if (!el) return;

    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setPage(idx);
      if (showSwipeHint) setShowSwipeHint(false);
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    // auto-hide hint after 2.5s
    const t = setTimeout(() => setShowSwipeHint(false), 2500);

    const ro = new ResizeObserver(onScroll);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(t);
      ro.disconnect();
    };
  }, [showSwipeHint]);

  // ---- FULL-PAGE LOADING & GATING ----
  if (loading) {
    return <GPNLoader message="Signing you in…" />;
  }
  if (!user) {
    // redirect happens in useEffect; keep branded loader visible in the meantime
    return <GPNLoader message="Redirecting to login…" />;
  }
  if (!notesLoaded || !moneyLoaded) {
    return <GPNLoader message="Preparing your dashboard…" />;
  }

  // Once here, auth is resolved AND first snapshots have been received.
  return (
    /**
     * Responsive scroll behavior:
     * - Mobile (default): 100dvh + overflow-hidden => app-like, no vertical scroll
     * - Desktop (lg+): natural page height & overflow-auto => dynamic scroll
     */
    <div className="h-[100dvh] overflow-hidden lg:h-auto lg:overflow-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <motion.div
            initial={container.hidden}
            animate={container.show}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-400/30 via-emerald-400/30 to-fuchsia-400/30 blur-sm" />
              <div className="relative rounded-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur px-3 py-2 ring-1 ring-slate-200 dark:ring-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Gaurav&apos;s Personal Notes (GPN)
                  </span>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="ml-1 hidden xs:inline-flex">
              Dashboard
            </Badge>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden sm:block">
                <StaticSyncStatus />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onSync}
                className="gap-2"
                aria-label={isSyncing ? "Syncing" : "Sync now"}
              >
                <RefreshCw
                  className={cn("h-4 w-4", isSyncing && "animate-spin")}
                />
                <span className="hidden xs:inline">
                  {isSyncing ? "Syncing" : "Sync now"}
                </span>
              </Button>
              <Separator
                orientation="vertical"
                className="h-6 hidden sm:block"
              />
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={user?.photoURL ?? undefined}
                  alt={user?.displayName ?? "User"}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
                <AvatarFallback>
                  {(user?.displayName ?? "Gaurav")
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ----------------------- */}
      {/* Mobile: swipe-first UX  */}
      {/* ----------------------- */}
      <section className="lg:hidden">
        {/* Tabs */}
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="flex items-center justify-center gap-2">
            {["Todos", "Notes", "Money", "Search", "Create"].map((t, i) => (
              <button
                key={t}
                onClick={() => {
                  setPage(i);
                  scrollToPage(i);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs",
                  i === page
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                )}
                aria-current={i === page}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Swipe container */}
        <div className="relative mt-3">
          {/* Non-interactive SWIPE HINT overlay */}
          {showSwipeHint && (
            <div
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-between"
              aria-hidden="true"
            >
              <div className="h-full w-10 bg-gradient-to-r from-white/90 to-transparent dark:from-slate-950/80" />
              <div className="mx-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/90 shadow-sm">
                Swipe
              </div>
              <div className="h-full w-10 bg-gradient-to-l from-white/90 to-transparent dark:from-slate-950/80" />
            </div>
          )}

          <div
            ref={swipeRef}
            onTouchStart={() => showSwipeHint && setShowSwipeHint(false)}
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* Panel 1: Recent Todos */}
            <div className="snap-center shrink-0 w-full">
              <div className="pt-1">
                <Section
                  title="Recent Todos"
                  description={`${activeTodos.length} active${overdueTodos.length > 0 ? `, ${overdueTodos.length} overdue` : ''}`}
                  action={{ label: "View all", onClick: viewAllTodos }}
                >
                  {recentTodos.length === 0 ? (
                    <EmptyState
                      icon={<CheckSquare className="h-5 w-5" />}
                      title="No todos yet"
                      subtitle="Create your first todo to see it here"
                      ctaLabel="Create a todo"
                      onCta={createTodo}
                    />
                  ) : (
                    <div className="grid gap-3">
                      {recentTodos.map((todo) => (
                        <ItemRow
                          key={todo.id}
                          title={todo.title || "Untitled"}
                          subtitle={
                            todo.dueAt
                              ? `Due ${todo.dueAt.toDate().toLocaleDateString()}`
                              : `Created ${todo.createdAt.toDate().toLocaleDateString()}`
                          }
                          onClick={() => router.push("/dashboard/todos")}
                          leading={
                            <CheckSquare
                              className={`h-5 w-5 ${
                                todo.isCompleted
                                  ? 'text-green-600'
                                  : isOverdue(todo)
                                  ? 'text-red-600'
                                  : 'text-slate-600'
                              }`}
                            />
                          }
                          trailing={
                            todo.isCompleted ? (
                              <span className="text-xs text-green-600 font-medium">✓ Done</span>
                            ) : isOverdue(todo) ? (
                              <span className="text-xs text-red-600 font-medium">⚠ Overdue</span>
                            ) : todo.dueAt ? (
                              <Clock className="h-4 w-4 text-orange-500" />
                            ) : null
                          }
                        />
                      ))}
                    </div>
                  )}
                </Section>
              </div>
            </div>

            {/* Panel 2: Recent Notes */}
            <div className="snap-center shrink-0 w-full">
              <div className="pt-1">
                <Section
                  title="Recent Notes"
                  description="Your latest thoughts"
                  action={{ label: "View all", onClick: viewAllNotes }}
                >
                  {recentNotes.length === 0 ? (
                    <EmptyState
                      icon={<NotepadText className="h-5 w-5" />}
                      title="No notes yet"
                      subtitle="Create your first note to see it here"
                      ctaLabel="Create a note"
                      onCta={createNewNote}
                    />
                  ) : (
                    <div className="grid gap-3">
                      {recentNotes.map((n) => (
                        <ItemRow
                          key={n.id}
                          title={n.title || "Untitled"}
                          subtitle={
                            (n as any).updatedAt
                              ?.toDate?.()
                              ?.toLocaleDateString?.() ||
                            new Date(
                              (n as any).updatedAt || Date.now()
                            ).toLocaleString()
                          }
                          onClick={() =>
                            router.push(`/dashboard/notes/${n.id}`)
                          }
                          leading={<NotepadText className="h-5 w-5" />}
                        />
                      ))}
                    </div>
                  )}
                </Section>
              </div>
            </div>

            {/* Panel 3: Money Trackers */}
            <div className="snap-center shrink-0 w-full">
              <div className="pt-1">
                <Section
                  title="Money Trackers"
                  description="Stay on top of your finances"
                  action={{ label: "View all", onClick: viewAllMoney }}
                >
                  {moneyTrackers.length === 0 ? (
                    <EmptyState
                      icon={<PiggyBank className="h-5 w-5" />}
                      title="No trackers yet"
                      subtitle="Create your first money tracker to see it here"
                      ctaLabel="Create a tracker"
                      onCta={createMoneyTracker}
                    />
                  ) : (
                    <div className="grid gap-3">
                      {moneyTrackers.map((m) => {
                        const expenses = ((m as any).expenses || []) as Array<{
                          amount: number;
                        }>;
                        const totalExpenses = expenses.reduce(
                          (sum, e) => sum + (e?.amount || 0),
                          0
                        );
                        const starting = (m as any).startingAmount || 0;
                        const remaining = starting - totalExpenses;
                        const currency =
                          (m as any).currency || DEFAULT_CURRENCY;
                        return (
                          <ItemRow
                            key={(m as any).id}
                            title={(m as any).title || "Untitled Budget"}
                            subtitle={`Updated ${
                              (m as any).updatedAt
                                ?.toDate?.()
                                ?.toLocaleDateString?.() ||
                              new Date(
                                (m as any).updatedAt || Date.now()
                              ).toLocaleDateString()
                            }`}
                            trailing={
                              <span
                                className={cn(
                                  "font-mono text-sm",
                                  remaining < 0 && "text-red-600"
                                )}
                              >
                                {formatCurrency(remaining, currency)}
                              </span>
                            }
                            onClick={() =>
                              router.push(`/dashboard/money/${(m as any).id}`)
                            }
                            leading={<Wallet className="h-5 w-5" />}
                          />
                        );
                      })}
                    </div>
                  )}
                </Section>
              </div>
            </div>

            {/* Panel 4: Quick find */}
            <div className="snap-center shrink-0 w-full">
              <div className="pt-1">
                <Card className="border-dashed bg-white/60 dark:bg-slate-900/50 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-3">
                      <LayoutGrid className="h-4 w-4" /> Quick find
                    </div>
                    <div className="flex w-full gap-2">
                      <Input
                        placeholder="Search notes, trackers, templates…"
                        aria-label="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSearch()}
                      />
                      <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={onSearch}
                      >
                        Search
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Panel 5: Create shortcuts */}
            <div className="snap-center shrink-0 w-full">
              <div className="pt-1 grid grid-cols-1 xs:grid-cols-2 gap-4">
                <PrimaryCard
                  title="New Todo"
                  description="Add a task"
                  icon={<CheckSquare className="h-5 w-5" />}
                  gradient="from-purple-500 to-pink-500"
                  onClick={createTodo}
                />
                <PrimaryCard
                  title="New Note"
                  description="Start writing your thoughts"
                  icon={<PencilLine className="h-5 w-5" />}
                  gradient="from-blue-500 to-indigo-500"
                  onClick={createNewNote}
                />
                <PrimaryCard
                  title="Money Tracker"
                  description="Track your expenses"
                  icon={<Wallet className="h-5 w-5" />}
                  gradient="from-emerald-500 to-green-500"
                  onClick={createMoneyTracker}
                />
                <PrimaryCard
                  title="Templates"
                  description={`Choose from ${TEMPLATES.length}+ templates`}
                  icon={<LayoutTemplate className="h-5 w-5" />}
                  gradient="from-fuchsia-500 to-violet-500"
                  onClick={goTemplates}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------- */}
      {/* Desktop layout          */}
      {/* ----------------------- */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Primary actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-4"
          >
            <PrimaryCard
              title="New Note"
              description="Start writing your thoughts"
              icon={<PencilLine className="h-5 w-5" />}
              gradient="from-blue-500 to-indigo-500"
              onClick={createNewNote}
            />
            <PrimaryCard
              title="Todo List"
              description="Manage your tasks"
              icon={<CheckSquare className="h-5 w-5" />}
              gradient="from-purple-500 to-pink-500"
              onClick={createTodo}
            />
            <PrimaryCard
              title="Money Tracker"
              description="Track your expenses"
              icon={<Wallet className="h-5 w-5" />}
              gradient="from-emerald-500 to-green-500"
              onClick={createMoneyTracker}
            />
            <PrimaryCard
              title="Templates"
              description={`Choose from ${TEMPLATES.length}+ templates`}
              icon={<LayoutTemplate className="h-5 w-5" />}
              gradient="from-fuchsia-500 to-violet-500"
              onClick={goTemplates}
            />
          </motion.div>

          {/* Search */}
          <div className="mt-6">
            <Card className="border-dashed bg-white/60 dark:bg-slate-900/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <LayoutGrid className="h-4 w-4" /> Quick find
                  </div>
                  <div className="flex w-full gap-2 md:w-1/2">
                    <Input
                      placeholder="Search notes, trackers, templates…"
                      aria-label="Search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    />
                    <Button
                      variant="secondary"
                      className="gap-2"
                      onClick={onSearch}
                    >
                      Search
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Sections */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section
              title="Recent Todos"
              description={`${activeTodos.length} active${overdueTodos.length > 0 ? `, ${overdueTodos.length} overdue` : ''}`}
              action={{ label: "View all", onClick: viewAllTodos }}
            >
              {recentTodos.length === 0 ? (
                <EmptyState
                  icon={<CheckSquare className="h-5 w-5" />}
                  title="No todos yet"
                  subtitle="Create your first todo to see it here"
                  ctaLabel="Create a todo"
                  onCta={createTodo}
                />
              ) : (
                <div className="grid gap-3">
                  {recentTodos.map((todo) => (
                    <ItemRow
                      key={todo.id}
                      title={todo.title || "Untitled"}
                      subtitle={
                        todo.dueAt
                          ? `Due ${todo.dueAt.toDate().toLocaleDateString()}`
                          : `Created ${todo.createdAt.toDate().toLocaleDateString()}`
                      }
                      onClick={() => router.push("/dashboard/todos")}
                      leading={
                        <CheckSquare
                          className={`h-5 w-5 ${
                            todo.isCompleted
                              ? 'text-green-600'
                              : isOverdue(todo)
                              ? 'text-red-600'
                              : 'text-slate-600'
                          }`}
                        />
                      }
                      trailing={
                        todo.isCompleted ? (
                          <span className="text-xs text-green-600 font-medium">✓ Done</span>
                        ) : isOverdue(todo) ? (
                          <span className="text-xs text-red-600 font-medium">⚠ Overdue</span>
                        ) : todo.dueAt ? (
                          <Clock className="h-4 w-4 text-orange-500" />
                        ) : null
                      }
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Recent Notes"
              description="Your latest thoughts at a glance"
              action={{ label: "View all", onClick: viewAllNotes }}
            >
              {recentNotes.length === 0 ? (
                <EmptyState
                  icon={<NotepadText className="h-5 w-5" />}
                  title="No notes yet"
                  subtitle="Create your first note to see it here"
                  ctaLabel="Create a note"
                  onCta={createNewNote}
                />
              ) : (
                <div className="grid gap-3">
                  {recentNotes.map((n) => (
                    <ItemRow
                      key={n.id}
                      title={n.title || "Untitled"}
                      subtitle={
                        (n as any).updatedAt
                          ?.toDate?.()
                          ?.toLocaleDateString?.() ||
                        new Date(
                          (n as any).updatedAt || Date.now()
                        ).toLocaleString()
                      }
                      onClick={() => router.push(`/dashboard/notes/${n.id}`)}
                      leading={<NotepadText className="h-5 w-5" />}
                    />
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-1 gap-6">
            <Section
              title="Money Trackers"
              description="Stay on top of your finances"
              action={{ label: "View all", onClick: viewAllMoney }}
            >
              {moneyTrackers.length === 0 ? (
                <EmptyState
                  icon={<PiggyBank className="h-5 w-5" />}
                  title="No trackers yet"
                  subtitle="Create your first money tracker to see it here"
                  ctaLabel="Create a tracker"
                  onCta={createMoneyTracker}
                />
              ) : (
                <div className="grid gap-3">
                  {moneyTrackers.map((m) => {
                    const expenses = ((m as any).expenses || []) as Array<{
                      amount: number;
                    }>;
                    const totalExpenses = expenses.reduce(
                      (sum, e) => sum + (e?.amount || 0),
                      0
                    );
                    const starting = (m as any).startingAmount || 0;
                    const remaining = starting - totalExpenses;
                    const currency = (m as any).currency || DEFAULT_CURRENCY;
                    return (
                      <ItemRow
                        key={(m as any).id}
                        title={(m as any).title || "Untitled Budget"}
                        subtitle={`Updated ${
                          (m as any).updatedAt
                            ?.toDate?.()
                            ?.toLocaleDateString?.() ||
                          new Date(
                            (m as any).updatedAt || Date.now()
                          ).toLocaleDateString()
                        }`}
                        trailing={
                          <span
                            className={cn(
                              "font-mono text-sm",
                              remaining < 0 && "text-red-600"
                            )}
                          >
                            {formatCurrency(remaining, currency)}
                          </span>
                        }
                        onClick={() =>
                          router.push(`/dashboard/money/${(m as any).id}`)
                        }
                        leading={<Wallet className="h-5 w-5" />}
                      />
                    );
                  })}
                </div>
              )}
            </Section>
          </div>

          {/* Footer */}
          <footer className="mt-8 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-2 w-2 rounded-full bg-emerald-500"
                aria-hidden
              />
              <span>
                {isSyncing ? "Syncing…" : <>Last Sync {displaySyncText}</>}
              </span>
            </div>
            <span className="opacity-80">Made with ♥ for Gaurav</span>
          </footer>
        </div>
      </div>

      {/* Mobile quick action bar (fixed footer — kept) */}
      <nav className="fixed bottom-3 left-0 right-0 z-20 mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 lg:hidden">
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={createNewNote}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs"
            aria-label="Create note"
          >
            <PlusCircle className="h-5 w-5" />
            Note
          </button>
          <button
            onClick={createMoneyTracker}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs"
            aria-label="New money tracker"
          >
            <Wallet className="h-5 w-5" />
            Money
          </button>
          <button
            onClick={goTemplates}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs"
            aria-label="Open templates"
          >
            <LayoutTemplate className="h-5 w-5" />
            Templates
          </button>
        </div>
      </nav>

      {/* GLOBAL: mobile locks scroll; desktop scrolls dynamically */}
      <style jsx global>{`
        html,
        body {
          height: 100%;
          background: #ffffff;
        }

        /* Mobile/tablet: lock vertical scroll for app-like feel */
        @media (max-width: 1023.98px) {
          html,
          body {
            overflow: hidden;
            touch-action: manipulation;
            overscroll-behavior: none;
          }
        }

        /* Hide horizontal scrollbar helper */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Safety: hide common carousel pagination dots if any third-party component injects them */
        .slick-dots,
        .swiper-pagination,
        .embla__dots,
        [data-carousel] [data-dots],
        .carousel-dots {
          display: none !important;
          visibility: hidden !important;
        }
      `}</style>

      {/* Optional: thin overlay while syncing (non-blocking) */}
      {isSyncing && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-center pt-16">
          <div className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 ring-1 ring-slate-200 dark:ring-slate-800 text-xs">
            Syncing your data…
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function PrimaryCard({
  title,
  description,
  icon,
  gradient,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl text-left",
        "ring-1 ring-slate-200/80 dark:ring-slate-800/80",
        "bg-gradient-to-br p-0.5",
        gradient
      )}
    >
      <div className="relative h-full w-full rounded-[calc(theme(borderRadius.3xl)-2px)] bg-white/80 dark:bg-slate-950/60 p-5 backdrop-blur">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 shadow-sm ring-1 ring-black/5 dark:bg-slate-900/60">
              {icon}
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">
                {title}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {description}
              </div>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/40 blur-2xl" />
      </div>
    </motion.button>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void };
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-white/60 dark:bg-slate-900/50 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base md:text-lg">{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
          {action ? (
            <Button variant="ghost" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ItemRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-white/70 px-3 py-3 text-left transition hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/50 dark:hover:bg-slate-900"
    >
      <div className="flex min-w-0 items-center gap-3">
        {leading ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-black/5 dark:bg-slate-800">
            {leading}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{title}</div>
          {subtitle ? (
            <div className="truncate text-xs text-slate-600 dark:text-slate-400">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      {trailing ? (
        <div className="ml-3 shrink-0 text-right text-slate-700 dark:text-slate-200">
          {trailing}
        </div>
      ) : null}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300/80 bg-white/60 p-10 text-center dark:border-slate-700/80 dark:bg-slate-950/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-black/5 dark:bg-slate-800">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
      {subtitle ? (
        <div className="max-w-sm text-xs text-slate-600 dark:text-slate-400">
          {subtitle}
        </div>
      ) : null}
      {ctaLabel ? (
        <Button className="mt-1" onClick={onCta}>
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}

function TemplateCard({
  title,
  category,
  icon,
  onClick,
}: {
  title: string;
  category: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="group flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-left shadow-sm ring-1 ring-black/5 transition hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/50 dark:hover:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-black/5 dark:bg-slate-800">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {category}
          </div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </motion.button>
  );
}