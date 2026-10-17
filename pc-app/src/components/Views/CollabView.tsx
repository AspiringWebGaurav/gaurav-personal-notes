import React, { useState, useEffect } from 'react';
import {
  Users,
  LogIn,
  Plus,
  Trash2,
  Clock,
  Activity,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  CollabRepository,
  ActiveRoom,
  uint8ArrayToBase64,
} from '../../services/CollabRepository';
import { CollabEditor } from '../Editor/CollabEditor';
import { useAuthStore } from '../../stores/authStore';
import * as Y from 'yjs';

interface CollabViewProps {
  initialRoomId?: string | null;
}

export const CollabView: React.FC<CollabViewProps> = ({ initialRoomId = null }) => {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(initialRoomId);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { user } = useAuthStore();
  const userName =
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'Desktop Peer';

  // Pure event-driven real-time listener: Zero polling!
  useEffect(() => {
    const repo = new CollabRepository();
    setIsLoadingRooms(true);

    const unsubscribe = repo.subscribeToActiveRooms((rooms) => {
      setActiveRooms(rooms);
      setIsLoadingRooms(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    const id = roomIdInput.trim().toUpperCase();
    if (id.length < 3) {
      setJoinError('Room code must be at least 3 characters.');
      return;
    }

    try {
      setIsJoining(true);
      const repo = new CollabRepository();
      try {
        const room = await repo.getRoom(id);
        if (room && room.deleted) {
          setJoinError('Room does not exist or has been deleted.');
          return;
        }
      } catch (err) {
        console.warn('Firestore room check bypassed for P2P join:', err);
      }
      setCurrentRoomId(id);
      setRoomIdInput('');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      setJoinError('');
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      try {
        const repo = new CollabRepository();
        const ydoc = new Y.Doc();
        const encoded = uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));
        await repo.saveRoom(newRoomId, encoded);
      } catch (err) {
        console.warn('Firestore room backup bypassed for P2P create:', err);
      }
      setCurrentRoomId(newRoomId);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinDirect = (id: string) => {
    setJoinError('');
    setCurrentRoomId(id);
  };

  const confirmDeleteRoom = async () => {
    if (!deleteRoomId) return;
    try {
      setIsDeleting(true);
      const repo = new CollabRepository();
      await repo.deleteRoom(deleteRoomId);
      setDeleteRoomId(null);
    } catch (err) {
      console.error('Failed to delete room', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
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

  // If in an active room, render the collaborative editor
  if (currentRoomId) {
    return (
      <CollabEditor
        roomId={currentRoomId}
        userName={userName}
        onBackToLobby={() => setCurrentRoomId(null)}
      />
    );
  }

  // Otherwise, render the Lobby view (Single-view, zero vertical scroll)
  return (
    <div className="flex-1 h-full overflow-hidden bg-white dark:bg-zinc-950 p-6 md:p-8 flex flex-col justify-between gap-4 select-none transition-colors">
      {/* 1. Header (Clean, Desktop GPN Native Layout) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 shrink-0">
        <div>
          <span className="text-[11px] font-mono tracking-[0.25em] font-semibold text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-violet-500" />
            <span>REAL-TIME COLLABORATION</span>
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            Co-op Sessions.
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Peer-to-peer real-time collaborative editing with zero latency across desktop, mobile, and web.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>WebRTC Live</span>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Desktop Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left Card: Create or Join */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/60 p-5 flex flex-col justify-between shadow-2xs">
          {/* Top: Start Session */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Plus size={16} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Start a New Session
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Create an instant P2P room with zero setup.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Creating Room...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} className="stroke-[2.5]" />
                    <span>Create Room</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-zinc-200 dark:border-zinc-800" />
            <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest">
              OR JOIN BY CODE
            </span>
            <div className="flex-1 h-px bg-zinc-200 dark:border-zinc-800" />
          </div>

          {/* Bottom: Join Session */}
          <div>
            <div className="mb-2">
              <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Join Existing Session
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Enter room code to join collaborators on any device.
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  placeholder="ENTER ROOM CODE"
                  className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-xs font-bold text-center tracking-widest text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 uppercase focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition"
                  maxLength={20}
                />
                <button
                  type="submit"
                  disabled={roomIdInput.trim().length < 3 || isJoining}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {isJoining ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <>
                      <span>Join Room</span>
                      <LogIn size={13} />
                    </>
                  )}
                </button>
              </div>

              {joinError && (
                <div className="flex items-center gap-1.5 text-rose-500 text-[11px] font-medium bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Card: Active Sessions List */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/60 p-5 flex flex-col justify-between shadow-2xs overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="text-zinc-700 dark:text-zinc-300 w-4 h-4" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Active Sessions
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700">
              {activeRooms.length} Live
            </span>
          </div>

          {/* List or Empty State (Scrolls internally if long, but never causes page scroll) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar my-2 pr-1 min-h-0 flex flex-col justify-center">
            {isLoadingRooms ? (
              <div className="flex flex-col items-center justify-center py-6 text-zinc-400 space-y-2">
                <Loader2 size={18} className="animate-spin text-zinc-400" />
                <p className="text-[11px] font-medium">Syncing sessions...</p>
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                <div className="w-9 h-9 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    No active sessions
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Created rooms will appear here automatically.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {activeRooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-wider">
                        {room.roomId}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(room.roomId, e)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                        title="Copy Room ID"
                      >
                        {copiedRoomId === room.roomId ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 ml-1">
                        {formatTimeAgo(room.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDeleteRoomId(room.roomId)}
                        className="p-1 text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                        title="Close Session"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleJoinDirect(room.roomId)}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-[11px] font-semibold rounded transition cursor-pointer"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card footer note */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] text-zinc-400 dark:text-zinc-500 text-center shrink-0">
            Active rooms auto-sync in real time without refreshing
          </div>
        </div>
      </div>

      {/* 3. Security & Policy Footer Pill (Matches Database & Permissions Footer) */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-violet-500 shrink-0" />
          <span className="text-[11px]">
            Smart Policy: Sessions auto-expire after 3h inactivity • Encrypted peer-to-peer data channel
          </span>
        </div>
        <span className="text-[10px] font-mono font-semibold text-zinc-400 dark:text-zinc-500 shrink-0">
          AES-256 P2P
        </span>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 dark:border-rose-500/20">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Delete Co-op Session?
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                Are you sure you want to permanently delete room{' '}
                <strong className="text-zinc-800 dark:text-zinc-200 font-mono tracking-widest bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                  {deleteRoomId}
                </strong>
                ? All connected peers will be disconnected immediately.
              </p>
              <div className="flex w-full gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setDeleteRoomId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteRoom}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isDeleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
