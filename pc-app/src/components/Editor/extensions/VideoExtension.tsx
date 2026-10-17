import { Node, mergeAttributes } from '@tiptap/core';

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
        class: 'gpn-video-attachment rounded-md max-w-full max-h-[480px] my-3 border border-zinc-200 dark:border-zinc-800 shadow-xs block bg-zinc-950 cursor-pointer transition',
      }),
    ];
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

export default Video;
