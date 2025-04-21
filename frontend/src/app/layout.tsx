import '../styles/globals.css';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import type { Metadata, Viewport } from 'next';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&display=swap" 
          rel="stylesheet" 
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
        {/* Google Tag Manager */}
        <script
          id="gtm-script"
          dangerouslySetInnerHTML={{
            __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}');
            `,
          }}
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
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
} 