import '../styles/globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ScrollToTopButton from '../components/ScrollToTopButton';
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import CookieConsent from '@/components/CookieConsent';
import ConditionalTrackingScripts from '@/components/ConditionalTrackingScripts';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_TITLE || 'Super Piccell',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Super Piccell - Web3 Media Franchise',
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://superpiccell.com',
  },
  openGraph: {
    title: process.env.NEXT_PUBLIC_SITE_TITLE || 'Super Piccell',
    description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Super Piccell - Web3 Media Franchise',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://superpiccell.com',
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Super Piccell',
    locale: 'ja_JP',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
    <html lang="ja">
      <head>
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
        <link 
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&display=swap" 
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": process.env.NEXT_PUBLIC_SITE_TITLE || 'Super Piccell',
              "alternateName": process.env.NEXT_PUBLIC_SITE_ALTERNATE_NAME || 'SuperPiccell',
              "url": process.env.NEXT_PUBLIC_SITE_URL || 'https://superpiccell.com',
              "description": process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'Super Piccell - Web3 Media Franchise',
            }),
          }}
        />
      </head>
      <body>
        <Header />
        {/* Toasterコンポーネント */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              style: {
                background: 'green',
              },
            },
            error: {
              style: {
                background: 'red',
              },
            },
          }}
        />
        {children}
        <Footer />
        <ScrollToTopButton />
        <CookieConsent privacyPolicyUrl="/privacy-policy" />
        <ConditionalTrackingScripts />
      </body>
    </html>
    </ClerkProvider>
  );
} 