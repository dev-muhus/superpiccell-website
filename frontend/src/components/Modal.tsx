'use client';

import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/lib/hooks/useScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  isLoading?: boolean; // 読み込み状態を管理するためのプロパティ
}

// クライアントサイドでのみ実行されるuseIsomorphicLayoutEffectを定義
const useIsomorphicLayoutEffect = 
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, isLoading = false }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  // 明示的なスクロール制御のためのフックを使用
  const { lockScroll, unlockScroll } = useScrollLock();
  // モーダルが開いている前後の状態を検出するためのRef
  const wasOpenRef = useRef(false);

  // モーダル表示状態変化時のスクロール処理
  useIsomorphicLayoutEffect(() => {
    // サーバー側での実行を防止
    if (typeof window === 'undefined') return;
    
    const prevOpen = wasOpenRef.current;
    
    // モーダルが新しく開かれた場合
    if (isOpen && !prevOpen) {
      lockScroll();
    }
    
    // モーダルが閉じられた場合
    if (!isOpen && prevOpen) {
      unlockScroll();
    }
    
    // 現在の状態を記録
    wasOpenRef.current = isOpen;
  }, [isOpen, lockScroll, unlockScroll]);
  
  // Escキー押下でモーダルを閉じる
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault(); // イベント伝播を防止
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // モーダル外クリックでモーダルを閉じる
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // イベントの伝播を完全に停止
    e.preventDefault();
    e.stopPropagation();
    
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // コンポーネントのクリーンアップ処理を追加
  useEffect(() => {
    return () => {
      // コンポーネントがアンマウントされる時にスクロールロックを解除
      unlockScroll();
    };
  }, [unlockScroll]);

  if (!isOpen) return null;

  // createPortalを使用してモーダルをbody直下に描画
  return createPortal(
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/0 backdrop-blur-none transition-all duration-300 ease-in-out"
      onClick={handleBackdropClick}
      style={{ 
        animation: isOpen ? 'modalBackdropIn 300ms forwards' : undefined
      }}
    >
      <div 
        className="relative mx-auto w-[95%] sm:w-auto max-w-[95%] sm:max-w-[85%] lg:max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl"
        style={{ 
          animation: isOpen ? 'modalContentIn 300ms forwards' : 'modalContentOut 300ms forwards'
        }}
      >
        {/* ヘッダー部分 - 固定表示 */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6">
          {title && (
            <h3 className="pr-8 text-lg sm:text-xl font-bold text-gray-800 line-clamp-1">
              {title}
            </h3>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-gray-600 hover:bg-gray-300 transition-colors duration-150"
            aria-label="閉じる"
          >
            <span style={{ marginTop: '-2px' }}>&times;</span>
          </button>
        </div>
        
        {/* スクロール可能なコンテンツエリア */}
        <div 
          ref={modalRef}
          className="modal-content max-h-[75vh] sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6 pt-3 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-gray-500">コンテンツを読み込み中...</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalBackdropIn {
          from {
            background-color: rgba(0, 0, 0, 0);
            backdrop-filter: blur(0px);
          }
          to {
            background-color: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(3px);
          }
        }

        @keyframes modalContentIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes modalContentOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
        }
        
        /* モーダル内の画像をレスポンシブに */
        .modal-content img {
          max-width: 100%;
          height: auto;
          object-fit: contain;
          margin: 0 auto;
        }
        
        /* モーダル内のテキストをレスポンシブに */
        .modal-content p {
          font-size: clamp(0.875rem, 2vw, 1rem);
          line-height: 1.6;
        }
        
        /* スクロールバーのスタイリング */
        .modal-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .modal-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .modal-content::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        .modal-content::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* 画像を中央配置 */
        .modal-content > img,
        .modal-content .flex > div > img {
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        
        @media (max-width: 640px) {
          .modal-content p {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Modal; 