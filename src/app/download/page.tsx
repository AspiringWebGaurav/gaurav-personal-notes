import type { Metadata } from "next";
import { DownloadClient } from "./DownloadClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Download Apps | Gaurav Personal Notes (Windows & Android)",
  description: "Download Gaurav Personal Notes for Windows 10/11 and Android. Offline-first encrypted notes with instant search and secure cloud sync.",
};

const baseDesktopDownloadUrl = (
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
  "https://gphost.eu.cc/raw/gpn-app"
).split("?")[0];

export const DESKTOP_DOWNLOAD_URL = `${baseDesktopDownloadUrl}?v=0.0.0-fresh-${Date.now()}`;
export const DESKTOP_SHARE_URL = `https://gphost.eu.cc/f/gpn-app?v=0.0.0-fresh-${Date.now()}`;
export const DESKTOP_EMBED_URL = "https://gphost.eu.cc/f/gpn-app/preview";

const baseMobileDownloadUrl = (
  process.env.NEXT_PUBLIC_MOBILE_DOWNLOAD_URL ||
  "https://gphost.eu.cc/raw/YrMOvyJLNjGO"
).split("?")[0];

export const MOBILE_DOWNLOAD_URL = `${baseMobileDownloadUrl}?v=0.0.0-fresh-${Date.now()}`;
export const MOBILE_SHARE_URL = `https://gphost.eu.cc/f/YrMOvyJLNjGO?v=0.0.0-fresh-${Date.now()}`;
export const MOBILE_EMBED_URL = "https://gphost.eu.cc/f/YrMOvyJLNjGO/preview";

export default function DownloadPage() {
  return (
    <DownloadClient
      desktopDownloadUrl={DESKTOP_DOWNLOAD_URL}
      desktopShareUrl={DESKTOP_SHARE_URL}
      desktopEmbedUrl={DESKTOP_EMBED_URL}
      mobileDownloadUrl={MOBILE_DOWNLOAD_URL}
      mobileShareUrl={MOBILE_SHARE_URL}
      mobileEmbedUrl={MOBILE_EMBED_URL}
    />
  );
}
