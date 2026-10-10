"use client";

import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

export const GpnImage = Image.extend({
  name: 'image',

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
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'gpn-image-attachment rounded-lg max-w-full max-h-[640px] object-contain my-3 border border-zinc-200 dark:border-zinc-800 shadow-sm block',
        referrerpolicy: 'no-referrer',
        crossorigin: 'anonymous',
        loading: 'eager',
      }),
    ];
  },
});

export default GpnImage;
