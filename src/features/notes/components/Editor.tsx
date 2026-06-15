"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMemo } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Code 
} from 'lucide-react';

interface EditorProps {
  initialContent?: string;
  onUpdate?: (content: string) => void;
  editable?: boolean;
}

const ToolbarButton = ({ 
  onClick, 
  isActive, 
  title, 
  children 
}: { 
  onClick: () => void, 
  isActive: boolean, 
  title: string, 
  children: React.ReactNode 
}) => (
  <button
    onClick={onClick}
    className={`w-8 h-8 flex items-center justify-center rounded transition ${
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
  const formattedContent = useMemo(() => {
    if (!initialContent) return "";
    
    // Check if the content already contains HTML tags. If not, it's likely a legacy plain text note.
    const hasHTML = /<[a-z][\s\S]*>/i.test(initialContent);
    
    if (!hasHTML && initialContent.includes('\n')) {
      // Convert plain text with newlines to HTML breaks to preserve tight line spacing
      return `<p>${initialContent.replace(/\n/g, '<br>')}</p>`;
    }
    
    return initialContent;
  }, [initialContent]);

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: formattedContent,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base mx-auto focus:outline-none dark:prose-invert max-w-none w-full min-h-full p-4',
      },
    },
  });

  if (!editor) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded h-[500px] w-full" />;
  }

  return (
    <div className="w-full h-full flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950">
      <div className="border-b border-gray-200 dark:border-gray-800 p-2 flex flex-wrap gap-1 bg-gray-50 dark:bg-gray-900 shrink-0">
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
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="w-full h-full" />
      </div>
    </div>
  );
}
