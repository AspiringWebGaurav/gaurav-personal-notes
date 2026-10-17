import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Users,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import {
  CollabRepository,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from '../../services/CollabRepository';
import { GpnImage } from './extensions/GpnImageExtension';
import { Video } from './extensions/VideoExtension';
import { gphostService } from '../../services/gphostService';

const CURSOR_COLORS = [
  '#f43f5e',
  '#ec4899',
  '#d946ef',
  '#a855f7',
  '#8b5cf6',
  '#6366f1',
  '#3b82f6',
  '#0ea5e9',
  '#06b6d4',
  '#14b8a6',
  '#10b981',
  '#84cc16',
  '#eab308',
  '#f97316',
];

interface CollabEditorProps {
  roomId: string;
  userName: string;
  onBackToLobby: () => void;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, isActive, title, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-7.5 h-7.5 flex items-center justify-center rounded-lg text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
      isActive
        ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold border border-violet-500/30'
        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
    }`}
    title={title}
  >
    {children}
  </button>
);

const ToolbarDivider = () => (
  <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 self-center shrink-0" />
);

export const CollabEditor: React.FC<CollabEditorProps> = ({
  roomId,
  userName,
  onBackToLobby,
}) => {
  const [providerDetails, setProviderDetails] = useState<{
    ydoc: Y.Doc;
    provider: WebrtcProvider;
  } | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const ydoc = new Y.Doc();
    const repo = new CollabRepository();
    let saveTimeout: ReturnType<typeof setTimeout>;

    const indexeddbProvider = new IndexeddbPersistence(
      `gpn-collab-room-${roomId}`,
      ydoc
    );
    const provider = new WebrtcProvider(`gpn-collab-room-${roomId}`, ydoc, {
      signaling: [
        'ws://127.0.0.1:4444',
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
      ],
    });

    setProviderDetails({ ydoc, provider });

    // Bootstrap room from Firestore
    repo
      .getRoom(roomId)
      .then((roomData) => {
        if (!isMounted) return;
        if (roomData?.deleted) {
          setIsDeleted(true);
          return;
        }

        if (roomData?.updatedAt) {
          const now = Date.now();
          const THREE_HOURS = 3 * 60 * 60 * 1000;
          if (now - roomData.updatedAt > THREE_HOURS) {
            setIsDeleted(true);
            repo.deleteRoom(roomId).catch(console.error);
            return;
          }
        }

        if (roomData?.stateUpdate) {
          const update = base64ToUint8Array(roomData.stateUpdate);
          Y.applyUpdate(ydoc, update);
        }
      })
      .catch(console.error);

    // Debounced automatic persistence of Yjs update snapshot to Firestore
    ydoc.on('update', () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const encoded = uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));
        repo.saveRoom(roomId, encoded).catch(console.error);
      }, 2000);
    });

    // P2P Real-time room closure sync
    const roomMeta = ydoc.getMap('room_state');
    const handleRoomMeta = () => {
      if (roomMeta.get('deleted')) {
        if (isMounted) setIsDeleted(true);
      }
    };
    roomMeta.observe(handleRoomMeta);
    if (roomMeta.get('deleted')) {
      setIsDeleted(true);
    }

    // Real-time listener for room deletion
    const unsubscribe = repo.listenToRoom(roomId, () => {
      if (isMounted) setIsDeleted(true);
    });

    return () => {
      isMounted = false;
      roomMeta.unobserve(handleRoomMeta);
      unsubscribe();
      if (saveTimeout) clearTimeout(saveTimeout);
      provider.destroy();
      indexeddbProvider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  if (isDeleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-center select-none animate-in fade-in duration-200">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <Trash2 size={28} />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
          Session Closed
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
          This collaborative session has ended, expired after 3 hours, or was deleted by a participant.
        </p>
        <button
          type="button"
          onClick={onBackToLobby}
          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
        >
          <ArrowLeft size={14} />
          <span>Return to Co-op Lobby</span>
        </button>
      </div>
    );
  }

  if (!providerDetails) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50/50 dark:bg-zinc-950/50 text-center select-none">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500 mb-3" />
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Connecting to secure Co-op session...
        </p>
      </div>
    );
  }

  return (
    <InnerCollabEditor
      roomId={roomId}
      userName={userName}
      ydoc={providerDetails.ydoc}
      provider={providerDetails.provider}
      onBackToLobby={onBackToLobby}
    />
  );
};

interface InnerCollabEditorProps {
  roomId: string;
  userName: string;
  ydoc: Y.Doc;
  provider: WebrtcProvider;
  onBackToLobby: () => void;
}

const InnerCollabEditor: React.FC<InnerCollabEditorProps> = ({
  roomId,
  userName,
  ydoc,
  provider,
  onBackToLobby,
}) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [usersCount, setUsersCount] = useState(1);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userColor = useRef(
    CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]
  ).current;

  // Track provider status and awareness peer count
  useEffect(() => {
    const handleStatus = (event: { connected: boolean }) => {
      if (event.connected) {
        setStatus('connected');
      } else {
        setStatus('connecting');
      }
    };

    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      setUsersCount(Math.max(1, states.size));
    };

    provider.on('status', handleStatus);
    provider.awareness.on('change', handleAwarenessChange);

    // Initial awareness state
    provider.awareness.setLocalStateField('user', {
      name: userName || 'Desktop User',
      color: userColor,
    });
    handleAwarenessChange();

    return () => {
      provider.off('status', handleStatus);
      provider.awareness.off('change', handleAwarenessChange);
    };
  }, [provider, userName, userColor]);

  // TipTap editor initialization with Collaboration + CollaborationCursor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
        undoRedo: false,
      } as any),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: userName || 'Desktop User',
          color: userColor,
        },
      }),
      GpnImage,
      Video,
    ],
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[400px] text-zinc-900 dark:text-zinc-100 text-sm leading-relaxed prose dark:prose-invert max-w-none p-6 md:p-8',
      },
    },
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      setIsUploadingMedia(true);
      const isVideo = file.type.startsWith('video/');
      const uploadRes = await gphostService.uploadMedia(file);

      if (uploadRes && uploadRes.rawUrl) {
        if (isVideo) {
          editor.commands.insertContent({
            type: 'video',
            attrs: { src: uploadRes.rawUrl },
          });
        } else {
          editor.commands.setImage({
            src: uploadRes.rawUrl,
            alt: file.name,
          });
        }
      }
    } catch (err) {
      console.error('[CollabEditor] Upload failed:', err);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDeleteRoom = async () => {
    try {
      setIsDeleting(true);
      const roomMeta = ydoc.getMap('room_state');
      roomMeta.set('deleted', true);
      const repo = new CollabRepository();
      await repo.deleteRoom(roomId).catch(console.warn);
      onBackToLobby();
    } catch (err) {
      console.error('[CollabEditor] Failed to delete room:', err);
      onBackToLobby();
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950 select-none">
      {/* Session Top Bar */}
      <div className="h-14 px-4 md:px-6 border-b border-zinc-200/90 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between shrink-0 gap-3">
        {/* Left: Back & Room Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToLobby}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
            title="Back to Co-op Lobby"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
              Co-op Session
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 transition cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
              title="Click to copy room code"
            >
              <span>{roomId}</span>
              {copiedCode ? (
                <Check size={11} className="text-emerald-500 shrink-0" />
              ) : (
                <Copy size={11} className="text-zinc-400 shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Center: Live Real-time Status Badge */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                status === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : status === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-zinc-400'
              }`}
            />
            <span className="hidden sm:inline">
              {status === 'connected' ? 'P2P Live' : 'Connecting...'}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">•</span>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <Users size={11} className="text-zinc-500" />
              <span>{usersCount} {usersCount === 1 ? 'peer' : 'peers'}</span>
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyCode}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-xs font-semibold border border-violet-500/20 transition cursor-pointer"
            title="Share Room Code"
          >
            <Share2 size={12} />
            <span>{copiedCode ? 'Copied!' : 'Share Code'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
            title="Close / Delete Session"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {editor && (
        <div className="px-4 py-1.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center gap-0.5 overflow-x-auto scrollbar-none shrink-0">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough size={13} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={13} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote size={13} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code size={13} />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Media upload button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,video/*"
            className="hidden"
          />
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="Insert Image / Video"
            disabled={isUploadingMedia}
          >
            {isUploadingMedia ? (
              <Loader2 size={13} className="animate-spin text-violet-500" />
            ) : (
              <ImageIcon size={13} />
            )}
          </ToolbarButton>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar select-text">
        <div className="max-w-4xl mx-auto min-h-full">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Close Co-op Session?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  This permanently closes the session for all connected peers.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRoom}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={12} className="animate-spin" />}
                <span>{isDeleting ? 'Closing...' : 'Close Session'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
