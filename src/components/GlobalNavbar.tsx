"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import AvatarWithFallback from "./AvatarWithFallback";
import { useAuth } from "@/hooks/useAuth";
import { useSyncStatus } from "./SyncStatusProvider";
import NotificationsBell from "./todos/NotificationsBell";
import { User, Settings, HelpCircle, LogOut, ChevronDown, LayoutGrid, NotepadText, CheckSquare, Wallet, LayoutTemplate } from "lucide-react";

/**
 * Elevation Pills — Enterprise Navbar for GPN
 * - Icon + label pills with tactile elevation
 * - Crisp glass bar; readable on light UIs
 * - Non-cropping dropdowns (fixed + measured top)
 * - Mobile: app-bar + drawer with large tap targets
 * - Safe-area aware (iOS/Android notches)
 */

type NavItem = { name: string; href: string; icon: React.ReactNode; desc?: string };

const NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: <LayoutGrid className="h-4 w-4" />, desc: "Overview" },
  { name: "Notes", href: "/dashboard/notes", icon: <NotepadText className="h-4 w-4" />, desc: "Your notes" },
  { name: "Todos", href: "/dashboard/todos", icon: <CheckSquare className="h-4 w-4" />, desc: "Task management" },
  {
    name: "Money",
    href: "/dashboard/money",
    icon: <Wallet className="h-4 w-4" />,
    desc: "Track expenses",
  },
  {
    name: "Templates",
    href: "/dashboard/templates",
    icon: <LayoutTemplate className="h-4 w-4" />,
    desc: "Starter templates",
  },
];

