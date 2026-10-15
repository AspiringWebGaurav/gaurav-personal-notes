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

export interface GpHostFolderItem {
  id: string;
  name: string;
  path: string;
  parent_path?: string | null;
  depth?: number;
  created_at?: string;
  updated_at?: string;
  file_count?: number;
  subfolder_count?: number;
  total_bytes?: number;
  children?: GpHostFolderItem[];
}

export interface GpHostFolderFileItem {
  id: string;
  filename: string;
  sanitized_name?: string;
  mime_type?: string;
  byte_size?: number;
  folder?: string;
  download_url?: string;
  raw_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GpHostBreadcrumb {
  name: string;
  path: string;
}

export interface GpHostListFolderResult {
  success: boolean;
  currentPath: string;
  parentPath: string | null;
  breadcrumbs: GpHostBreadcrumb[];
  subfolders: GpHostFolderItem[];
  files: GpHostFolderFileItem[];
  totalSubfolders: number;
  totalFiles: number;
  totalBytes: number;
  error?: string;
}

export interface GpHostFolderTreeResult {
  success: boolean;
  tree: GpHostFolderItem[];
  error?: string;
}

export interface GpHostFolderMutationResult {
  success: boolean;
  message?: string;
  folder?: GpHostFolderItem;
  error?: string;
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

    const isBrowser = typeof window !== 'undefined';

    // 1. In web browsers, direct cross-origin upload is blocked by browser CORS because GPHost CDN
    // does not provide Access-Control-Allow-Origin headers. Route directly to centralized backend proxy.
    if (!isBrowser) {
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
        console.warn('Direct GPHost CDN upload failed, attempting centralized fallback:', directErr);
      }
    }

    // 2. Centralized Next.js backend (/api/gphost/upload) handles server-to-server upload to GPHost
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

