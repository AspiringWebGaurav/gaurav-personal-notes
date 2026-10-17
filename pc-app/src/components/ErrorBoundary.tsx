import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GPN Crash Guard] Uncaught error in React tree:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('gpn_session_tab');
      localStorage.removeItem('gpn_active_note_id');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isDark =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');

      return (
        <div
          className={`w-screen h-screen flex flex-col select-none overflow-hidden font-sans ${
            isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
          }`}
        >
          {/* Frameless top draggable bar */}
          <div
            data-tauri-drag-region
            className="h-8 w-full flex items-center justify-between px-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm"
          >
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Gaurav Personal Notes — Recovery Mode
            </span>
            <button
              onClick={() => window.close()}
              className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Close Window"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Centered Crash Guard UI */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Unable to Load View
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm">
                A component error occurred while rendering the desktop interface. Your notes remain safe.
              </p>

              {this.state.error && (
                <div className="w-full text-left p-3 mb-5 rounded-lg bg-zinc-100 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-32">
                  <div className="font-semibold text-rose-600 dark:text-rose-400 mb-1">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div className="text-zinc-500 dark:text-zinc-500 text-[10px] whitespace-pre-wrap">
                      {this.state.error.stack.split('\n').slice(1, 4).join('\n')}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2.5 w-full">
                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload App
                </button>
                <button
                  onClick={this.handleResetCache}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Clear temporary session tabs and reload"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset View
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
