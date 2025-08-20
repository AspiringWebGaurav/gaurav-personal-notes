// src/components/todos/Filters.tsx
"use client";

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useTodos } from '@/hooks/useTodos';
import { filterTodos, getOverdueTodos } from '@/lib/todoUtils';

type FilterType = 'all' | 'active' | 'completed' | 'overdue';

interface FiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  className?: string;
}

export default function Filters({ activeFilter, onFilterChange, className = '' }: FiltersProps) {
  const { todos } = useTodos();

  const counts = {
    all: todos.length,
    active: filterTodos(todos, 'active').length,
    completed: filterTodos(todos, 'completed').length,
    overdue: getOverdueTodos(todos).length,
  };

  const filters: { key: FilterType; label: string; emoji: string }[] = [
    { key: 'all', label: 'All', emoji: '📋' },
    { key: 'active', label: 'Active', emoji: '⚡' },
    { key: 'completed', label: 'Completed', emoji: '✅' },
    { key: 'overdue', label: 'Overdue', emoji: '🔥' },
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = counts[filter.key];
        
        return (
          <motion.button
            key={filter.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onFilterChange(filter.key)}
            className={`
              relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all
              ${isActive
                ? 'bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900'
                : 'bg-white/70 text-slate-700 hover:bg-white hover:shadow-md dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800'
              }
              ${filter.key === 'overdue' && count > 0 && !isActive
                ? 'ring-2 ring-red-200 dark:ring-red-800/50'
                : ''
              }
              border border-slate-200/50 dark:border-slate-700/50
            `}
          >
            <span className="text-base leading-none">{filter.emoji}</span>
            <span>{filter.label}</span>
            
            {count > 0 && (
              <Badge 
                variant={isActive ? "secondary" : "outline"}
                className={`
                  ml-1 h-5 px-1.5 text-xs font-bold
                  ${isActive 
                    ? 'bg-white/20 text-white border-white/30 dark:bg-slate-900/20 dark:text-slate-900 dark:border-slate-900/30' 
                    : filter.key === 'overdue' 
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                  }
                `}
              >
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}