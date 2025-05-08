'use client';

import { ReactNode } from 'react';
import Head from 'next/head';

export interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  contentClass?: string;
  withHeaderSpace?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}

/**
 * すべてのページで使用する共通レイアウトコンポーネント
 * ヘッダーとの間隔を一貫して管理します
 */
export default function PageLayout({
  children,
  title,
  contentClass = '',
  withHeaderSpace = true,
  maxWidth = '7xl'
}: PageLayoutProps) {
  // ヘッダー用の固定された間隔
  const HEADER_SPACING = 'mt-16';
  
  // 最大幅のマッピング
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full'
  };
  
  return (
    <>
      {title && (
        <Head>
          <title>{title} | Super Piccell</title>
        </Head>
      )}
      <div className={`w-full flex-grow ${withHeaderSpace ? HEADER_SPACING : ''}`}>
        <main className={`container mx-auto ${maxWidthClasses[maxWidth]} px-4 py-4 flex-grow ${contentClass}`}>
          {children}
        </main>
      </div>
    </>
  );
} 