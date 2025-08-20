// src/components/todos/TodoItem.tsx
"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';
import {
  Check,
  Clock,
  Edit3,
  Trash2,
  FileText,
  Calendar,
  X,
  Save,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useTodos } from '@/hooks/useTodos';
import { Todo } from '@/types';
import {
  formatRelativeTime,
  formatAbsoluteTime,
  isOverdue,
  validateTodoTitle,
  validateDueDate
} from '@/lib/todoUtils';
import SubtaskList from './SubtaskList';

interface TodoItemProps {
  todo: Todo;
  className?: string;
}

export default function TodoItem({ todo, className = '' }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editNotes, setEditNotes] = useState(todo.notes || '');
  const [editDueDate, setEditDueDate] = useState(
    todo.dueAt ? todo.dueAt.toDate().toISOString().split('T')[0] : ''
  );
  const [editDueTime, setEditDueTime] = useState(
    todo.dueAt ? todo.dueAt.toDate().toTimeString().slice(0, 5) : ''
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { updateTodo, deleteTodo, toggleTodo } = useTodos();

  const overdue = isOverdue(todo);
  const completed = todo.isCompleted;

  const handleToggleComplete = async () => {
    try {
      await toggleTodo(todo.id, !todo.isCompleted);
    } catch (err) {
      console.error('Error toggling todo:', err);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditTitle(todo.title);
    setEditNotes(todo.notes || '');
    setEditDueDate(todo.dueAt ? todo.dueAt.toDate().toISOString().split('T')[0] : '');
    setEditDueTime(todo.dueAt ? todo.dueAt.toDate().toTimeString().slice(0, 5) : '');
    setError('');
  };

  const handleSave = async () => {
    setError('');

    // Validate title
    const titleValidation = validateTodoTitle(editTitle);
    if (!titleValidation.isValid) {
      setError(titleValidation.error!);
      return;
    }

    // Parse due date/time
    let dueAt: Date | undefined;
    if (editDueDate) {
      const dateTimeString = editDueTime ? `${editDueDate}T${editDueTime}` : `${editDueDate}T23:59`;
      dueAt = new Date(dateTimeString);
      
      const dateValidation = validateDueDate(dueAt);
      if (!dateValidation.isValid) {
        setError(dateValidation.error!);
        return;
      }
    }

    setIsUpdating(true);
    try {
      await updateTodo(todo.id, {
        title: editTitle.trim(),
        notes: editNotes.trim() || undefined,
        dueAt: dueAt ? Timestamp.fromDate(dueAt) : undefined,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating todo:', err);
      setError('Failed to update todo. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteTodo(todo.id);
      setShowDeleteDialog(false);
    } catch (err) {
      console.error('Error deleting todo:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const handleToggleSubtask = async (id: string, done: boolean) => {
    if (!todo.subtasks) return;
    const updated = todo.subtasks.map(s => s.id === id ? { ...s, done } : s);
    try {
      await updateTodo(todo.id, { subtasks: updated });
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={className}
      >
        <Card className="bg-white/80 dark:bg-slate-900/60 backdrop-blur border-slate-200/70 dark:border-slate-800/70">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Title Input */}
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="font-medium"
                maxLength={120}
                placeholder="Todo title"
              />

              {/* Notes Input */}
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  placeholder="Add notes (optional)"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  rows={2}
                  maxLength={500}
                />
              </div>

              {/* Due Date/Time */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="pl-10 bg-slate-50 dark:bg-slate-800/50"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                {editDueDate && (
                  <div className="w-32">
                    <Input
                      type="time"
                      value={editDueTime}
                      onChange={(e) => setEditDueTime(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800/50"
                    />
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!editTitle.trim() || isUpdating}
                  size="sm"
                  className="flex-1"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
  
        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <DialogTitle>Delete Todo</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this todo? This action cannot be undone.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 mx-6 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-slate-300 dark:border-slate-600 mt-0.5">
                  {todo.isCompleted && <Check className="h-3 w-3 text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {todo.title}
                  </p>
                  {todo.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {todo.notes}
                    </p>
                  )}
                  {todo.dueAt && (
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        Due {formatAbsoluteTime(todo.dueAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
  
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Todo
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className={`
        group transition-all duration-200 hover:shadow-md
        ${completed 
          ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50' 
          : 'bg-white/80 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800/70'
        }
        ${overdue && !completed ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10' : ''}
        backdrop-blur
      `}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={handleToggleComplete}
              className={`
                mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all
                ${completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : overdue
                  ? 'border-red-400 hover:border-red-500'
                  : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
                }
              `}
            >
              {completed && <Check className="h-3 w-3" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className={`
                font-medium transition-all
                ${completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}
              `}>
                {todo.title}
              </div>

              {todo.notes && (
                <div className={`
                  text-sm mt-1 transition-all
                  ${completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}
                `}>
                  {todo.notes}
                </div>
              )}

              {todo.dueAt && (
                <div className="flex items-center gap-1 mt-2">
                  <Clock className={`h-3 w-3 ${overdue && !completed ? 'text-red-500' : 'text-slate-400'}`} />
                  <span
                    className={`text-xs ${overdue && !completed ? 'text-red-600 font-medium' : 'text-slate-500'}`}
                    title={formatAbsoluteTime(todo.dueAt)}
                  >
                    {formatRelativeTime(todo.dueAt)}
                  </span>
                </div>
              )}
              {todo.subtasks && (
                <SubtaskList
                  subtasks={todo.subtasks}
                  onToggle={handleToggleSubtask}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                onClick={handleEdit}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleDeleteClick}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle>Delete Todo</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this todo? This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 mx-6 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-slate-300 dark:border-slate-600 mt-0.5">
                {todo.isCompleted && <Check className="h-3 w-3 text-green-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {todo.title}
                </p>
                {todo.notes && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {todo.notes}
                  </p>
                )}
                {todo.dueAt && (
                  <div className="flex items-center gap-1 mt-2">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      Due {formatAbsoluteTime(todo.dueAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Todo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}