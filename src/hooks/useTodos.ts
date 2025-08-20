// src/hooks/useTodos.ts
import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type WithFieldValue,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Todo } from '@/types';

/**
 * Hook for Todo operations using Firestore realtime listeners
 */
export function useTodos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setTodos([]);
      return;
    }

    const todosQuery = query(
      collection(db, 'users', user.uid, 'todos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      todosQuery,
      (snapshot) => {
        const todosData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Todo[];
        setTodos(todosData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching todos:', err);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  // Create a new todo
  const createTodo = useCallback(async (todoData: {
    title: string;
    notes?: string;
    dueAt?: Date;
  }) => {
    if (!user) throw new Error('User not authenticated');

    const todoId = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTodo: WithFieldValue<Todo> = {
      id: todoId,
      title: todoData.title.trim(),
      isCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (todoData.notes?.trim()) {
      newTodo.notes = todoData.notes.trim();
    }

    if (todoData.dueAt) {
      newTodo.dueAt = Timestamp.fromDate(todoData.dueAt);
    }

    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'users', user.uid, 'todos', todoId), newTodo);
    return todoId;
  }, [user]);

  // Update a todo
  const updateTodo = useCallback(async (todoId: string, updates: Partial<Todo>) => {
    if (!user) throw new Error('User not authenticated');

    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    } as Partial<Todo>;

    const cleanUpdates: Record<string, unknown> = { ...updateData };
    delete cleanUpdates.id;
    delete cleanUpdates.createdAt;
    const filteredUpdates = Object.fromEntries(
      Object.entries(cleanUpdates).filter(([, value]) => value !== undefined)
    );

    await updateDoc(
      doc(db, 'users', user.uid, 'todos', todoId),
      filteredUpdates
    );
  }, [user]);

  // Delete a todo
  const deleteTodo = useCallback(async (todoId: string) => {
    if (!user) throw new Error('User not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'todos', todoId));
  }, [user]);

  // Toggle todo completion
  const toggleTodo = useCallback(async (todoId: string, isCompleted: boolean) => {
    await updateTodo(todoId, { isCompleted });
  }, [updateTodo]);

  // Snooze a todo (add 30 minutes to due date)
  const snoozeTodo = useCallback(async (todoId: string, currentDueAt?: Timestamp) => {
    const baseTime = currentDueAt ? currentDueAt.toMillis() : Date.now();
    const snoozeTime = baseTime + 30 * 60 * 1000; // 30 minutes
    const newDueAt = Timestamp.fromMillis(snoozeTime);

    await updateTodo(todoId, { dueAt: newDueAt });
  }, [updateTodo]);

  return {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    snoozeTodo,
  };
}

/**
 * Hook for getting overdue todos count (for notifications)
 */
export function useOverdueTodosCount() {
  const { todos } = useTodos();

  const overdueCount = todos.filter(todo => {
    if (todo.isCompleted || !todo.dueAt) return false;
    return Date.now() > todo.dueAt.toMillis();
  }).length;

  return overdueCount;
}

/**
 * Hook for getting overdue todos (for notifications panel)
 */
export function useOverdueTodos() {
  const { todos, ...rest } = useTodos();

  const overdueTodos = todos.filter(todo => {
    if (todo.isCompleted || !todo.dueAt) return false;
    return Date.now() > todo.dueAt.toMillis();
  });

  return {
    overdueTodos,
    ...rest,
  };
}
