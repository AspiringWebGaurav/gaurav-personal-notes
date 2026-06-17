export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 p-8 sm:p-16 lg:p-24 selection:bg-fuchsia-500/30">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-600 dark:from-fuchsia-400 dark:via-violet-400 dark:to-cyan-400">
          Privacy Policy
        </h1>
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-lg text-zinc-600 dark:text-zinc-300">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="mt-8 space-y-6 text-zinc-600 dark:text-zinc-400">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">1. Information We Collect</h2>
            <p>
              We collect information to provide better services to all our users. When you use GPN Workspace, we collect the following types of information:
              authentication data (via Google), usage analytics, and content you explicitly choose to store in the workspace.
            </p>
            
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">2. How We Use Information We Collect</h2>
            <p>
              We use the information we collect from all our services to provide, maintain, protect and improve them, to develop new ones, and to protect GPN Workspace and our users.
            </p>

            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">3. Information We Share</h2>
            <p>
              We do not share personal information with companies, organizations and individuals outside of GPN Workspace unless one of the following circumstances applies: with your consent, for external processing, or for legal reasons.
            </p>
            
            <p className="pt-8 italic text-sm text-zinc-500">
              Note: This is a placeholder privacy policy page for the application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
