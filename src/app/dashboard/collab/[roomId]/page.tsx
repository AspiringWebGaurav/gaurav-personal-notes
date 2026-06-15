"use client";

import { use } from "react";
import { CollabEditor } from "@/features/notes/components/CollabEditor";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CollaborativeRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { user } = useAuthStore();

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="flex-1 overflow-hidden bg-indigo-50/10 dark:bg-indigo-950/5 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/collab" className="text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-lg">Co-op Session</h1>
            <p className="text-xs text-gray-500 font-mono">ID: {roomId}</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden p-4 md:p-8">
        <div className="max-w-5xl mx-auto h-full">
          <CollabEditor 
            roomId={roomId} 
            userName={user.displayName || "Anonymous User"} 
          />
        </div>
      </div>
    </div>
  );
}
