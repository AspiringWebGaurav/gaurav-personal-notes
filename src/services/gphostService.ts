const GPHOST_KEY_STORAGE = 'gpn_gphost_api_key';
export const DEFAULT_GPHOST_API_KEY =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_GPHOST_API_KEY || process.env.GPHOST_API_KEY)) ||
  '';

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
   * Retrieves the current GPHost API key from storage or returns default from environment
   */
  getApiKey(): string {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(GPHOST_KEY_STORAGE);
        if (saved && saved.trim()) return saved.trim();
      } catch {}
    }
    return DEFAULT_GPHOST_API_KEY;
  }

  /**
   * Saves custom GPHost API key
   */
  setApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GPHOST_KEY_STORAGE, key.trim());
    } catch (err) {
      console.warn('Failed to save GPHost API key to localStorage:', err);
    }
  }

  /**
   * Uploads media file to GPHost.
   * Optimised for Free Vercel Hobby Quota:
   * 1. Attempts direct client-to-CDN upload (0 bytes Vercel bandwidth, 0 serverless ms, bypasses Vercel 4.5MB limit).
   * 2. Falls back to centralized `/api/gphost/upload` proxy if direct browser fetch is blocked.
   */
  async uploadMedia(file: File | Blob, customFilename?: string): Promise<GpHostUploadResult> {
    const apiKey = this.getApiKey();
    const mimeType = file.type || 'application/octet-stream';
    const filename =
      customFilename ||
      (file instanceof File && file.name) ||
      `media_${Date.now()}.${this.getExtensionFromMime(mimeType)}`;

    // 1. Direct CDN upload (Preserves 100% of free Vercel hobby quota)
    try {
      const formData = new FormData();
      formData.append('file', file, filename);

      const directResponse = await fetch('https://gphost.eu.cc/api/v1/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (directResponse.ok) {
        const data = await directResponse.json();
        const rawUrl = data.rawUrl || data.downloadUrl?.replace('/f/', '/raw/') || '';

        return {
          success: true,
          fileId: data.fileId,
          filename: data.filename || filename,
          rawUrl,
          downloadUrl: data.downloadUrl || rawUrl,
          mimeType: data.mimeType || mimeType,
          byteSize: data.byteSize || file.size,
        };
      }
    } catch (directErr) {
      console.warn('Direct GPHost CDN upload failed or blocked, attempting centralized fallback:', directErr);
    }

    // 2. Centralized Next.js backend fallback (/api/gphost/upload)
    const fallbackFormData = new FormData();
    fallbackFormData.append('file', file, filename);

    const fallbackResponse = await fetch('/api/gphost/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: fallbackFormData,
    });

    if (!fallbackResponse.ok) {
      const errText = await fallbackResponse.text();
      throw new Error(`Media upload failed (${fallbackResponse.status}): ${errText}`);
    }

    const fallbackData = await fallbackResponse.json();
    return {
      success: true,
      fileId: fallbackData.fileId,
      filename: fallbackData.filename || filename,
      rawUrl: fallbackData.rawUrl,
      downloadUrl: fallbackData.downloadUrl || fallbackData.rawUrl,
      mimeType: fallbackData.mimeType || mimeType,
      byteSize: fallbackData.byteSize,
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

    // 1. Direct client-to-GPHost attempt (uses browser credentials/cookies if signed in)
    try {
      if (typeof window !== 'undefined' && cleanId) {
        await fetch(`https://gphost.eu.cc/api/v1/files/${cleanId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'x-api-key': apiKey,
          },
          credentials: 'include',
        });
      }
    } catch (err) {
      // Direct call may be blocked by CORS or require server proxy, proceed to fallback
    }

    // 2. Centralized Next.js API delete proxy (/api/gphost/delete)
    try {
      const res = await fetch('/api/gphost/delete', {
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
      const res = await fetch('/api/gphost/delete', {
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
