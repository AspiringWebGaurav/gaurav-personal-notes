export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 p-8 sm:p-16 lg:p-24 selection:bg-violet-500/30">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-8 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 dark:from-cyan-400 dark:via-violet-400 dark:to-fuchsia-400">
          Terms of Service
        </h1>
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-lg text-zinc-600 dark:text-zinc-300">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="mt-8 space-y-6 text-zinc-600 dark:text-zinc-400">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">1. Acceptance of Terms</h2>
            <p>
              By accessing and using GPN Workspace, you accept and agree to be bound by the terms and provision of this agreement. 
              In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>
            
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">2. Description of Service</h2>
            <p>
              GPN Workspace provides users with access to a rich collection of resources, including enterprise knowledge management, collaboration tools, and personalized content formatting capabilities.
            </p>

            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">3. Privacy Policy</h2>
            <p>
              Your use of the service is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the site and informs users of our data collection practices.
            </p>
            
            <p className="pt-8 italic text-sm text-zinc-500">
              Note: This is a placeholder terms of service page for the application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
