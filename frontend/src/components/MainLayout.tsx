'use client';

import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  backUrl?: string;
  hideBackButton?: boolean;
  rightContent?: ReactNode;
}

export default function MainLayout({
  children,
  title,
  backUrl = '/profile',
  hideBackButton = false,
  rightContent
}: MainLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl flex-grow flex flex-col" style={{ marginTop: '5rem' }}>
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between sticky top-16 z-10">
        <div className="flex items-center">
          {!hideBackButton && (
            <Link href={backUrl} className="text-blue-500 mr-3">
              <FaArrowLeft />
            </Link>
          )}
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        
        {rightContent && (
          <div className="flex items-center">
            {rightContent}
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
} 