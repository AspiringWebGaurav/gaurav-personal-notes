import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNotesStore } from '../stores/notesStore';
import {
  Zap,
  X,
  CornerDownLeft,
  ClipboardPaste,
  Image as ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Layers,
  Bold,
  Italic,
  CheckSquare,
  Code,
  Check,
} from 'lucide-react';
import {
  isMarkdownContent,
  parseMarkdownToHtml,
  extractSmartTitleAndContent,
} from '../utils/markdownHelper';
import { gphostService } from '../services/gphostService';

interface AttachedImage {
  id: string;
  file: File | Blob;
  url: string;
  previewUrl: string;
  filename: string;
  uploading: boolean;
  sizeText?: string;
  fileId?: string;
  cloudUploaded?: boolean;
}

interface QuickCaptureModalProps {
  isOpen: boolean;
  isStandalone?: boolean;
  onOpen?: () => void;
  onClose: () => void;
}

// Convert File/Blob to base64 Data URL for offline preservation
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Format byte size helper
function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper to paginate long pasted content into readable chunks
function splitTextIntoPages(text: string, maxCharsPerPage = 1200): string[] {
  if (!text || text.length <= maxCharsPerPage) {
    return [text];
  }

  // Check if explicit page breaks exist (e.g. --- or form-feed)
  if (text.includes('\n---\n') || text.includes('\f')) {
    const parts = text.split(/\n---\n|\f/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }

  // Split along natural paragraph breaks
  const paragraphs = text.split(/\n\n+/);
  const pages: string[] = [];
  let currentPage = '';

  for (const para of paragraphs) {
    if (!currentPage) {
      currentPage = para;
    } else if (currentPage.length + para.length + 2 <= maxCharsPerPage) {
      currentPage += '\n\n' + para;
    } else {
      pages.push(currentPage);
      currentPage = para;
    }
  }

  if (currentPage) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [text];
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  isStandalone = false,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [pages, setPages] = useState<string[]>(['']);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const cancelledUploadIdsRef = useRef<Set<string>>(new Set());
  const { createNote } = useNotesStore();

  const currentContent = pages[currentPageIndex] || '';

  // Show a temporary subtle feedback toast
  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice(null);
    }, 2800);
  };

  // Reset state and autofocus when opened
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setPages(['']);
      setCurrentPageIndex(0);
      setAttachedImages([]);
      setErrorMessage(null);
      setStatusNotice(null);
      setIsSubmitting(false);
      setIsDraggingOver(false);
      cancelledUploadIdsRef.current.clear();

      const focusTextarea = () => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      };

      focusTextarea();
      const animFrame = requestAnimationFrame(focusTextarea);
      const timer = setTimeout(focusTextarea, 25);
      const timer2 = setTimeout(focusTextarea, 150);
      const timer3 = setTimeout(focusTextarea, 300);

      return () => {
        cancelAnimationFrame(animFrame);
        clearTimeout(timer);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen]);

  // Upload or locally cache image file
  const handleAddImageFile = async (file: File | Blob) => {
    setErrorMessage(null);
    if ('size' in file && file.size > 100 * 1024 * 1024) {
      setErrorMessage('Image exceeds 100MB limit. Please choose a smaller file.');
      return;
    }

    const tempId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const localPreview = URL.createObjectURL(file);
    const filename =
      file instanceof File && file.name ? file.name : `screenshot_${Date.now()}.png`;
    const sizeText = 'size' in file ? formatBytes(file.size) : '';

    // Immediately render local preview
    setAttachedImages((prev) => [
      ...prev,
      {
        id: tempId,
        file,
        url: localPreview,
        previewUrl: localPreview,
        filename,
        uploading: true,
        sizeText,
      },
    ]);
    showNotice('Image attached');

    // Upload to GPHost CDN for cloud sync
    try {
      const res = await gphostService.uploadMedia(file, filename);

      // If user deleted the image while the upload was in progress, immediately delete from GPHost
      if (cancelledUploadIdsRef.current.has(tempId)) {
        cancelledUploadIdsRef.current.delete(tempId);
        const identifier = res.fileId || res.rawUrl;
        if (identifier) {
          gphostService.deleteMedia(identifier, res.rawUrl).catch(() => {});
        }
        return;
      }

      if (res.rawUrl) {
        setAttachedImages((prev) =>
          prev.map((img) =>
            img.id === tempId
              ? {
                  ...img,
                  url: res.rawUrl,
                  uploading: false,
                  fileId: res.fileId,
                  cloudUploaded: true,
                }
              : img
          )
        );
      } else {
        const base64 = await fileToBase64(file);
        setAttachedImages((prev) =>
          prev.map((img) =>
            img.id === tempId
              ? { ...img, url: base64, uploading: false }
              : img
          )
        );
      }
    } catch (err) {
      console.warn('GPHost upload failed, using offline fallback:', err);
      try {
        const base64 = await fileToBase64(file);
        setAttachedImages((prev) =>
          prev.map((img) =>
            img.id === tempId
              ? { ...img, url: base64, uploading: false }
              : img
          )
        );
      } catch {
        setAttachedImages((prev) => prev.filter((img) => img.id !== tempId));
        setErrorMessage('Failed to read image file.');
      }
    }
  };

  // Remove attached image and delete from GPHost so no stale media remains
  const handleRemoveImage = async (id: string) => {
    cancelledUploadIdsRef.current.add(id);

    const target = attachedImages.find((img) => img.id === id);
    if (!target) return;

    // Immediately remove from UI list
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));

    if (target.previewUrl && target.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(target.previewUrl);
      } catch {}
    }

    // If uploaded to GPHost or has GPHost URL, delete from GPHost immediately
    const isCloudMedia =
      target.cloudUploaded ||
      Boolean(target.fileId) ||
      (target.url && target.url.includes('gphost.eu.cc'));

    if (isCloudMedia) {
      showNotice('Deleting from GPHost...');
      try {
        const identifier = target.fileId || target.url;
        await gphostService.deleteMedia(identifier, target.url);
        showNotice('Image removed & deleted from cloud');
      } catch (err) {
        console.warn('Failed to delete media from GPHost on capture UI removal:', err);
      }
    } else {
      showNotice('Image removed');
    }
  };

  // Clean up any uploaded GPHost images if user closes modal without saving
  const handleCancelAndCleanup = async () => {
    const uploadedImages = attachedImages.filter(
      (img) =>
        img.cloudUploaded ||
        Boolean(img.fileId) ||
        (img.url && img.url.includes('gphost.eu.cc'))
    );

    if (uploadedImages.length > 0) {
      for (const img of uploadedImages) {
        cancelledUploadIdsRef.current.add(img.id);
        const identifier = img.fileId || img.url;
        gphostService.deleteMedia(identifier, img.url).catch(() => {});
      }
    }

    for (const img of attachedImages) {
      if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(img.previewUrl);
        } catch {}
      }
    }

    onClose();
  };

  // Content change on the active page
  const handleCurrentContentChange = (newText: string) => {
    setPages((prev) => {
      const copy = [...prev];
      copy[currentPageIndex] = newText;
      return copy;
    });
  };

  // Add new page to the capture scratchpad
  const handleAddPage = () => {
    setPages((prev) => [...prev, '']);
    setCurrentPageIndex(pages.length);
    showNotice(`Page ${pages.length + 1} added`);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Remove current page
  const handleRemovePage = (indexToRemove: number) => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setCurrentPageIndex((prev) => Math.max(0, Math.min(prev, pages.length - 2)));
    showNotice('Page deleted');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Split current long page into multiple pages
  const handleSplitPages = () => {
    const text = currentContent;
    const split = splitTextIntoPages(text, 1200);
    if (split.length > 1) {
      setPages((prev) => {
        const before = prev.slice(0, currentPageIndex);
        const after = prev.slice(currentPageIndex + 1);
        return [...before, ...split, ...after];
      });
      showNotice(`Split into ${split.length} pages`);
    } else {
      showNotice('Text is already compact');
    }
  };

  // Merge all pages back into a single long page
  const handleMergePages = () => {
    if (pages.length <= 1) return;
    const merged = pages.filter(Boolean).join('\n\n');
    setPages([merged]);
    setCurrentPageIndex(0);
    showNotice('Merged into 1 page');
  };

  // Insert markdown formatting into active page
  const handleInsertFormat = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = currentContent.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const nextVal =
      currentContent.substring(0, start) +
      replacement +
      currentContent.substring(end);
    handleCurrentContentChange(nextVal);
    setTimeout(() => {
      el.focus();
      const newPos = start + prefix.length + (selected ? selected.length : 4);
      el.setSelectionRange(newPos, newPos);
    }, 20);
  };

  // Process text pasted from clipboard
  const handlePasteText = (text: string) => {
    if (!text.trim()) return;

    // Auto-detect title if title input is currently empty
    if (!title.trim()) {
      const { title: autoTitle } = extractSmartTitleAndContent(text);
      if (
        autoTitle &&
        autoTitle !== 'Capture Note' &&
        autoTitle !== 'Quick Note' &&
        autoTitle !== 'Untitled Note'
      ) {
        setTitle(autoTitle);
      }
    }

    // If current page is empty and pasted text is large (>1200 chars), auto-paginate into pages!
    if (!currentContent.trim() && text.length > 1200) {
      const split = splitTextIntoPages(text, 1200);
      if (split.length > 1) {
        setPages(split);
        setCurrentPageIndex(0);
        showNotice(`Pasted & split into ${split.length} pages`);
        return;
      }
    }

    const updated = currentContent ? `${currentContent}\n\n${text}` : text;
    handleCurrentContentChange(updated);
    showNotice(`Pasted ${text.length} characters`);
  };

  // Paste from clipboard button handler
  const handlePasteClipboard = async () => {
    setErrorMessage(null);
    try {
      if (navigator.clipboard.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          let handledAnyImage = false;
          for (const item of clipboardItems) {
            const imageType = item.types.find((t) => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              await handleAddImageFile(blob);
              handledAnyImage = true;
            }
          }
          if (handledAnyImage) return;
        } catch {}
      }

      const text = await navigator.clipboard.readText();
      if (text) {
        handlePasteText(text);
      }
    } catch (err) {
      console.warn('Failed to read clipboard:', err);
    }
  };

  // Save note across all pages
  const handleSave = async () => {
    if (isSubmitting) return;

    const activePages = pages.map((p) => p.trim()).filter(Boolean);
    const combinedText = activePages.join('\n\n---\n\n');

    if (!combinedText && attachedImages.length === 0 && !title.trim()) {
      setErrorMessage('Please type some text or attach an image.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      let finalTitle = title.trim();

      // 1. If title was left blank, check first page
      if (!finalTitle && combinedText) {
        const { title: autoTitle } = extractSmartTitleAndContent(activePages[0] || combinedText);
        if (
          autoTitle &&
          autoTitle !== 'Capture Note' &&
          autoTitle !== 'Quick Note' &&
          autoTitle !== 'ChatGPT Answer' &&
          autoTitle !== 'Untitled Note'
        ) {
          finalTitle = autoTitle;
        }
      }

      // 2. If still blank, generate clean timestamp title
      if (!finalTitle) {
        const now = new Date();
        const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const randId = Math.floor(1000 + Math.random() * 9000);

        if (attachedImages.length > 0 && !combinedText) {
          finalTitle = `Image Capture #${randId} • ${dateStr}`;
        } else {
          finalTitle = `Capture Note #${randId} • ${dateStr}, ${timeStr}`;
        }
      }

      // 3. Construct HTML content across all pages
      let finalHtml = '';
      if (activePages.length === 1) {
        const single = activePages[0];
        finalHtml = isMarkdownContent(single)
          ? parseMarkdownToHtml(single)
          : `<p>${single.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
      } else if (activePages.length > 1) {
        finalHtml = activePages
          .map((pageText, idx) => {
            const pageHtml = isMarkdownContent(pageText)
              ? parseMarkdownToHtml(pageText)
              : `<p>${pageText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
            return idx === 0
              ? pageHtml
              : `<hr class="gpn-page-break"/><p><strong>Page ${idx + 1}</strong></p>${pageHtml}`;
          })
          .join('');
      }

      // Append attached images
      for (const img of attachedImages) {
        let safeUrl = img.url;
        if (img.uploading || safeUrl.startsWith('blob:')) {
          try {
            safeUrl = await fileToBase64(img.file);
          } catch {
            safeUrl = img.url;
          }
        }
        finalHtml += `<p><img src="${safeUrl}" alt="${img.filename}" class="gpn-image-attachment" /></p>`;
      }

      if (!finalHtml.trim()) {
        finalHtml = '<p></p>';
      }

      await createNote(finalTitle, finalHtml);
      try {
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
        if (isTauri) {
          const { emit } = await import('@tauri-apps/api/event');
          await emit('notes-updated');
        }
      } catch {}
      onClose();
    } catch (err: any) {
      console.error('Quick capture failed to save:', err);
      setErrorMessage(err?.message || 'Failed to save note. Your text is preserved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelAndCleanup();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentPageIndex((prev) => Math.max(0, prev - 1));
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    for (const file of imageFiles) {
      handleAddImageFile(file);
    }
  };

  // Modal-wide paste event handler
  const handlePasteEvent = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items || []);
    const imageItems = items.filter((i) => i.type.startsWith('image/'));
    if (imageItems.length > 0) {
      e.preventDefault();
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          handleAddImageFile(file);
        }
      }
      return;
    }

    // Text paste
    const text = e.clipboardData.getData('text');
    if (text && text.length > 1200 && !currentContent.trim()) {
      e.preventDefault();
      handlePasteText(text);
    }
  };

  // Live statistics
  const pageWordCount = useMemo(() => {
    const trimmed = currentContent.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [currentContent]);

  const totalWordCount = useMemo(() => {
    return pages.reduce((acc, p) => {
      const t = p.trim();
      return acc + (t ? t.split(/\s+/).length : 0);
    }, 0);
  }, [pages]);

  if (!isOpen) return null;

  return (
    <div
      onClick={isStandalone ? undefined : handleCancelAndCleanup}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={
        isStandalone
          ? "w-screen h-screen bg-transparent select-none p-1 flex flex-col overflow-hidden"
          : "fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150"
      }
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        onPaste={handlePasteEvent}
        className={
          isStandalone
            ? `relative w-full h-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 transition-all ${
                isDraggingOver
                  ? 'ring-2 ring-black dark:ring-white border-transparent'
                  : ''
              }`
            : `relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 transition-all ${
          isDraggingOver
            ? 'ring-2 ring-black dark:ring-white border-transparent'
            : ''
        }`}
      >
        {/* Drag over overlay banner */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-zinc-950/95 z-50 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-900 dark:border-zinc-100 rounded-2xl animate-in fade-in duration-100 pointer-events-none">
            <UploadCloud className="w-10 h-10 text-zinc-900 dark:text-zinc-100" />
            <p className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100 uppercase">
              Drop image here to attach
            </p>
          </div>
        )}

        {/* 1. FIXED TOP HEADER (Draggable) */}
        <div
          data-tauri-drag-region
          className="shrink-0 p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0" data-tauri-drag-region>
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div className="flex items-center gap-2 min-w-0" data-tauri-drag-region>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-sans truncate" data-tauri-drag-region>
                Gaurav Personal Notes Capture
              </h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 shrink-0">
                Ctrl+Shift+N / C
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0" data-tauri-drag-region="false">
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                for (const file of files) {
                  handleAddImageFile(file);
                }
                e.target.value = '';
              }}
            />

            <button
              type="button"
              data-tauri-drag-region="false"
              onClick={() => mediaInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer"
              title="Attach image from your computer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span className="hidden sm:inline">Attach Image</span>
            </button>

            <button
              type="button"
              data-tauri-drag-region="false"
              onClick={handlePasteClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer"
              title="Paste text or screenshot from clipboard"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span className="hidden sm:inline">Paste Clipboard</span>
            </button>

            <button
              type="button"
              data-tauri-drag-region="false"
              onClick={handleCancelAndCleanup}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. DYNAMIC FEEDBACK & ERROR NOTIFICATIONS */}
        {(errorMessage || statusNotice) && (
          <div className="shrink-0 px-4 sm:px-5 pt-3">
            {errorMessage ? (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 font-medium animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-rose-500 font-bold">⚠</span>
                  <span className="truncate">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-900 ml-2 font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>
            ) : statusNotice ? (
              <div className="flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-medium animate-in fade-in">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{statusNotice}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* 3. SCROLLABLE MIDDLE WORKSTATION */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3 custom-scrollbar">
          {/* Title Input */}
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Title (optional — auto-generated if left blank)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors shrink-0"
          />

          {/* Dynamic Pagination & Formatting Strip */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs shrink-0 flex-wrap">
            {/* Left: Multi-Page Pagination Controls */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                disabled={currentPageIndex === 0}
                onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-2xs"
                title="Previous page (Alt+Left)"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 shadow-2xs">
                <span>Page {currentPageIndex + 1}</span>
                <span className="text-zinc-400">/</span>
                <span>{pages.length}</span>
              </div>

              <button
                type="button"
                disabled={currentPageIndex === pages.length - 1}
                onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-2xs"
                title="Next page (Alt+Right)"
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={handleAddPage}
                className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-800 transition cursor-pointer shadow-2xs"
                title="Add new blank page"
              >
                <Plus size={12} />
                <span>Add Page</span>
              </button>

              {pages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRemovePage(currentPageIndex)}
                    className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-500 hover:text-rose-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
                    title="Delete current page"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={handleMergePages}
                    className="inline-flex items-center gap-1 px-2 h-7 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium transition cursor-pointer shadow-2xs"
                    title="Merge all pages into a single note page"
                  >
                    <Layers size={11} />
                    <span>Merge</span>
                  </button>
                </>
              )}

              {pages.length === 1 && currentContent.length > 1200 && (
                <button
                  type="button"
                  onClick={handleSplitPages}
                  className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-800 transition cursor-pointer shadow-2xs animate-in fade-in"
                  title="Split this long text into readable pages"
                >
                  <FileText size={12} />
                  <span>Split into Pages</span>
                </button>
              )}
            </div>

            {/* Right: Formatting Tools & Live Statistics */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Live Count Pill */}
              <div className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 select-none">
                <span>{pageWordCount} words</span>
                <span>•</span>
                <span>{currentContent.length} chars</span>
                {pages.length > 1 && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-600">|</span>
                    <span className="text-zinc-400">Total: {totalWordCount}w</span>
                  </>
                )}
              </div>

              {/* Formatting Quick Buttons */}
              <div className="flex items-center gap-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-1.5">
                <button
                  type="button"
                  onClick={() => handleInsertFormat('**', '**')}
                  className="w-7 h-7 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer font-bold text-xs"
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormat('*', '*')}
                  className="w-7 h-7 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer italic text-xs"
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormat('\n- [ ] ')}
                  className="w-7 h-7 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer text-xs"
                  title="Checklist task"
                >
                  <CheckSquare size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormat('`', '`')}
                  className="w-7 h-7 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer text-xs font-mono"
                  title="Inline code"
                >
                  <Code size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Textarea: Dynamically Expands, Scrollable, No Harsh Box Grips */}
          <textarea
            ref={textareaRef}
            placeholder={`Write thoughts for page ${currentPageIndex + 1}, paste articles, or paste screenshots (Ctrl+V)...`}
            value={currentContent}
            onChange={(e) => handleCurrentContentChange(e.target.value)}
            className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-zinc-900 resize-none flex-1 min-h-[250px] sm:min-h-[300px] leading-relaxed transition-colors font-sans custom-scrollbar"
          />

          {/* Attached Images Filmstrip Gallery */}
          {attachedImages.length > 0 && (
            <div className="flex flex-col gap-2 pt-1 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  Attached Images ({attachedImages.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {attachedImages.map((img) => (
                  <div
                    key={img.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-850 shrink-0 border border-zinc-200 dark:border-zinc-750">
                        <img
                          src={img.previewUrl}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                        />
                        {img.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {img.filename}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {img.uploading ? 'Syncing...' : img.sizeText || 'Ready'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. PINNED BOTTOM ACTION FOOTER */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <span>Esc: cancel</span>
            <span>•</span>
            <span>Ctrl+Enter: save</span>
            {pages.length > 1 && (
              <>
                <span>•</span>
                <span>Alt+←/→: flip pages</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCancelAndCleanup}
              className="px-4 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-medium text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-black dark:hover:bg-white text-white dark:text-zinc-950 font-sans text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <span>{isSubmitting ? 'SAVING...' : 'SAVE NOTE'}</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickCaptureModal;
