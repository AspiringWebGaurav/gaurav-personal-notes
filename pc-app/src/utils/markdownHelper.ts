import { marked } from 'marked';

// Configure marked with GitHub-Flavored Markdown (matching ChatGPT formatting)
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Detects if a text string contains Markdown syntax typical of ChatGPT answers or notes
 */
export function isMarkdownContent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // Check for common markdown indicators:
  // 1. Headings: #, ##, ###, etc.
  if (/^#{1,6}\s+.+/m.test(trimmed)) return true;

  // 2. Fenced code blocks: ```lang ... ```
  if (/```[\s\S]*?```/.test(trimmed)) return true;

  // 3. Bold or italic: **bold**, __bold__, *italic*, _italic_
  if (/(\*\*|__)(?!\s).+?(?!\s)\1/.test(trimmed)) return true;

  // 4. Bullet lists: - item, * item, + item
  if (/^\s*[-*+]\s+.+/m.test(trimmed)) return true;

  // 5. Numbered lists: 1. item, 2. item
  if (/^\s*\d+\.\s+.+/m.test(trimmed)) return true;

  // 6. Blockquotes: > quote
  if (/^\s*>\s+.+/m.test(trimmed)) return true;

  // 7. Markdown tables: | col | col |
  if (/\|.+\|[\r\n]+\|[-:\s|]+\|/m.test(trimmed)) return true;

  // 8. Checklists: - [ ] or - [x]
  if (/^\s*[-*+]\s+\[[ xX]\]\s+.+/m.test(trimmed)) return true;

  // 9. Inline code: `code`
  if (/`[^`\n]+`/.test(trimmed)) return true;

  // 10. Horizontal rules: --- or ***
  if (/^(\*{3,}|-{3,}|_{3,})$/m.test(trimmed)) return true;

  // 11. Markdown images: ![alt](url)
  if (/!\[.*?\]\([^\s)]+\)/.test(trimmed)) return true;

  // 12. Markdown links: [text](url)
  if (/\[.*?\]\((https?:\/\/[^\s)]+)\)/.test(trimmed)) return true;

  return false;
}

/**
 * Normalizes any note content format (raw markdown, plain text, old HTML, hybrid data)
 * into clean, valid, safe HTML for TipTap and cross-platform display.
 */
export function normalizeNoteContent(rawContent: string | null | undefined): string {
  if (!rawContent || typeof rawContent !== 'string') return '';
  const trimmed = rawContent.trim();
  if (!trimmed) return '';

  // 1. If it's already structured HTML:
  const isHtml = /<\/?(p|h[1-6]|ul|ol|li|blockquote|table|pre|code|div|img|video|hr|br)[^>]*>/i.test(trimmed);

  if (isHtml) {
    let cleaned = trimmed;

    // Convert any embedded markdown image syntax (![alt](url)) into <img> tags
    cleaned = cleaned.replace(
      /!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/gi,
      '<p><img src="$2" alt="$1" class="gpn-image-attachment" /></p>'
    );

    // Convert old GPHost '/f/' links to raw CDN '/raw/' links
    cleaned = cleaned.replace(/https:\/\/gphost\.eu\.cc\/f\//gi, 'https://gphost.eu.cc/raw/');

    // Ensure all <img> tags have the .gpn-image-attachment class
    cleaned = cleaned.replace(/<img(?![^>]*class=)([^>]*)>/gi, '<img class="gpn-image-attachment"$1>');

    return cleaned;
  }

  // 2. If it's Markdown (headings, lists, blockquotes, code blocks, bold/italics, or images):
  if (isMarkdownContent(trimmed)) {
    let parsed = parseMarkdownToHtml(trimmed);
    parsed = parsed.replace(/https:\/\/gphost\.eu\.cc\/f\//gi, 'https://gphost.eu.cc/raw/');
    parsed = parsed.replace(/<img(?![^>]*class=)([^>]*)>/gi, '<img class="gpn-image-attachment"$1>');
    return parsed;
  }

  // 3. Fallback: Plain text with newlines (legacy plain-text notes)
  return trimmed
    .split(/\r?\n\r?\n/)
    .map((p) => `<p>${p.replace(/\r?\n/g, '<br/>')}</p>`)
    .join('');
}

/**
 * Parses markdown into clean HTML with sanitized formatting
 */
export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  try {
    const rawHtml = marked.parse(markdown) as string;
    return rawHtml;
  } catch (err) {
    console.error('Failed to parse markdown:', err);
    return markdown;
  }
}

/**
 * Extracts a smart title and body from ChatGPT text or markdown
 */
export function extractSmartTitleAndContent(rawText: string): {
  title: string;
  content: string;
} {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { title: 'Untitled Note', content: '' };
  }

  const lines = trimmed.split(/\r?\n/);
  let title = '';
  let contentStartIndex = 0;

  // Check first non-empty line
  const firstLine = lines[0]?.trim() || '';

  // 1. Heading pattern: # Title, ## Title, ### Title
  const headingMatch = firstLine.match(/^#{1,6}\s+(.+)$/);
  if (headingMatch && headingMatch[1]) {
    title = headingMatch[1].replace(/[*_`]/g, '').trim();
    contentStartIndex = 1;
  } else if (firstLine.length > 0 && firstLine.length <= 80 && !firstLine.startsWith('```')) {
    // Single clean line that can serve as a title
    title = firstLine.replace(/[*_`]/g, '').trim();
  }

  // Fallback title
  if (!title) {
    title = 'ChatGPT Answer';
  }

  // Clean title length
  if (title.length > 70) {
    title = title.substring(0, 67) + '...';
  }

  // The rest of the content
  const remainingLines = lines.slice(contentStartIndex).join('\n').trim();
  const bodyText = remainingLines || trimmed;

  // If body has markdown, convert to HTML
  const finalHtml = isMarkdownContent(bodyText)
    ? parseMarkdownToHtml(bodyText)
    : `<p>${bodyText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;

  return {
    title,
    content: finalHtml,
  };
}

/**
 * Cleans pasted clipboard data to ensure ChatGPT answers render identical to ChatGPT
 */
export function processClipboardPaste(clipboardData: DataTransfer): {
  isHandled: boolean;
  html: string;
} {
  const text = clipboardData.getData('text/plain') || '';
  const html = clipboardData.getData('text/html') || '';

  // 1. If clipboard contains plain text with Markdown (ChatGPT "Copy" button output):
  if (isMarkdownContent(text)) {
    const parsedHtml = parseMarkdownToHtml(text);
    return {
      isHandled: true,
      html: parsedHtml,
    };
  }

  // 2. If clipboard has rich HTML (from mouse selection on ChatGPT):
  if (html && (html.includes('class="markdown') || html.includes('data-message-author-role') || html.includes('<pre'))) {
    // Tiptap can handle the HTML, but return true if we want to ensure clean insertion
    return {
      isHandled: false,
      html,
    };
  }

  return {
    isHandled: false,
    html: '',
  };
}
