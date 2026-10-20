import type { Metadata } from "next";
import { HowItWorksClient } from "./HowItWorksClient";

export const metadata: Metadata = {
  title: "How It Works | Gaurav Personal Notes (GPN Architecture)",
  description:
    "Explore how Gaurav Personal Notes works: local-first offline storage, AES-256-GCM encryption, Cloudflare R2 edge sync, and atomic over-the-air updates.",
  openGraph: {
    title: "How It Works | Gaurav Personal Notes Architecture",
    description:
      "Deep dive into GPN architecture: offline SQLite, delta cloud sync, zero-knowledge encryption, and atomic updates.",
  },
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
