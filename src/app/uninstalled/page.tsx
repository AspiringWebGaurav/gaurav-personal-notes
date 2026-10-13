import type { Metadata } from "next";
import { Suspense } from "react";
import UninstalledClient from "./UninstalledClient";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Uninstalled | Gaurav Personal Notes",
  description: "Gaurav Personal Notes has been uninstalled. You can reinstall anytime.",
};

export default function UninstalledPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 flex items-center justify-center text-xs text-zinc-400">
        Loading...
      </div>
    }>
      <UninstalledClient />
    </Suspense>
  );
}