export default function GlobalNavbar() {
  const { user, userFirstName, userDisplayName } = useAuth();
  const { syncStatus } = useSyncStatus();
  const router = useRouter();
  const pathname = usePathname();

  const [navH, setNavH] = useState(64);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const navRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      if (navRef.current)
        setNavH(Math.ceil(navRef.current.getBoundingClientRect().height));
    };
    update();
    const ro = new ResizeObserver(update);
    if (navRef.current) ro.observe(navRef.current);
    addEventListener("resize", update);
    return () => {
      ro.disconnect();
      removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  if (!user) return null;

  const active = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  const go = (href: string) => router.push(href);
  const logout = async () => {
    try {
      router.push("/postlogout"); // go show the post-logout animation page
      // IMPORTANT: do NOT call signOut() here.
      // The /postlogout page will handle calling signOut() so this component unmount
      // can never cancel our navigation.
    } catch (e) {
      console.error(e);
    }
  };

  const displayName = userDisplayName || user.displayName || "User";
  const firstName = userFirstName || displayName.split(" ")[0];
  const email = user.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getSyncLabel = (date: Date | null) => {
    if (!date) return "Synced";
    return `Last synced ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <>
      {/* Glass App Bar */}
      <nav
        ref={navRef}
        className="
          sticky top-0 z-[70]
          bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70
          border-b border-black/10
          shadow-[0_10px_30px_-12px_rgba(0,0,0,.18)]
        "
        style={
          {
            paddingTop: "max(0px, env(safe-area-inset-top))",
          } as React.CSSProperties
        }
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="grid grid-cols-12 items-center gap-2 md:gap-3 py-2 min-h-[56px] md:min-h-[64px]">
            {/* Brand */}
            <div className="col-span-6 sm:col-span-4 lg:col-span-3 min-w-0">
              <motion.button
                whileHover={{ y: -1 }} // subtle lift on desktop hover
                whileTap={{ scale: 0.98 }} // slight press on tap
                onClick={() => go("/dashboard")}
                className="inline-flex items-center gap-2 rounded-xl px-2 py-1
             hover:bg-black/5 focus:outline-none focus-visible:ring-2
             focus-visible:ring-black/20 transition"
                aria-label="Gaurav's Personal Notes home"
              >
                <div className="relative w-6 h-6 md:w-7 md:h-7 flex-shrink-0">
                  <Image
                    src="/icon-512x512.png"
                    alt="Gaurav's Personal Notes logo"
                    width={28}
                    height={28}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <span className="font-semibold text-gray-900 truncate text-base sm:text-lg">
                  <span className="hidden xl:inline">
                    Gaurav&apos;s Personal Notes
                  </span>
                  <span className="hidden lg:inline xl:hidden">
                    Gaurav&apos;s Notes
                  </span>
                  <span className="inline lg:hidden">GPN</span>
                </span>
              </motion.button>
            </div>

            {/* Elevation Pills (desktop) */}
            <div className="hidden lg:flex col-span-6 justify-center">
              <div className="flex items-center gap-2">
                {NAV.map((item) => (
                  <PillButton
                    key={item.name}
                    icon={item.icon}
                    label={item.name}
                    active={active(item.href)}
                    onClick={() => go(item.href)}
                  />
                ))}
              </div>
            </div>

            {/* Utilities */}
            <div className="col-span-6 sm:col-span-8 lg:col-span-3 flex items-center justify-end gap-1.5 sm:gap-2">
              {/* Todo Notifications Bell */}
              <NotificationsBell className="hidden sm:inline-flex" />

              {/* Synced badge */}
              <SyncBadge label={getSyncLabel(syncStatus.lastSyncTime)} />

              {/* Mobile menu */}
              <IconBtn
                className="lg:hidden"
                label={drawerOpen ? "Close menu" : "Open menu"}
                onClick={() => setDrawerOpen((v) => !v)}
              >
                {drawerOpen ? (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </IconBtn>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/50 px-1 py-1 pr-3 text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 transition-all dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:bg-slate-900"
                  aria-expanded={menuOpen}
                  aria-label="Open user menu"
                >
                  <AvatarWithFallback
                    src={user.photoURL}
                    userId={user.uid}
                    alt={`${displayName} avatar`}
                    size="sm"
                    initials={initials}
                    showOnlineStatus
                    isOnline={isOnline}
                    className="shrink-0"
                  />
                  <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                    {firstName}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform text-slate-400 ${menuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Profile menu (fixed) */}
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="fixed right-3 sm:right-4 z-[80]"
                      style={{
                        top: `calc(${navH}px + env(safe-area-inset-top) + 8px)`,
                      }}
                    >
                      <div className="w-72 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden dark:bg-slate-950 dark:border-slate-800">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20">
                          <div className="flex items-center gap-3">
                            <AvatarWithFallback
                              src={user.photoURL}
                              userId={user.uid}
                              alt={`${displayName} avatar`}
                              size="md"
                              initials={initials}
                              showOnlineStatus
                              isOnline={isOnline}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {displayName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {email}
                              </p>
                              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                                <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                                {isOnline ? "Online" : "Offline"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                          <MenuBtn
                            onClick={() => {
                              router.push("/dashboard/profile");
                              setMenuOpen(false);
                            }}
                            icon={<User className="h-4 w-4" />}
                            title="Profile"
                            subtitle="Manage your account"
                          />
                          <MenuBtn
                            onClick={() => {
                              router.push("/dashboard/settings");
                              setMenuOpen(false);
                            }}
                            icon={<Settings className="h-4 w-4" />}
                            title="Settings"
                            subtitle="App preferences"
                          />
                          <MenuBtn
                            onClick={() => {
                              router.push("/dashboard/help");
                              setMenuOpen(false);
                            }}
                            icon={<HelpCircle className="h-4 w-4" />}
                            title="Help & Support"
                            subtitle="Get assistance"
                          />
                        </div>

                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Last synced</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {getSyncLabel(syncStatus.lastSyncTime).replace('Last synced ', '')}
                          </span>
                        </div>

                        <div className="p-1">
                          <button
                            onClick={logout}
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="absolute left-0 right-0"
              style={{ top: `calc(${navH}px + env(safe-area-inset-top))` }}
            >
              <div className="mx-3 sm:mx-4 rounded-2xl border border-black/10 bg-white/85 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5">
                  <div className="flex items-center gap-3">
                    <AvatarWithFallback
                      src={user.photoURL}
                      userId={user.uid}
                      alt={`${displayName} avatar`}
                      size="md"
                      initials={initials}
                      showOnlineStatus
                      isOnline={isOnline}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{email}</p>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  {NAV.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        go(item.href);
                        setDrawerOpen(false);
                      }}
                      className={[
                        "mx-2 mb-1 w-[calc(100%-1rem)]",
                        "inline-flex items-center justify-between rounded-md px-3 py-2.5 transition-colors",
                        active(item.href)
                          ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-medium"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        <span className={active(item.href) ? "font-semibold" : "font-medium"}>
                          {item.name}
                        </span>
                      </span>
                      <span className="text-xs opacity-70">{item.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-black/5 px-4 py-3 flex items-center justify-between text-sm">
                  <SyncBadge label={getSyncLabel(syncStatus.lastSyncTime)} />
                  <button
                    onClick={logout}
                    className="text-red-600 font-medium hover:underline"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- Subcomponents ---------- */

function PillButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-medium"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100 font-medium",
      ].join(" ")}
      title={label}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function IconBtn({
  children,
  label,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-2xl hover:bg-black/5 text-gray-800 " +
        className
      }
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function SyncBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
      {label}
    </div>
  );
}

function MenuBtn({
  onClick,
  icon,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 mx-1 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition-colors"
      style={{ width: "calc(100% - 8px)" }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
        {icon}
      </div>
      <div className="text-left">
        <div className="font-medium text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>
      </div>
    </button>
  );
}
