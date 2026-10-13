import Link from "next/link";
import { ArrowLeft, ShieldCheck, RefreshCw, Lock, EyeOff, Server, HardDrive } from "lucide-react";

export default function PrivacyPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#121316] text-[#202124] dark:text-[#e8eaed] selection:bg-cyan-500/30 transition-colors">
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
              href="/terms"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <Link
              href="/patch-notes"
              className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline"
            >
              Patch Notes
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 text-xs font-semibold mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy & Security Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Last updated: {currentDate} • Complete data transparency
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-cyan-600 dark:text-cyan-400">1.</span>
              Privacy Principles & Local-First Isolation
            </h2>
            <p>
              Gaurav Personal Notes (&ldquo;GPN&rdquo;) is built with privacy-by-design principles. We believe your
              personal notes belong exclusively to you. Your thoughts, journals, and private entries are stored
              locally on your device in an encrypted SQLite database:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <li>We never sell, monetize, or harvest your personal notes or notebook data.</li>
              <li>We do not train artificial intelligence or machine learning models on your private content.</li>
              <li>You can operate GPN 100% offline in Local Vault mode with zero network communication.</li>
            </ul>
          </section>

          {/* Section 2 - OTA Update Verification Telemetry (CRITICAL) */}
          <section className="space-y-3 p-5 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-800/50">
            <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 font-bold text-base">
              <RefreshCw className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>2. Automated Over-The-Air (OTA) Updates & Anonymous Release Telemetry</span>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 font-medium">
              Because GPN operates with mandatory Over-The-Air continuous updates, the desktop software
              communicates with our release infrastructure under strict privacy guarantees:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <li>
                <strong>Minimal Release Verification Query:</strong> When checking for updates, the application
                submits an HTTPS request to <code>https://gphost.eu.cc/api/v1/releases/gpn/latest</code>. This request
                contains strictly anonymous technical parameters:
                <ul className="list-circle pl-5 mt-1 space-y-0.5 text-zinc-500 dark:text-zinc-400 text-xs font-mono">
                  <li>target: &ldquo;windows-x86_64&rdquo;</li>
                  <li>arch: &ldquo;x86_64&rdquo;</li>
                  <li>current_version: &ldquo;0.0.6&rdquo;</li>
                </ul>
              </li>
              <li>
                <strong>Zero Personal Data or Note Transmission:</strong> Update check requests never transmit note
                contents, database keys, user identity, file paths, hardware serials, or behavioral telemetry.
              </li>
              <li>
                <strong>Cryptographic Verification on Device:</strong> Update packages are signed using Ed25519
                Minisign private keys. Before any update binary is launched, the local desktop client verifies the
                single-line Base64 cryptographic signature against the embedded public key, guaranteeing zero payload
                tampering.
              </li>
              <li>
                <strong>Edge Network Delivery:</strong> Release binaries are distributed over Cloudflare R2 edge
                locations with standard IP-level network protections and zero persistent logging of user identity.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-cyan-600 dark:text-cyan-400">3.</span>
              Information We Collect When Using Cloud Features
            </h2>
            <p>
              If you explicitly activate Cloud Sync or Collaborative Rooms, we process minimal operational data:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <li>
                <strong>Authentication Data:</strong> When signing in via Google, we receive your email address,
                display name, and unique Google User ID (UID) via Firebase Authentication to identify your cloud vault.
              </li>
              <li>
                <strong>Cloud Vault Storage:</strong> Your synchronized notes are stored in Firestore/Cloudflare
                databases strictly to provide multi-device sync between your PC and web companion.
              </li>
              <li>
                <strong>Ephemeral Burn Notes:</strong> Notes created with auto-burn parameters are deleted immediately
                from memory and database once viewed or expired, with zero persistent copies retained.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-cyan-600 dark:text-cyan-400">4.</span>
              Data Retention & Account Deletion
            </h2>
            <p>
              You maintain sovereign control over your data lifecycle:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <li>
                <strong>Local Deletion:</strong> Deleting notes or emptying the trash permanently removes records from
                your local SQLite database.
              </li>
              <li>
                <strong>Cloud Purge:</strong> When you delete a note or clear your vault in Settings, deletion records
                propagate immediately across cloud endpoints.
              </li>
              <li>
                <strong>Complete Account Reset:</strong> You can wipe all cloud mirrors and local databases directly
                via the Desktop Account Settings view at any time.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-cyan-600 dark:text-cyan-400">5.</span>
              Security & Credential Vaulting
            </h2>
            <p>
              GPN protects your session credentials using native operating system vaults:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <li>Windows Credential Manager securely isolates authentication tokens from unprivileged software.</li>
              <li>All API communication takes place exclusively over TLS 1.3 encrypted transport.</li>
              <li>Cloudflare edge proxies enforce strict DDoS protection and origin rate limiting.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-cyan-600 dark:text-cyan-400">6.</span>
              Contact & Privacy Inquiries
            </h2>
            <p>
              If you have any questions or concerns regarding our privacy practices, please contact us via our
              official repository support channels or email <code>support@gpnotes.eu.cc</code>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Gaurav Personal Notes (GPN). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              Terms of Service
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
