import type { Metadata } from "next";
import { DevelopersClient } from "./DevelopersClient";

export const metadata: Metadata = {
  title: "Developer API & Protocols | Gaurav Personal Notes (GPN)",
  description:
    "Official developer documentation, release delivery protocol, GPHost Cloudflare R2 APIs, and payload encryption specifications for Gaurav Personal Notes.",
  openGraph: {
    title: "Developer API & Protocols | Gaurav Personal Notes",
    description:
      "Explore GPN release endpoints, manifest schemas, GPHost hierarchical storage APIs, and client SDKs.",
  },
};

export default function DevelopersPage() {
  return <DevelopersClient />;
}
