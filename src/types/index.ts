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
  data: any;
  timestamp: number;
}

export interface OfflineQueueItem {
  collection: string;
  id: string;
  data: any;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
}

export interface Todo {
  id: string;
  title: string;
  notes?: string;
  dueAt?: Timestamp;
  isCompleted: boolean;
  /** optional enterprise fields */
  isStarred?: boolean;
  priority?: 0|1|2|3|4;
  tags?: string[];
  startAt?: Timestamp | null;
  durationMin?: number | null;
  recurrence?: string | null;
  reminders?: Timestamp[];
  subtasks?: { id: string; title: string; done: boolean }[];
  attachments?: { name: string; url: string }[];
  orderIndex?: number | null;
  estimateMin?: number | null;
  focusCount?: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Currency {
  code: 'USD' | 'EUR' | 'GBP' | 'INR';
  symbol: string;
  name: string;
}