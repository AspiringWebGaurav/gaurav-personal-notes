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

// Comprehensive SEO Metadata
export const metadata: Metadata = {
  title: "Gaurav's Personal Notes",
  description: "Fast, private note-taking by Gaurav — create, search, and sync your personal notes.",
  keywords: ["notes", "personal notes", "markdown", "notebook", "Gaurav", "productivity", "sync", "private"],
  authors: [{ name: "Gaurav", url: "https://gaurav-personal-notes.vercel.app" }],
  creator: "Gaurav",
  publisher: "Gaurav",
  metadataBase: new URL("https://gaurav-personal-notes.vercel.app"),
  
  // Icons and Theme
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-256x256.png", sizes: "256x256", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  
  manifest: "/manifest.json",
  
  
  // Open Graph Protocol
  openGraph: {
    type: "website",
    url: "https://gaurav-personal-notes.vercel.app",
    siteName: "Gaurav's Personal Notes",
    title: "Gaurav's Personal Notes",
    description: "Fast, private note-taking by Gaurav — create, search, and sync your personal notes.",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Gaurav's Personal Notes Logo",
        type: "image/png"
      }
    ],
    locale: "en_US"
  },
  
  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    site: "@gaurav", // Replace with actual Twitter handle if available
    creator: "@gaurav",
    title: "Gaurav's Personal Notes",
    description: "Fast, private note-taking by Gaurav — create, search, and sync your personal notes.",
    images: ["/icon-512x512.png"]
  },
  
  // Additional SEO
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  
  // Verification (add when available)
  // verification: {
  //   google: "your-google-verification-code",
  //   yandex: "your-yandex-verification-code",
  // },
  
  category: "productivity"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0fb9b1",
  colorScheme: "light"
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://gaurav-personal-notes.vercel.app/#website",
      "url": "https://gaurav-personal-notes.vercel.app",
      "name": "Gaurav's Personal Notes",
      "description": "Fast, private note-taking by Gaurav — create, search, and sync your personal notes.",
      "publisher": {
        "@id": "https://gaurav-personal-notes.vercel.app/#organization"
      },
      "potentialAction": [
        {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://gaurav-personal-notes.vercel.app/dashboard/notes?search={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      ],
      "inLanguage": "en-US"
    },
    {
      "@type": "Organization",
      "@id": "https://gaurav-personal-notes.vercel.app/#organization",
      "name": "Gaurav's Personal Notes",
      "url": "https://gaurav-personal-notes.vercel.app",
      "logo": {
        "@type": "ImageObject",
        "url": "https://gaurav-personal-notes.vercel.app/icon-512x512.png",
        "width": 512,
        "height": 512
      },
      "sameAs": [],
      "founder": {
        "@type": "Person",
        "name": "Gaurav"
      }
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* PWA App Capabilities */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Notes" />
        
        {/* Microsoft Application Configuration */}
        <meta name="msapplication-TileColor" content="#0fb9b1" />
        
        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd)
          }}
        />
      </head>
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
