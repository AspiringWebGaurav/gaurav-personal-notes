"use client";

import { useState, useRef, memo } from "react";
import Link from "next/link";
import { Book, ChevronRight, Trash2 } from "lucide-react";
import { Note } from "@/features/notes/NotesRepository";

interface NoteItemProps {
  note: Note;
  onDelete: (id: string) => void;
}

const SWIPE_THRESHOLD = -70; // pixels to swipe left before showing delete

export const NoteItem = memo(function NoteItem({ note, onDelete }: NoteItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Only allow swiping left
    if (diff < 0) {
      // Add resistance
      setTranslateX(Math.max(diff, SWIPE_THRESHOLD - 20));
    } else {
      setTranslateX(0);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (translateX <= SWIPE_THRESHOLD) {
      // Lock it open
      setTranslateX(SWIPE_THRESHOLD);
    } else {
      // Snap back
      setTranslateX(0);
    }
    startX.current = null;
    currentX.current = null;
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the link
    e.stopPropagation();
    onDelete(note.id);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl mb-3 shadow-sm bg-red-500 group">
      {/* Background Delete Action */}
      <div className="absolute top-0 right-0 h-full w-[80px] flex items-center justify-center bg-red-500">
        <button 
          onClick={handleDelete}
          className="w-full h-full flex flex-col items-center justify-center text-white p-2"
        >
          <Trash2 size={24} />
          <span className="text-[10px] font-bold mt-1">Delete</span>
        </button>
      </div>

      {/* Foreground Card */}
      <div 
        className={`w-full bg-white dark:bg-zinc-900 p-4 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between active:bg-zinc-50 dark:active:bg-zinc-800/50 ${isSwiping ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: `translateX(${translateX}px)`, touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          // If swiped open, tapping the card closes it instead of navigating
          if (translateX < 0) {
            setTranslateX(0);
          }
        }}
      >
        <Link
          href={translateX < 0 ? "#" : `/mobile/notes/${note.id}`}
          className="flex items-center justify-between flex-1 overflow-hidden"
          onClick={(e) => {
             if (translateX < 0) e.preventDefault();
          }}
        >
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
              <Book size={20} className="stroke-[2.5]" />
            </div>
            <div className="truncate flex-1 pr-4">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">{note.title || 'Untitled Note'}</h3>
              <p className="text-xs font-medium text-zinc-500 mt-1">
                {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-zinc-300 shrink-0" />
        </Link>
      </div>
    </div>
  );
});
