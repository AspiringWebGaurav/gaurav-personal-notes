"use client";

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { NodeSelection } from '@tiptap/pm/state';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, 
  List, ListOrdered, Quote, Code, Users, Wifi, WifiOff, Trash2,
  Image as ImageIcon, Loader2, CloudUpload, ExternalLink
} from 'lucide-react';
import { CollabRepository, uint8ArrayToBase64, base64ToUint8Array } from '@/features/notes/CollabRepository';
import { GpnImage } from './extensions/GpnImageExtension';
import { Video } from './extensions/VideoExtension';
import { gphostService } from '@/services/gphostService';

const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac', '#4299e1', '#667eea', '#9f7aea', '#ed64a6'];
const randomColor = colors[Math.floor(Math.random() * colors.length)];

interface CollabEditorProps {
  roomId: string;
  userName: string;
}

const ToolbarButton = ({ onClick, isActive, title, disabled, children }: { onClick: () => void, isActive?: boolean, title: string, disabled?: boolean, children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-8 h-8 flex items-center justify-center rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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

    const indexeddbProvider = new IndexeddbPersistence(`gpn-collab-room-${roomId}`, ydoc);
    const provider = new WebrtcProvider(`gpn-collab-room-${roomId}`, ydoc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
    });

    setProviderDetails({ ydoc, provider });

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
          setIsDeleted(true);
          repo.deleteRoom(roomId).catch(console.error);
          return;
        }
      }
      
      if (roomData?.stateUpdate) {
        const update = base64ToUint8Array(roomData.stateUpdate);
        Y.applyUpdate(ydoc, update);
      } else if (!roomData) {
        setIsDeleted(true);
      }
    }).catch(console.error);

    ydoc.on('update', () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const encoded = uint8ArrayToBase64(Y.encodeStateAsUpdate(ydoc));
        repo.saveRoom(roomId, encoded).catch(console.error);
      }, 2000);
    });

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
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadStatus, setMediaUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

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

  const uploadAndInsertMedia = useCallback(async (file: File | Blob) => {
    setIsUploadingMedia(true);
    const isVideo = file.type.startsWith('video/');
    setMediaUploadStatus(isVideo ? 'Uploading video to GPHost...' : 'Uploading image to GPHost...');

    const localBlobUrl = URL.createObjectURL(file);
    const ed = editorRef.current;

    if (ed && !ed.isDestroyed) {
      if (isVideo) {
        ed.chain().focus().setVideo({
          src: localBlobUrl,
          title: file instanceof File ? file.name : 'Uploading video...',
        }).run();
      } else {
        ed.chain().focus().setImage({
          src: localBlobUrl,
          alt: file instanceof File ? file.name : 'Uploading image...',
          title: file instanceof File ? file.name : 'Uploading image...',
        }).run();
      }
    }

    try {
      const res = await gphostService.uploadMedia(file);
      if (res.rawUrl && ed && !ed.isDestroyed) {
        let updated = false;

        ed.commands.command(({ tr, state, dispatch }) => {
          state.doc.descendants((node, pos) => {
            if (
              (node.type.name === 'image' || node.type.name === 'video') &&
              node.attrs.src === localBlobUrl
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                src: res.rawUrl,
                fileId: res.fileId,
                alt: res.filename || node.attrs.alt,
                title: res.filename || node.attrs.title,
              });
              updated = true;
            }
          });
          if (dispatch && updated) {
            dispatch(tr);
          }
          return updated;
        });

        // Fallback: if descendants didn't find the preview node, insert permanent image directly
        if (!updated) {
          if (isVideo) {
            ed.chain().focus().setVideo({
              src: res.rawUrl,
              fileId: res.fileId,
              title: res.filename,
            }).run();
          } else {
            ed.chain().focus().setImage({
              src: res.rawUrl,
              alt: res.filename,
              title: res.filename,
            }).run();
          }
        }

        setMediaUploadStatus('Uploaded!');
        setTimeout(() => setMediaUploadStatus(null), 2500);
      }
    } catch (err: unknown) {
      console.error('Failed to upload media:', err);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setMediaUploadStatus(msg);
      setTimeout(() => setMediaUploadStatus(null), 3500);

      if (ed && !ed.isDestroyed) {
        ed.commands.command(({ tr, state, dispatch }) => {
          let cleaned = false;
          state.doc.descendants((node, pos) => {
            if ((node.type.name === 'image' || node.type.name === 'video') && node.attrs.src === localBlobUrl) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                uploading: false,
              });
              cleaned = true;
            }
          });
          if (dispatch && cleaned) {
            dispatch(tr);
          }
          return cleaned;
        });
      }
    } finally {
      setIsUploadingMedia(false);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(localBlobUrl);
        } catch {}
      }, 6000);
    }
  }, []);

  const previousMediaRef = useRef<Array<{ fileId?: string; url?: string }>>([]);

  const handleDeleteSelectedMedia = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;

    const imgAttrs = ed.getAttributes('image');
    const videoAttrs = ed.getAttributes('video');
    const src = imgAttrs.src || videoAttrs.src;
    const fileId = imgAttrs.fileId || videoAttrs.fileId;

    ed.chain().focus().deleteSelection().run();

    const target = fileId || src;
    if (target) {
      gphostService.deleteMedia(target, src).catch((err) => {
        console.warn('GPHost media delete error:', err);
      });
      setMediaUploadStatus('Deleted from GPHost CDN');
      setTimeout(() => setMediaUploadStatus(null), 3000);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadAndInsertMedia(files[0]);
    }
    e.target.value = '';
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
  }, [provider, userName]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: { name: userName, color: randomColor },
      }),
      GpnImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Video,
    ],
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const currentMedia = gphostService.extractGphostMedia(html);
      const currentKeys = new Set(
        currentMedia.map((m) => m.fileId || m.url).filter((k): k is string => Boolean(k))
      );
      const removedMedia = previousMediaRef.current.filter((prev) => {
        const key = prev.fileId || prev.url;
        return Boolean(key && !currentKeys.has(key));
      });

      if (removedMedia.length > 0) {
        removedMedia.forEach((item) => {
          const target = item.fileId || item.url;
          if (target) {
            gphostService.deleteMedia(target, item.url).catch((err) => {
              console.warn('Auto GPHost media cleanup failed:', err);
            });
          }
        });
        setMediaUploadStatus('Deleted from GPHost CDN');
        setTimeout(() => setMediaUploadStatus(null), 3000);
      }
      previousMediaRef.current = currentMedia;
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base mx-auto focus:outline-none dark:prose-invert max-w-none w-full min-h-full p-4',
      },
      handleClickOn: (view, _pos, node, nodePos) => {
        if (node.type.name === 'image' || node.type.name === 'video') {
          view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)));
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        const mediaFile = files.find(
          (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
        );
        if (mediaFile) {
          event.preventDefault();
          uploadAndInsertMedia(mediaFile);
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const files = Array.from(clipboardData.files || []);
        const mediaFile = files.find(
          (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
        );
        if (mediaFile) {
          event.preventDefault();
          uploadAndInsertMedia(mediaFile);
          return true;
        }

        const items = Array.from(clipboardData.items || []);
        for (const item of items) {
          if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
            const blob = item.getAsFile();
            if (blob) {
              event.preventDefault();
              uploadAndInsertMedia(blob);
              return true;
            }
          }
        }

        const pastedText = clipboardData.getData('text/plain')?.trim();
        if (pastedText) {
          if (/^https?:\/\/[^\s]+?\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(pastedText)) {
            event.preventDefault();
            editorRef.current?.commands.setImage({ src: pastedText, alt: 'Pasted Image' });
            editorRef.current?.commands.insertContent('<p></p>');
            return true;
          }
          if (/^https?:\/\/[^\s]+?\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(pastedText)) {
            event.preventDefault();
            editorRef.current?.commands.setVideo({ src: pastedText });
            editorRef.current?.commands.insertContent('<p></p>');
            return true;
          }
          const gphostMatch = pastedText.match(/^https:\/\/gphost\.eu\.cc\/(raw|f)\/([^\s\/?#]+)/i);
          if (gphostMatch) {
            event.preventDefault();
            const raw = pastedText.replace('/f/', '/raw/');
            const shortcode = gphostMatch[2];
            editorRef.current?.commands.setImage({ src: raw, fileId: shortcode, alt: 'GPHost Media' } as any);
            editorRef.current?.commands.insertContent('<p></p>');
            return true;
          }
        }

        return false;
      },
    },
  });

  editorRef.current = editor;

  if (!editor) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded h-full w-full flex items-center justify-center text-gray-500">Initializing editor...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-lg">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*,video/*"
        className="hidden"
      />

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

      <div className="border-b border-gray-200 dark:border-gray-800 p-2 flex flex-wrap items-center gap-1 bg-gray-50 dark:bg-gray-900 shrink-0">
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
        <Divider />
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          isActive={isUploadingMedia}
          disabled={isUploadingMedia}
          title="Attach Image or Video (GPHost CDN)"
        >
          {isUploadingMedia ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <ImageIcon size={16} />}
        </ToolbarButton>

        {/* Remove Media Button if Image or Video is selected */}
        {(editor.isActive('image') || editor.isActive('video')) && (
          <button
            type="button"
            onClick={handleDeleteSelectedMedia}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 rounded border border-red-200 dark:border-red-900/50 transition cursor-pointer shadow-xs"
            title="Remove selected media & delete from GPHost CDN"
          >
            <Trash2 size={14} className="text-red-500" />
            <span>Remove {editor.isActive('video') ? 'Video' : 'Image'}</span>
          </button>
        )}

        {mediaUploadStatus && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] font-mono font-medium text-indigo-700 dark:text-indigo-300 select-none whitespace-nowrap">
            {isUploadingMedia ? (
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>{mediaUploadStatus}</span>
          </div>
        )}

        <div className="flex-1" />
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded transition ml-auto border border-red-200 dark:border-red-900/50 cursor-pointer"
          title="Permanently Delete Room"
        >
          <Trash2 size={14} /> Delete Room
        </button>
      </div>

      <div className="flex-1 overflow-y-auto relative collab-editor">
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 150, placement: 'top' }}
          shouldShow={({ editor }) => editor.isActive('image') || editor.isActive('video')}
        >
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl backdrop-blur-md">
            <span className="text-[11px] font-mono font-semibold text-gray-500 dark:text-gray-400 px-1">
              {editor.isActive('video') ? 'Video' : 'Image'}
            </span>
            {(editor.getAttributes('image').src || editor.getAttributes('video').src) && (
              <a
                href={editor.getAttributes('image').src || editor.getAttributes('video').src}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 font-medium px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="View full size"
              >
                <ExternalLink size={12} />
                <span>View</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleDeleteSelectedMedia}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/60 transition cursor-pointer"
              title="Remove from note & permanently delete from GPHost CDN"
            >
              <Trash2 size={12} />
              <span>Remove & Delete</span>
            </button>
          </div>
        </BubbleMenu>
        <EditorContent editor={editor} className="w-full h-full" />
      </div>

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
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteRoom}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 cursor-pointer"
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
