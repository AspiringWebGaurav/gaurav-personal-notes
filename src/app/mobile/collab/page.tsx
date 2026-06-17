"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, LogIn, Plus, Trash2, Clock, Activity, Copy, Check, AlertCircle } from "lucide-react";
import { CollabRepository, ActiveRoom, uint8ArrayToBase64 } from "@/features/notes/CollabRepository";
import * as Y from 'yjs';

export default function MobileCollabLobbyPage() {
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
      router.push(`/mobile/collab/${id}`);
    }
  };

  const handleCreate = async () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const repo = new CollabRepository();
    const ydoc = new Y.Doc();
    const encoded = uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));
    await repo.saveRoom(newRoomId, encoded);
    router.push(`/mobile/collab/${newRoomId}`);
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
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedRoomId(id);
    setTimeout(() => setCopiedRoomId(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-y-auto custom-scrollbar relative">
      <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
      
      <div className="p-4 pb-24 space-y-6 relative z-10">
        
        {/* Header */}
        <div className="space-y-1 mt-4">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 dark:from-cyan-400 dark:via-violet-400 dark:to-fuchsia-400 tracking-tight">
            Co-op Sessions
          </h1>
          <p className="text-sm font-medium text-zinc-500">Live collaborative editing.</p>
        </div>

        {/* Action Card */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col space-y-5 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <button 
            onClick={handleCreate}
            className="w-full flex items-center justify-center gap-2 py-4 bg-violet-500 active:bg-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98]"
          >
            <Plus size={20} className="stroke-[2.5]" /> Create Room
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <input 
              type="text" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="ENTER ROOM CODE"
              className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl focus:ring-2 focus:ring-violet-500/50 focus:outline-none uppercase font-mono font-bold tracking-widest text-center text-lg text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
              maxLength={20}
            />
            {joinError && (
              <div className="flex items-center gap-1.5 text-red-500 text-xs font-semibold justify-center">
                <AlertCircle size={14} /> {joinError}
              </div>
            )}
            <button 
              type="submit"
              disabled={roomId.trim().length < 3}
              className="w-full py-4 bg-zinc-900 active:bg-zinc-800 dark:bg-zinc-100 dark:active:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Join Room <LogIn size={18} className="stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Active Rooms */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-zinc-400">
              <Activity size={16} className="text-cyan-500" /> Active
            </h2>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-50 dark:bg-cyan-500/10 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400">{activeRooms.length} Live</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-sm">
            {isLoadingRooms ? (
              <div className="p-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-2 text-zinc-400">
                  <Users size={24} />
                </div>
                <p className="font-bold text-zinc-700 dark:text-zinc-300">No active rooms</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {activeRooms.map((room) => (
                  <div key={room.roomId} className="p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg text-zinc-900 dark:text-white">
                          {room.roomId}
                        </span>
                        <button onClick={(e) => handleCopy(room.roomId, e)} className="p-1 text-zinc-400 active:text-violet-500 transition-colors">
                          {copiedRoomId === room.roomId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1 uppercase">
                        <Clock size={10} className="text-cyan-500" /> {formatTimeAgo(room.updatedAt)} ago
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button onClick={() => setDeleteRoomId(room.roomId)} className="p-2 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl active:bg-red-100 dark:active:bg-red-500/20">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => router.push(`/mobile/collab/${room.roomId}`)} className="px-4 py-2 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold rounded-xl active:scale-95 transition-transform">
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Delete Modal */}
      {deleteRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-2">Delete Session?</h3>
            <p className="text-sm text-zinc-500 mb-6">Room {deleteRoomId} will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteRoomId(null)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 font-bold rounded-xl text-zinc-700 dark:text-zinc-300">Cancel</button>
              <button onClick={confirmDeleteRoom} disabled={isDeleting} className="flex-1 py-3 bg-red-500 font-bold rounded-xl text-white flex justify-center">
                {isDeleting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
