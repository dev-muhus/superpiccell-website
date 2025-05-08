'use client';

import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { ReactNode, useEffect, useState, PropsWithChildren } from 'react';

// ContentLayoutコンポーネント用のProps型定義
interface ContentLayoutProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  contentClass?: string;
  backUrl?: string;
  backText?: string;
  rightContent?: ReactNode;
}

/**
 * コンテンツ領域のレイアウトを提供するコンポーネント
 * タイトルバーとコンテンツエリアのレイアウトを一貫して管理します
 */
export default function ContentLayout({
  children,
  title,
  subtitle,
  contentClass = '',
  backUrl,
  backText,
  rightContent,
}: ContentLayoutProps) {
  const [mounted, setMounted] = useState(false);

  // マウント後にスタイルを適用して確実にレンダリングされるようにする
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="content-layout">
      {/* タイトルセクション - シンプルなスタイルに変更 */}
      <div className="content-layout__header py-4">
        <div className="content-layout__title-container flex items-start">
          <div className="content-layout__title-wrapper flex-1">
            {backUrl && (
              <div className="inline-flex items-center mb-3">
                <Link 
                  href={backUrl} 
                  className="content-layout__back-link flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                  aria-label={backText || "戻る"}
                >
                  <FaArrowLeft size={14} className="mr-2" />
                  {backText && <span className="text-sm font-medium">{backText}</span>}
                </Link>
              </div>
            )}
            {title && (
              <h1 className="content-layout__title text-2xl font-bold">{title}</h1>
            )}
            {subtitle && (
              <p className="content-layout__subtitle text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {rightContent && (
            <div className="content-layout__actions">
              {rightContent}
            </div>
          )}
        </div>
      </div>

      {/* コンテンツエリア - 適切なマージンで区切り */}
      <div className={`content-layout__content mt-4 ${contentClass}`}>
        {mounted && children}
      </div>
    </div>
  );
} 