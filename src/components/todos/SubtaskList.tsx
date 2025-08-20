// src/components/todos/SubtaskList.tsx
"use client";

import { cn } from "../../lib/utils";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface SubtaskListProps {
  subtasks: Subtask[];
  onToggle: (id: string, done: boolean) => void;
}

export default function SubtaskList({ subtasks, onToggle }: SubtaskListProps) {
  if (!subtasks || subtasks.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {subtasks.map((sub) => (
        <li key={sub.id} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={sub.done}
            onChange={(e) => onToggle(sub.id, e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span
            className={cn("text-sm", sub.done && "line-through text-slate-500")}
          >
            {sub.title}
          </span>
        </li>
      ))}
    </ul>
  );
}
