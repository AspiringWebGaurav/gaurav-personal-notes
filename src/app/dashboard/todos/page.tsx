// src/app/dashboard/todos/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, ListTodo, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTodos } from '@/hooks/useTodos';
import AddTodoForm from '@/components/todos/AddTodoForm';
import TodoItem from '@/components/todos/TodoItem';
import Filters from '@/components/todos/Filters';
import { filterTodos, sortTodos, getOverdueTodos } from '@/lib/todoUtils';

type FilterType = 'all' | 'active' | 'completed' | 'overdue';

export default function TodosPage() {
  const { user } = useAuth();
  const { todos, loading, error } = useTodos();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredTodos = useMemo(() => {
    const filtered = filterTodos(todos, activeFilter);
    return sortTodos(filtered);
  }, [todos, activeFilter]);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.isCompleted).length;
    const active = total - completed;
    const overdue = getOverdueTodos(todos).length;
    
    return { total, completed, active, overdue };
  }, [todos]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">Please sign in to view your todos.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Failed to load todos. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                <CheckSquare className="h-8 w-8 text-blue-600" />
                Todos
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Stay organized and get things done
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/60 dark:bg-slate-900/50 backdrop-blur border-slate-200/70 dark:border-slate-800/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <ListTodo className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.total}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/50 backdrop-blur border-slate-200/70 dark:border-slate-800/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.active}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-900/50 backdrop-blur border-slate-200/70 dark:border-slate-800/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.completed}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Done</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`
              bg-white/60 dark:bg-slate-900/50 backdrop-blur border-slate-200/70 dark:border-slate-800/70
              ${stats.overdue > 0 ? 'ring-2 ring-red-200 dark:ring-red-800/50' : ''}
            `}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.overdue}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Filters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            className="mb-6"
          />
        </motion.div>

        {/* Add Todo Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <AddTodoForm />
        </motion.div>

        {/* Todos List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-white/60 dark:bg-slate-900/50 backdrop-blur animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="flex-1">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTodos.length === 0 ? (
            <Card className="bg-white/60 dark:bg-slate-900/50 backdrop-blur border-dashed border-slate-300/80 dark:border-slate-700/80">
              <CardContent className="p-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <CheckSquare className="h-8 w-8 text-slate-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {activeFilter === 'all' 
                    ? 'No todos yet' 
                    : `No ${activeFilter} todos`
                  }
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {activeFilter === 'all' 
                    ? 'Create your first todo to get started!' 
                    : `You don't have any ${activeFilter} todos right now.`
                  }
                </p>
                {activeFilter !== 'all' && (
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    View all todos
                  </button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTodos.map((todo, index) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TodoItem todo={todo} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Footer */}
        {filteredTodos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {filteredTodos.length} of {stats.total} todos
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}