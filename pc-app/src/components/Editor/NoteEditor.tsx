import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { NodeSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { GpnImage } from './extensions/GpnImageExtension';
import { Video } from './extensions/VideoExtension';
import { gphostService } from '../../services/gphostService';
import {
  isMarkdownContent,
  parseMarkdownToHtml,
  extractSmartTitleAndContent,
  normalizeNoteContent,
} from '../../utils/markdownHelper';
import { useNotesStore } from '../../stores/notesStore';
import { useConfirmStore } from '../../stores/confirmStore';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import { EditorToolbar } from './EditorToolbar';
import { Check, Clock, RotateCcw, Trash2, FileText, Plus, Loader2, CloudUpload, Cloud, Lock, RefreshCw, ExternalLink } from 'lucide-react';

export type NoteViewMode = 'edit' | 'split' | 'preview';

interface NoteEditorProps {
  viewMode?: NoteViewMode;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ viewMode = 'edit' }) => {
  const {
    notes,
    trashNotes,
    activeNoteId,
    updateNote,
    saveStatus,
    restoreFromTrash,
    deletePermanently,
    createNote,
    isTrashView,
    toggleNoteSyncMode,
  } = useNotesStore();
  const { isAuthenticated } = useAuthStore();
  const { isManualSyncing } = useSyncStore();
  const confirmModal = useConfirmStore((s) => s.confirm);

  const activeNote = isTrashView
    ? trashNotes.find((n) => n.id === activeNoteId)
    : notes.find((n) => n.id === activeNoteId);

  const handleDeletePermanently = async () => {
    if (!activeNote) return;
    const ok = await confirmModal({
      title: 'Delete Note Permanently?',
      description: `Permanently delete "${activeNote.title || 'Untitled Note'}"? This cannot be undone.`,
      confirmText: 'DELETE PERMANENTLY',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (ok) {
      await deletePermanently(activeNote.id);
    }
  };

  const [title, setTitle] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadStatus, setMediaUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  // Track GPHost media items present in note to detect any user removals (backspace, delete, cut)
  const previousMediaRef = useRef<Array<{ fileId?: string; url?: string }>>([]);

  useEffect(() => {
    if (activeNote?.content) {
      previousMediaRef.current = gphostService.extractGphostMedia(activeNote.content);
    }
  }, [activeNote?.id]);

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
      setMediaUploadStatus('Deleted from GPHost!');
      setTimeout(() => setMediaUploadStatus(null), 3000);
    }

    if (activeNote) {
      updateNote(activeNote.id, {
        content: ed.getHTML(),
      });
    }
  }, [activeNote, updateNote]);

  const uploadAndInsertMedia = async (file: File | Blob) => {
    setIsUploadingMedia(true);
    const isVideo = file.type.startsWith('video/');
    setMediaUploadStatus(isVideo ? 'Uploading video to GPHost CDN...' : 'Uploading image to GPHost CDN...');

    // 1. Instant local preview (Notion-style 0ms latency)
    const localBlobUrl = URL.createObjectURL(file);
    const ed = editorRef.current;

    if (ed && !ed.isDestroyed) {
      if (isVideo) {
        ed.commands.insertContent({
          type: 'video',
          attrs: {
            src: localBlobUrl,
            title: file instanceof File ? file.name : 'Uploading video...',
            uploading: true,
          },
        });
      } else {
        ed.commands.insertContent({
          type: 'image',
          attrs: {
            src: localBlobUrl,
            alt: file instanceof File ? file.name : 'Uploading image...',
            title: file instanceof File ? file.name : 'Uploading image...',
            uploading: true,
          },
        });
      }
      ed.commands.insertContent('<p></p>');
    }

    try {
      const res = await gphostService.uploadMedia(file);
      if (res.rawUrl && ed && !ed.isDestroyed) {
        // 2. In-place swap of temporary blob with permanent GPHost CDN URL
        const tr = ed.state.tr;
        let updated = false;

        ed.state.doc.descendants((node, pos) => {
          if ((node.type.name === 'image' || node.type.name === 'video') && node.attrs.src === localBlobUrl) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              src: res.rawUrl,
              fileId: res.fileId,
              uploading: false,
              alt: res.filename,
              title: res.filename,
            });
            updated = true;
          }
        });

        if (updated) {
          ed.view.dispatch(tr);
        }

        setMediaUploadStatus('Uploaded to GPHost!');
        setTimeout(() => setMediaUploadStatus(null), 2500);
      }
    } catch (err: unknown) {
      console.error('Failed to upload media to GPHost:', err);
      const msg = err instanceof Error ? err.message : 'Media upload failed';
      setMediaUploadStatus(msg);
      setTimeout(() => setMediaUploadStatus(null), 3500);

      if (ed && !ed.isDestroyed) {
        const tr = ed.state.tr;
        ed.state.doc.descendants((node, pos) => {
          if ((node.type.name === 'image' || node.type.name === 'video') && node.attrs.src === localBlobUrl) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              uploading: false,
            });
          }
        });
        ed.view.dispatch(tr);
      }
    } finally {
      setIsUploadingMedia(false);
      try {
        URL.revokeObjectURL(localBlobUrl);
      } catch {}
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing thoughts, ideas, or paste images, videos, ChatGPT answers here...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      GpnImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Video,
    ],
    content: activeNote ? normalizeNoteContent(activeNote.content) : '',
    editable: !isTrashView,
    editorProps: {
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

        // 1. Intercept Image or Video from clipboard (e.g. screenshot, copied picture)
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

        // 2. Notion-style direct image/video URL paste
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
          if (/^https:\/\/gphost\.eu\.cc\/(raw|f)\/[^\s]+$/i.test(pastedText)) {
            event.preventDefault();
            const raw = pastedText.replace('/f/', '/raw/');
            editorRef.current?.commands.setImage({ src: raw, alt: 'GPHost Media' });
            editorRef.current?.commands.insertContent('<p></p>');
            return true;
          }
        }

        // 3. Intercept ChatGPT / Markdown text
        const text = clipboardData.getData('text/plain');
        if (text && isMarkdownContent(text)) {
          event.preventDefault();

          // Auto-detect note title if currently empty or default
          if (!title || title.trim() === '' || title === 'Untitled Note') {
            const { title: autoTitle, content: htmlContent } = extractSmartTitleAndContent(text);
            if (autoTitle && autoTitle !== 'ChatGPT Answer') {
              setTitle(autoTitle);
              if (activeNote) {
                updateNote(activeNote.id, { title: autoTitle });
              }
            }
            setTimeout(() => {
              if (editorRef.current && !editorRef.current.isDestroyed) {
                editorRef.current.commands.insertContent(htmlContent);
              }
            }, 0);
          } else {
            const html = parseMarkdownToHtml(text);
            setTimeout(() => {
              if (editorRef.current && !editorRef.current.isDestroyed) {
                editorRef.current.commands.insertContent(html);
              }
            }, 0);
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (!activeNote || isTrashView) return;
      const htmlContent = editor.getHTML();

      // Auto-cleanup: detect if any GPHost media was removed via keyboard (backspace/delete/cut)
      const currentMedia = gphostService.extractGphostMedia(htmlContent);
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
        setMediaUploadStatus('Deleted from GPHost!');
        setTimeout(() => setMediaUploadStatus(null), 3000);
      }
      previousMediaRef.current = currentMedia;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateNote(activeNote.id, {
          content: htmlContent,
        });
      }, 350);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync title dynamically whenever active note or activeNote.title updates from store/sync
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || 'Untitled Note');
    } else {
      setTitle('');
    }
  }, [activeNote?.id, activeNote?.title]);

  // Sync editor content when switching active note or if updated remotely
  useEffect(() => {
    if (activeNote && editor && !editor.isDestroyed) {
      const normalized = normalizeNoteContent(activeNote.content);
      if (editor.getHTML() !== normalized && !editor.isFocused) {
        editor.commands.setContent(normalized);
      }
      editor.setEditable(!isTrashView);
    } else if (!activeNote && editor && !editor.isDestroyed) {
      editor.commands.setContent('');
    }
  }, [activeNote?.id, activeNote?.content, isTrashView, editor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (!activeNote || isTrashView) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateNote(activeNote.id, {
        title: newTitle.trim() || 'Untitled Note',
      });
    }, 350);
  };

  const wordCount = activeNote?.wordCount || 0;
  const characterCount = activeNote?.content?.replace(/<[^>]*>?/gm, '').length || 0;

  if (!activeNote) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-zinc-950 select-none transition-colors">
        <div className="w-12 h-12 rounded-[2px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3 shadow-2xs">
          <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Click any note to load here
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mb-4 leading-relaxed font-normal">
          Select a note from the left sidebar to load and edit its content, or create a new note.
        </p>
        <button
          type="button"
          onClick={() => createNote()}
          className="px-4 py-2 rounded-[2px] bg-black dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>CREATE NEW NOTE</span>
          <kbd className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-1">Ctrl+N</kbd>
        </button>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950 transition-colors">
      {/* Trash Alert Banner */}
      {isTrashView && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 px-4 py-2 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 select-none">
          <span>This note is in the trash. It cannot be edited.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => restoreFromTrash(activeNote.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore</span>
            </button>
            <button
              onClick={handleDeletePermanently}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Permanently</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden Media File Input for Toolbar Attachment Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            uploadAndInsertMedia(file);
          }
          e.target.value = '';
        }}
      />

      {/* Editor Formatting Toolbar */}
      {!isTrashView && viewMode !== 'preview' && (
        <EditorToolbar
          editor={editor}
          onAttachMedia={() => fileInputRef.current?.click()}
          onAttachFile={uploadAndInsertMedia}
          isUploadingMedia={isUploadingMedia}
          onDeleteMedia={handleDeleteSelectedMedia}
        />
      )}

      {/* Note Title Input & Status Badges */}
      <div className="px-4 sm:px-6 md:px-10 pt-6 md:pt-8 pb-3 border-b border-zinc-100 dark:border-zinc-900 w-full">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-2 max-w-5xl mx-auto w-full min-w-0">
          <input
            type="text"
            placeholder="Untitled Note"
            disabled={isTrashView}
            value={title}
            onChange={handleTitleChange}
            className="flex-1 min-w-0 bg-transparent text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 dark:placeholder-zinc-600 focus:outline-none"
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Per-Note Sync Preference Pill / Toggle */}
            {activeNote && !isTrashView && (
              <button
                type="button"
                onClick={() => toggleNoteSyncMode(activeNote.id)}
                title={
                  activeNote.syncState === 'local_only'
                    ? 'Strictly Local: Not syncing to cloud. Click to enable Cloud Sync.'
                    : 'Cloud Synced: Automatically mirrors to your cloud account. Click to keep strictly Local Only.'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] border text-[10px] font-mono tracking-wider font-semibold select-none transition-colors cursor-pointer whitespace-nowrap shadow-2xs ${
                  activeNote.syncState === 'local_only'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                    : isAuthenticated
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {activeNote.syncState === 'local_only' ? (
                  <>
                    <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>LOCAL ONLY</span>
                  </>
                ) : isManualSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-sky-600 dark:text-sky-400 animate-spin" />
                    <span className="text-sky-700 dark:text-sky-300">SYNCING...</span>
                  </>
                ) : isAuthenticated ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 dark:text-[#00ff87]" />
                    <span>CLOUD SYNC</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                    <span>CLOUD SYNC</span>
                  </>
                )}
              </button>
            )}

            {/* GPHost Media Upload Indicator */}
            {mediaUploadStatus && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[10px] font-mono font-semibold text-sky-700 dark:text-sky-300 select-none whitespace-nowrap">
                {isUploadingMedia ? (
                  <Loader2 className="w-3 h-3 text-sky-600 dark:text-sky-400 animate-spin" />
                ) : (
                  <CloudUpload className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                )}
                <span>{mediaUploadStatus.toUpperCase()}</span>
              </div>
            )}

            {/* Saved Locally Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 select-none whitespace-nowrap shadow-2xs">
              {saveStatus === 'Saving...' ? (
                <>
                  <Clock className="w-3 h-3 text-amber-500 animate-spin" />
                  <span className="text-amber-700 dark:text-amber-400">SAVING...</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-zinc-600 dark:text-zinc-300">SAVED LOCALLY</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Word count & metadata footer */}
        <div className="flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500 pb-1 select-none max-w-5xl mx-auto w-full">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{characterCount} characters</span>
          <span>•</span>
          <span>
            Updated {new Date(activeNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Editor / Split / Preview Content Area */}
      {viewMode === 'preview' ? (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-6 relative">
          <div className="max-w-5xl mx-auto w-full">
            <div
              className="prose dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100 font-sans leading-relaxed selection:bg-blue-500/20"
              dangerouslySetInnerHTML={{
                __html: normalizeNoteContent(activeNote.content) || '<p class="text-zinc-400 italic">Empty note</p>',
              }}
            />
          </div>
        </div>
      ) : viewMode === 'split' ? (
        <div className="flex-1 overflow-hidden flex flex-row relative divide-x divide-zinc-200 dark:divide-zinc-800">
          {/* Left Split: Editor */}
          <div className="flex-1 h-full overflow-y-auto px-4 sm:px-6 md:px-8 py-6 relative">
            <div className="max-w-3xl mx-auto w-full relative">
              {editor && (
                <BubbleMenu
                  editor={editor}
                  shouldShow={({ editor }: { editor: any }) => editor.isActive('image') || editor.isActive('video')}
                >
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl backdrop-blur-md">
                    <span className="text-[11px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 px-1">
                      {editor.isActive('video') ? 'Video' : 'Image'}
                    </span>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedMedia}
                      className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </BubbleMenu>
              )}
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Right Split: Live Rendered Preview */}
          <div className="flex-1 h-full overflow-y-auto px-4 sm:px-6 md:px-8 py-6 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="max-w-3xl mx-auto w-full">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between select-none">
                <span>Live Markdown Preview</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[9px] font-semibold">Rendered</span>
              </div>
              <div
                className="prose dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100 font-sans leading-relaxed text-sm"
                dangerouslySetInnerHTML={{
                  __html: normalizeNoteContent(activeNote.content) || '<p class="text-zinc-400 italic">Live preview will appear as you write...</p>',
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-6 relative">
          <div className="max-w-5xl mx-auto w-full relative">
            {editor && (
              <BubbleMenu
                editor={editor}
                shouldShow={({ editor }: { editor: any }) => editor.isActive('image') || editor.isActive('video')}
              >
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl backdrop-blur-md">
                  <span className="text-[11px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 px-1">
                    {editor.isActive('video') ? 'Video' : 'Image'}
                  </span>
                  {(editor.getAttributes('image').src || editor.getAttributes('video').src) && (
                    <a
                      href={editor.getAttributes('image').src || editor.getAttributes('video').src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-zinc-600 hover:text-sky-600 dark:text-zinc-300 dark:hover:text-sky-400 font-medium px-2 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="View full size"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleDeleteSelectedMedia}
                    className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
                    title="Remove from note & permanently delete from GPHost CDN"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove & Delete</span>
                  </button>
                </div>
              </BubbleMenu>
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
      )}
    </main>
  );
};
