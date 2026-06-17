"use client";

import { use } from "react";
import { CollabEditor } from "@/features/notes/components/CollabEditor";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MobileCollaborativeRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { user } = useAuthStore();
  const router = useRouter();

  if (!user) {
    return <div className="flex h-full items-center justify-center text-zinc-500">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-[#0f1115] absolute inset-0 z-50">
      <div className="flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <button 
          onClick={() => router.push("/mobile/collab")}
          className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 font-medium"
        >
          <ChevronLeft size={24} />
          <span className="text-sm">Leave</span>
        </button>
        <div className="flex flex-col items-end pr-2">
          <h1 className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100">Co-op Session</h1>
          <p className="text-[10px] text-zinc-500 font-mono font-bold tracking-widest">{roomId}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <CollabEditor 
          roomId={roomId} 
          userName={user.displayName || "Anonymous User"} 
        />
      </div>
    </div>
  );
}
