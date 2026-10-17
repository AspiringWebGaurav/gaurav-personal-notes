/**
 * Resilient multi-tier clipboard utility for Windows desktop and web environments.
 * Prioritizes native Win32 clipboard API calls via Tauri to bypass WebView2 document
 * focus requirements and permission constraints 100%.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Native Windows Win32 clipboard API via Tauri command
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('cmd_set_clipboard_text', { text });
      return true;
    } catch (e) {
      console.warn('Native Win32 clipboard set fallback:', e);
    }
  }

  // 2. Modern Web Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText fallback:', e);
    }
  }

  // 3. Fallback: document.execCommand('copy') with hidden textarea
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) return true;
    } catch (e) {
      console.warn('execCommand copy fallback failed:', e);
    }
  }

  return false;
}

export async function getClipboardText(): Promise<string> {
  // 1. Native Windows Win32 clipboard extraction via Tauri command
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const nativeText = await invoke<string>('cmd_get_clipboard_text');
      if (nativeText && nativeText.trim()) {
        return nativeText;
      }
    } catch (e) {
      console.warn('Native Win32 clipboard get fallback:', e);
    }
  }

  // 2. Modern Web Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      const webText = await navigator.clipboard.readText();
      if (webText && webText.trim()) {
        return webText;
      }
    } catch (e) {
      console.warn('navigator.clipboard.readText fallback:', e);
    }
  }

  return '';
}
