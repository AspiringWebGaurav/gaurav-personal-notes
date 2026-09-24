"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useEffect, useState } from 'react';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, 
  List, ListOrdered, Quote, Code, Users, Wifi, WifiOff, Trash2
} from 'lucide-react';
import { CollabRepository, uint8ArrayToBase64, base64ToUint8Array } from '@/features/notes/CollabRepository';

const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac', '#4299e1', '#667eea', '#9f7aea', '#ed64a6'];
const randomColor = colors[Math.floor(Math.random() * colors.length)];

interface CollabEditorProps {
  roomId: string;
  userName: string;
}

const ToolbarButton = ({ onClick, isActive, title, children }: { onClick: () => void, isActive?: boolean, title: string, children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`w-8 h-8 flex items-center justify-center rounded transition ${
      isActive 
        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 shadow-sm' 
        : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800'
    }`}
    title={title}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />;

export function CollabEditor({ roomId, userName }: CollabEditorProps) {
  const [providerDetails, setProviderDetails] = useState<{ ydoc: Y.Doc; provider: WebrtcProvider } | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const ydoc = new Y.Doc();
    const repo = new CollabRepository();
    let saveTimeout: ReturnType<typeof setTimeout>;

    // 1. Synchronously initialize providers to guarantee cleanup
    const indexeddbProvider = new IndexeddbPersistence(`gpn-collab-room-${roomId}`, ydoc);
    const provider = new WebrtcProvider(`gpn-collab-room-${roomId}`, ydoc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
    });

    setProviderDetails({ ydoc, provider });

    // 2. Asynchronously fetch initial data and apply it
    repo.getRoom(roomId).then(roomData => {
      if (!isMounted) return;
      if (roomData?.deleted) {
        setIsDeleted(true);
        return;
      }

      if (roomData?.updatedAt) {
        const now = Date.now();
        const THREE_HOURS = 3 * 60 * 60 * 1000;
        if (now - roomData.updatedAt > THREE_HOURS) {
          // Room expired
          setIsDeleted(true);
          repo.deleteRoom(roomId).catch(console.error);
          return;
        }
      }
      
      if (roomData?.stateUpdate) {
        const update = base64ToUint8Array(roomData.stateUpdate);
        Y.applyUpdate(ydoc, update);
      } else if (!roomData) {
        setIsDeleted(true); // Room doesn't exist, treat as invalid
      }
    }).catch(console.error);

    // 3. Listen for local changes to save to Firebase
    ydoc.on('update', () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const encoded = uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));
        repo.saveRoom(roomId, encoded).catch(console.error);
      }, 2000);
    });

    // 4. Listen for room deletion
    const unsubscribe = repo.listenToRoom(roomId, () => {
      if (isMounted) setIsDeleted(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      if (saveTimeout) clearTimeout(saveTimeout);
      provider.destroy();
      indexeddbProvider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  if (isDeleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-4">
          <Trash2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Room Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          This collaborative session does not exist, or it has been permanently closed and deleted.
        </p>
      </div>
    );
  }

  if (!providerDetails) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded h-full w-full flex items-center justify-center text-gray-500">Loading secure room...</div>;
  }

  return <InnerEditor roomId={roomId} userName={userName} ydoc={providerDetails.ydoc} provider={providerDetails.provider} />;
}

function InnerEditor({ roomId, userName, ydoc, provider }: { roomId: string; userName: string; ydoc: Y.Doc; provider: WebrtcProvider }) {
  const [status, setStatus] = useState<string>("connecting");
  const [usersCount, setUsersCount] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteRoom = async () => {
    try {
      setIsDeleting(true);
      const repo = new CollabRepository();
      await repo.deleteRoom(roomId);
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    provider.on('status', (event: { connected: boolean }) => {
      setStatus(event.connected ? 'connected' : 'disconnected');
    });

    provider.awareness.setLocalStateField('user', {
      name: userName,
      color: randomColor,
    });

    const updateAwareness = () => {
      setUsersCount(Array.from(provider.awareness.getStates().values()).length);
    };

    provider.awareness.on('change', updateAwareness);
    updateAwareness();

    // No need to destroy provider/ydoc here, it's handled by the parent
  }, [provider, userName]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // REQUIRED for Yjs collaboration
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: { name: userName, color: randomColor },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base mx-auto focus:outline-none dark:prose-invert max-w-none w-full min-h-full p-4',
      },
    },
  });

  if (!editor) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded h-full w-full flex items-center justify-center text-gray-500">Initializing editor...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-lg">
      
      {/* Collab Status Bar */}
      <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium">
          <span className="bg-indigo-800 px-2 py-0.5 rounded font-mono text-xs">ROOM: {roomId}</span>
          <span className="opacity-80">|</span>
          <span className="flex items-center gap-1">
            <Users size={14} /> {usersCount} Active
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-80">
          {status === 'connected' ? (
            <><Wifi size={14} /> <span>Connected</span></>
          ) : (
            <><WifiOff size={14} className="text-zinc-300" /> <span className="text-zinc-200 text-xs italic tracking-wide">Saved locally</span></>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-800 p-2 flex flex-wrap gap-1 bg-gray-50 dark:bg-gray-900 shrink-0">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={16} />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 size={16} />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered size={16} />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Code">
          <Code size={16} />
        </ToolbarButton>
        <div className="flex-1" />
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded transition ml-auto border border-red-200 dark:border-red-900/50"
          title="Permanently Delete Room"
        >
          <Trash2 size={14} /> Delete Room
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto relative collab-editor">
        <EditorContent editor={editor} className="w-full h-full" />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl shadow-2xl shadow-red-500/10 p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Session?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Are you sure you want to permanently delete room <strong className="text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{roomId}</strong>? Everyone will be kicked out immediately.
              </p>
              <div className="flex w-full gap-3 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors disabled:opacity-50"
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
