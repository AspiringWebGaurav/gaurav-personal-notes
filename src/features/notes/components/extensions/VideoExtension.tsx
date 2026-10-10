"use client";

import React, { useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { gphostService } from '@/services/gphostService';

export interface VideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string; title?: string; uploading?: boolean; fileId?: string }) => ReturnType;
    };
  }
}

const VideoNodeView: React.FC<NodeViewProps> = ({ node, deleteNode, getPos, editor, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const src = node.attrs.src;
  const isUploading = Boolean(node.attrs.uploading);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Trigger GPHost deletion immediately so no stale media remains
    const fileId = node.attrs.fileId;
    const mediaSrc = node.attrs.src;
    if (fileId || (mediaSrc && mediaSrc.includes('gphost.eu.cc'))) {
      gphostService.deleteMedia(fileId || mediaSrc, mediaSrc).catch((err) => {
        console.warn('GPHost video deletion error:', err);
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

  return (
    <NodeViewWrapper className="gpn-video-wrapper my-3 relative inline-block max-w-full group select-none">
      <div
        className={`relative rounded-lg overflow-hidden border transition-all ${
          isUploading
            ? 'border-sky-400 ring-2 ring-sky-400/40'
            : selected
            ? 'ring-2 ring-emerald-500 border-emerald-400'
            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <video
          src={src}
          controls={!isUploading}
          playsInline
          preload="metadata"
          className={`max-h-[500px] w-auto max-w-full rounded-lg object-contain block transition-opacity duration-200 ${
            isUploading ? 'opacity-70' : 'opacity-100'
          }`}
        />

        {isUploading && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-3 pointer-events-none z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 text-white text-xs font-mono shadow-xl border border-white/20">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              <span>Uploading video to GPHost...</span>
            </div>
          </div>
        )}

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
              title="Open video in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline font-mono">View</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-600 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
            title="Remove video from note"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono">Remove</span>
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export const Video = Node.create<VideoOptions>({
  name: 'video',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id'),
        renderHTML: (attributes) => {
          if (!attributes.fileId) return {};
          return { 'data-file-id': attributes.fileId };
        },
      },
      title: {
        default: null,
      },
      controls: {
        default: true,
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

  parseHTML() {
    return [
      {
        tag: 'video',
        getAttrs: (node) => {
          if (typeof node === 'string') return {};
          const el = node as HTMLVideoElement;
          return {
            src: el.getAttribute('src'),
            fileId: el.getAttribute('data-file-id'),
            title: el.getAttribute('title'),
            uploading: el.getAttribute('data-uploading') === 'true',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        controls: 'true',
        preload: 'metadata',
        playsinline: 'true',
        class: 'gpn-video-attachment rounded-md max-w-full my-3 border border-zinc-200 dark:border-zinc-800 shadow-xs',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
