"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "@/components/SyncStatusProvider";
import StaticSyncStatus from "@/components/StaticSyncStatus";
import { motion } from "framer-motion";
import { TEMPLATES } from "@/lib/templates";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Note, MoneyTracker } from "@/types";
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { syncStatus } = useSyncStatus();
  const router = useRouter();
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [moneyTrackers, setMoneyTrackers] = useState<MoneyTracker[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      const notesQuery = query(
        collection(db, "users", user.uid, "notes"),
        orderBy("updatedAt", "desc"),
        limit(5)
      );
      const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
        setRecentNotes(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Note[]
        );
      });

      const moneyQuery = query(
        collection(db, "users", user.uid, "money"),
        orderBy("updatedAt", "desc"),
        limit(3)
      );
      const unsubscribeMoney = onSnapshot(moneyQuery, (snapshot) => {
        setMoneyTrackers(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as MoneyTracker[]
        );
      });

      return () => {
        unsubscribeNotes();
        unsubscribeMoney();
      };
    }
  }, [user, loading, router]);

  const createNewNote = () =>
    router.push(`/dashboard/notes/note_${Date.now()}`);
  const createMoneyTracker = () =>
    router.push(`/dashboard/money/money_${Date.now()}`);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Welcome back, {user.displayName?.split(" ")[0]}!
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              What would you like to work on today?
            </p>
          </div>
          <StaticSyncStatus />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { staggerChildren: 0.15 },
            },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"
        >
          {[
            {
              title: "New Note",
              icon: "✏️",
              desc: "Start writing your thoughts",
              action: createNewNote,
              color: "from-blue-500 to-blue-600",
            },
            {
              title: "Money Tracker",
              icon: "💰",
              desc: "Track your expenses",
              action: createMoneyTracker,
              color: "from-green-500 to-green-600",
            },
            {
              title: "Templates",
              icon: "📋",
              desc: `Choose from ${TEMPLATES.length}+ templates`,
              action: () => router.push("/dashboard/templates"),
              color: "from-purple-500 to-purple-600",
            },
          ].map((btn, idx) => (
            <motion.button
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
              }}
              whileTap={{ scale: 0.97 }}
              onClick={btn.action}
              className={`relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r ${btn.color} text-white shadow-lg hover:shadow-xl backdrop-blur-md`}
            >
              <div className="text-4xl mb-3 animate-bounce">{btn.icon}</div>
              <h3 className="text-lg font-bold mb-1">{btn.title}</h3>
              <p className="text-sm opacity-90">{btn.desc}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* Two Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Notes */}
          <SectionCard
            title="Recent Notes"
            viewAll={() => router.push("/dashboard/notes")}
            icon="📝"
          >
            {recentNotes.length === 0 ? (
              <EmptyState
                icon="📝"
                text="No notes yet. Create your first note!"
              />
            ) : (
              recentNotes.map((note) => (
                <ListItem
                  key={note.id}
                  title={note.title || "Untitled"}
                  desc={note.content.substring(0, 100) + "..."}
                  date={
                    note.updatedAt?.toDate?.()?.toLocaleDateString() ||
                    "Recently"
                  }
                  color="blue"
                  onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                />
              ))
            )}
          </SectionCard>

          {/* Money Trackers */}
          <SectionCard
            title="Money Trackers"
            viewAll={() => router.push("/dashboard/money")}
            icon="💰"
            color="green"
          >
            {moneyTrackers.length === 0 ? (
              <EmptyState
                icon="💰"
                text="No money trackers yet. Create your first one!"
              />
            ) : (
              moneyTrackers.map((tracker) => {
                const totalExpenses = (tracker.expenses || []).reduce(
                  (sum, expense) => sum + expense.amount,
                  0
                );
                const remainingBalance =
                  (tracker.startingAmount || 0) - totalExpenses;
                return (
                  <ListItem
                    key={tracker.id}
                    title={tracker.title || "Untitled Budget"}
                    desc={`${tracker.expenses?.length || 0} expenses`}
                    date={`of ${formatCurrency(
                      tracker.startingAmount || 0,
                      tracker.currency || DEFAULT_CURRENCY
                    )}`}
                    amount={formatCurrency(
                      remainingBalance,
                      tracker.currency || DEFAULT_CURRENCY
                    )}
                    amountColor={
                      remainingBalance >= 0 ? "text-green-600" : "text-red-600"
                    }
                    color="green"
                    onClick={() =>
                      router.push(`/dashboard/money/${tracker.id}`)
                    }
                  />
                );
              })
            )}
          </SectionCard>
        </div>

        {/* Popular Templates */}
        <SectionCard
          title="Popular Templates"
          viewAll={() => router.push("/dashboard/templates")}
          icon="📑"
          className="mt-10"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TEMPLATES.slice(0, 8).map((template) => (
              <motion.button
                key={template.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (template.type === "money") {
                    router.push(
                      `/dashboard/money/money_${Date.now()}?template=${
                        template.id
                      }`
                    );
                  } else {
                    router.push(
                      `/dashboard/notes/note_${Date.now()}?template=${
                        template.id
                      }`
                    );
                  }
                }}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-400 text-left shadow-sm"
              >
                <div className="text-2xl mb-2">{template.icon}</div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                  {template.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {template.category}
                </p>
              </motion.button>
            ))}
          </div>
        </SectionCard>
      </main>
    </div>
  );
}

/* Helper Components */
interface SectionCardProps {
  title: string;
  viewAll: () => void;
  icon: string;
  children: React.ReactNode;
  color?: "blue" | "green" | "purple";
  className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  viewAll,
  icon,
  children,
  color = "blue",
  className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 ${className}`}
  >
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <button
        onClick={viewAll}
        className={`text-sm text-${color}-600 hover:text-${color}-700 dark:text-${color}-400`}
      >
        View all
      </button>
    </div>
    {children}
  </motion.div>
);

interface ListItemProps {
  title: string;
  desc: string;
  date: string;
  amount?: string; // optional
  amountColor?: string; // optional
  color: "blue" | "green" | "purple";
  onClick: () => void;
}

const ListItem: React.FC<ListItemProps> = ({
  title,
  desc,
  date,
  amount,
  amountColor,
  color,
  onClick,
}) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    onClick={onClick}
    className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-${color}-300 dark:hover:border-${color}-400 cursor-pointer transition`}
  >
    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
      {title}
    </h4>
    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
      {desc}
    </p>
    <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
      <span>{date}</span>
      {amount && (
        <span className={`font-semibold ${amountColor}`}>{amount}</span>
      )}
    </div>
  </motion.div>
);

interface EmptyStateProps {
  icon: string;
  text: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, text }) => (
  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
    <div className="text-4xl mb-3">{icon}</div>
    <p>{text}</p>
  </div>
);
