/**
 * Cross-platform external URL opener for Gaurav Personal Notes.
 * Uses @tauri-apps/plugin-opener when running natively in Tauri desktop,
 * and falls back safely to window.open in web browsers.
 */
export const openExternalUrl = async (url: string): Promise<void> => {
  try {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    }
  } catch (err) {
    console.warn('Failed to open URL via Tauri plugin-opener:', err);
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};
