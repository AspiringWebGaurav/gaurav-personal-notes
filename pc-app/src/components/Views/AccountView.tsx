import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import { useNotesStore } from '../../stores/notesStore';
import { Shield, Cloud, LogIn, LogOut, RefreshCw, Check } from 'lucide-react';

interface AccountViewProps {
  onOpenAuthModal: (mode?: 'default' | 'logout') => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onOpenAuthModal }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { isManualSyncing, status, triggerSync } = useSyncStore();
  const { notes } = useNotesStore();

  const [imgError, setImgError] = React.useState(false);
  const [justSynced, setJustSynced] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [user?.photoUrl]);

  const handleSyncNow = async () => {
    if (isManualSyncing) return;
    setJustSynced(false);
    try {
      await triggerSync();
      setJustSynced(true);
      setTimeout(() => {
        setJustSynced(false);
      }, 2000);
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  const avatarUrl = user?.photoUrl || (user as { photoURL?: string })?.photoURL;

  const initial = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'G';

  const formatLastSynced = (timestamp?: number | null) => {
    if (!timestamp) return 'Not synced yet';
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="flex-1 h-full overflow-hidden bg-white dark:bg-zinc-950 p-6 md:p-8 flex flex-col gap-5 select-none transition-colors">
      {/* 1. Page Header */}
      <div className="shrink-0">
        <span className="text-[11px] font-mono tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 uppercase">
          ACCOUNT
        </span>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-0.5">
          Account
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {isAuthenticated
            ? 'Manage your account and sync settings.'
            : 'Your notes are saved on this computer.'}
        </p>
      </div>

      {/* 2. Main Profile / Account Card */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] p-5 md:p-6 bg-white dark:bg-zinc-900 flex flex-col gap-5 shadow-2xs shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Avatar Square */}
            <div
              className={`w-12 h-12 rounded-[3px] flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 border transition-all ${
                isAuthenticated
                  ? 'border-zinc-200 dark:border-emerald-500/30 bg-gradient-to-br from-zinc-800 to-zinc-950 dark:from-emerald-950/60 dark:to-zinc-900 shadow-2xs'
                  : 'border-zinc-300 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {isAuthenticated && avatarUrl && !imgError ? (
                <img
                  src={avatarUrl}
                  alt={user?.displayName || user?.email || 'Profile'}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="font-mono text-sm tracking-wide text-zinc-100 dark:text-zinc-200">
                  {initial}
                </span>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {isAuthenticated
                  ? user?.displayName || user?.email
                  : 'Local Account'}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {isAuthenticated
                  ? user?.displayName && user?.email
                    ? `${user.email} • Synced across devices`
                    : 'Signed in • Notes sync across your devices'
                  : 'Saved on this computer'}
              </div>
            </div>
          </div>

          {/* EXACTLY ONE Primary Account Action Button */}
          {isAuthenticated ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onOpenAuthModal('logout')}
              className="px-4 py-2 rounded-[2px] border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800 text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Log out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthModal('default')}
              className="px-4 py-2 rounded-[2px] bg-black dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-mono font-semibold cursor-pointer flex items-center gap-2 transition-colors shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in</span>
            </button>
          )}
        </div>

        {/* Device & Status Details */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              DEVICE
            </div>
            <div className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">Windows PC</div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              APP VERSION
            </div>
            <div className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 font-mono">v0.0.1</div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              SAVED NOTES
            </div>
            <div className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 font-mono">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              STORAGE
            </div>
            <div className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  isAuthenticated ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
              />
              <span>{isAuthenticated ? 'Cloud Synced' : 'Saved Locally'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sync & Storage Card (Unified & stable, no jumping cards or neon banners) */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 bg-white dark:bg-zinc-900 flex flex-col gap-3 shadow-2xs shrink-0 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                justSynced
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : isManualSyncing
                  ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100'
                  : isAuthenticated
                  ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {justSynced ? (
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : isManualSyncing ? (
                <RefreshCw className="w-5 h-5 animate-spin text-zinc-900 dark:text-zinc-100" />
              ) : isAuthenticated ? (
                <Cloud className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {justSynced
                  ? 'Notes synced'
                  : isManualSyncing
                  ? 'Syncing notes...'
                  : isAuthenticated
                  ? 'Cloud sync is active'
                  : 'Local storage'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-lg leading-relaxed">
                {justSynced
                  ? 'Your notes are up to date and saved.'
                  : isManualSyncing
                  ? 'Updating your notes with your account.'
                  : isAuthenticated
                  ? `Your notes sync automatically across your devices. (Last synced: ${formatLastSynced(status.lastSyncedAt)})`
                  : 'Your notes stay on this computer. Sign in if you want to sync across devices.'}
              </p>
            </div>
          </div>

          {/* Sync action button */}
          {isAuthenticated && (
            <button
              type="button"
              disabled={isManualSyncing}
              onClick={handleSyncNow}
              className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer disabled:cursor-wait flex items-center gap-1.5 shrink-0 shadow-2xs ${
                justSynced
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                  : isManualSyncing
                  ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750'
              }`}
            >
              {justSynced ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Synced</span>
                </>
              ) : isManualSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Sync now</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Inline hairline progress line during sync (Zero layout shift, zero jargon) */}
        {isAuthenticated && isManualSyncing && (
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in duration-150">
            <div className="w-full h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 w-full animate-pulse transition-all duration-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
