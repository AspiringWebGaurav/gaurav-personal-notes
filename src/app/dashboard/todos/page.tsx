// src/app/dashboard/todos/page.tsx
"use client";

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, ListTodo, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                  <CheckSquare className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </div>
                Todos
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Stay organized and get things done
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                    <ListTodo className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {stats.total}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                    <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {stats.active}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                    <CheckSquare className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {stats.completed}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Done</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`
              bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm
              ${stats.overdue > 0 ? 'ring-1 ring-red-200 dark:ring-red-900/50 border-red-200 dark:border-red-900/50' : ''}
            `}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-md flex items-center justify-center border ${stats.overdue > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                    <AlertCircle className={`h-4 w-4 ${stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {stats.overdue}
                    </p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue</p>
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
                <Card key={i} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 animate-pulse shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 bg-slate-100 dark:bg-slate-800 rounded" />
                      <div className="flex-1">
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4 mb-2" />
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTodos.length === 0 ? (
            <Card className="bg-white dark:bg-slate-950 border-dashed border-slate-200 dark:border-slate-800 shadow-none">
              <CardContent className="p-12 text-center flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 mb-4">
                  <CheckSquare className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {activeFilter === 'all'
                    ? 'No todos yet'
                    : `No ${activeFilter} todos`
                  }
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 max-w-[250px]">
                  {activeFilter === 'all'
                    ? 'Create your first todo to get started.'
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
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