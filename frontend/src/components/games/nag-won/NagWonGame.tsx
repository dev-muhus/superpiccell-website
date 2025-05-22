'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GameCanvas from './GameCanvas';
import GameUI from './GameUI';
import { VirtualJoystick } from './Controls/VirtualJoystick';
import { AvailableGameConfig } from '@/lib/games/config';
import { useGameSettingsStore } from './Utils/stores';

interface NagWonGameProps {
  config: AvailableGameConfig;
}

export default function NagWonGame({ config }: NagWonGameProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [gameState, setGameState] = useState({
    score: 0,
    timeRemaining: config.settings.gameTime,
    isGameActive: false,
    isGameOver: false,
    error: null as Error | null
  });

  // ゲーム設定ストアから現在のステージIDを取得
  const selectedStageId = useGameSettingsStore(state => state.selectedStageId);

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

  // ESCキーイベント検出
  useEffect(() => {
    const handleEscapeEvent = () => {
      // ESCキーが押された時の処理
      if (gameState.isGameActive) {
        // ゲーム一時停止
        setGameState(prev => ({
          ...prev,
          isGameActive: false
        }));
      } else if (!gameState.isGameOver) {
        // 一時停止中の場合は再開
        setGameState(prev => ({
          ...prev,
          isGameActive: true
        }));
      }
    };

    // ESCキーのカスタムイベントリスナー
    window.addEventListener('game-escape', handleEscapeEvent);
    
    return () => {
      window.removeEventListener('game-escape', handleEscapeEvent);
    };
  }, [gameState.isGameActive, gameState.isGameOver]);

  // デバッグモード切替（F3キー）
  useEffect(() => {
    const handleDebugToggle = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        // 開発環境でのみデバッグモードを有効化
        if (process.env.NODE_ENV === 'development') {
          e.preventDefault();
          setShowDebug(prev => !prev);
          console.log('デバッグモード:', !showDebug);
        }
      }
    };

    window.addEventListener('keydown', handleDebugToggle);
    return () => {
      window.removeEventListener('keydown', handleDebugToggle);
    };
  }, [showDebug]);

  // ゲーム開始処理
  const handleStartGame = useCallback(() => {
    setGameState({
      score: 0,
      timeRemaining: config.settings.gameTime,
      isGameActive: true,
      isGameOver: false,
      error: null
    });
  }, [config.settings.gameTime]);

  // スコア更新処理
  const handleScoreUpdate = useCallback((points: number) => {
    setGameState(prev => ({
      ...prev,
      score: prev.score + points
    }));
  }, []);

  // ゲーム再開処理
  const handleRestartGame = useCallback(() => {
    handleStartGame();
  }, [handleStartGame]);

  // ダッシュボードに戻る
  const handleBackToDashboard = useCallback(() => {
    router.push('/dashboard/games');
  }, [router]);

  // トップページに戻る
  const handleBackToTop = useCallback(() => {
    router.push('/');
  }, [router]);

  // タイマー処理
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (gameState.isGameActive && !gameState.isGameOver) {
      timer = setInterval(() => {
        setGameState(prev => {
          if (prev.timeRemaining <= 1) {
            // ゲーム終了
            clearInterval(timer!);
            return {
              ...prev,
              timeRemaining: 0,
              isGameActive: false,
              isGameOver: true
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
  }, [gameState.isGameActive, gameState.isGameOver]);

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
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 bottom-0">
        {/* ゲームUI */}
        <GameUI
          score={gameState.score}
          timeRemaining={gameState.timeRemaining}
          isGameActive={gameState.isGameActive}
          isGameOver={gameState.isGameOver}
          error={gameState.error}
          onStart={handleStartGame}
          onRestart={handleRestartGame}
          onBackToDashboard={handleBackToDashboard}
          onBackToTop={handleBackToTop}
          selectedStageId={selectedStageId}
        />
        
        {/* 3Dゲームキャンバス - 全画面表示 */}
        <div className="absolute inset-0 z-0">
          <GameCanvas 
            onScoreUpdate={handleScoreUpdate} 
            showDebug={showDebug}
          />
        </div>
        
        {/* 仮想ジョイスティック - モバイルかつゲーム開始状態の場合のみ表示 */}
        {isMobile && gameState.isGameActive && (
          <VirtualJoystick 
            size={100}
            baseColor="#4a5568"
            stickColor="#3182ce"
            baseOpacity={0.7}
            stickOpacity={0.9}
            disabled={!gameState.isGameActive}
          />
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
      </div>
    </div>
  );
} 