'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface CollectedItem {
  id: string;
  value?: number;
  position?: [number, number, number];
}

export interface GameState {
  score: number;
  timeRemaining: number;
  collectedItems: string[];
  isGameActive: boolean;
  isGameOver: boolean;
  showResults: boolean;
  error: Error | null;
  isRecovering: boolean;
}

export const useGameState = (initialGameTime = 60) => {
  const [state, setState] = useState<GameState>({
    score: 0,
    timeRemaining: initialGameTime,
    collectedItems: [],
    isGameActive: false,
    isGameOver: false,
    showResults: false,
    error: null,
    isRecovering: false
  });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // エラー設定関数
  const setError = useCallback((error: Error) => {
    console.error('Game error:', error);
    setState(prev => ({ 
      ...prev, 
      error, 
      isGameActive: false,
      isRecovering: false
    }));
    
    // エラーを記録
    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      console.warn('Game error logged:', errorLog);
      // 将来的には専用のエラー記録APIに送信することもできる
    } catch {
      // エラーログ中のエラーは無視
    }
  }, []);
  
  // エラー回復開始
  const startRecovery = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRecovering: true
    }));
    
    // 回復プロセスの模擬（実際にはゲームの状態をリセットなど）
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        error: null,
        isRecovering: false
      }));
    }, 1500);
  }, []);

  // ゲーム開始
  const startGame = useCallback(() => {
    try {
      // タイマーをクリア
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setState({
        score: 0,
        timeRemaining: initialGameTime,
        collectedItems: [],
        isGameActive: true,
        isGameOver: false,
        showResults: false,
        error: null,
        isRecovering: false
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('ゲーム開始に失敗しました'));
    }
  }, [initialGameTime, setError]);

  // アイテム収集
  const collectItem = useCallback((item: CollectedItem) => {
    try {
      if (!item || !item.id) {
        throw new Error('無効なアイテムデータです');
      }
      
      setState(prev => {
        // すでに収集済みの場合は何もしない
        if (prev.collectedItems.includes(item.id)) {
          return prev;
        }
        
        return {
          ...prev,
          score: prev.score + (item.value || 10),
          collectedItems: [...prev.collectedItems, item.id]
        };
      });
    } catch (err) {
      console.warn('アイテム収集エラー:', err);
      // 致命的でないエラーなのでゲームは停止しない
    }
  }, []);

  // ゲーム終了
  const endGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isGameActive: false,
      isGameOver: true,
      showResults: true
    }));
  }, []);

  // 結果画面非表示
  const hideResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      showResults: false
    }));
  }, []);

  // タイマー処理
  useEffect(() => {
    if (!state.isGameActive) return;

    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return {
            ...prev,
            timeRemaining: 0,
            isGameActive: false,
            isGameOver: true,
            showResults: true
          };
        }
        return {
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isGameActive]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    startGame,
    collectItem,
    hideResults,
    endGame,
    setError,
    startRecovery
  };
}; 