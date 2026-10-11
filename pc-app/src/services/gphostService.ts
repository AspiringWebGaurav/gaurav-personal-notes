import { invoke } from '@tauri-apps/api/core';

const GPHOST_KEY_STORAGE = 'gpn_gphost_api_key';
export const DEFAULT_GPHOST_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GPHOST_API_KEY) ||
  '';

export const DEFAULT_BACKEND_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
  'https://gaurav-personal-notes.vercel.app';

export interface GpHostUploadResult {
  success: boolean;
  fileId?: string;
  filename: string;
  rawUrl: string;
  downloadUrl: string;
  mimeType: string;
  byteSize?: number;
}

export interface GphostMediaItem {
  fileId?: string;
  url: string;
}

export class GpHostService {
  /**
   * Retrieves the current GPHost API key from storage or returns default
   */
  getApiKey(): string {
    try {
      const saved = localStorage.getItem(GPHOST_KEY_STORAGE);
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return DEFAULT_GPHOST_API_KEY;
  }

  /**
   * Saves custom GPHost API key
   */
  setApiKey(key: string): void {
    try {
      localStorage.setItem(GPHOST_KEY_STORAGE, key.trim());
    } catch (err) {
      console.warn('Failed to save GPHost API key to localStorage:', err);
    }
  }

  /**
   * Uploads an image or video file/blob to GPHost and returns hotlink CDN URLs
   */
  async uploadMedia(file: File | Blob, customFilename?: string): Promise<GpHostUploadResult> {
    const apiKey = this.getApiKey();
    const mimeType = file.type || 'application/octet-stream';
    const filename =
      customFilename ||
      (file instanceof File && file.name) ||
      `media_${Date.now()}.${this.getExtensionFromMime(mimeType)}`;

    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    if (isTauri) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const fileBytes = Array.from(new Uint8Array(arrayBuffer));

        const res = await invoke<{
          success: boolean;
          fileId?: string;
          filename?: string;
          byteSize?: number;
          mimeType?: string;
          downloadUrl?: string;
          rawUrl?: string;
          error?: string;
        }>('cmd_upload_to_gphost', {
          apiKey,
          fileBytes,
          filename,
          mimeType,
        });

        if (!res.success && res.error) {
          throw new Error(res.error);
        }

        const rawUrl =
          res.rawUrl ||
          res.downloadUrl?.replace('/f/', '/raw/') ||
          '';

        return {
          success: true,
          fileId: res.fileId,
          filename: res.filename || filename,
          rawUrl,
          downloadUrl: res.downloadUrl || rawUrl,
          mimeType: res.mimeType || mimeType,
          byteSize: res.byteSize,
        };
      } catch (tauriErr) {
        console.warn('Tauri native GPHost upload failed, falling back to fetch:', tauriErr);
      }
    }

    // Direct HTTP fetch
    try {
      const formData = new FormData();
      formData.append('file', file, filename);

      const response = await fetch('https://gphost.eu.cc/api/v1/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const rawUrl = data.rawUrl || data.downloadUrl?.replace('/f/', '/raw/') || '';

        return {
          success: true,
          fileId: data.fileId,
          filename: data.filename || filename,
          rawUrl,
          downloadUrl: data.downloadUrl || rawUrl,
          mimeType: data.mimeType || mimeType,
          byteSize: data.byteSize,
        };
      }
    } catch (directErr) {
      console.warn('Direct GPHost fetch failed, trying centralized backend:', directErr);
    }

    // Centralized backend fallback
    const backendFormData = new FormData();
    backendFormData.append('file', file, filename);

