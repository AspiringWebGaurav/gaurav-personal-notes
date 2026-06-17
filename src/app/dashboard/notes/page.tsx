import { BookDashed } from "lucide-react";

export default function NotesIndexPage() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 relative overflow-hidden bg-zinc-50/30 dark:bg-zinc-950/30">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center animate-[fade-in_0.4s_ease-out]">
        <div className="w-24 h-24 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-center mb-6 relative group transition-all hover:scale-105 hover:shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <BookDashed size={40} className="text-zinc-400 dark:text-zinc-500 group-hover:text-violet-500 transition-colors" strokeWidth={1.5} />
        </div>
        
        <h3 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100 tracking-tight">Your Workspace is Empty</h3>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-sm text-center leading-relaxed">
          Select a note from the sidebar to start writing, or create a new one to capture your next big idea.
        </p>
      </div>
    </div>
  );
}
