import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { GpnImageView } from './GpnImageView';

export const GpnImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => {
          const src = element.getAttribute('src');
          if (src && src.includes('gphost.eu.cc/f/')) {
            return src.replace('/f/', '/raw/');
          }
          return src;
        },
        renderHTML: (attributes) => {
          let src = attributes.src;
          if (src && typeof src === 'string' && src.includes('gphost.eu.cc/f/')) {
            src = src.replace('/f/', '/raw/');
          }
          return { src };
        },
      },
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

  addNodeView() {
    return ReactNodeViewRenderer(GpnImageView);
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes };
    if (attrs.src && typeof attrs.src === 'string' && attrs.src.includes('gphost.eu.cc/f/')) {
      attrs.src = attrs.src.replace('/f/', '/raw/');
    }
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, attrs, {
        class: 'gpn-image-attachment rounded-lg max-w-full max-h-[640px] object-contain my-3 border border-zinc-200 dark:border-zinc-800 shadow-sm block cursor-pointer transition',
        loading: 'eager',
        referrerpolicy: 'no-referrer',
      }),
    ];
  },
});

export default GpnImage;