"use client";

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { NodeSelection } from '@tiptap/pm/state';
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
  Image as ImageIcon,
  Loader2,
  CloudUpload,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { GpnImage } from './extensions/GpnImageExtension';
import { Video } from './extensions/VideoExtension';
import { gphostService } from '@/services/gphostService';

interface EditorProps {
  initialContent?: string;
  onUpdate?: (content: string, wordCount: number) => void;
  editable?: boolean;
}

const ToolbarButton = ({ 
  onClick, 
  isActive, 
  title, 
  disabled = false,
  children 
}: { 
  onClick: () => void, 
  isActive: boolean, 
  title: string, 
  disabled?: boolean,
  children: React.ReactNode 
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-8 h-8 flex items-center justify-center rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
      isActive 
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 shadow-sm' 
        : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800'
    }`}
    title={title}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />;

export function Editor({ initialContent = "", onUpdate, editable = true }: EditorProps) {
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadStatus, setMediaUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const formattedContent = useMemo(() => {
    if (!initialContent) return "";
    
    // Check if the content already contains HTML tags. If not, it's likely legacy plain text.
    const hasHTML = /<[a-z][\s\S]*>/i.test(initialContent);
    
    if (!hasHTML && initialContent.includes('\n')) {
      return `<p>${initialContent.replace(/\n/g, '<br>')}</p>`;
    }
    
    return initialContent;
  }, [initialContent]);

  // Notion-style Instant Upload: Renders local blob immediately, then swaps with CDN URL
  const uploadAndInsertMedia = useCallback(async (file: File | Blob) => {
    setIsUploadingMedia(true);
    const isVideo = file.type.startsWith('video/');
    setMediaUploadStatus(isVideo ? 'Uploading video to GPHost CDN...' : 'Uploading image to GPHost CDN...');

    // 1. Instant local object URL preview (0ms latency, Notion feel)
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
        // 2. Seamlessly update the node from temporary blob URL to permanent GPHost CDN URL
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

        // 3. Fallback: if descendants didn't find the preview node, insert permanent image directly
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

        // 4. Force onUpdate notification so parent note page saves the permanent CDN URL to Firestore
        const text = ed.getText();
        const wordCount = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
        onUpdate?.(ed.getHTML(), wordCount);

        setMediaUploadStatus('Uploaded to GPHost CDN!');
        setTimeout(() => setMediaUploadStatus(null), 2500);
      }
    } catch (err: unknown) {
      console.error('Failed to upload media to GPHost:', err);
      const msg = err instanceof Error ? err.message : 'Media upload failed';
      setMediaUploadStatus(msg);
      setTimeout(() => setMediaUploadStatus(null), 4000);

      // On error, remove the uploading overlay so user can inspect or remove
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
      // Keep blob valid briefly during transition so browser can complete image load
      setTimeout(() => {
        try {
          URL.revokeObjectURL(localBlobUrl);
        } catch {}
      }, 6000);
    }
  }, [onUpdate]);

  // Track GPHost media items present in note to detect any user removals (backspace, delete, cut)
  const previousMediaRef = useRef<Array<{ fileId?: string; url?: string }>>([]);

  useEffect(() => {
    if (initialContent) {
      previousMediaRef.current = gphostService.extractGphostMedia(initialContent);
    }
  }, [initialContent]);

  // Explicit handler to remove selected image or video and permanently delete from GPHost
  const handleDeleteSelectedMedia = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return;

    const imgAttrs = ed.getAttributes('image');
    const videoAttrs = ed.getAttributes('video');
    const src = imgAttrs.src || videoAttrs.src;
    const fileId = imgAttrs.fileId || videoAttrs.fileId;

    // Delete node from editor selection
    ed.chain().focus().deleteSelection().run();

    // Trigger GPHost deletion immediately so no stale media remains
    const target = fileId || src;
    if (target) {
      gphostService.deleteMedia(target, src).catch((err) => {
        console.warn('GPHost media delete error:', err);
      });
      setMediaUploadStatus('Deleted from GPHost CDN');
      setTimeout(() => setMediaUploadStatus(null), 3000);
    }

    const text = ed.getText();
    const wordCount = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
    onUpdate?.(ed.getHTML(), wordCount);
  }, [onUpdate]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadAndInsertMedia(files[0]);
    }
    e.target.value = '';
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      GpnImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Video,
    ],
    content: formattedContent,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

      // Auto-cleanup: detect if any GPHost media was removed via keyboard (backspace/delete/cut)
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

      onUpdate?.(html, wordCount);
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

        // 1. Direct file attachment from clipboard
        const files = Array.from(clipboardData.files || []);
        const mediaFile = files.find(
          (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
        );
        if (mediaFile) {
          event.preventDefault();
          uploadAndInsertMedia(mediaFile);
          return true;
        }

        // 2. Clipboard screenshot items (PrintScreen, Win+Shift+S, copied browser images)
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

        // 3. Notion-style smart URL paste: if user pastes an image or video direct URL, embed it
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

  // Sync content if initialContent changes externally
  useEffect(() => {
    if (editor && !editor.isDestroyed && formattedContent) {
      if (editor.getHTML() !== formattedContent && editor.isEmpty) {
        editor.commands.setContent(formattedContent);
      }
    }
  }, [editor, formattedContent]);

  if (!editor) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded h-[500px] w-full" />;
  }

  return (
    <div className="w-full h-full flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950">
      {/* Hidden file input for GPHost uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*,video/*"
        className="hidden"
      />

      <div className="border-b border-gray-200 dark:border-gray-800 p-2 flex flex-wrap items-center gap-1 bg-gray-50 dark:bg-gray-900 shrink-0">
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          isActive={editor.isActive('bold')} 
          title="Bold"
        ><Bold size={16} /></ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          isActive={editor.isActive('italic')} 
          title="Italic"
        ><Italic size={16} /></ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleStrike().run()} 
          isActive={editor.isActive('strike')} 
          title="Strikethrough"
        ><Strikethrough size={16} /></ToolbarButton>

        <Divider />

        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
          isActive={editor.isActive('heading', { level: 1 })} 
          title="Heading 1"
        ><Heading1 size={16} /></ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          isActive={editor.isActive('heading', { level: 2 })} 
          title="Heading 2"
        ><Heading2 size={16} /></ToolbarButton>

        <Divider />

        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          isActive={editor.isActive('bulletList')} 
          title="Bullet List"
        ><List size={16} /></ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          isActive={editor.isActive('orderedList')} 
          title="Numbered List"
        ><ListOrdered size={16} /></ToolbarButton>

        <Divider />

        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()} 
          isActive={editor.isActive('blockquote')} 
          title="Blockquote"
        ><Quote size={16} /></ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleCode().run()} 
          isActive={editor.isActive('code')} 
          title="Code"
        ><Code size={16} /></ToolbarButton>

        <Divider />

        {/* GPHost Media Attach Button */}
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          isActive={isUploadingMedia}
          disabled={isUploadingMedia}
          title="Attach Image or Video (GPHost CDN)"
        >
          {isUploadingMedia ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <ImageIcon size={16} />}
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

        {/* GPHost Upload Status Banner */}
        {mediaUploadStatus && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[11px] font-mono font-medium text-sky-700 dark:text-sky-300 select-none whitespace-nowrap ml-auto">
            {isUploadingMedia ? (
              <Loader2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            )}
            <span>{mediaUploadStatus}</span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto relative">
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
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
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
    </div>
  );
}
