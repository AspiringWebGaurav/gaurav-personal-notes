export interface LocalNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  wordCount: number;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  remoteUpdatedAt: number;
  syncVersion: number;
  syncState: 'synced' | 'pending' | 'syncing' | 'conflict' | 'local_only';
  isDeleted: boolean;
  deletedAt: number | null;
}

export interface CreateNoteInput {
  id?: string;
  userId?: string;
  title?: string;
  content?: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  wordCount?: number;
  isArchived?: boolean;
}
