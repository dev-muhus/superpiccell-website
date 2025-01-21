import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE || "Super Piccell";
  const siteDescription = process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Super Piccell - A creative project";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://superpiccell.com";
  const siteAlternateName = process.env.NEXT_PUBLIC_SITE_ALTERNATE_NAME || "SuperPiccell";

  return (
    <Html lang="ja">
      <Head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${googleAnalyticsId}');
            `,
          }}
        />
        <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&display=swap" rel="stylesheet" />
        {/* Favicon and Apple Touch Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" /> */}
        {/* <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" /> */}
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
        {/* <link rel="manifest" href="/site.webmanifest" /> */}
        {/* Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": siteTitle,
              "alternateName": siteAlternateName,
              "url": siteUrl,
              "description": siteDescription,
            }),
          }}
        />
      </Head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${googleAnalyticsId}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
