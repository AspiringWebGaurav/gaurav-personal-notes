// src/lib/todoUtils.ts
import { Timestamp } from 'firebase/firestore';
import { Todo } from '@/types';

/**
 * Check if a todo is overdue
 */
export function isOverdue(todo: Todo): boolean {
  if (todo.isCompleted || !todo.dueAt) return false;
  return Date.now() > todo.dueAt.toMillis();
}

/**
 * Get overdue todos from a list
 */
export function getOverdueTodos(todos: Todo[]): Todo[] {
  return todos.filter(isOverdue);
}

/**
 * Format relative time (e.g., "in 2h", "5m late")
 */
export function formatRelativeTime(timestamp: Timestamp): string {
  const now = Date.now();
  const targetTime = timestamp.toMillis();
  const diffMs = targetTime - now;
  const absDiffMs = Math.abs(diffMs);
  
  const minutes = Math.floor(absDiffMs / (1000 * 60));
  const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  
  const isLate = diffMs < 0;
  const prefix = isLate ? '' : 'in ';
  const suffix = isLate ? ' late' : '';
  
  if (absDiffMs < 60 * 1000) {
    return isLate ? 'just overdue' : 'due now';
  } else if (minutes < 60) {
    return `${prefix}${minutes}m${suffix}`;
  } else if (hours < 24) {
    return `${prefix}${hours}h${suffix}`;
  } else {
    return `${prefix}${days}d${suffix}`;
  }
}

/**
 * Format absolute time for tooltips
 */
export function formatAbsoluteTime(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleString();
}

/**
 * Create a new timestamp for snoozing (add 30 minutes)
 */
export function createSnoozeTimestamp(currentDueAt?: Timestamp): Timestamp {
  const baseTime = currentDueAt ? currentDueAt.toMillis() : Date.now();
  const snoozeTime = baseTime + (30 * 60 * 1000); // 30 minutes
  return Timestamp.fromMillis(snoozeTime);
}

/**
 * Validate todo title
 */
export function validateTodoTitle(title: string): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Title is required' };
  }
  if (title.length > 120) {
    return { isValid: false, error: 'Title must be 120 characters or less' };
  }
  return { isValid: true };
}

/**
 * Validate due date
 */
export function validateDueDate(date: Date | null): { isValid: boolean; error?: string } {
  if (!date) return { isValid: true }; // Optional field
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date' };
  }
  
  return { isValid: true };
}

/**
 * Filter todos by status
 */
export function filterTodos(todos: Todo[], filter: 'all' | 'active' | 'completed' | 'overdue'): Todo[] {
  switch (filter) {
    case 'active':
      return todos.filter(todo => !todo.isCompleted);
    case 'completed':
      return todos.filter(todo => todo.isCompleted);
    case 'overdue':
      return todos.filter(isOverdue);
    case 'all':
    default:
      return todos;
  }
}

/**
 * Sort todos by priority (overdue first, then by due date, then by creation date)
 */
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    // Completed todos go to bottom
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    
    // Among incomplete todos, overdue first
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // If both have due dates, sort by due date
    if (a.dueAt && b.dueAt) {
      return a.dueAt.toMillis() - b.dueAt.toMillis();
    }
    
    // Todos with due dates come before those without
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;
    
    // Finally, sort by creation date (newest first)
    return b.createdAt.toMillis() - a.createdAt.toMillis();
  });
}