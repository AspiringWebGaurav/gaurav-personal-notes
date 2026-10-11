export interface SyncStatusSummary {
  state: 'idle' | 'syncing' | 'synced' | 'pending' | 'offline' | 'error';
  pendingCount: number;
  lastSyncedAt?: number | null;
  lastError?: string | null;
  hasRemoteChanges?: boolean;
}