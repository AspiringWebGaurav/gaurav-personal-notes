import { NotesList } from "@/features/notes/components/NotesList";

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full h-full">
      <div className="w-64 md:w-80 shrink-0 hidden sm:block">
        <NotesList />
      </div>
      <div className="flex-1 h-full relative">
        {children}
      </div>
    </div>
  );
}
