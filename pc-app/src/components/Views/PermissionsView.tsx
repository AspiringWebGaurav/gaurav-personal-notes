import React from 'react';
import {
  Shield,
  Keyboard,
  Search,
  Wifi,
  Cpu,
  Lock,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';

interface PermissionItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  status: 'ACTIVE' | 'GRANTED' | 'PROTECTED';
  details: string;
}

export const PermissionsView: React.FC = () => {
  const permissions: PermissionItem[] = [
    {
      id: 'dpapi',
      name: 'Hardware Encryption (Windows DPAPI)',
      category: 'CRYPTOGRAPHY',
      description: 'Protects local SQLite vault keys using native Windows machine cryptography bound to your Windows user account.',
      icon: Lock,
      status: 'ACTIVE',
      details: 'CryptProtectData / CryptUnprotectData',
    },
    {
      id: 'keyboard',
      name: 'Global Hotkey & Keyboard Access',
      category: 'INPUT HOOK',
      description: 'Permission to capture Ctrl+Shift+N and Ctrl+Shift+C system-wide to summon the Quick Capture scratchpad from any app.',
      icon: Keyboard,
      status: 'GRANTED',
      details: 'tauri-plugin-global-shortcut',
    },
    {
      id: 'fts5',
      name: 'Full-Text Search Indexing (FTS5)',
      category: 'DATABASE ACCESS',
      description: 'Direct local database indexing privilege enabling Porter unicode61 ranked search across all encrypted and local notes.',
      icon: Search,
      status: 'GRANTED',
      details: 'SQLite 3.46 FTS5 virtual tables',
    },
    {
      id: 'network',
      name: 'Outbound Network & Cloud Sync',
      category: 'NETWORK SOCKETS',
      description: 'Outbound HTTPS communication privilege for multi-device note synchronization and Cloudflare R2 media hosting via GPHost.',
      icon: Wifi,
      status: 'GRANTED',
      details: 'Encrypted TLS 1.3 / reqwest',
    },
    {
      id: 'storage',
      name: 'Local Storage & AppData Directory',
      category: 'FILE SYSTEM ACCESS',
      description: 'Read and write permissions for the isolated local database, write-ahead logs, and application cache directory.',
      icon: HardDrive,
      status: 'GRANTED',
      details: '%LOCALAPPDATA%\\Gaurav Personal Notes',
    },
    {
      id: 'process',
      name: 'Process Isolation & Memory Protection',
      category: 'MEMORY & SYSTEM SECURITY',
      description: 'Process working-set isolation preventing external memory scraping. Zero third-party telemetry and zero background trackers.',
      icon: Cpu,
      status: 'PROTECTED',
      details: 'Windows Process Working Set Sandbox',
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-zinc-950 p-8 flex flex-col gap-6 select-none transition-colors">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono tracking-[0.25em] font-semibold text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>SYSTEM ACCESS &amp; PERMISSIONS</span>
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
          Permissions.
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Security access grants, hardware cryptography, and Windows OS integration privileges.
        </p>
      </div>

      {/* Permissions Grid / List */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        {permissions.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-[2px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {item.category}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
                      {item.details}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {item.name}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                  {item.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Summary Badge */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] p-4 bg-zinc-50/50 dark:bg-zinc-900/60 flex items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>All system privileges are scoped to local execution. Zero elevated root permissions required.</span>
        </div>
        <span className="text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
          6/6 ACTIVE
        </span>
      </div>
    </div>
  );
};
