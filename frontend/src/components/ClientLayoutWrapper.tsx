'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import ScrollToTopButton from './ScrollToTopButton';
import CookieConsent from './CookieConsent';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // ゲームページかどうかを判定
  const isGamePage = pathname?.includes('/dashboard/games/') && !pathname?.endsWith('/dashboard/games/');
  
  if (isGamePage) {
    // ゲームページの場合はヘッダー・フッターなしのフルスクリーンレイアウト
    return (
      <div className="game-layout h-screen bg-black overflow-hidden">
        {children}
      </div>
    );
  }
  
  // 通常のページの場合は標準レイアウト
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <ScrollToTopButton />
      <CookieConsent privacyPolicyUrl="/privacy-policy" />
    </>
  );
} 