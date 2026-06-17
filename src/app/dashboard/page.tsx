"use client";

import { useAuthStore } from "@/features/auth/useAuthStore";
import { NotesRepository, Note } from "@/features/notes/NotesRepository";
import { CollabRepository } from "@/features/notes/CollabRepository";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Book, Users, Flame, ChevronRight, Clock, Plus, LayoutGrid } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [coopSessions, setCoopSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      const repo = new NotesRepository(user.uid);
      const unsub = repo.subscribeToNotes((newNotes) => {
        setNotes(newNotes);
        setLoading(false);
      });
      
      const collabRepo = new CollabRepository();
      const unsubCollab = collabRepo.subscribeToActiveRooms((rooms) => {
        setCoopSessions(rooms.length);
      });
      
      return () => {
        unsub();
        unsubCollab();
      };
    }
  }, [user]);


  const recentNotes = useMemo(() => {
    return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes]);

  return (
    <div className="flex-1 overflow-hidden p-4 md:p-6 lg:p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-violet-500/30 relative flex flex-col">
      {/* Background ambient glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-fuchsia-500/5 dark:bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto w-full h-full flex flex-col gap-5 lg:gap-6 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col gap-1 animate-[fade-in_0.4s_ease-out]">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 dark:from-cyan-400 dark:via-violet-400 dark:to-fuchsia-400">{user?.displayName?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Here&apos;s what is happening with your workspace today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors"></div>
            <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-400 mb-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center border border-cyan-100 dark:border-cyan-500/20">
                <Book size={20} className="stroke-[2.5]" />
              </div>
              <h3 className="font-semibold text-zinc-500 dark:text-zinc-400 text-sm">Total Notes</h3>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white relative z-10 tracking-tight">
              {loading ? <span className="animate-pulse opacity-50">...</span> : notes.length}
            </div>
          </div>
          
          <div className="group bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors"></div>
            <div className="flex items-center gap-3 text-violet-600 dark:text-violet-400 mb-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center border border-violet-100 dark:border-violet-500/20">
                <Users size={20} className="stroke-[2.5]" />
              </div>
              <h3 className="font-semibold text-zinc-500 dark:text-zinc-400 text-sm">Co-op Sessions</h3>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white relative z-10 tracking-tight">
              {loading ? <span className="animate-pulse opacity-50">...</span> : coopSessions}
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Notes - Symmetrically aligned */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 flex-1 min-h-0">
          
          {/* Quick Actions Column */}
          <div className="flex flex-col h-full space-y-3 min-h-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <LayoutGrid size={18} className="text-zinc-400" /> 
              Quick Actions
            </h2>
            <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-sm relative min-h-0">
              <div className="flex-1 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-y-auto custom-scrollbar min-h-0">
                
                {/* New Note */}
                <Link href="/dashboard/notes" className="flex-1 p-4 flex items-center gap-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group relative overflow-hidden shrink-0">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors shadow-sm">
                    <Plus size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">New Note</p>
                    <p className="text-xs font-medium text-zinc-500">Create a private rich-text note.</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 ml-auto group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </Link>

                {/* Co-op Session */}
                <Link href="/dashboard/collab" className="flex-1 p-4 flex items-center gap-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group relative overflow-hidden shrink-0">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20 transition-colors shadow-sm">
                    <Users size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Co-op Session</p>
                    <p className="text-xs font-medium text-zinc-500">Join or start a live lobby.</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 ml-auto group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                </Link>

                {/* Smart Burn */}
                <Link href="/dashboard/burn" className="flex-1 p-4 flex items-center gap-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group relative overflow-hidden shrink-0">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors shadow-sm">
                    <Flame size={20} className="stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-0.5 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Create Smart Burn</p>
                    <p className="text-xs font-medium text-zinc-500">Generate a view-once self-destructing link.</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 ml-auto group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                </Link>

              </div>
              
              {/* Bottom fixed link matching Recent Notes */}
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200/80 dark:border-zinc-800/80 text-center mt-auto">
                <Link href="/dashboard/notes" className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-all">
                  Open Workspace <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Notes Column */}
          <div className="flex flex-col h-full space-y-3 min-h-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock size={18} className="text-zinc-400" /> 
              Recent Notes
            </h2>
            <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-sm relative min-h-0">
              {loading ? (
                <div className="flex-1 flex items-center justify-center p-6 text-zinc-500 font-medium text-sm">
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-violet-500 rounded-full animate-spin"></div>
                    Loading recent notes...
                  </div>
                </div>
              ) : recentNotes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mb-3">
                    <Book size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">No notes yet</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Create your first note to get started!</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-y-auto custom-scrollbar min-h-0">
                  {recentNotes.map((note) => (
                    <Link 
                      key={note.id} 
                      href={`/dashboard/notes/${note.id}`}
                      className="p-4 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group relative overflow-hidden shrink-0"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0 group-hover:bg-white dark:group-hover:bg-zinc-700 group-hover:text-violet-500 transition-colors shadow-sm">
                          <Book size={18} className="stroke-[2.5]" />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate mb-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{note.title || 'Untitled Note'}</p>
                          <p className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-transparent group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20 flex items-center justify-center transition-colors">
                        <ChevronRight size={16} className="text-zinc-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {/* Bottom fixed link */}
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200/80 dark:border-zinc-800/80 text-center mt-auto">
                <Link href="/dashboard/notes" className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-bold hover:text-violet-700 dark:hover:text-violet-300 hover:underline transition-all">
                  View all notes <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
