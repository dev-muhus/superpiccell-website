'use client';

import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    const currentObserver = observerRef.current;
    
    if (!currentObserver || !hasNextPage) return;
    
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasNextPage && !isLoading) {
        console.log('IntersectionObserver triggered - loading more content');
        onLoadMore();
      }
    };
    
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold
    });
    
    observer.observe(currentObserver);
    
    return () => {
      if (currentObserver) {
        observer.unobserve(currentObserver);
      }
    };
  }, [hasNextPage, isLoading, onLoadMore, threshold]);
  
  return (
    <div>
      {children}
      {hasNextPage && <div ref={observerRef} style={{ height: '20px' }} />}
    </div>
  );
};

export default InfiniteScroll; 