"use client";

import React, { useState } from 'react';
import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { gphostService } from '@/services/gphostService';

const ImageNodeView: React.FC<NodeViewProps> = ({
  node,
  selected,
  deleteNode,
  getPos,
  editor,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const src = node.attrs.src;
  const alt = node.attrs.alt || '';
  const title = node.attrs.title || alt || 'Attached Image';
  const isUploading = Boolean(node.attrs.uploading);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Trigger GPHost deletion immediately so no stale media remains
    const fileId = node.attrs.fileId;
    const mediaSrc = node.attrs.src;
    if (fileId || (mediaSrc && mediaSrc.includes('gphost.eu.cc'))) {
      gphostService.deleteMedia(fileId || mediaSrc, mediaSrc).catch((err) => {
        console.warn('GPHost image deletion error:', err);
      });
    }

    if (typeof deleteNode === 'function') {
      deleteNode();
    } else if (editor && typeof getPos === 'function') {
      const pos = getPos();
      if (typeof pos === 'number') {
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
      }
    }
  };

  const [imageError, setImageError] = useState(false);

  return (
    <NodeViewWrapper className="gpn-image-wrapper my-3 relative inline-block max-w-full group select-none">
      <div
        className={`relative rounded-lg overflow-hidden border transition-all min-h-[50px] min-w-[120px] bg-zinc-50 dark:bg-zinc-900/60 ${
          isUploading
            ? 'border-sky-400 ring-2 ring-sky-400/40'
            : selected
            ? 'ring-2 ring-emerald-500 border-emerald-400'
            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {imageError ? (
          <div className="p-4 flex flex-col items-center justify-center text-center text-zinc-400 gap-1 text-xs">
            <span className="font-semibold text-rose-500">Failed to display image</span>
            <span className="text-[11px] font-mono truncate max-w-xs">{src}</span>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            title={title}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={() => setImageError(true)}
            className={`max-h-[640px] w-auto max-w-full rounded-lg object-contain block transition-opacity duration-200 min-h-[40px] ${
              isUploading ? 'opacity-75 filter blur-[0.5px]' : 'opacity-100'
            }`}
            loading="eager"
          />
        )}

        {/* Instant Notion-style Uploading Shimmer/Badge */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-3 pointer-events-none z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 text-white text-xs font-mono shadow-xl border border-white/20">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              <span>Uploading to GPHost...</span>
            </div>
          </div>
        )}

        {/* Floating Action Overlay with Remove & View Buttons */}
        <div
          className={`absolute top-2 right-2 flex items-center gap-1.5 transition-all duration-150 p-1 rounded-md bg-zinc-900/90 dark:bg-black/90 backdrop-blur-md shadow-md border border-white/10 z-20 ${
            isHovered || selected || isUploading ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {src && !isUploading && (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/15 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Open full resolution in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline font-mono">View</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-600 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
            title="Remove image from note"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono">Remove</span>
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const GpnImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id'),
        renderHTML: (attributes) => {
          if (!attributes.fileId) return {};
          return { 'data-file-id': attributes.fileId };
        },
      },
      uploading: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-uploading') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.uploading) return {};
          return { 'data-uploading': 'true' };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      {
        ...HTMLAttributes,
        class: 'gpn-image-attachment rounded-lg max-w-full max-h-[640px] object-contain my-3 border border-zinc-200 dark:border-zinc-800 shadow-sm block',
        referrerpolicy: 'no-referrer',
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
