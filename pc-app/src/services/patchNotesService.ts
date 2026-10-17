import { BINARY_PATCH_NOTES, DynamicPatchNotes, parseNotesToHighlights } from '../data/patchNotes';
import { cleanVersion, formatVersion } from '../utils/version';
import { compareSemver, APP_VERSION } from './updateService';

const STORAGE_KEY = 'gpn_patch_notes_history';
const LAST_SYNC_KEY = 'gpn_patch_notes_last_sync';

export interface PatchNotesSyncResult {
  notes: DynamicPatchNotes[];
  fromCloud: boolean;
  lastSyncedAt: number;
  error?: string;
}

export type PatchNotesListener = (notes: DynamicPatchNotes[]) => void;

class PatchNotesService {
  private inMemoryNotes: DynamicPatchNotes[] = [];
  private lastSyncedAt: number = 0;
  private isFetching = false;
  private listeners = new Set<PatchNotesListener>();

  constructor() {
    this.loadInitial();
  }

  private loadInitial() {
    // 1. Start with compiled in-binary notes
    const map = new Map<string, DynamicPatchNotes>();
    for (const [v, item] of Object.entries(BINARY_PATCH_NOTES)) {
      const cv = cleanVersion(v);
      map.set(cv, { ...item, version: cv });
    }

    // 2. Merge local storage cached notes if any
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        // If cached history contains unreleased versions while on 0.0.0, purge it
        if (APP_VERSION === '0.0.0' && cached.includes('"0.0.1"')) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LAST_SYNC_KEY);
        } else {
          const parsed: DynamicPatchNotes[] = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const cv = cleanVersion(item.version);
              if (map.has(cv) || compareSemver(cv, APP_VERSION) <= 0) {
                map.set(cv, { ...item, version: cv });
              }
            }
          }
        }
      }
      const syncTs = localStorage.getItem(LAST_SYNC_KEY);
      if (syncTs) {
        this.lastSyncedAt = parseInt(syncTs, 10) || 0;
      }
    } catch {}

    this.inMemoryNotes = this.sortNotes(Array.from(map.values()));
  }

  private sortNotes(notes: DynamicPatchNotes[]): DynamicPatchNotes[] {
    // Sort in descending order: latest active release first (e.g. 0.0.8 -> 0.0.7 -> ... -> 0.0.0)
    return [...notes].sort((a, b) => compareSemver(b.version, a.version));
  }

  public getLocalPatchNotes(): DynamicPatchNotes[] {
    return this.inMemoryNotes;
  }

  public getLastSyncedAt(): number {
    return this.lastSyncedAt;
  }

  public getIsFetching(): boolean {
    return this.isFetching;
  }

  public subscribe(listener: PatchNotesListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.inMemoryNotes);
    } catch {}
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.inMemoryNotes);
      } catch (err) {
        console.error('[PatchNotesService] Listener error:', err);
      }
    }
  }

  /**
   * On-demand cloud fetch (zero polling).
   * Queries Firestore public documents and GPHost release manifests,
   * merges with local history, and persists to local storage cache.
   */
  public async fetchCloudPatchNotes(): Promise<PatchNotesSyncResult> {
    if (this.isFetching) {
      return {
        notes: this.inMemoryNotes,
        fromCloud: false,
        lastSyncedAt: this.lastSyncedAt,
      };
    }

    this.isFetching = true;
    let fetchedFromCloud = false;
    let fetchError: string | undefined = undefined;

    const map = new Map<string, DynamicPatchNotes>();
    for (const item of this.inMemoryNotes) {
      map.set(cleanVersion(item.version), item);
    }

    // Source A: Firestore Public REST API
    try {
      const firestoreUrl =
        'https://firestore.googleapis.com/v1/projects/gaurav-personal-notes/databases/(default)/documents/patch_notes';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(firestoreUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const documents: any[] = data.documents || [];
        for (const doc of documents) {
          const fields = doc.fields || {};
          const docId = doc.name ? doc.name.split('/').pop() : '';
          const rawVersion = fields.version?.stringValue || docId;
          const version = cleanVersion(rawVersion);
          const title = fields.title?.stringValue || `Release ${formatVersion(version)}`;
          const releaseDate = fields.releaseDate?.stringValue || fields.date?.stringValue || 'Recent';
          const rawNotes = fields.notes?.stringValue || fields.rawNotes?.stringValue || '';
          
          let highlights: string[] = [];
          if (fields.highlights?.arrayValue?.values) {
            highlights = fields.highlights.arrayValue.values
              .map((v: any) => v.stringValue)
              .filter(Boolean);
          } else if (rawNotes) {
            highlights = parseNotesToHighlights(rawNotes);
          }

          if (version) {
            map.set(version, {
              version,
              title,
              releaseDate,
              highlights: highlights.length > 0 ? highlights : parseNotesToHighlights(title),
              rawNotes,
            });
            fetchedFromCloud = true;
          }
        }
      }
    } catch (fsErr) {
      console.warn('[PatchNotesService] Firestore fetch notice:', fsErr);
    }

    // Source B: GPHost Manifest Endpoint (Always serves active latest release notes)
    try {
      const manifestUrl = `https://gphost.eu.cc/api/v1/releases/gpn/latest?target=windows-x86_64&arch=x86_64&_t=${Date.now()}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(manifestUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const manifest = await res.json();
        if (manifest && manifest.version) {
          const v = cleanVersion(manifest.version);
          const rawNotes = manifest.notes || '';
          const highlights = parseNotesToHighlights(rawNotes);
          const dateStr = manifest.pub_date
            ? new Date(manifest.pub_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent';

          const existing = map.get(v);
          map.set(v, {
            version: v,
            title: existing?.title || `Release ${formatVersion(v)}`,
            releaseDate: existing?.releaseDate || dateStr,
            highlights: highlights.length > 0 ? highlights : (existing?.highlights || ['General performance enhancements and bug fixes.']),
            rawNotes,
          });
          fetchedFromCloud = true;
        }
      }
    } catch (gphErr) {
      console.warn('[PatchNotesService] GPHost manifest notice:', gphErr);
      if (!fetchedFromCloud) {
        fetchError = 'Could not sync latest notes from cloud. Showing cached history.';
      }
    }

    this.inMemoryNotes = this.sortNotes(Array.from(map.values()));
    this.isFetching = false;

    if (fetchedFromCloud) {
      this.lastSyncedAt = Date.now();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryNotes));
        localStorage.setItem(LAST_SYNC_KEY, String(this.lastSyncedAt));
      } catch {}
    }

    this.notify();

    return {
      notes: this.inMemoryNotes,
      fromCloud: fetchedFromCloud,
      lastSyncedAt: this.lastSyncedAt,
      error: fetchError,
    };
  }
}

export const patchNotesService = new PatchNotesService();
