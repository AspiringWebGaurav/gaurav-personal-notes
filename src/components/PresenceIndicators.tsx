"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PresenceData, getUserColor } from "@/lib/presence";

interface PresenceIndicatorsProps {
  presenceData: Record<string, PresenceData>;
  currentUserId: string;
  isWaiting?: boolean;
}

// Helpers
function initialFrom(name: unknown) {
  return typeof name === "string" && name.trim().length > 0
    ? name.trim().charAt(0).toUpperCase()
    : "?";
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasName(p: any): p is PresenceData {
  return p && typeof p.displayName === "string" && p.displayName.length > 0;
}

export default function PresenceIndicators({
  presenceData,
  currentUserId,
  isWaiting = false,
}: PresenceIndicatorsProps) {
  const data = presenceData ?? {};
  const currentUser = data[currentUserId];

  const otherUsersAll = Object.entries(data).filter(
    ([uid]) => uid !== currentUserId
  );
  const otherUsers = otherUsersAll.filter(([, p]) => hasName(p));

  return (
    <div className="flex items-center space-x-3">
      {/* Current user indicator */}
      {hasName(currentUser) && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="relative"
        >
          <div
            className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: getUserColor(currentUserId) }}
            title={`${currentUser.displayName} (You)`}
          >
            {initialFrom(currentUser.displayName)}
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </motion.div>
      )}

      {/* Other users */}
      <AnimatePresence>
        {otherUsers.map(([uid, presence]) => (
          <motion.div
            key={uid}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="relative"
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: getUserColor(uid) }}
              title={presence.displayName ?? "Collaborator"}
            >
              {initialFrom(presence.displayName)}
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Waiting indicator or status text */}
      <div className="text-sm text-gray-600 ml-2">
        {isWaiting ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-yellow-500 rounded-full"
            />
            <span>Waiting for collaborator...</span>
          </motion.div>
        ) : otherUsers.length === 0 ? (
          <span>You&apos;re editing alone</span>
        ) : otherUsers.length === 1 ? (
          <span>
            {otherUsers[0]?.[1] && (otherUsers[0][1] as PresenceData).displayName} is collaborating
          </span>
        ) : (
          <span>{otherUsers.length} people collaborating</span>
        )}
      </div>
    </div>
  );
}

// Typing indicator component
export function TypingIndicator({
  presenceData,
  currentUserId,
}: {
  presenceData: Record<string, PresenceData>;
  currentUserId: string;
}) {
  const data = presenceData ?? {};
  const typingUsers = Object.entries(data)
    .filter(
      ([uid, presence]) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        uid !== currentUserId && !!presence && (presence as any).typing
    )
    .map(([, presence]) => (hasName(presence) ? presence.displayName : null))
    .filter((n): n is string => !!n);

  if (typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center space-x-2 text-sm text-gray-500 px-4 py-2"
    >
      <div className="flex space-x-1">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
      </div>
      <span>
        {typingUsers.length === 1
          ? `${typingUsers[0]} is typing...`
          : `${typingUsers.slice(0, -1).join(", ")} and ${typingUsers[typingUsers.length - 1]
          } are typing...`}
      </span>
    </motion.div>
  );
}
