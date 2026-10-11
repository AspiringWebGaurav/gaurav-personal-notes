import { useState, useEffect, useRef, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Undo2,
  Redo2,
  FileCode,
  ClipboardPaste,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from 'lucide-react';
import { normalizeNoteContent } from '../../utils/markdownHelper';

interface EditorToolbarProps {
  editor: Editor | null;
  onAttachMedia?: () => void;
  onAttachFile?: (file: File | Blob) => void;
  isUploadingMedia?: boolean;
  onDeleteMedia?: () => void;
}

export const EditorToolbar = ({
  editor,
  onAttachMedia,
  onAttachFile,
  isUploadingMedia = false,
  onDeleteMedia,
}: EditorToolbarProps) => {
  if (!editor) return null;

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarWidth, setToolbarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.max(300, window.innerWidth - 200);
    }
    return 800;
  });

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setToolbarWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(el);
    if (el.clientWidth > 0) {
      setToolbarWidth(el.clientWidth);
    }

    return () => observer.disconnect();
  }, []);

  // Adaptive responsive labels to completely prevent toolbar cut-off / glitches:
  // - >= 820px: Full labels ("Attach Media", "Paste Clipboard")
  // - >= 620px: Clean workstation labels ("Attach", "Paste")
  // - < 620px: Compact icon-only buttons (fits perfectly even in split view)
  const isFullLabel = toolbarWidth >= 820;
  const isCompactLabel = toolbarWidth >= 620;
  const attachText = isFullLabel ? 'Attach Media' : isCompactLabel ? 'Attach' : '';
  const pasteText = isFullLabel ? 'Paste Clipboard' : isCompactLabel ? 'Paste' : '';

  const ToolbarButton = ({
    isActive = false,
    onClick,
    title,
    children,
  }: {
    isActive?: boolean;
    onClick: () => void;
    title: string;
    children: ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-[4px] text-xs transition-colors cursor-pointer shrink-0 ${
        isActive
          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-semibold shadow-2xs'
          : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );

  const handlePasteClipboard = async () => {
    try {
      // 1. Try reading rich image data from clipboard first
      if (navigator.clipboard?.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imgType = item.types.find((t) => t.startsWith('image/'));
            if (imgType) {
              const blob = await item.getType(imgType);
              if (onAttachFile) {
                onAttachFile(blob);
                return;
              }
            }
          }
        } catch {
          // Fallback to text reading if permissions or browser restrictions apply
        }
      }

      // 2. Read clipboard text/markdown/HTML
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const cleanHtml = normalizeNoteContent(text);
        editor.commands.insertContent(cleanHtml);
      }
    } catch (err) {
      console.warn('Could not read clipboard:', err);
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 select-none transition-colors min-h-[42px] overflow-x-auto no-scrollbar"
    >
      {/* Left Formatting Tools Group */}
      <div className="flex items-center gap-0.5 shrink-0">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Task Checkbox List"
        >
          <CheckSquare className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <FileCode className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Line"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>

        {/* Remove Media Button if Image or Video is selected */}
        {(editor.isActive('image') || editor.isActive('video')) && (
          <>
            <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0" />
            <button
              type="button"
              onClick={onDeleteMedia}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 rounded-[3px] border border-rose-200 dark:border-rose-900/50 transition cursor-pointer shadow-xs shrink-0"
              title="Remove selected media & delete from GPHost CDN"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Remove {editor.isActive('video') ? 'Video' : 'Image'}</span>
            </button>
          </>
        )}
      </div>

      {/* Right Monochrome Action Buttons: Clean Minimal Black & White on the exact same row */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto pl-2 pr-1">
        <button
          type="button"
          disabled={isUploadingMedia}
          onClick={onAttachMedia}
          title="Attach Image or Video from your computer"
          className={`inline-flex items-center gap-1.5 py-1 rounded-[3px] text-xs font-medium text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-2xs ${
            attachText ? 'px-2.5' : 'px-2'
          }`}
        >
          {isUploadingMedia ? (
            <Loader2 className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 animate-spin shrink-0" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
          )}
          {attachText && (
            <span>{isUploadingMedia ? 'Uploading...' : attachText}</span>
          )}
        </button>

        <button
          type="button"
          onClick={handlePasteClipboard}
          title="Paste text, markdown, or screenshot from clipboard (Ctrl+V)"
          className={`inline-flex items-center gap-1.5 py-1 rounded-[3px] text-xs font-medium text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition cursor-pointer whitespace-nowrap shadow-2xs ${
            pasteText ? 'px-2.5' : 'px-2'
          }`}
        >
          <ClipboardPaste className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
          {pasteText && <span>{pasteText}</span>}
        </button>
      </div>
    </div>
  );
};
