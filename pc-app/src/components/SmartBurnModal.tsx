import { useState } from 'react';
import { collabService } from '../services/collabService';
import { gphostService } from '../services/gphostService';
import { Flame, X, Copy, Check, Eye, Send, AlertTriangle, Loader2 } from 'lucide-react';

interface SmartBurnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartBurnModal = ({ isOpen, onClose }: SmartBurnModalProps) => {
  const [tab, setTab] = useState<'create' | 'read'>('create');
  const [content, setContent] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [burnedContent, setBurnedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!content.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await collabService.createBurnNote(content.trim());
      setGeneratedToken(token);
      setContent('');
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadAndBurn = async () => {
    if (!tokenInput.trim()) return;
    setIsLoading(true);
    setError(null);
    setBurnedContent(null);
    try {
      // In case user pasted full URL, extract token
      const cleanToken = tokenInput.trim().split('/').pop() || tokenInput.trim();
      const readText = await collabService.readAndBurnNote(cleanToken);
      if (readText) {
        setBurnedContent(readText);
        const media = gphostService.extractGphostMedia(readText);
        if (media.length > 0) {
          gphostService.deleteMediaBatch(media).catch(console.warn);
        }
      } else {
        setError('This note does not exist or has already been burned.');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedToken) return;
    navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2px] shadow-2xl overflow-hidden p-6 flex flex-col gap-4 transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[2px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-sans">
                Smart Burn Notes
              </h3>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                View-Once Self-Destructing Notes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-0.5 bg-zinc-100 dark:bg-zinc-950 rounded-[2px] border border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            onClick={() => {
              setTab('create');
              setError(null);
            }}
            className={`py-1 rounded-[2px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              tab === 'create'
                ? 'bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            CREATE NOTE
          </button>
          <button
            onClick={() => {
              setTab('read');
              setError(null);
            }}
            className={`py-1 rounded-[2px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              tab === 'read'
                ? 'bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            READ &amp; BURN
          </button>
        </div>

        {/* Create Tab */}
        {tab === 'create' && (
          <div className="space-y-3">
            {generatedToken ? (
              <div className="p-4 rounded-[2px] bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 text-xs font-semibold">
                  <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Burn Note Created!</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                  Share this token with the recipient. The moment they open it, it will be deleted permanently.
                </p>

                <div className="flex items-center gap-2 p-2 rounded-[2px] bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900">
                  <span className="text-xs font-mono text-zinc-800 dark:text-zinc-200 flex-1 truncate">
                    {generatedToken}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded-[2px] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setGeneratedToken(null)}
                  className="w-full py-1.5 rounded-[2px] text-xs font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Create another burn note
                </button>
              </div>
            ) : (
              <>
                <textarea
                  rows={4}
                  placeholder="Enter secret message, password, or paste image/screenshot to burn after reading..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onPaste={async (e) => {
                    const items = Array.from(e.clipboardData.items || []);
                    const mediaItem = items.find(
                      (i) => i.type.startsWith('image/') || i.type.startsWith('video/')
                    );
                    if (mediaItem) {
                      const file = mediaItem.getAsFile();
                      if (file) {
                        e.preventDefault();
                        setIsUploadingMedia(true);
                        try {
                          const res = await gphostService.uploadMedia(file);
                          if (res.rawUrl) {
                            const isVid = file.type.startsWith('video/');
                            const insertText = isVid
                              ? `\n[Video Attachment: ${res.filename}](${res.rawUrl})\n`
                              : `\n![Attached Image: ${res.filename}](${res.rawUrl})\n`;
                            setContent((prev) => (prev ? `${prev}\n${insertText}` : insertText));
                          }
                        } catch (err) {
                          console.error('Failed to upload media in SmartBurn:', err);
                        } finally {
                          setIsUploadingMedia(false);
                        }
                      }
                    }
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2px] p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 resize-none leading-relaxed transition-colors font-sans"
                />

                {isUploadingMedia && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[11px] font-mono font-medium text-sky-700 dark:text-sky-300">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400" />
                    <span>Uploading pasted image to GPHost CDN...</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Note will be destroyed forever upon first view.</span>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={isLoading || !content.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-[2px] bg-black dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-mono text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'CREATING...' : 'CREATE BURN NOTE'}</span>
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'read' && (
          <div className="space-y-3">
            {burnedContent ? (
              <div className="p-4 rounded-[2px] bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-300 text-xs font-semibold">
                  <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Note Read &amp; Burned</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-normal">
                  This note has now been deleted from the database. It cannot be viewed again.
                </p>

                <div className="p-3 rounded-[2px] bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900 text-xs text-zinc-800 dark:text-zinc-200 font-mono whitespace-pre-wrap select-text">
                  {burnedContent}
                </div>

                <button
                  onClick={() => {
                    setBurnedContent(null);
                    setTokenInput('');
                  }}
                  className="w-full py-1.5 rounded-[2px] text-xs font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Read another burn note
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Paste burn note token or link..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2px] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                />

                {error && (
                  <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-[2px] border border-rose-200 dark:border-rose-900 font-mono">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleReadAndBurn}
                  disabled={isLoading || !tokenInput.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-[2px] bg-black dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-mono text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'BURNING & OPENING...' : 'OPEN & BURN NOTE'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
