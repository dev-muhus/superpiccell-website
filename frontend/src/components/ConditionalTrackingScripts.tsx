'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import Cookies from 'js-cookie';
import { CookieConsents } from './CookieConsent';

// CookieConsentコンポーネントで設定したCookieキー
const COOKIE_CONSENT_KEY = 'cookie-consent';

/**
 * Cookie同意に基づいてトラッキングスクリプトを条件付きで読み込むコンポーネント
 */
const ConditionalTrackingScripts = () => {
  const [consents, setConsents] = useState<CookieConsents | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // クライアントサイドでのみCookieを読み込む
  useEffect(() => {
    const storedConsent = Cookies.get(COOKIE_CONSENT_KEY);
    
    if (storedConsent) {
      try {
        const parsedConsent = JSON.parse(storedConsent) as CookieConsents;
        setConsents(parsedConsent);
      } catch (error) {
        console.error('Failed to parse cookie consent:', error);
      }
    }
    
    setIsLoaded(true);
  }, []);

  // まだCookieが読み込まれていない場合はなにも表示しない
  if (!isLoaded) return null;

  // 分析系もマーケティング系も拒否されている場合はなにも表示しない
  if (!consents?.analytics && !consents?.marketing) return null;

  const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

  return (
    <>
      {/* Google Analytics 4 (gtag.js) - 分析系Cookieが許可されている場合のみ */}
      {consents?.analytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-script" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}');
            `}
          </Script>
        </>
      )}

      {/* マーケティング系のCookieが許可されている場合、追加のマーケティングスクリプトをここに追加 */}
      {consents?.marketing && (
        <>
          {/* 例: Facebook Pixel等のマーケティングスクリプト */}
          {/* <Script id="fb-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script> */}
        </>
      )}
    </>
  );
};

export default ConditionalTrackingScripts; 