    const backendUrl = `${DEFAULT_BACKEND_URL}/api/gphost/upload`;
    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: backendFormData,
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      throw new Error(`GPHost upload failed (${backendRes.status}): ${errText}`);
    }

    const backendData = await backendRes.json();
    return {
      success: true,
      fileId: backendData.fileId,
      filename: backendData.filename || filename,
      rawUrl: backendData.rawUrl,
      downloadUrl: backendData.downloadUrl || backendData.rawUrl,
      mimeType: backendData.mimeType || mimeType,
      byteSize: backendData.byteSize,
    };
  }

  /**
   * Sends GPHost delete request for a specific file or media URL.
   * Ensures GPHost remains synchronized with user deletions (no stale media).
   */
  async deleteMedia(identifier: string, fallbackUrl?: string): Promise<boolean> {
    if (!identifier && !fallbackUrl) return false;
    const apiKey = this.getApiKey();
    const cleanId = this.cleanIdentifier(identifier || fallbackUrl || '');

    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      try {
        await invoke<boolean>('cmd_delete_from_gphost', {
          apiKey,
          identifier: cleanId,
        });
      } catch (err) {
        console.warn('Native Tauri GPHost delete command failed, falling back:', err);
      }
    }

    // 1. Direct browser attempt to GPHost upstream (uses session cookies if user logged in)
    try {
      if (typeof window !== 'undefined' && cleanId) {
        await fetch(`https://gphost.eu.cc/api/files/${cleanId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'x-api-key': apiKey,
          },
          credentials: 'include',
        });
      }
    } catch {}

    // 2. Centralized fallback proxy
    try {
      const backendUrl = `${DEFAULT_BACKEND_URL}/api/gphost/delete`;
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          fileId: cleanId,
          fileUrl: fallbackUrl || identifier,
        }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Centralized GPHost delete request failed:', err);
      return false;
    }
  }

  /**
   * Deletes multiple media items from GPHost in batch
   */
  async deleteMediaBatch(items: Array<{ fileId?: string; url?: string }>): Promise<boolean> {
    if (!items || items.length === 0) return true;
    const apiKey = this.getApiKey();
    const targets = items
      .map((it) => it.fileId || it.url)
      .filter((v): v is string => Boolean(v));

    if (targets.length === 0) return true;

    try {
      const res = await fetch(`${DEFAULT_BACKEND_URL}/api/gphost/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          fileIds: targets,
          urls: targets,
        }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Batch GPHost delete failed:', err);
      return false;
    }
  }

  /**
   * Extracts all GPHost media references (URLs and fileIds) from HTML or text content
   */
  extractGphostMedia(content: string): GphostMediaItem[] {
    if (!content || typeof content !== 'string') return [];
    const results: GphostMediaItem[] = [];
    const seen = new Set<string>();

    // Match HTML tags with data-file-id and/or src containing gphost
    const tagRegex = /<(?:img|video)[^>]+(?:src=["']([^"']+)["']|data-file-id=["']([^"']+)["'])[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(content)) !== null) {
      const fullTag = match[0];
      const srcMatch = /src=["']([^"']+)["']/i.exec(fullTag);
      const fileIdMatch = /data-file-id=["']([^"']+)["']/i.exec(fullTag);

      const src = srcMatch ? srcMatch[1] : '';
      const fileId = fileIdMatch ? fileIdMatch[1] : undefined;

      if ((src && src.includes('gphost.eu.cc')) || fileId) {
        const key = fileId || src;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ fileId, url: src });
        }
      }
    }

    // Match raw GPHost URLs in text or Markdown
    const urlRegex = /https:\/\/gphost\.eu\.cc\/(?:raw|f)\/([a-zA-Z0-9_\-]+)/gi;
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[0];
      const shortcode = match[1];
      if (!seen.has(url) && !seen.has(shortcode)) {
        seen.add(url);
        results.push({ fileId: shortcode, url });
      }
    }

    return results;
  }

  private cleanIdentifier(val: string): string {
    if (!val) return '';
    const trimmed = val.trim();
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed);
        const parts = url.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || trimmed;
      }
    } catch {}
    return trimmed;
  }

  private getExtensionFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };
    return map[mime] || 'bin';
  }
}

export const gphostService = new GpHostService();
