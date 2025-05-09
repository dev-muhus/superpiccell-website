'use client';

import { useEffect, useRef, useState } from 'react';

interface InfiniteScrollProps {
  /**
   * 子要素
   */
  children: React.ReactNode;
  
  /**
   * 次のページがあるかどうか
   */
  hasNextPage: boolean;
  
  /**
   * 読み込み中かどうか
   */
  isLoading: boolean;
  
  /**
   * 次のページを読み込む関数
   */
  onLoadMore: () => void;
  
  /**
   * スクロール検知の閾値（px）
   * デフォルトはconstantsから取得
   */
  threshold?: number;
}

/**
 * インフィニットスクロールを実装する共通コンポーネント
 * スクロール位置が下部に近づくと、onLoadMore関数を呼び出す
 */
const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  hasNextPage,
  isLoading,
  onLoadMore,
  threshold = 0.5
}) => {
  const observerRef = useRef<HTMLDivElement>(null);
  const observerInstance = useRef<IntersectionObserver | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const prevHasNextPageRef = useRef(hasNextPage);
  const callbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // hasNextPageの変更を監視
  useEffect(() => {
    prevHasNextPageRef.current = hasNextPage;
  }, [hasNextPage]);

  // IntersectionObserverの設定
  useEffect(() => {
    const currentRef = observerRef.current;
    
    // 監視対象要素がない場合やページがない場合は何もしない
    if (!currentRef || !hasNextPage) {
      // 既存のオブザーバーを破棄
      if (observerInstance.current) {
        observerInstance.current.disconnect();
        observerInstance.current = null;
      }
      setIsVisible(false);
      return;
    }
    
    // 監視コールバック
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      const isIntersecting = entry?.isIntersecting || false;
      setIsVisible(isIntersecting);
    };
    
    // 既存のオブザーバーを破棄して新しいオブザーバーを作成
    if (observerInstance.current) {
      observerInstance.current.disconnect();
    }
    
    observerInstance.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '300px', // より広いマージンで早めに検知
      threshold: threshold
    });
    
    observerInstance.current.observe(currentRef);
    
    return () => {
      if (observerInstance.current) {
        observerInstance.current.disconnect();
        observerInstance.current = null;
      }
    };
  }, [hasNextPage, threshold]);
  
  // 可視状態の変化に応じてデータ読み込み処理を実行
  useEffect(() => {
    // タイムアウトをクリア
    if (callbackTimeoutRef.current) {
      clearTimeout(callbackTimeoutRef.current);
      callbackTimeoutRef.current = null;
    }
    
    // 可視状態でない場合はスキップ
    if (!isVisible) return;
    
    // すでに読み込み中の場合はスキップ
    if (isLoading) return;
    
    // 次のページがない場合はスキップ
    if (!hasNextPage) return;
    
    // 少し遅延を入れてデータ読み込みを実行（連続実行防止）
    callbackTimeoutRef.current = setTimeout(() => {
      onLoadMore();
      callbackTimeoutRef.current = null;
    }, 100);
    
    return () => {
      if (callbackTimeoutRef.current) {
        clearTimeout(callbackTimeoutRef.current);
        callbackTimeoutRef.current = null;
      }
    };
  }, [isVisible, hasNextPage, isLoading, onLoadMore]);
  
  // コンポーネント内のタイムアウトをクリーンアップ
  useEffect(() => {
    return () => {
      if (callbackTimeoutRef.current) {
        clearTimeout(callbackTimeoutRef.current);
        callbackTimeoutRef.current = null;
      }
    };
  }, []);
  
  return (
    <div className="infinite-scroll-container">
      {children}
      <div 
        ref={observerRef} 
        className="infinite-scroll-sentinel"
        style={{ 
          height: '10px', 
          visibility: hasNextPage ? 'visible' : 'hidden' 
        }}
      />
    </div>
  );
};

export default InfiniteScroll; 