  /**
   * Creates a folder on GPHost at arbitrary depth (auto-creates parent ancestors).
   * E.g. 'GPN/1/2' creates GPN, GPN/1, and GPN/1/2.
   */
  async createFolder(path: string): Promise<GpHostFolderMutationResult> {
    if (!path || !path.trim()) {
      return { success: false, error: 'Folder path cannot be empty' };
    }
    const cleanPath = path.trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    const apiKey = this.getApiKey();

    // 1. Direct call if not in browser or if CORS permits
    if (typeof window === 'undefined') {
      try {
        const res = await fetch('https://gphost.eu.cc/api/v1/folders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': 'GPN-App/1.0',
          },
          body: JSON.stringify({ path: cleanPath }),
        });
        const data = await res.json();
        return data;
      } catch (err) {
        console.warn('Direct GPHost folder creation failed, trying fallback proxy:', err);
      }
    }

    // 2. Centralized Next.js API proxy (/api/gphost/folders)
    try {
      const res = await fetch('/api/gphost/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ path: cleanPath }),
      });
      return await res.json();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Folder creation failed',
      };
    }
  }

  /**
   * Lists the contents of a folder (breadcrumbs, subfolders, files, totals).
   * If path is omitted, lists root folders.
   */
  async listFolder(path?: string): Promise<GpHostListFolderResult> {
    const cleanPath = (path || '').trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    const apiKey = this.getApiKey();

    // 1. Server-side direct call
    if (typeof window === 'undefined') {
      try {
        const url = cleanPath
          ? `https://gphost.eu.cc/api/v1/folders?path=${encodeURIComponent(cleanPath)}`
          : 'https://gphost.eu.cc/api/v1/folders';
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': 'GPN-App/1.0',
          },
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Direct GPHost folder listing failed, trying fallback proxy:', err);
      }
    }

    // 2. Centralized Next.js API proxy
    try {
      const url = cleanPath
        ? `/api/gphost/folders?path=${encodeURIComponent(cleanPath)}`
        : '/api/gphost/folders';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return await res.json();
    } catch (err) {
      return {
        success: false,
        currentPath: cleanPath,
        parentPath: null,
        breadcrumbs: [],
        subfolders: [],
        files: [],
        totalSubfolders: 0,
        totalFiles: 0,
        totalBytes: 0,
        error: err instanceof Error ? err.message : 'Failed to list folder',
      };
    }
  }

  /**
   * Retrieves full folder hierarchy tree for navigation menus and selectors.
   */
  async getFolderTree(): Promise<GpHostFolderTreeResult> {
    const apiKey = this.getApiKey();

    if (typeof window === 'undefined') {
      try {
        const res = await fetch('https://gphost.eu.cc/api/v1/folders?tree=true', {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': 'GPN-App/1.0',
          },
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Direct GPHost folder tree query failed, trying proxy:', err);
      }
    }

    try {
      const res = await fetch('/api/gphost/folders?tree=true', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return await res.json();
    } catch (err) {
      return {
        success: false,
        tree: [],
        error: err instanceof Error ? err.message : 'Failed to fetch folder tree',
      };
    }
  }

  /**
   * Renames a folder on GPHost.
   */
  async renameFolder(path: string, newName: string): Promise<GpHostFolderMutationResult> {
    const cleanPath = (path || '').trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    const cleanName = (newName || '').trim().replace(/[\/\\]/g, '');
    if (!cleanPath || !cleanName) {
      return { success: false, error: 'Valid folder path and new name are required' };
    }

    // Safeguard
    const normalized = cleanPath.toLowerCase();
    if (normalized === 'gpn' || normalized === 'gpn-dynamic-update/base') {
      return {
        success: false,
        error: '403 BASE_INSTALLER_PROTECTED: Protected installer folder cannot be renamed.',
      };
    }

    const apiKey = this.getApiKey();

    if (typeof window === 'undefined') {
      try {
        const res = await fetch('https://gphost.eu.cc/api/v1/folders', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': 'GPN-App/1.0',
          },
          body: JSON.stringify({ path: cleanPath, newName: cleanName }),
        });
        return await res.json();
      } catch (err) {
        console.warn('Direct folder rename failed, trying proxy:', err);
      }
    }

    try {
      const res = await fetch('/api/gphost/folders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ path: cleanPath, newName: cleanName }),
      });
      return await res.json();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Rename failed',
      };
    }
  }

  /**
   * Moves a folder to a new destination parent (or root when destinationParent is null).
   */
  async moveFolder(path: string, destinationParent: string | null): Promise<GpHostFolderMutationResult> {
    const cleanPath = (path || '').trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    const cleanDest = destinationParent ? destinationParent.trim().replace(/^[\/\\]+|[\/\\]+$/g, '') : null;
    if (!cleanPath) {
      return { success: false, error: 'Source folder path is required' };
    }

    // Safeguard
    const normalized = cleanPath.toLowerCase();
    if (normalized === 'gpn' || normalized === 'gpn-dynamic-update/base') {
      return {
        success: false,
        error: '403 BASE_INSTALLER_PROTECTED: Protected installer folder cannot be moved.',
      };
    }

    const apiKey = this.getApiKey();

    if (typeof window === 'undefined') {
      try {
        const res = await fetch('https://gphost.eu.cc/api/v1/folders', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': 'GPN-App/1.0',
          },
          body: JSON.stringify({ path: cleanPath, destinationParent: cleanDest }),
        });
        return await res.json();
      } catch (err) {
        console.warn('Direct folder move failed, trying proxy:', err);
      }
    }

    try {
      const res = await fetch('/api/gphost/folders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ path: cleanPath, destinationParent: cleanDest }),
      });
      return await res.json();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Move failed',
      };
    }
  }

  /**
   * Deletes a folder and all its contents recursively.
   */
  async deleteFolder(path: string, recursive: boolean = true): Promise<boolean> {
    const cleanPath = (path || '').trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    if (!cleanPath) return false;

    // Safeguard
    const normalized = cleanPath.toLowerCase();
    if (normalized === 'gpn' || normalized === 'gpn-dynamic-update/base') {
      throw new Error('403 BASE_INSTALLER_PROTECTED: Protected installer folder cannot be deleted.');
    }

    const apiKey = this.getApiKey();

    if (typeof window === 'undefined') {
      try {
        const res = await fetch(
          `https://gphost.eu.cc/api/v1/folders?path=${encodeURIComponent(cleanPath)}&recursive=${recursive}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'User-Agent': 'GPN-App/1.0',
            },
          }
        );
        return res.ok;
      } catch (err) {
        console.warn('Direct folder delete failed, trying proxy:', err);
      }
    }

    try {
      const res = await fetch(
        `/api/gphost/folders?path=${encodeURIComponent(cleanPath)}&recursive=${recursive}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      return res.ok;
    } catch (err) {
      console.warn('Folder deletion request failed:', err);
      return false;
    }
  }

  /**
   * Uploads any file, blob, or string content directly into a designated folder.
   */
  async uploadFileToFolder(
    file: File | Blob | string,
    folderPath: string,
    customFilename?: string
  ): Promise<GpHostUploadResult> {
    const cleanFolder = (folderPath || '').trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    const apiKey = this.getApiKey();

    let blob: Blob;
    let filename: string;
    let mimeType: string;

    if (typeof file === 'string') {
      blob = new Blob([file], { type: 'text/markdown;charset=utf-8' });
      mimeType = 'text/markdown';
      filename = customFilename || `note_backup_${Date.now()}.md`;
    } else {
      blob = file;
      mimeType = file.type || 'application/octet-stream';
      filename =
        customFilename ||
        (file instanceof File && file.name) ||
        `file_${Date.now()}.${this.getExtensionFromMime(mimeType)}`;
    }

    // Direct upload attempt (server/desktop)
    if (typeof window === 'undefined') {
      try {
        const formData = new FormData();
        formData.append('file', blob, filename);
        if (cleanFolder) formData.append('folder', cleanFolder);

        const res = await fetch('https://gphost.eu.cc/api/v1/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': 'GPN-App/1.0',
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const rawUrl = data.rawUrl || data.downloadUrl?.replace('/f/', '/raw/') || '';
          return {
            success: true,
            fileId: data.fileId,
            filename: data.filename || filename,
            rawUrl,
            downloadUrl: data.downloadUrl || rawUrl,
            mimeType: data.mimeType || mimeType,
            byteSize: data.byteSize || blob.size,
          };
        }
      } catch (directErr) {
        console.warn('Direct upload to folder failed, attempting proxy:', directErr);
      }
    }

    // Centralized Next.js proxy fallback
    const fallbackFormData = new FormData();
    fallbackFormData.append('file', blob, filename);
    if (cleanFolder) fallbackFormData.append('folder', cleanFolder);

    const fallbackResponse = await fetch('/api/gphost/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: fallbackFormData,
    });

    if (!fallbackResponse.ok) {
      const errText = await fallbackResponse.text();
      throw new Error(`File upload to folder failed (${fallbackResponse.status}): ${errText}`);
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
   * Moves an existing file to a different folder.
   */
  async moveFileToFolder(fileId: string, folderPath: string): Promise<boolean> {
    const cleanId = this.cleanIdentifier(fileId);
    const cleanFolder = (folderPath || '').trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    if (!cleanId) return false;

    const apiKey = this.getApiKey();

    if (typeof window === 'undefined') {
      try {
        const res = await fetch(`https://gphost.eu.cc/api/v1/files/${cleanId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': 'GPN-App/1.0',
          },
          body: JSON.stringify({ folder: cleanFolder }),
        });
        return res.ok;
      } catch (err) {
        console.warn('Direct file move failed, trying proxy:', err);
      }
    }

    try {
      const res = await fetch(`/api/gphost/files/${cleanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ folder: cleanFolder }),
      });
      return res.ok;
    } catch (err) {
      console.warn('File move failed:', err);
      return false;
    }
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
