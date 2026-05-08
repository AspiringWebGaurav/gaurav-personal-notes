// src/components/todos/Filters.tsx
"use client";

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useTodos } from '@/hooks/useTodos';
import { filterTodos, getOverdueTodos } from '@/lib/todoUtils';
import { LayoutList, Zap, CheckCircle2, Flame } from 'lucide-react';

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

  const filters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <LayoutList className="h-4 w-4" /> },
    { key: 'active', label: 'Active', icon: <Zap className="h-4 w-4" /> },
    { key: 'completed', label: 'Completed', icon: <CheckCircle2 className="h-4 w-4" /> },
    { key: 'overdue', label: 'Overdue', icon: <Flame className="h-4 w-4" /> },
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.key;
        const count = counts[filter.key];
        
        return (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              className={`
                inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors border
                ${isActive
                  ? 'bg-slate-100 text-slate-900 border-slate-200 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-100'
                }
                ${filter.key === 'overdue' && count > 0 && !isActive
                  ? 'border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20'
                  : ''
                }
              `}
            >
              {filter.icon}
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
            </button>
        );
      })}
    </div>
  );
}