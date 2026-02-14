import { useCallback, useEffect, useRef } from 'react';

/**
 * スクロールロックを管理するカスタムフック
 * @returns {{lockScroll: () => void, unlockScroll: () => void, isLocked: boolean}}
 */
export function useScrollLock() {
  // スクロール位置を保存するref
  const scrollPositionRef = useRef(0);
  // スクロールがロックされているかを追跡するref
  const isLockedRef = useRef(false);

  /**
   * スクロールをロックする関数
   */
  const lockScroll = useCallback(() => {
    if (isLockedRef.current || typeof window === 'undefined') return;
    
    // 現在のスクロール位置を保存
    scrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    
    // スクロールバーの幅を計算（スクロールバーが消えたときのレイアウトシフトを防ぐため）
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // body要素にクラスを追加
    document.body.classList.add('scroll-locked');
    
    // ピクセル単位でのスタイル設定（位置固定）
    document.body.style.top = `-${scrollPositionRef.current}px`;
    
    // スクロールバーの幅をpaddingRightで補償
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    isLockedRef.current = true;
  }, []);

  /**
   * スクロールロックを解除する関数
   */
  const unlockScroll = useCallback(() => {
    if (!isLockedRef.current || typeof window === 'undefined') return;
    
    // クラスの削除
    document.body.classList.remove('scroll-locked');
    
    // スタイルをリセット
    document.body.style.top = '';
    document.body.style.paddingRight = '';
    
    // 保存されていたスクロール位置に戻る
    window.scrollTo(0, scrollPositionRef.current);
    
    isLockedRef.current = false;
  }, []);

  // コンポーネントのアンマウント時にスクロールロックを解除
  useEffect(() => {
    return () => {
      if (isLockedRef.current) {
        unlockScroll();
      }
    };
  }, [unlockScroll]);

  return { 
    lockScroll, 
    unlockScroll,
    // eslint-disable-next-line react-hooks/refs
    isLocked: isLockedRef.current 
  };
} 