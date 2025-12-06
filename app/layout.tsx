import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export const metadata: Metadata = {
  title: "Parkshare - Utleie av private parkeringsplasser",
  description: "Finn eller leie ut private parkeringsplasser",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Parkshare",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192",
    apple: "/icon-192",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Parkshare" />
        <link rel="apple-touch-icon" href="/icon-192" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}

// Service Worker Registration Component
function ServiceWorkerRegistration() {
  if (typeof window === "undefined") return null;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(function(registration) {
                  console.log('ServiceWorker registration successful:', registration.scope);
                  
                  // Check for updates periodically
                  registration.addEventListener('updatefound', function() {
                    console.log('ServiceWorker update found');
                  });
                })
                .catch(function(err) {
                  console.error('ServiceWorker registration failed:', err);
                });
            });
          }
        `,
      }}
    />
  );
}

