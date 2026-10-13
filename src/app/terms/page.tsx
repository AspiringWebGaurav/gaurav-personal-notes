import Link from "next/link";
import { ArrowLeft, ShieldCheck, RefreshCw, HardDrive, Lock, FileText } from "lucide-react";

export default function TermsPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#121316] text-[#202124] dark:text-[#e8eaed] selection:bg-violet-500/30 transition-colors">
      <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16 lg:py-20">
        {/* Navigation Bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to GPN</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/privacy"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <Link
              href="/patch-notes"
              className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
            >
              Patch Notes
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 text-xs font-semibold mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Last updated: {currentDate} • Effective immediately
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-violet-600 dark:text-violet-400">1.</span>
              Acceptance of Terms
            </h2>
            <p>
              By accessing, downloading, installing, or using Gaurav Personal Notes (&ldquo;GPN&rdquo;,
              &ldquo;GPN Workspace&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or the &ldquo;Service&rdquo;),
              including the web companion application and the Windows native desktop software, you agree
              to be legally bound by these Terms of Service. If you do not agree to these terms, you must not
              download, install, or use the application.
            </p>
          </section>

          {/* Section 2 - Mandatory OTA Updates (CRITICAL) */}
          <section className="space-y-3 p-5 rounded-2xl bg-violet-50/70 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-800/50">
            <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300 font-bold text-base">
              <RefreshCw className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>2. Mandatory Continuous Over-The-Air (OTA) Updates & Versioning</span>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 font-medium">
              Gaurav Personal Notes is intentionally engineered as an offline-first system with <strong>mandatory,
              continuous Over-The-Air (OTA) background updates</strong>. This architecture is fundamental to how
              the software functions:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <li>
                <strong>Base Installer Anchor (v0.0.0):</strong> New installations are initialized using the
                permanent Base v0.0.0 Windows setup executable. Upon initial launch, the application automatically
                discovers, downloads, and silently installs the single active production release manifest.
              </li>
              <li>
                <strong>Mandatory Automatic Execution:</strong> The desktop software periodically performs automated
                release manifest checks (on startup, on 30-minute intervals, and upon network reconnection). When a
                new verified build is published, GPN downloads and applies the update in the background, elevating the
                process upon restart. <strong>Users may not opt out of mandatory updates</strong>.
              </li>
              <li>
                <strong>Zero Historical Binary Archival:</strong> To maintain strict Cloudflare edge storage integrity,
                prevent cryptographic fragmentation, and eliminate protocol drift, superseded intermediate binaries
                (e.g., past patches) are permanently purged upon release of subsequent builds. The ecosystem
                strictly maintains exactly two files in Cloudflare R2 storage at all times: the Base v0.0.0 anchor
                and the single active OTA release. Past standalone installers are not distributed or preserved.
              </li>
              <li>
                <strong>Integrity & Cryptographic Security:</strong> Mandatory updates are essential to verify
                Ed25519 Minisign public key signatures, execute SQLite database migrations, maintain cloud sync
                compatibility, and patch vulnerabilities. Running superseded versions is structurally unsupported.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-violet-600 dark:text-violet-400">3.</span>
              Local-First Architecture & Data Ownership
            </h2>
            <p>
              GPN adheres to a local-first philosophy. Your personal notes, notebooks, and vault entries are stored
              primarily within a local SQLite database on your device:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <li>You retain 100% intellectual property ownership of all notes and media created within GPN.</li>
              <li>We do not claim ownership, licensing rights, or commercial permissions over your personal content.</li>
              <li>You may export your database or vault contents in open formats (Markdown, JSON, ZIP) at any time.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-violet-600 dark:text-violet-400">4.</span>
              Cloud Synchronization & Collaborative Workspace
            </h2>
            <p>
              When you authenticate with Google Cloud, GPN provides automated cloud synchronization and ephemeral
              peer collaboration:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <li>
                <strong>Encrypted Mirroring:</strong> Cloud sync maintains an encrypted mirror of your local database
                for cross-device availability between your desktop application and web companion.
              </li>
              <li>
                <strong>Smart Burn Notes:</strong> Ephemeral notes created with burn parameters are permanently destroyed
                upon access or expiration, with zero server-side recovery capability.
              </li>
              <li>
                <strong>Collaborative Rooms:</strong> Real-time editing occurs over peer-to-peer or authenticated
                relay protocols. You are responsible for any invite links or room codes you share with third parties.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-violet-600 dark:text-violet-400">5.</span>
              Acceptable Use & User Conduct
            </h2>
            <p>
              You agree not to misuse GPN or assist anyone else in doing so. You must not:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <li>Probe, scan, or test the vulnerability of any GPHost release endpoint or API server.</li>
              <li>Attempt to reverse-engineer, forge, or bypass Ed25519 Minisign cryptographic verification signatures.</li>
              <li>Use the collaborative features or burn note links to transmit malicious code, malware, or unlawful content.</li>
              <li>Interfere with or disrupt any user, host, or network connected to the service.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-violet-600 dark:text-violet-400">6.</span>
              Disclaimers & Limitation of Liability
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo;
              AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED.
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. UNDER NO CIRCUMSTANCES
              SHALL GAURAV PATIL OR GPN CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO DATA LOSS OR
              HARDWARE FAILURES.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-violet-600 dark:text-violet-400">7.</span>
              Modifications to Terms
            </h2>
            <p>
              We reserve the right to revise these Terms at any time. Notice of material modifications will be
              provided via release patch notes on our website and in-app update changelogs. Continued use of the
              Service after changes become effective constitutes acceptance of the revised Terms.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Gaurav Personal Notes (GPN). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/patch-notes" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              Release Notes
            </Link>
            <Link href="/download" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              Download
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
