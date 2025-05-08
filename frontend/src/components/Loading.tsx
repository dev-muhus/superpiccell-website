'use client';

import LoadingSpinner from './LoadingSpinner';

interface LoadingProps {
  message?: string;
  fullPage?: boolean;
  size?: number | 'sm' | 'md' | 'lg';
}

/**
 * LoadingSpinnerを拡張したより高レベルのローディングコンポーネント
 * 
 * 違い:
 * - LoadingSpinner: 単純なスピナーのみ（UI要素として使用）
 * - Loading: メッセージやフルページオーバーレイなどの追加機能を持つ（UX要素として使用）
 */
export default function Loading({ 
  message = '読み込み中です...',
  fullPage = false,
  size = 'md'
}: LoadingProps) {
  const containerClasses = fullPage 
    ? 'fixed inset-0 bg-white bg-opacity-80 z-50 flex flex-col items-center justify-center'
    : 'w-full py-8 flex flex-col items-center justify-center';

  return (
    <div className={containerClasses}>
      <LoadingSpinner size={size} className="mb-4" />
      {message && <p className="text-gray-600">{message}</p>}
    </div>
  );
} 