'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GameCanvas from './GameCanvas';
import GameUI from './GameUI';
import { VirtualJoystick } from './Controls/VirtualJoystick';
import ScoreSaveModal from './UI/ScoreSaveModal';
import { SimpleAnimationModal } from './UI/SimpleAnimationModal';
import { AvailableGameConfig } from '@/lib/games/config';
import { useGameSettingsStore } from './Utils/stores';
import { logger } from '@/utils/logger';

interface NagWonGameProps {
  config: AvailableGameConfig;
}

export default function NagWonGame({ config }: NagWonGameProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showScoreSaveModal, setShowScoreSaveModal] = useState(false);
  const [showGameUI, setShowGameUI] = useState(false);
  const [showAnimationModal, setShowAnimationModal] = useState(false);
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState('idle');
  const [itemsCollected, setItemsCollected] = useState(0);
  const [gameKey, setGameKey] = useState(0); // ゲーム再開時にコンポーネントを強制再マウントするためのキー
  const [gameState, setGameState] = useState({
    score: 0,
    timeRemaining: config.settings.gameTime,
    isGameActive: false,
    isGameOver: false,
    isPaused: false,
    error: null as Error | null
  });

  // ゲーム設定ストアから現在のステージIDを取得
  const selectedStageId = useGameSettingsStore(state => state.selectedStageId);
  
  // GameUIのモーダル表示状態を取得するコールバック
  const handleGameUIModalChange = useCallback((isVisible: boolean) => {
    setShowGameUI(isVisible);
  }, []);
  
  // 前回のステージIDを追跡するためのRef
  const prevStageIdRef = useRef(selectedStageId);

  // モーダルの表示状態を管理する変数を追加（重要なモーダルのみ）
  const isModalOpen = showScoreSaveModal || showGameUI;

  // 初期ロード
  useEffect(() => {
    // 画面遷移後、少し待ってからロード完了とする
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    // モバイルデバイス判定
    const checkIfMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileDevices = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i;
      const isMobileDevice = mobileDevices.test(userAgent) || window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      
      // 画面の向きを確認
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    // 初期チェック
    checkIfMobile();
    
    // リサイズイベントとorientationchangeイベントでチェック
    window.addEventListener('resize', checkIfMobile);
    window.addEventListener('orientationchange', checkIfMobile);

    // クリーンアップ
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkIfMobile);
      window.removeEventListener('orientationchange', checkIfMobile);
    };
  }, []);

  // モバイル端末が縦向きの場合、横向きにするよう促す
  useEffect(() => {
    const handleOrientationChange = () => {
      if (isMobile) {
        setIsLandscape(window.innerWidth > window.innerHeight);
      }
    };
    
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isMobile]);

  // ESCキーでメニュー表示
  useEffect(() => {
    const handleGameEscape = () => {
      logger.debug('game-escape event received in NagWonGame');
      setGameState(prev => {
        logger.debug('Current game state:', prev);
        if (prev.isGameActive && !prev.isGameOver) {
          const newState = { ...prev, isPaused: !prev.isPaused };
          logger.debug('New game state:', newState);
          return newState;
        }
        logger.debug('Game state not changed - not active or game over');
        return prev;
      });
    };

    // InputManagerからのgame-escapeイベントのみを処理
    window.addEventListener('game-escape', handleGameEscape);
    logger.debug('game-escape event listener added in NagWonGame');
    
    return () => {
      window.removeEventListener('game-escape', handleGameEscape);
      logger.debug('game-escape event listener removed in NagWonGame');
    };
  }, []); // 依存関係を空にして、イベントリスナーの再登録を防ぐ

  // デバッグモード切替（F3キー）とアニメーション選択（Tキー）
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        // 開発環境でのみデバッグモードを有効化
        if (process.env.NODE_ENV === 'development') {
          e.preventDefault();
          setShowDebug(prev => !prev);
          logger.debug('デバッグモード:', !showDebug);
        }
      } else if (e.key === 't' || e.key === 'T') {
        // アニメーション選択モーダルの表示切り替え
        if (gameState.isGameActive && !gameState.isGameOver && !gameState.isPaused) {
          e.preventDefault();
          setShowAnimationModal(prev => !prev);
          logger.debug('🎭 Animation selection modal toggled');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [showDebug, gameState.isGameActive, gameState.isGameOver, gameState.isPaused]);

  // ゲーム状態変更時にアニメーションモーダルを閉じる
  useEffect(() => {
    if (gameState.isGameOver || gameState.isPaused || !gameState.isGameActive) {
      if (showAnimationModal) {
        setShowAnimationModal(false);
        logger.debug('🎭 Animation modal closed due to game state change');
      }
    }
  }, [gameState.isGameOver, gameState.isPaused, gameState.isGameActive, showAnimationModal]);

  // ゲーム開始処理
  const handleStartGame = useCallback(() => {
    setGameState({
      score: 0,
      timeRemaining: config.settings.gameTime,
      isGameActive: true,
      isGameOver: false,
      isPaused: false,
      error: null
    });
    setItemsCollected(0);
  }, [config.settings.gameTime]);

  // スコア更新処理
  const handleScoreUpdate = useCallback((points: number) => {
    setGameState(prev => ({
      ...prev,
      score: prev.score + points
    }));
    // アイテム収集数も更新（1アイテム = config.settings.pointsPerItem ポイントと仮定）
    setItemsCollected(prev => prev + Math.floor(points / config.settings.pointsPerItem));
  }, [config.settings.pointsPerItem]);

  // ゲーム再開処理
  const handleRestartGame = useCallback(() => {
    handleStartGame();
    setGameKey(prevKey => prevKey + 1); // ゲーム再開時にキーを更新
  }, [handleStartGame]);

  // ゲーム再開処理（一時停止解除）
  const handleResumeGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPaused: false
    }));
  }, []);

  // ゲーム中のリスタート処理（完全リセット：スコア、時間、アイテムをすべてリセット）
  const handleGameRestart = useCallback(() => {
    setGameState({
      score: 0,
      timeRemaining: config.settings.gameTime, // 時間も完全リセット
      isGameActive: true, // ゲームを継続
      isGameOver: false,
      isPaused: false,
      error: null
    });
    setItemsCollected(0);
    setGameKey(prevKey => prevKey + 1); // アイテムとプレイヤー位置をリセット
    
    // プレイヤー位置リセットのイベントを発行
    const resetEvent = new CustomEvent('player-reset');
    window.dispatchEvent(resetEvent);
    
    logger.info('Game completely restarted - score, time, and items reset');
  }, [config.settings.gameTime]);

  // ダッシュボードに戻る
  const handleBackToDashboard = useCallback(() => {
    router.push('/games');
  }, [router]);

  // トップページに戻る
  const handleBackToTop = useCallback(() => {
    router.push('/');
  }, [router]);

  // スコア保存処理
  const handleSaveScore = useCallback(async () => {
    try {
      const response = await fetch('/api/games/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game_id: 'nag-won',
          stage_id: selectedStageId,
          score: gameState.score,
          game_time: config.settings.gameTime - gameState.timeRemaining,
          items_collected: itemsCollected,
          difficulty: 'normal' // 現在は固定、将来的に設定から取得
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'スコアの保存に失敗しました');
      }

      // 保存成功
      logger.info('スコアが正常に保存されました');
    } catch (error) {
      logger.error('スコア保存エラー:', error);
      throw error;
    }
  }, [gameState.score, gameState.timeRemaining, config.settings.gameTime, itemsCollected, selectedStageId]);

  // アニメーション情報受信コールバック
  const handleAnimationInfoUpdate = useCallback((animations: string[], current: string) => {
    setAvailableAnimations(animations);
    setCurrentAnimation(current);
  }, []);

  // アニメーション選択ハンドラー
  const handleAnimationSelect = useCallback((animationName: string) => {
    logger.debug(`🎭 Animation selected: ${animationName} - Scheduling for 1 second delay`);
    setCurrentAnimation(animationName);
    setShowAnimationModal(false);
    
    // 0.5秒後にアニメーションを実行
    setTimeout(() => {
      logger.debug(`🎭 Executing animation: ${animationName} after 0.5 second delay`);
      // カスタムイベントを送信してPlayer.tsxに通知
      const event = new CustomEvent('game:manualAnimationSelect', {
        detail: animationName
      });
      window.dispatchEvent(event);
    }, 500);
  }, []);

  // ズーム変更処理
  const handleZoomChange = useCallback((delta: number) => {
    // ズームイベントをGameCanvasに送信
    const event = new CustomEvent('zoom-change', {
      detail: { delta }
    });
    window.dispatchEvent(event);
  }, []);

  // ピンチズーム処理
  useEffect(() => {
    if (!isMobile) return;

    let initialDistance = 0;
    let isZooming = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isZooming = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isZooming) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        const deltaDistance = currentDistance - initialDistance;
        const zoomDelta = deltaDistance * 0.001; // 感度調整
        
        if (Math.abs(zoomDelta) > 0.01) {
          handleZoomChange(zoomDelta);
          initialDistance = currentDistance;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isZooming = false;
      }
    };

    // passive: falseを明示的に指定してpreventDefaultを有効にする
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleZoomChange]);

  // タイマー処理
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (gameState.isGameActive && !gameState.isGameOver && !gameState.isPaused) {
      timer = setInterval(() => {
        setGameState(prev => {
          if (prev.timeRemaining <= 1) {
            // ゲーム終了
            clearInterval(timer!);
            // スコア保存モーダルを表示（スコアが0より大きい場合のみ）
            if (prev.score > 0) {
              setTimeout(() => setShowScoreSaveModal(true), 1000);
            }
            // ゲーム終了時はアニメーションモーダルを閉じる
            setShowAnimationModal(false);
            
            return {
              ...prev,
              timeRemaining: 0,
              isGameActive: false,
              isGameOver: true,
              isPaused: false
            };
          }
          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1
          };
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState.isGameActive, gameState.isGameOver, gameState.isPaused]);

  // ステージ変更を検出してゲームをリセット
  useEffect(() => {
    if (prevStageIdRef.current !== selectedStageId) {
      logger.debug(`ステージ変更検出: ${prevStageIdRef.current} → ${selectedStageId}`);
      
      // ゲームが進行中の場合はリセット
      if (gameState.isGameActive || gameState.isGameOver) {
        setGameState({
          score: 0,
          timeRemaining: config.settings.gameTime,
          isGameActive: false,
          isGameOver: false,
          isPaused: false,
          error: null
        });
        setItemsCollected(0);
        setGameKey(prevKey => prevKey + 1);
        logger.info('ステージ変更によりゲーム状態をリセット');
      }
      
      // 前回のステージIDを更新
      prevStageIdRef.current = selectedStageId;
    }
  }, [selectedStageId, gameState.isGameActive, gameState.isGameOver, config.settings.gameTime]);

  // 読み込み中の表示
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-4">メタバース環境を準備中...</h3>
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-300">アバターとサイバーシティを読み込んでいます</p>
          <div className="mt-6 w-full max-w-md bg-gray-800 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // モバイル端末が縦向きの場合の警告表示
  if (isMobile && !isLandscape && !gameState.isGameOver) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white p-4">
        <div className="text-center">
          <div className="animate-bounce mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-4">端末を横向きにしてください</h3>
          <p className="mb-6">このゲームは横向き画面に最適化されています。<br/>より良い体験のために端末を回転させてください。</p>
          <div className="mt-4 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-screen bg-black text-white overflow-hidden"
      style={{
        // Pull to Refresh対策（国際標準）
        overscrollBehavior: 'none',
        touchAction: 'manipulation',
        WebkitOverflowScrolling: 'touch',
        // iOS Safari対策
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        // Android Chrome対策
        overscrollBehaviorY: 'none',
        // 追加のブラウザ対策
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        // モーダル表示中はポインターイベントを完全に無効化
        pointerEvents: isModalOpen ? 'none' : 'auto'
      }}
      onTouchStart={(e) => {
        // タッチイベントの伝播を制御（国際標準のアプローチ）
        if (isMobile && gameState.isGameActive) {
          // UI要素（ボタン、ジョイスティック）以外のタッチのみ制御
          const target = e.target as HTMLElement;
          const isUIElement = target.closest('button') || 
                             target.closest('[data-joystick]') || 
                             target.closest('[data-ui-element]');
          
          if (!isUIElement) {
            e.preventDefault();
          }
        }
      }}
      onTouchMove={(e) => {
        // Pull to Refreshを防止しつつ、UI要素は正常に動作させる
        if (isMobile && gameState.isGameActive) {
          const target = e.target as HTMLElement;
          const isUIElement = target.closest('button') || 
                             target.closest('[data-joystick]') || 
                             target.closest('[data-ui-element]');
          
          if (!isUIElement) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }}
      onTouchEnd={(e) => {
        // タッチ終了時も制御
        if (isMobile && gameState.isGameActive) {
          const target = e.target as HTMLElement;
          const isUIElement = target.closest('button') || 
                             target.closest('[data-joystick]') || 
                             target.closest('[data-ui-element]');
          
          if (!isUIElement) {
            e.preventDefault();
          }
        }
      }}
    >
      <div className="absolute top-0 left-0 right-0 bottom-0">
        {/* ゲームUI */}
        <GameUI
          score={gameState.score}
          timeRemaining={gameState.timeRemaining}
          isGameActive={gameState.isGameActive}
          isGameOver={gameState.isGameOver}
          isPaused={gameState.isPaused}
          error={gameState.error}
          onStart={gameState.isPaused ? handleResumeGame : handleStartGame}
          onRestart={gameState.isGameOver ? handleRestartGame : handleGameRestart}
          onBackToDashboard={handleBackToDashboard}
          onBackToTop={handleBackToTop}
          selectedStageId={selectedStageId}
          onGameRestart={gameState.isGameActive && !gameState.isGameOver ? handleGameRestart : undefined}
          onModalChange={handleGameUIModalChange}
        />
        
        {/* 3Dゲームキャンバス - 全画面表示 */}
        <div className="absolute inset-0 z-0">
          <GameCanvas 
            key={gameKey}
            onScoreUpdate={handleScoreUpdate} 
            showDebug={showDebug}
            gameKey={gameKey}
            onAnimationInfoUpdate={handleAnimationInfoUpdate}
          />
        </div>
        
        {/* モバイル操作UI */}
        {isMobile && gameState.isGameActive && !gameState.isPaused && (
          <>
            {/* 移動ジョイスティック（左下） */}
            <div className="absolute bottom-10 left-8 z-30" data-ui-element="joystick">
              <VirtualJoystick 
                size={100}
                baseColor="#4a5568"
                stickColor="#3182ce"
                baseOpacity={0.7}
                stickOpacity={0.9}
                disabled={!gameState.isGameActive}
              />
            </div>

            {/* アクションボタン（右下に移動） */}
            <div className="absolute bottom-8 right-8 z-30 flex flex-col gap-3" data-ui-element="action-buttons">
              {/* ジャンプボタン */}
              <button
                className="w-16 h-16 bg-blue-600 bg-opacity-80 rounded-full flex items-center justify-center touch-manipulation active:bg-blue-700 border-2 border-white border-opacity-40 shadow-lg"
                onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))}
                onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))}
                aria-label="ジャンプ"
                data-ui-element="jump-button"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* ダッシュボタン */}
              <button
                className="w-16 h-16 bg-red-600 bg-opacity-80 rounded-full flex items-center justify-center touch-manipulation active:bg-red-700 border-2 border-white border-opacity-40 shadow-lg"
                onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }))}
                onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }))}
                aria-label="ダッシュ"
                data-ui-element="dash-button"
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* アニメーション選択ボタン */}
              <button
                className="w-16 h-16 bg-purple-600 bg-opacity-80 rounded-full flex items-center justify-center touch-manipulation active:bg-purple-700 border-2 border-white border-opacity-40 shadow-lg"
                onTouchStart={() => {
                  setShowAnimationModal(prev => !prev);
                  logger.debug('🎭 Mobile animation modal toggled');
                }}
                aria-label="アニメーション選択"
                data-ui-element="animation-button"
              >
                <span className="text-lg">🎭</span>
              </button>
            </div>

            {/* ズームコントロール（左上に移動） */}
            <div className="absolute left-8 top-20 z-30 flex flex-col gap-2" data-ui-element="zoom-controls">
              {/* ズームイン */}
              <button
                className="w-12 h-12 bg-gray-700 bg-opacity-80 rounded-full flex items-center justify-center touch-manipulation active:bg-gray-800 border-2 border-white border-opacity-30 shadow-lg"
                onTouchStart={() => handleZoomChange(0.1)}
                aria-label="ズームイン"
                data-ui-element="zoom-in-button"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              
              {/* ズームアウト */}
              <button
                className="w-12 h-12 bg-gray-700 bg-opacity-80 rounded-full flex items-center justify-center touch-manipulation active:bg-gray-800 border-2 border-white border-opacity-30 shadow-lg"
                onTouchStart={() => handleZoomChange(-0.1)}
                aria-label="ズームアウト"
                data-ui-element="zoom-out-button"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            </div>
          </>
        )}
        
        {/* 操作説明 - ゲーム開始後、またはゲーム終了後のみ表示 */}
        {(gameState.isGameActive || gameState.isGameOver) && !isMobile && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center z-10">
            <div className="bg-black bg-opacity-80 text-white px-3 py-1 rounded-full text-xs sm:text-sm max-w-full mx-2 truncate">
              <p className="truncate">WASD/矢印:移動 スペース:ジャンプ ESC:メニュー</p>
            </div>
          </div>
        )}
        
        {/* デバッグモード時の表示（開発環境のみ） */}
        {showDebug && process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center z-10">
            <div className="bg-red-900 bg-opacity-80 text-white px-3 py-1 rounded-full text-xs">
              <p>デバッグ: F3キー</p>
            </div>
          </div>
        )}

        {/* アニメーション選択モーダル - 2D UI層 */}
        <div style={{ pointerEvents: 'auto' }}>
          <SimpleAnimationModal
            isVisible={showAnimationModal}
            availableAnimations={availableAnimations}
            currentAnimation={currentAnimation}
            onAnimationSelect={handleAnimationSelect}
            onClose={() => setShowAnimationModal(false)}
          />
        </div>

        {/* スコア保存モーダル - モーダルにはポインターイベントを有効化 */}
        <div style={{ pointerEvents: 'auto' }}>
          <ScoreSaveModal
            isOpen={showScoreSaveModal}
            onClose={() => setShowScoreSaveModal(false)}
            onSave={handleSaveScore}
            score={gameState.score}
            gameTime={config.settings.gameTime - gameState.timeRemaining}
            itemsCollected={itemsCollected}
            stageId={selectedStageId}
          />
        </div>
      </div>
    </div>
  );
} 