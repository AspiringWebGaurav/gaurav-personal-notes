import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  Strikethrough,
  Heading,
  CheckSquare,
  List,
  ListOrdered,
  Code,
  Quote,
  Link2,
  Minus,
  Copy,
  RotateCcw,
  Check,
  HelpCircle,
  Keyboard,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import {
  isMarkdownContent,
  parseMarkdownToHtml,
  extractSmartTitleAndContent,
} from '../utils/markdownHelper';
import { copyTextToClipboard, getClipboardText } from '../utils/clipboardHelper';
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
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const cancelledUploadIdsRef = useRef<Set<string>>(new Set());
  const noticeTimerRef = useRef<any>(null);
  const { createNote } = useNotesStore();

  const currentContent = pages[currentPageIndex] || '';

  const prevIsOpenRef = useRef(false);
  const currentContentRef = useRef(currentContent);
  currentContentRef.current = currentContent;
  const titleRef = useRef(title);
  titleRef.current = title;
  const currentPageIndexRef = useRef(currentPageIndex);
  currentPageIndexRef.current = currentPageIndex;

  // Show a temporary subtle feedback toast
  const showNotice = useCallback((msg: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setStatusNotice(msg);
    noticeTimerRef.current = setTimeout(() => {
      setStatusNotice(null);
    }, 2500);
  }, []);

  // Wipe all modal draft state completely
  const resetAllDraftState = useCallback(() => {
    setTitle('');
    setPages(['']);
    setCurrentPageIndex(0);
    setErrorMessage(null);
    setStatusNotice(null);
    setIsSubmitting(false);
    setIsDraggingOver(false);
    setIsGuideOpen(false);

    // Revoke object URLs to prevent memory leaks
    setAttachedImages((prev) => {
      for (const img of prev) {
        if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(img.previewUrl);
          } catch {}
        }
      }
      return [];
    });
    cancelledUploadIdsRef.current.clear();
  }, []);

  // Reset state and autofocus ONLY on open/close transitions, never on re-render
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen && !wasOpen) {
      // Opening transition ONLY: reset to fresh draft and autofocus once
      setTitle('');
      setPages(['']);
      setCurrentPageIndex(0);
      setErrorMessage(null);
      setStatusNotice(null);
      setIsSubmitting(false);
      setIsDraggingOver(false);
      setIsGuideOpen(false);
      cancelledUploadIdsRef.current.clear();

      setAttachedImages((prev) => {
        for (const img of prev) {
          if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(img.previewUrl);
            } catch {}
          }
        }
        return [];
      });

      // Immediate autofocus on reveal: native requestAnimationFrame + backup timer
      const focusTarget = () => {
        if (typeof window !== 'undefined') {
          try {
            window.focus();
          } catch {}
        }
        if (document.activeElement !== titleInputRef.current && textareaRef.current) {
          textareaRef.current.focus();
        }
      };

      const raf = requestAnimationFrame(focusTarget);
      const timer = setTimeout(focusTarget, 40);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    } else if (!isOpen && wasOpen) {
      // Closing transition ONLY: clean up memory
      resetAllDraftState();
    }
  }, [isOpen, resetAllDraftState]);

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

    try {
      const res = await gphostService.uploadMedia(file, filename);

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

  // Remove attached image and delete from GPHost
  const handleRemoveImage = async (id: string) => {
    cancelledUploadIdsRef.current.add(id);

    const target = attachedImages.find((img) => img.id === id);
    if (!target) return;

    setAttachedImages((prev) => prev.filter((img) => img.id !== id));

    if (target.previewUrl && target.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(target.previewUrl);
      } catch {}
    }

    const isCloudMedia =
      target.cloudUploaded ||
      Boolean(target.fileId) ||
      (target.url && target.url.includes('gphost.eu.cc'));

    if (isCloudMedia) {
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

  // Clean up any uploaded GPHost images and wipe modal state completely
  const handleCancelAndCleanup = async () => {
    // 1. Instantly reset all input states so modal content completely vanishes
    setTitle('');
    setPages(['']);
    setCurrentPageIndex(0);
    setErrorMessage(null);
    setStatusNotice(null);
    setIsSubmitting(false);
    setIsGuideOpen(false);

    // 2. Revoke blob URLs and clean up uncommitted cloud images
    for (const img of attachedImages) {
      if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(img.previewUrl);
        } catch {}
      }
    }

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
    setAttachedImages([]);

    // 3. Trigger parent close
    onClose();

    // 4. Standalone window handling
    if (isStandalone) {
      try {
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
        if (isTauri) {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('cmd_hide_capture_window').catch(() => {});
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const win = getCurrentWindow();
          if (win.label === 'capture') {
            await win.setAlwaysOnTop(false).catch(() => {});
            await win.hide().catch(() => {});
          }
        }
      } catch {}
    }
  };

  // Global Escape listener: pressing Esc anywhere closes guide if open, or vanishes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isGuideOpen) {
          setIsGuideOpen(false);
        } else {
          handleCancelAndCleanup();
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        setIsGuideOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalEsc, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalEsc, true);
    };
  }, [isOpen, isGuideOpen]);

  // Content change on the active page
  const handleCurrentContentChange = (newText: string) => {
    setPages((prev) => {
      const copy = [...prev];
      copy[currentPageIndexRef.current] = newText;
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

  // Copy current page content to clipboard
  const handleCopyPage = async () => {
    const textToCopy = currentContent || title;
    if (!textToCopy) {
      showNotice('Nothing to copy');
      return;
    }
    const success = await copyTextToClipboard(textToCopy);
    if (success) {
      showNotice('Page copied to clipboard');
    } else {
      showNotice('Failed to copy');
    }
  };

  // Clear current page
  const handleClearPage = () => {
    if (!currentContent) return;
    handleCurrentContentChange('');
    showNotice('Page cleared');
    textareaRef.current?.focus();
  };

  // Robust formatting engine with selection persistence & markdown toggles
  const applyFormat = (type: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const text = currentContent;
    const selected = text.substring(start, end);

    let newText = text;
    let newStart = start;
    let newEnd = end;

    switch (type) {
      case 'bold': {
        if (selected) {
          if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
            const unwrapped = selected.slice(2, -2);
            newText = text.substring(0, start) + unwrapped + text.substring(end);
            newStart = start;
            newEnd = start + unwrapped.length;
          } else {
            const wrapped = `**${selected}**`;
            newText = text.substring(0, start) + wrapped + text.substring(end);
            newStart = start;
            newEnd = start + wrapped.length;
          }
        } else {
          newText = text.substring(0, start) + '****' + text.substring(end);
          newStart = start + 2;
          newEnd = start + 2;
        }
        break;
      }
      case 'italic': {
        if (selected) {
          if (selected.startsWith('*') && selected.endsWith('*') && !selected.startsWith('**') && selected.length >= 2) {
            const unwrapped = selected.slice(1, -1);
            newText = text.substring(0, start) + unwrapped + text.substring(end);
            newStart = start;
            newEnd = start + unwrapped.length;
          } else {
            const wrapped = `*${selected}*`;
            newText = text.substring(0, start) + wrapped + text.substring(end);
            newStart = start;
            newEnd = start + wrapped.length;
          }
        } else {
          newText = text.substring(0, start) + '**' + text.substring(end);
          newStart = start + 1;
          newEnd = start + 1;
        }
        break;
      }
      case 'strike': {
        if (selected) {
          if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length >= 4) {
            const unwrapped = selected.slice(2, -2);
            newText = text.substring(0, start) + unwrapped + text.substring(end);
            newStart = start;
            newEnd = start + unwrapped.length;
          } else {
            const wrapped = `~~${selected}~~`;
            newText = text.substring(0, start) + wrapped + text.substring(end);
            newStart = start;
            newEnd = start + wrapped.length;
          }
        } else {
          newText = text.substring(0, start) + '~~~~' + text.substring(end);
          newStart = start + 2;
          newEnd = start + 2;
        }
        break;
      }
      case 'code': {
        if (selected) {
          if (selected.includes('\n')) {
            const block = `\`\`\`\n${selected}\n\`\`\``;
            newText = text.substring(0, start) + block + text.substring(end);
            newStart = start;
            newEnd = start + block.length;
          } else if (selected.startsWith('`') && selected.endsWith('`') && selected.length >= 2) {
            const unwrapped = selected.slice(1, -1);
            newText = text.substring(0, start) + unwrapped + text.substring(end);
            newStart = start;
            newEnd = start + unwrapped.length;
          } else {
            const wrapped = `\`${selected}\``;
            newText = text.substring(0, start) + wrapped + text.substring(end);
            newStart = start;
            newEnd = start + wrapped.length;
          }
        } else {
          newText = text.substring(0, start) + '``' + text.substring(end);
          newStart = start + 1;
          newEnd = start + 1;
        }
        break;
      }
      case 'heading': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = text.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = text.length;
        const currentLine = text.substring(lineStart, lineEnd);

        let updatedLine = currentLine;
        if (currentLine.startsWith('### ')) {
          updatedLine = currentLine.substring(4);
        } else if (currentLine.startsWith('## ')) {
          updatedLine = '### ' + currentLine.substring(3);
        } else if (currentLine.startsWith('# ')) {
          updatedLine = '## ' + currentLine.substring(2);
        } else {
          updatedLine = '# ' + currentLine;
        }

        newText = text.substring(0, lineStart) + updatedLine + text.substring(lineEnd);
        const diff = updatedLine.length - currentLine.length;
        newStart = Math.max(lineStart, start + diff);
        newEnd = Math.max(lineStart, end + diff);
        break;
      }
      case 'task': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = text.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = text.length;
        const selectedBlock = text.substring(lineStart, lineEnd);
        const lines = selectedBlock.split('\n');

        const updatedLines = lines.map((line) => {
          if (line.startsWith('- [ ] ')) return line.substring(6);
          if (line.startsWith('- [x] ')) return line.substring(6);
          if (line.startsWith('- ') || line.startsWith('* ')) return '- [ ] ' + line.substring(2);
          if (/^\d+\.\s/.test(line)) return '- [ ] ' + line.replace(/^\d+\.\s/, '');
          return '- [ ] ' + line;
        });

        const replacement = updatedLines.join('\n');
        newText = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        newStart = lineStart;
        newEnd = lineStart + replacement.length;
        break;
      }
      case 'bullet': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = text.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = text.length;
        const selectedBlock = text.substring(lineStart, lineEnd);
        const lines = selectedBlock.split('\n');

        const updatedLines = lines.map((line) => {
          if (line.startsWith('- ')) return line.substring(2);
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) return '- ' + line.substring(6);
          if (/^\d+\.\s/.test(line)) return '- ' + line.replace(/^\d+\.\s/, '');
          return '- ' + line;
        });

        const replacement = updatedLines.join('\n');
        newText = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        newStart = lineStart;
        newEnd = lineStart + replacement.length;
        break;
      }
      case 'number': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = text.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = text.length;
        const selectedBlock = text.substring(lineStart, lineEnd);
        const lines = selectedBlock.split('\n');

        const hasNumbering = lines.every((l) => /^\d+\.\s/.test(l));
        const updatedLines = lines.map((line, idx) => {
          if (hasNumbering) return line.replace(/^\d+\.\s/, '');
          let clean = line;
          if (clean.startsWith('- [ ] ') || clean.startsWith('- [x] ')) clean = clean.substring(6);
          else if (clean.startsWith('- ') || clean.startsWith('* ')) clean = clean.substring(2);
          return `${idx + 1}. ${clean}`;
        });

        const replacement = updatedLines.join('\n');
        newText = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        newStart = lineStart;
        newEnd = lineStart + replacement.length;
        break;
      }
      case 'quote': {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = text.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = text.length;
        const selectedBlock = text.substring(lineStart, lineEnd);
        const lines = selectedBlock.split('\n');

        const hasQuotes = lines.every((l) => l.startsWith('> '));
        const updatedLines = lines.map((line) => {
          if (hasQuotes) return line.substring(2);
          return '> ' + line;
        });

        const replacement = updatedLines.join('\n');
        newText = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        newStart = lineStart;
        newEnd = lineStart + replacement.length;
        break;
      }
      case 'link': {
        if (selected) {
          if (selected.startsWith('http://') || selected.startsWith('https://')) {
            const replacement = `[link](${selected})`;
            newText = text.substring(0, start) + replacement + text.substring(end);
            newStart = start + 1;
            newEnd = start + 5;
          } else {
            const replacement = `[${selected}](https://)`;
            newText = text.substring(0, start) + replacement + text.substring(end);
            newStart = start + selected.length + 3;
            newEnd = newStart + 8;
          }
        } else {
          const replacement = '[title](https://)';
          newText = text.substring(0, start) + replacement + text.substring(end);
          newStart = start + 1;
          newEnd = start + 6;
        }
        break;
      }
      case 'hr': {
        const separator = '\n\n---\n\n';
        newText = text.substring(0, start) + separator + text.substring(end);
        newStart = start + separator.length;
        newEnd = newStart;
        break;
      }
    }

    handleCurrentContentChange(newText);

    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(newStart, newEnd);
      }
    });
  };

  // Process text pasted from clipboard
  const handlePasteText = (text: string) => {
    if (!text.trim()) return;

    if (!titleRef.current.trim()) {
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

    if (!currentContentRef.current.trim() && text.length > 1200) {
      const split = splitTextIntoPages(text, 1200);
      if (split.length > 1) {
        setPages(split);
        setCurrentPageIndex(0);
        showNotice(`Pasted & split into ${split.length} pages`);
        return;
      }
    }

    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const cur = el.value;
      const before = cur.substring(0, start);
      const after = cur.substring(end);
      const updated = before + text + after;
      handleCurrentContentChange(updated);
      requestAnimationFrame(() => {
        if (el) {
          el.selectionStart = el.selectionEnd = start + text.length;
          el.focus();
        }
      });
      showNotice(`Pasted ${text.length} characters`);
      return;
    }

    const updated = currentContentRef.current
      ? `${currentContentRef.current}\n\n${text}`
      : text;
    handleCurrentContentChange(updated);
    showNotice(`Pasted ${text.length} characters`);
  };

  // Paste from clipboard button handler
  const handlePasteClipboard = async () => {
    setErrorMessage(null);
    try {
      // 1. Try native Windows OS clipboard extraction via Tauri command first
      const nativeText = await getClipboardText();
      if (nativeText && nativeText.trim()) {
        handlePasteText(nativeText);
        return;
      }

      // 2. Try Web Clipboard API for images
      if (navigator.clipboard?.read) {
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

      showNotice('Clipboard is empty');
    } catch (err) {
      console.warn('Failed to read clipboard:', err);
      showNotice('Clipboard access unavailable. Press Ctrl+V directly.');
    }
  };

  // Unified window-level paste event listener: handles images anywhere, and text paste on backdrop
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      // 1. If clipboard contains image items, capture immediately anywhere in modal
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter((i) => i.type.startsWith('image/'));
      if (imageItems.length > 0) {
        e.preventDefault();
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) handleAddImageFile(file);
        }
        return;
      }

      const text = e.clipboardData?.getData('text');
      if (!text) return;

      const target = e.target as HTMLElement | null;

      // 2. If user is pasting directly into Title input, let native browser paste handle it
      if (target === titleInputRef.current) {
        return;
      }

      // 3. If user is pasting into textarea
      if (target === textareaRef.current) {
        if (text.length > 1200 && !currentContentRef.current.trim()) {
          e.preventDefault();
          handlePasteText(text);
          return;
        }
        if (!titleRef.current.trim()) {
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
        // Let native browser paste handle inserting into textarea
        return;
      }

      // 4. If user pasted while focus was on modal container, toolbar, or buttons
      e.preventDefault();
      handlePasteText(text);
      textareaRef.current?.focus();
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [isOpen]);

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

      resetAllDraftState();
      onClose();

      if (isStandalone) {
        try {
          const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
          if (isTauri) {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('cmd_hide_capture_window').catch(() => {});
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const win = getCurrentWindow();
            if (win.label === 'capture') {
              await win.setAlwaysOnTop(false).catch(() => {});
              await win.hide().catch(() => {});
            }
          }
        } catch {}
      }
    } catch (err: any) {
      console.error('Quick capture failed to save:', err);
      setErrorMessage(err?.message || 'Failed to save note. Your text is preserved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut listener for modal container
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isGuideOpen) {
        setIsGuideOpen(false);
      } else {
        handleCancelAndCleanup();
      }
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentPageIndex((prev) => Math.max(0, prev - 1));
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (!isInput) {
        e.preventDefault();
        handlePasteClipboard();
      }
    }
  };

  // Rich inline editing keyboard shortcuts in the textarea
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyFormat('bold');
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyFormat('italic');
    } else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyFormat('link');
    } else if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyFormat('code');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const nextVal = val.substring(0, start) + '  ' + val.substring(end);
      handleCurrentContentChange(nextVal);
      requestAnimationFrame(() => {
        el.setSelectionRange(start + 2, start + 2);
      });
    } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      const el = e.currentTarget;
      const pos = el.selectionStart;
      const val = el.value;
      const textBefore = val.substring(0, pos);
      const lineStart = textBefore.lastIndexOf('\n') + 1;
      const currentLine = textBefore.substring(lineStart);

      // Empty task item: Enter removes prefix
      if (currentLine === '- [ ] ' || currentLine === '- [x] ') {
        e.preventDefault();
        const nextVal = val.substring(0, lineStart) + val.substring(pos);
        handleCurrentContentChange(nextVal);
        requestAnimationFrame(() => {
          el.setSelectionRange(lineStart, lineStart);
        });
        return;
      }
      // Empty bullet item: Enter removes prefix
      if (currentLine === '- ' || currentLine === '* ') {
        e.preventDefault();
        const nextVal = val.substring(0, lineStart) + val.substring(pos);
        handleCurrentContentChange(nextVal);
        requestAnimationFrame(() => {
          el.setSelectionRange(lineStart, lineStart);
        });
        return;
      }
      // Continue task item
      if (currentLine.startsWith('- [ ] ') || currentLine.startsWith('- [x] ')) {
        e.preventDefault();
        const nextVal = val.substring(0, pos) + '\n- [ ] ' + val.substring(pos);
        handleCurrentContentChange(nextVal);
        requestAnimationFrame(() => {
          el.setSelectionRange(pos + 7, pos + 7);
        });
        return;
      }
      // Continue bullet item
      if (currentLine.startsWith('- ') || currentLine.startsWith('* ')) {
        e.preventDefault();
        const nextVal = val.substring(0, pos) + '\n- ' + val.substring(pos);
        handleCurrentContentChange(nextVal);
        requestAnimationFrame(() => {
          el.setSelectionRange(pos + 3, pos + 3);
        });
        return;
      }
      // Continue numbered item
      const numMatch = currentLine.match(/^(\d+)\.\s/);
      if (numMatch) {
        e.preventDefault();
        const nextNum = parseInt(numMatch[1], 10) + 1;
        const prefix = `\n${nextNum}. `;
        const nextVal = val.substring(0, pos) + prefix + val.substring(pos);
        handleCurrentContentChange(nextVal);
        requestAnimationFrame(() => {
          el.setSelectionRange(pos + prefix.length, pos + prefix.length);
        });
        return;
      }
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

  const readingTime = useMemo(() => {
    const words = totalWordCount || pageWordCount;
    return Math.max(1, Math.ceil(words / 200));
  }, [totalWordCount, pageWordCount]);

  if (!isOpen) return null;

  // Workstation Interior Content (Unified, borderless document canvas)
  const workstationContent = (
    <div className="relative flex flex-col flex-1 h-full min-h-0 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* 1. TOP HEADER */}
      <div
        data-tauri-drag-region
        className="shrink-0 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-zinc-100 dark:border-zinc-850 flex items-center justify-between cursor-move select-none bg-white dark:bg-zinc-950 z-20"
      >
        <div className="flex items-center gap-2.5 min-w-0" data-tauri-drag-region>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
          </div>
          <div className="flex items-center gap-2 min-w-0" data-tauri-drag-region>
            <h3
              className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-sans shrink-0"
              data-tauri-drag-region
            >
              Capture Note
            </h3>
            <span className="hidden sm:inline-block text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded-md shrink-0 border border-zinc-200/50 dark:border-zinc-800/60">
              Ctrl+Shift+N / C
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0" data-tauri-drag-region="false">
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              for (const file of files) handleAddImageFile(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={() => mediaInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 font-medium transition cursor-pointer select-none"
            title="Attach image from device"
          >
            <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline text-xs">Attach Image</span>
          </button>

          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={handlePasteClipboard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 font-medium transition cursor-pointer select-none"
            title="Paste text or screenshot from clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline text-xs">Paste Clipboard</span>
          </button>

          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium transition cursor-pointer select-none"
            title="User Guide & Keyboard Shortcuts (F1)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <span className="hidden md:inline text-xs">Guide</span>
          </button>

          <button
            type="button"
            data-tauri-drag-region="false"
            onClick={handleCancelAndCleanup}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850 transition cursor-pointer ml-1 select-none"
            title="Cancel & close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC NOTICES */}
      {(errorMessage || statusNotice) && (
        <div className="shrink-0 px-4 pt-2.5 sm:px-5">
          {errorMessage ? (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 font-medium">
              <span className="truncate">{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-600 ml-2 font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
          ) : statusNotice ? (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-700 dark:text-zinc-300 font-medium animate-in fade-in">
              <div className="flex items-center gap-1.5 min-w-0">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{statusNotice}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 3. UNIFIED WRITING CANVAS */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Document Title: Borderless, frameless, modern typography */}
        <div className="px-4 pt-3 sm:px-6 sm:pt-4 shrink-0">
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Note title (auto-generated if left blank)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-lg sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-colors select-text cursor-text"
          />
        </div>

        {/* Minimal Tool Ribbon: Dividers, clean group rhythms, no heavy outer box */}
        <div className="mx-4 mt-2 mb-1 sm:mx-6 px-2 py-1.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-850/80 flex items-center justify-between gap-2 shrink-0 flex-wrap backdrop-blur-xs shadow-2xs">
          {/* Left: Multi-page controls */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              disabled={currentPageIndex === 0}
              onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
              className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer disabled:opacity-25 disabled:pointer-events-none select-none"
              title="Previous page (Alt+Left)"
            >
              <ChevronLeft size={13} />
            </button>

            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-[11px] font-mono font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-750 shadow-2xs select-none">
              {currentPageIndex + 1} / {pages.length}
            </span>

            <button
              type="button"
              disabled={currentPageIndex === pages.length - 1}
              onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
              className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer disabled:opacity-25 disabled:pointer-events-none select-none"
              title="Next page (Alt+Right)"
            >
              <ChevronRight size={13} />
            </button>

            <button
              type="button"
              onClick={handleAddPage}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium border border-zinc-200/50 dark:border-zinc-750 transition cursor-pointer shadow-2xs select-none"
              title="Add new blank page"
            >
              <Plus size={11} />
              <span>Page</span>
            </button>

            {pages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => handleRemovePage(currentPageIndex)}
                  className="w-6 h-6 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer select-none"
                  title="Delete current page"
                >
                  <Trash2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleMergePages}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium transition cursor-pointer select-none"
                  title="Merge all pages into single note"
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
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium border border-zinc-200/50 dark:border-zinc-750 transition cursor-pointer shadow-2xs select-none"
                title="Split long text into readable pages"
              >
                <FileText size={11} />
                <span>Split</span>
              </button>
            )}
          </div>

          {/* Right: Rich Formatting Tools & Stats */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5 select-none">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('heading');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                title="Heading (Cycle H1/H2/H3)"
              >
                <Heading size={12} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('bold');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer font-bold"
                title="Bold (Ctrl+B)"
              >
                <Bold size={12} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('italic');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer italic"
                title="Italic (Ctrl+I)"
              >
                <Italic size={12} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('strike');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                title="Strikethrough"
              >
                <Strikethrough size={12} />
              </button>

              <span className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-750 mx-0.5" />

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('task');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                title="Checklist task (- [ ])"
              >
                <CheckSquare size={12} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('bullet');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                title="Bullet list (- )"
              >
                <List size={12} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('number');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                title="Numbered list (1. )"
              >
                <ListOrdered size={12} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('quote');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                title="Blockquote (> )"
              >
                <Quote size={12} />
              </button>

              <span className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-750 mx-0.5" />

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('code');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer font-mono"
                title="Inline code or code block (`)"
              >
                <Code size={12} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('link');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                title="Insert link (Ctrl+K)"
              >
                <Link2 size={12} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat('hr');
                }}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                title="Horizontal divider (---)"
              >
                <Minus size={12} />
              </button>

              <span className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-750 mx-0.5" />

              <button
                type="button"
                onClick={handleCopyPage}
                className="w-6 h-6 rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                title="Copy page text to clipboard"
              >
                <Copy size={12} />
              </button>

              <button
                type="button"
                onClick={handleClearPage}
                className="w-6 h-6 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                title="Clear current page text"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Live Count Pill */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-750 shadow-2xs select-none">
              <span>{pageWordCount}w</span>
              <span>•</span>
              <span>{currentContent.length}c</span>
              <span>•</span>
              <span className="text-zinc-400 dark:text-zinc-500">~{readingTime}m read</span>
            </div>
          </div>
        </div>

        {/* Seamless Editor Area: Fills naturally without harsh nested outer box */}
        <div
          onClick={() => textareaRef.current?.focus()}
          className="flex-1 min-h-[260px] flex flex-col relative overflow-hidden px-4 sm:px-6 cursor-text"
        >
          <textarea
            ref={textareaRef}
            placeholder={`Start typing page ${currentPageIndex + 1}, paste articles, or paste screenshots (Ctrl+V)...`}
            value={currentContent}
            onChange={(e) => handleCurrentContentChange(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            className="w-full flex-1 py-3 bg-transparent border-none outline-none resize-none text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-sans leading-relaxed selection:bg-zinc-200 dark:selection:bg-zinc-800 select-text cursor-text"
          />

          {/* Attached Images Filmstrip Gallery */}
          {attachedImages.length > 0 && (
            <div className="flex flex-col gap-1.5 shrink-0 pt-2 pb-3 border-t border-zinc-100 dark:border-zinc-850">
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Attached Media ({attachedImages.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {attachedImages.map((img) => (
                  <div
                    key={img.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 transition shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                        <img
                          src={img.previewUrl}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                        />
                        {img.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
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
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded cursor-pointer shrink-0"
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
      </div>

      {/* 4. PINNED BOTTOM ACTION FOOTER */}
      <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between text-xs backdrop-blur-xs">
        <div className="flex items-center gap-2.5 text-zinc-400 dark:text-zinc-500 text-[11px] font-mono select-none">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs">
              Esc
            </kbd>
            <span className="text-zinc-500 dark:text-zinc-400">Cancel</span>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs">
              Ctrl+↵
            </kbd>
            <span className="text-zinc-500 dark:text-zinc-400">Save</span>
          </span>
          {pages.length > 1 && (
            <>
              <span>•</span>
              <span className="hidden sm:inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs">
                  Alt+←/→
                </kbd>
                <span className="text-zinc-500 dark:text-zinc-400">Flip</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCancelAndCleanup}
            className="h-9 min-w-[115px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs shadow-2xs transition-all duration-150 active:scale-[0.98] cursor-pointer select-none flex items-center justify-center"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-9 min-w-[115px] px-4 rounded-xl border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 hover:bg-black dark:hover:bg-white hover:border-black dark:hover:border-white text-white dark:text-zinc-950 font-sans text-xs font-bold shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
          >
            <span>{isSubmitting ? 'SAVING...' : 'SAVE NOTE'}</span>
            <CornerDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 5. INTERACTIVE IN-APP USER GUIDE & SHORTCUTS MODAL */}
      {isGuideOpen && (
        <div
          onClick={() => setIsGuideOpen(false)}
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150"
          >
            {/* Guide Header */}
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Quick Capture Guide & Documentation
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    How to use all features, formatting tools, and lifecycles with zero friction
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Guide Content Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed">
              {/* Feature Card 1: Global Capture */}
              <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Global Desktop Capture</span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    Ctrl + Shift + N / C
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Press the global hotkey anytime while working in Windows to summon this scratchpad over any application without opening or switching to the main GPN window.
                </p>
              </div>

              {/* Feature Card 2: Keyboard Formatting Shortcuts */}
              <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                  <Keyboard className="w-3.5 h-3.5 text-violet-500" />
                  <span>Rich Formatting & Keyboard Shortcuts</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">BOLD</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Ctrl + B</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">ITALIC</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Ctrl + I</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">LINK</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Ctrl + K</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">INLINE CODE</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Ctrl + `</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">INDENT</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Tab</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                    <span className="text-zinc-400 block text-[10px]">SAVE NOTE</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Ctrl + Enter</span>
                  </div>
                </div>
              </div>

              {/* Feature Card 3: Smart Markdown Lists */}
              <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Smart Markdown List Engine</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li><strong className="text-zinc-800 dark:text-zinc-200">Checklist:</strong> Type <code className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[11px]">- [ ] </code>. Pressing Enter continues the checklist. Pressing Enter on an empty box exits.</li>
                  <li><strong className="text-zinc-800 dark:text-zinc-200">Bullet Lists:</strong> Type <code className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[11px]">- </code> or click the toolbar icon. Pressing Enter continues items.</li>
                  <li><strong className="text-zinc-800 dark:text-zinc-200">Numbered Lists:</strong> Type <code className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[11px]">1. </code> to auto-increment.</li>
                  <li><strong className="text-zinc-800 dark:text-zinc-200">Headings & Quotes:</strong> Type <code className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[11px]"># </code> for titles, or <code className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-[11px]">&gt; </code> for callouts.</li>
                </ul>
              </div>

              {/* Feature Card 4: Multi-Page & Media */}
              <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <span>Multi-Page Scratchpad & Instant Screenshots</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  • <strong>Screenshots:</strong> Take a screenshot with Snipping Tool (<kbd className="font-mono px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">Win+Shift+S</kbd>) and press <kbd className="font-mono px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">Ctrl+V</kbd> to attach directly without saving files.<br/>
                  • <strong>Multi-Page:</strong> Use <kbd className="font-mono px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">+ Page</kbd> to structure notes into chapters. Flip between pages with <kbd className="font-mono px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">Alt+←/→</kbd>.<br/>
                  • <strong>Split & Merge:</strong> Long articles automatically offer <em>Split into Pages</em>. Click <em>Merge</em> to join them into a single continuous note.
                </p>
              </div>

              {/* Feature Card 5: Safe Lifecycle */}
              <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Clean Lifecycles & Zero Residual Drafts</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Clicking <strong>Cancel</strong> or pressing <kbd className="font-mono px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">Esc</kbd> discards 100% of memory and purges uncommitted uploads from cloud storage. When reopened, the canvas is always completely fresh and clean.
                </p>
              </div>
            </div>

            {/* Guide Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400">Tip: Press F1 anytime to toggle this guide</span>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-black dark:hover:bg-white text-white dark:text-zinc-950 font-bold text-xs transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Standalone window layout
  if (isStandalone) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full h-full bg-white dark:bg-zinc-950 rounded-2xl flex flex-col text-zinc-900 dark:text-zinc-100 overflow-hidden transition-all border border-zinc-200/90 dark:border-zinc-800/90 shadow-none ${
          isDraggingOver
            ? 'ring-2 ring-black dark:ring-white border-transparent'
            : ''
        }`}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-zinc-950/95 z-50 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-900 dark:border-zinc-100 animate-in fade-in duration-100 pointer-events-none">
            <UploadCloud className="w-10 h-10 text-zinc-900 dark:text-zinc-100" />
            <p className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100 uppercase">
              Drop image here to attach
            </p>
          </div>
        )}
        {workstationContent}
      </div>
    );
  }

  // Standard in-app modal overlay layout
  return (
    <div
      onClick={handleCancelAndCleanup}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className={`relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-zinc-950 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 transition-all ${
          isDraggingOver
            ? 'ring-2 ring-black dark:ring-white border-transparent'
            : ''
        }`}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 bg-white/95 dark:bg-zinc-950/95 z-50 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-900 dark:border-zinc-100 rounded-2xl animate-in fade-in duration-100 pointer-events-none">
            <UploadCloud className="w-10 h-10 text-zinc-900 dark:text-zinc-100" />
            <p className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100 uppercase">
              Drop image here to attach
            </p>
          </div>
        )}
        {workstationContent}
      </div>
    </div>
  );
};

export default QuickCaptureModal;
