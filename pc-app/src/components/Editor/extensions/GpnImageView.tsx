import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Loader2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface GpnImageViewProps {
  node: {
    attrs: {
      src?: string | null;
      alt?: string | null;
      title?: string | null;
      fileId?: string | null;
      uploading?: boolean;
    };
  };
  selected?: boolean;
  deleteNode?: () => void;
  updateAttributes?: (attrs: Record<string, any>) => void;
}

export const GpnImageView: React.FC<GpnImageViewProps> = ({
  node,
  selected = false,
  deleteNode,
}) => {
  const { src, alt, title, uploading } = node.attrs;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Normalize GPHost URLs (/f/ -> /raw/)
  let cleanSrc = src || '';
  if (cleanSrc && typeof cleanSrc === 'string' && cleanSrc.includes('gphost.eu.cc/f/')) {
    cleanSrc = cleanSrc.replace('/f/', '/raw/');
  }

  // Reset loading state on src change or manual retry
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    if (!cleanSrc) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // If already loaded and cached by browser, skip spinner
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoading(false);
    }
  }, [cleanSrc, retryKey]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    setHasError(false);
    setRetryKey((k) => k + 1);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteNode) {
      deleteNode();
    }
  };

  const activeSrc =
    retryKey > 0
      ? `${cleanSrc}${cleanSrc.includes('?') ? '&' : '?'}retry=${retryKey}`
      : cleanSrc;

  return (
    <NodeViewWrapper
      className={`gpn-image-nodeview my-3 block select-none group relative transition-all duration-150 ${
        selected ? 'ring-2 ring-blue-500 rounded-lg shadow-sm' : ''
      }`}
      data-drag-handle
    >
      {/* 1. Loading State with Centered Spinner */}
      {(isLoading || uploading) && !hasError && (
        <div className="w-full min-h-[160px] max-h-[320px] rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2.5 p-6 transition-colors">
          <Loader2 className="w-5 h-5 text-zinc-500 dark:text-zinc-400 animate-spin" />
          <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400 dark:text-zinc-500 font-semibold">
            {uploading ? 'Uploading image...' : 'Loading image...'}
          </span>
        </div>
      )}

      {/* 2. Error State with Retry Button */}
      {hasError && !isLoading && (
        <div className="w-full min-h-[140px] rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 flex flex-col items-center justify-center gap-2.5 p-5 text-xs">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load image</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              type="button"
              onClick={handleRetry}
              className="px-2.5 py-1 rounded-[2px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw size={11} />
              <span>Retry</span>
            </button>
            {deleteNode && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-2.5 py-1 rounded-[2px] bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 font-mono text-[11px] cursor-pointer transition flex items-center gap-1 shadow-2xs"
              >
                <Trash2 size={11} />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. The Actual Image Element */}
      {activeSrc && (
        <img
          ref={imgRef}
          src={activeSrc}
          alt={alt || 'Note attachment'}
          title={title || undefined}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`gpn-image-attachment rounded-lg max-w-full max-h-[640px] object-contain my-0 border border-zinc-200 dark:border-zinc-800 shadow-sm block cursor-pointer transition-opacity duration-200 ${
            isLoading || hasError ? 'opacity-0 absolute pointer-events-none w-0 h-0' : 'opacity-100'
          }`}
        />
      )}
    </NodeViewWrapper>
  );
};

export default GpnImageView;
