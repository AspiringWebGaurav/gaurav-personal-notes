// src/types/index.ts
import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  defaultTemplate: string;
  autoSaveInterval: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'list' | 'todo';
  templateId?: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isArchived: boolean;
  isPinned: boolean;
}

export interface MoneyTracker {
  id: string;
  title: string;
  startingAmount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  expenses: Expense[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: Timestamp;
  description?: string;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'note' | 'list' | 'todo' | 'money';
  category: string;
  icon: string;
  tags: string[];
  moneyConfig?: {
    startingAmount: number;
    currency: 'USD' | 'EUR' | 'GBP' | 'INR';
    presetCategories: string[];
    budgetType: string;
    description?: string;
  };
}

export interface AutosaveData {
  id: string;
  collection: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: number;
}

export interface OfflineQueueItem {
  collection: string;
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
}

export interface Todo {
  id: string;
  title: string;
  notes?: string | undefined;
  dueAt?: Timestamp | undefined;
  isCompleted: boolean;
  /** optional enterprise fields */
  isStarred?: boolean | undefined;
  priority?: 0 | 1 | 2 | 3 | 4 | undefined;
  tags?: string[] | undefined;
  startAt?: Timestamp | null | undefined;
  durationMin?: number | null | undefined;
  recurrence?: string | null | undefined;
  reminders?: Timestamp[] | undefined;
  subtasks?: { id: string; title: string; done: boolean }[] | undefined;
  attachments?: { name: string; url: string }[] | undefined;
  orderIndex?: number | null | undefined;
  estimateMin?: number | null | undefined;
  focusCount?: number | null | undefined;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Currency {
  code: 'USD' | 'EUR' | 'GBP' | 'INR';
  symbol: string;
  name: string;
}

// Collaborative Notes Types
export interface Profile {
  uid: string;
  firstName: string;
  avatarUrl?: string;
  inviteCodeId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InviteCode {
  code: string; // 4-6 char base36, used as document ID
  ownerUid: string;
  active: boolean;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface Lobby {
  id: string;
  createdBy: string;
  status: 'waiting' | 'active' | 'closed';
  noteId: string;
  pairKey: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LobbyMember {
  uid: string;
  role: 'host' | 'guest';
  joinedAt: Timestamp;
}

export interface CollabNote {
  id: string;
  title: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CollabNoteMember {
  uid: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: Timestamp;
}

export interface CollabNoteSnapshot {
  id: string;
  contentMarkdown: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentJSON: any;
  createdAt: Timestamp;
  createdBy: string;
}

export interface PresenceData {
  firstName: string;
  color: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursor?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selection?: any;
  lastSeen: Timestamp;
}

// Cloud Functions Response Types
export interface CreateInviteCodeResponse {
  code: string;
}

export interface JoinByCodeResponse {
  lobbyId: string;
  noteId: string;
}