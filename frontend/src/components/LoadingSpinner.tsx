'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: number | 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

/**
 * ローディング状態を表示するスピナーコンポーネント
 */
export default function LoadingSpinner({ 
  size = 'md', 
  color = 'text-blue-500', 
  className = '' 
}: LoadingSpinnerProps) {
  // サイズの計算
  let sizeClass = '';
  
  if (typeof size === 'string') {
    // 文字列の場合はプリセットサイズを使用
    sizeClass = {
      'sm': 'w-4 h-4',
      'md': 'w-8 h-8',
      'lg': 'w-12 h-12'
    }[size] || 'w-8 h-8'; // デフォルトは md
  } else {
    // 数値の場合は直接サイズを指定
    sizeClass = `w-[${size}px] h-[${size}px]`;
  }

  return (
    <div className={`${className} flex justify-center items-center`}>
      <div className={`${sizeClass} ${color} animate-spin`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    </div>
  );
} 