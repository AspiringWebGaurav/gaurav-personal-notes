import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { SyncStatusProvider } from "@/components/SyncStatusProvider";
import GlobalNavbar from "@/components/GlobalNavbar";
import Breadcrumb from "@/components/Breadcrumb";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Gaurav's Personal Notes",
  description: "Personal notes and money tracker app with real-time sync",
  keywords: ["notes", "money tracker", "personal", "productivity"],
  authors: [{ name: "Gaurav" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900 min-h-screen">
        <AuthProvider>
          <SyncStatusProvider>
            <GlobalNavbar />
            <Breadcrumb />
            {children}
          </SyncStatusProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
