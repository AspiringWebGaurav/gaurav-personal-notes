"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, LogIn, Plus, Trash2, Clock, Activity, Copy, Check, AlertCircle } from "lucide-react";
import { CollabRepository, ActiveRoom, uint8ArrayToBase64 } from "@/features/notes/CollabRepository";
import * as Y from 'yjs';

export default function CollabLobbyPage() {
  const [roomId, setRoomId] = useState("");
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState("");
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  const fetchActiveRooms = async () => {
    try {
      setIsLoadingRooms(true);
      const repo = new CollabRepository();
      const rooms = await repo.getActiveRooms();
      setActiveRooms(rooms);
    } catch (err) {
      console.error("Failed to fetch active rooms", err);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    const id = roomId.trim();
    if (id.length > 3) {
      const repo = new CollabRepository();
      const room = await repo.getRoom(id);
      if (!room) {
        setJoinError("Room does not exist.");
        return;
      }
      router.push(`/dashboard/collab/${id}`);
    }
  };

  const handleCreate = async () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const repo = new CollabRepository();
    const ydoc = new Y.Doc();
    const encoded = uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));
    await repo.saveRoom(newRoomId, encoded);
    router.push(`/dashboard/collab/${newRoomId}`);
  };

  const confirmDeleteRoom = async () => {
    if (!deleteRoomId) return;
    try {
      setIsDeleting(true);
      const repo = new CollabRepository();
      await repo.deleteRoom(deleteRoomId);
      setActiveRooms(prev => prev.filter(r => r.roomId !== deleteRoomId));
      setDeleteRoomId(null);
    } catch (err) {
      console.error("Failed to delete room", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedRoomId(id);
    setTimeout(() => setCopiedRoomId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-zinc-50 dark:bg-zinc-950 p-4 md:p-6 lg:p-8 flex flex-col justify-center min-h-0 selection:bg-violet-500/30">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-fuchsia-500/5 dark:bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 relative z-10 animate-[fade-in_0.4s_ease-out]">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 dark:from-cyan-400 dark:via-violet-400 dark:to-fuchsia-400 tracking-tight">
            Co-op Sessions
          </h1>
          <p className="text-base font-medium text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            Real-time collaborative editing with zero latency. Peer-to-peer sync backed by secure persistence.
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[400px]">
          
          {/* Action Card */}
          <div className="group bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl group-hover:bg-violet-500/10 transition-colors pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-2 border border-violet-100 dark:border-violet-500/20">
                  <Plus size={24} className="stroke-[2.5]" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Start a New Session</h2>
                <button 
                  onClick={handleCreate}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-violet-500 hover:bg-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  Create Room
                </button>
              </div>

              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">OR</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
              </div>

              <div className="flex-1 flex flex-col justify-end">
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-center text-zinc-900 dark:text-white tracking-tight">Join Existing Session</h2>
                  <form onSubmit={handleJoin} className="flex flex-col gap-3">
                    <div className="relative">
                      <input 
                        type="text" 
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                        placeholder="ENTER ROOM CODE"
                        className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 focus:outline-none uppercase font-mono font-bold tracking-widest text-center text-lg text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 transition-all"
                        maxLength={20}
                      />
                    </div>
                    {joinError && (
                      <div className="flex items-center gap-1.5 text-red-500 text-sm font-semibold justify-center bg-red-50 dark:bg-red-500/10 py-2 rounded-xl animate-in fade-in zoom-in duration-200">
                        <AlertCircle size={16} />
                        {joinError}
                      </div>
                    )}
                    <button 
                      type="submit"
                      disabled={roomId.trim().length < 3}
                      className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Join Room <LogIn size={18} className="stroke-[2.5]" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Active Rooms List */}
          <div className="group bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full relative overflow-hidden">
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none"></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white tracking-tight">
                <Activity className="text-cyan-500 stroke-[2.5]" size={20} />
                Active Sessions
              </h2>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">
                  {activeRooms.length} Live
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar relative z-10">
              {isLoadingRooms ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-4">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-sm font-medium animate-pulse">Syncing sessions...</p>
                </div>
              ) : activeRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4 text-center px-4">
                  <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-zinc-100 dark:border-zinc-800">
                    <Users size={32} className="text-zinc-400 stroke-[1.5]" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-700 dark:text-zinc-300 text-lg tracking-tight">No active rooms</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Create a new session to get started.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRooms.map((room) => (
                    <div 
                      key={room.roomId} 
                      className="group/room relative bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 transition-all hover:bg-white dark:hover:bg-zinc-900 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-between overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-violet-500 scale-y-0 group-hover/room:scale-y-100 transition-transform origin-bottom" />
                      
                      <div className="flex flex-col pl-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg text-zinc-900 dark:text-white tracking-widest">
                            {room.roomId}
                          </span>
                          <button 
                            onClick={(e) => handleCopy(room.roomId, e)}
                            className="p-1.5 text-zinc-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-md transition-colors"
                            title="Copy Room ID"
                          >
                            {copiedRoomId === room.roomId ? (
                              <Check size={14} className="text-emerald-500 stroke-[3]" />
                            ) : (
                              <Copy size={14} className="stroke-[2.5]" />
                            )}
                          </button>
                        </div>
                        <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5 mt-1">
                          <Clock size={12} className="text-cyan-500" /> {formatTimeAgo(room.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDeleteRoomId(room.roomId)}
                          className="p-2.5 text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white rounded-xl transition-all opacity-0 group-hover/room:opacity-100 focus:opacity-100 -translate-x-2 group-hover/room:translate-x-0"
                          title="Delete Room"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/collab/${room.roomId}`)}
                          className="px-5 py-2.5 bg-violet-50 hover:bg-violet-600 hover:text-white dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-600 dark:hover:text-white text-violet-700 font-bold rounded-xl transition-colors shadow-sm"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Smart Use Policy Banner */}
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 relative z-10">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 py-2 px-4 rounded-full w-fit mx-auto">
                <Clock size={14} className="text-cyan-500" />
                <span>Smart Policy: Rooms auto-purge after 3h inactivity.</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl shadow-red-500/10 p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-red-100 dark:border-red-500/20">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Delete Session?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                Are you sure you want to permanently delete room <strong className="text-zinc-700 dark:text-zinc-300 font-mono tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{deleteRoomId}</strong>? This action cannot be undone.
              </p>
              <div className="flex w-full gap-3 mt-4">
                <button
                  onClick={() => setDeleteRoomId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteRoom}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
