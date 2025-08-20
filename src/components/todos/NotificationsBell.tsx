// src/components/todos/NotificationsBell.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, CheckCircle, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useOverdueTodos, useTodos } from '@/hooks/useTodos';
import { formatRelativeTime, formatAbsoluteTime } from '@/lib/todoUtils';
import { useRouter } from 'next/navigation';

interface NotificationsBellProps {
  className?: string;
}

export default function NotificationsBell({ className = '' }: NotificationsBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { overdueTodos } = useOverdueTodos();
  const { toggleTodo, snoozeTodo, deleteTodo } = useTodos();
  const router = useRouter();
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const overdueCount = overdueTodos.length;

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        bellRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleComplete = async (todoId: string) => {
    try {
      await toggleTodo(todoId, true);
    } catch (err) {
      console.error('Error completing todo:', err);
    }
  };

  const handleSnooze = async (todoId: string, currentDueAt: any) => {
    try {
      await snoozeTodo(todoId, currentDueAt);
    } catch (err) {
      console.error('Error snoozing todo:', err);
    }
  };

  const handleDeleteClick = (todoId: string, todoTitle: string) => {
    setTodoToDelete({ id: todoId, title: todoTitle });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!todoToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteTodo(todoToDelete.id);
      setShowDeleteDialog(false);
      setTodoToDelete(null);
    } catch (err) {
      console.error('Error deleting todo:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setTodoToDelete(null);
  };

  const handleOpenTodos = () => {
    setIsOpen(false);
    router.push('/dashboard/todos');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <Button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0 hover:bg-black/5"
        aria-label={`Notifications ${overdueCount > 0 ? `(${overdueCount} overdue)` : ''}`}
      >
        <Bell className={`h-5 w-5 ${overdueCount > 0 ? 'text-red-600' : 'text-slate-600'}`} />
        
        {/* Badge */}
        {overdueCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Badge 
              variant="destructive" 
              className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold rounded-full"
            >
              {overdueCount > 99 ? '99+' : overdueCount}
            </Badge>
          </motion.div>
        )}
      </Button>

      {/* Notifications Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 z-50"
          >
            <Card className="border border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-xl dark:border-slate-800/70 dark:bg-slate-900/90">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </CardTitle>
                  {overdueCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {overdueCount} overdue
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {overdueCount === 0 ? (
                  <div className="text-center py-6">
                    <div className="flex justify-center mb-3">
                      <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      All caught up!
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      No overdue todos at the moment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overdueTodos.slice(0, 5).map((todo) => (
                      <motion.div
                        key={todo.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {todo.title}
                            </p>
                            {todo.dueAt && (
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3 text-red-500" />
                                <span 
                                  className="text-xs text-red-600 dark:text-red-400 font-medium"
                                  title={formatAbsoluteTime(todo.dueAt)}
                                >
                                  {formatRelativeTime(todo.dueAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-1 mt-3">
                          <Button
                            onClick={() => handleComplete(todo.id)}
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </Button>
                          <Button
                            onClick={() => handleSnooze(todo.id, todo.dueAt)}
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            +30m
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(todo.id, todo.title)}
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white/50 dark:bg-slate-800/50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                    
                    {overdueTodos.length > 5 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                        And {overdueTodos.length - 5} more overdue todos...
                      </p>
                    )}
                    
                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <Button
                        onClick={handleOpenTodos}
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open Todos
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete Todo
              </div>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this todo? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {todoToDelete && (
            <div className="my-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
              <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                {todoToDelete.title}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <div className="flex gap-2 w-full justify-end">
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
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}