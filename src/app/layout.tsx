import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ViewportRedirect } from "@/components/ViewportRedirect";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL 
      ? `https://${process.env.NEXT_PUBLIC_SITE_URL}`
      : process.env.VERCEL_PROJECT_PRODUCTION_URL 
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
  ),
  title: "GPN | Gaurav Personal Notes",
  description: "Enterprise-grade personal knowledge base and real-time collaboration workspace.",
  keywords: ["knowledge base", "notes", "collaboration", "real-time", "workspace", "gpn", "enterprise", "productivity"],
  authors: [{ name: "Gaurav" }],
  openGraph: {
    title: "GPN | Enterprise Knowledge Base",
    description: "Enterprise-grade personal knowledge base and real-time collaboration workspace.",
    siteName: "GPN",
    images: [
      {
        url: "/apple-icon.png",
        width: 180,
        height: 180,
        alt: "GPN Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GPN | Enterprise Knowledge Base",
    description: "Enterprise-grade personal knowledge base and real-time collaboration workspace.",
    images: ["/apple-icon.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const theme = localStorage.getItem('app-theme');
              if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches) || theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (_) {}
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ViewportRedirect />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
