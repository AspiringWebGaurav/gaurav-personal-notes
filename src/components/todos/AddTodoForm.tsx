// src/components/todos/AddTodoForm.tsx
"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useTodos } from '@/hooks/useTodos';
import { validateTodoTitle, validateDueDate } from '@/lib/todoUtils';

interface AddTodoFormProps {
  onSuccess?: () => void;
  className?: string;
}

export default function AddTodoForm({ onSuccess, className = '' }: AddTodoFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { createTodo } = useTodos();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate title
    const titleValidation = validateTodoTitle(title);
    if (!titleValidation.isValid) {
      setError(titleValidation.error!);
      return;
    }

    // Parse due date/time
    let dueAt: Date | undefined;
    if (dueDate) {
      const dateTimeString = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T23:59`;
      dueAt = new Date(dateTimeString);
      
      const dateValidation = validateDueDate(dueAt);
      if (!dateValidation.isValid) {
        setError(dateValidation.error!);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createTodo({
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueAt,
      });

      // Reset form
      setTitle('');
      setNotes('');
      setDueDate('');
      setDueTime('');
      setIsExpanded(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error creating todo:', err);
      setError('Failed to create todo. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setNotes('');
    setDueDate('');
    setDueTime('');
    setError('');
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={className}
      >
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          className="w-full justify-start gap-2 h-12 text-left bg-white/60 dark:bg-slate-900/50 backdrop-blur border-dashed hover:bg-white dark:hover:bg-slate-900"
        >
          <Plus className="h-4 w-4" />
          Add a new todo...
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="bg-white/80 dark:bg-slate-900/60 backdrop-blur border-slate-200/70 dark:border-slate-800/70">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title Input */}
            <div>
              <Input
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base font-medium bg-transparent border-none shadow-none focus-visible:ring-0 px-0"
                maxLength={120}
                autoFocus
              />
              <div className="text-xs text-slate-500 mt-1">
                {title.length}/120 characters
              </div>
            </div>

            {/* Notes Input */}
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <textarea
                placeholder="Add notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="pl-10 bg-slate-50 dark:bg-slate-800/50"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              {dueDate && (
                <div className="w-32">
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
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
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Todo
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}