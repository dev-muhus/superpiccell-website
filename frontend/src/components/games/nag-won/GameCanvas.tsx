'use client';

import React, { Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ErrorBoundary } from 'react-error-boundary';
import { Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Player from './Player';
import Ground from './Ground';
import { useGameSettingsStore, getSelectedStage } from './Utils/stores';
import { CyberCity, ForestWorld, VolcanoWorld } from './World';
import EnhancedItems, { EnhancedCollectibleItem } from './Items/EnhancedItems';

// エラーフォールバックコンポーネントの型定義
interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

// エラー表示コンポーネント
function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="bg-red-900 text-white p-4 rounded m-4">
      <h2 className="text-xl font-bold">エラーが発生しました</h2>
      <p className="my-2">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded mt-4"
      >
        再試行
      </button>
    </div>
  );
}

// ローディング表示コンポーネント
function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 text-white z-50">
      <div className="text-center p-6">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-300">3Dワールドを準備しています。</p>
        <p className="mt-2 text-gray-400 text-sm">少々お待ちください...</p>
      </div>
    </div>
  );
}

// デバッグ情報表示
function DebugInfo({ show }: { show: boolean }) {
  // デバッグ情報の状態
  const [debugInfo, setDebugInfo] = useState({
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    position: { x: 0, y: 0, z: 0 },
    cameraMode: 'thirdPerson'
  });
  
  // デバッグ情報の更新
  useEffect(() => {
    if (!show) return;
    
    // グローバルで利用可能なThree.js情報用のインターフェース
    interface ThreeJSGlobals {
      lastFrameTime?: number;
      renderer?: {
        info?: {
          render?: {
            calls?: number;
            triangles?: number;
          }
        }
      };
      playerPosition?: { x: number; y: number; z: number };
      cameraMode?: string;
    }
    
    // ウィンドウオブジェクトをThreeJSGlobals型として扱う
    const threeGlobals = window as unknown as ThreeJSGlobals;
    
    // リアルタイムで更新する情報を取得
    const interval = setInterval(() => {
      // 実際のアプリではThree.jsのパフォーマンスメトリクスなどを取得
      setDebugInfo({
        fps: Math.round(1000 / (threeGlobals.lastFrameTime ? performance.now() - threeGlobals.lastFrameTime : 0)),
        drawCalls: threeGlobals.renderer?.info?.render?.calls || 0,
        triangles: threeGlobals.renderer?.info?.render?.triangles || 0,
        position: threeGlobals.playerPosition || { x: 0, y: 0, z: 0 },
        cameraMode: threeGlobals.cameraMode || 'thirdPerson'
      });
      threeGlobals.lastFrameTime = performance.now();
    }, 500);
    
    return () => clearInterval(interval);
  }, [show]);
  
  if (!show) return null;
  
  return (
    <div className="absolute top-20 right-4 bg-black bg-opacity-70 text-white p-2 rounded text-xs">
      <h3 className="font-bold border-b border-gray-600 pb-1 mb-1">デバッグ情報</h3>
      <div>FPS: {debugInfo.fps}</div>
      <div>描画コール: {debugInfo.drawCalls}</div>
      <div>三角形数: {debugInfo.triangles}</div>
      <div>座標: ({debugInfo.position.x.toFixed(1)}, {debugInfo.position.y.toFixed(1)}, {debugInfo.position.z.toFixed(1)})</div>
      <div>カメラ: {debugInfo.cameraMode}</div>
    </div>
  );
}

// GameCanvasプロパティの型定義
interface GameCanvasProps {
  onScoreUpdate: (points: number) => void;
  showDebug?: boolean;
  gameKey?: number; // ゲーム再開時のキー
}

export default function GameCanvas({ onScoreUpdate, showDebug = false, gameKey }: GameCanvasProps) {
  const [playerPosition, setPlayerPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  
  // ゲーム設定ストアの状態を直接購読
  const { selectedStageId, selectedAvatarId } = useGameSettingsStore();
  
  // セレクター関数を使用して現在選択中のステージとアバターを取得（useMemoで最適化）
  const selectedStage = useMemo(() => {
    const gameSettings = useGameSettingsStore.getState();
    return getSelectedStage(gameSettings);
  }, []);
  
  // エラーをコンソールに記録
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Three.jsレンダリングエラー:", error);
    console.error("エラー詳細情報:", errorInfo);
  };

  // プレイヤー位置の更新
  const handlePlayerMove = useCallback((position: THREE.Vector3) => {
    setPlayerPosition(position);
  }, []);
  
  // アイテム収集時の処理（拡張版）
  const handleEnhancedItemCollect = useCallback((item: EnhancedCollectibleItem) => {
    // スコア更新
    onScoreUpdate(item.points);
    
    // 収集エフェクト
    console.log(`アイテム収集: ${item.id}, ポイント: ${item.points}`);
  }, [onScoreUpdate]);

  // ズームイベントリスナー
  useEffect(() => {
    const handleZoomEvent = (event: CustomEvent) => {
      try {
        const { delta } = event.detail;
        
        // 値の妥当性チェック
        if (typeof delta === 'number' && isFinite(delta)) {
          console.log('Zoom delta:', delta);
        }
      } catch (error) {
        console.error('Error processing zoom event:', error);
      }
    };

    // イベントリスナーを登録
    window.addEventListener('zoom-change', handleZoomEvent as EventListener, { passive: true });
    
    return () => {
      window.removeEventListener('zoom-change', handleZoomEvent as EventListener);
    };
  }, []);

  // ステージに対応するワールドコンポーネントを返す関数
  const renderWorldForStage = (stageId: string) => {
    switch (stageId) {
      case 'forest':
        return <ForestWorld />;
      case 'volcano':
        return <VolcanoWorld />;
      case 'cyber-city':
      default:
        return <CyberCity />;
    }
  };

  // アイテムコンポーネントを選択
  const renderItems = () => {
    // 常に拡張アイテムシステムを使用
    return (
      <EnhancedItems
        playerPosition={playerPosition}
        onCollect={handleEnhancedItemCollect}
        stageId={selectedStageId}
        gameKey={gameKey}
      />
    );
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError} onReset={() => {
        console.log("エラーバウンダリーをリセットしました");
      }}>
        <Suspense fallback={<LoadingFallback />}>
          <Canvas 
            camera={{ 
              position: [0, 2, 8],
              fov: 60,
              near: 0.1,
              far: 1000
            }}
            dpr={[1, 1.5]}
            gl={{ 
              antialias: true,
              alpha: false, 
              stencil: false,
              depth: true,
              powerPreference: 'default'
            }}
            onError={(error) => {
              console.error("Canvasエラー:", error);
            }}
          >
            {/* 選択したステージの空の色を適用 */}
            <color attach="background" args={[selectedStage.skyColor]} />
            
            {/* ErrorBoundaryをネストしてコンポーネント単位でエラーを捕捉 */}
            <ErrorBoundary FallbackComponent={() => null} onError={(e) => console.error("コンポーネントエラー:", e)}>
              {/* 環境光と太陽光 */}
              <ambientLight intensity={0.3} />
              <directionalLight 
                position={[50, 100, 50]} 
                intensity={1} 
                castShadow 
                shadow-mapSize={[2048, 2048]}
              />
              
              {/* プレイヤー */}
              <Player 
                key={`player-${selectedStageId}-${selectedAvatarId}`} 
                onMove={handlePlayerMove} 
                modelId={selectedAvatarId} 
              />
              
              {/* 選択されたステージに対応するワールドコンポーネントを表示 */}
              {renderWorldForStage(selectedStageId)}
              
              {/* 地面 */}
              <Ground />
              
              {/* 収集アイテム */}
              {renderItems()}
              
              {/* 星空 */}
              {selectedStageId !== 'forest' && (
                <Stars 
                  radius={100} 
                  depth={50} 
                  count={selectedStageId === 'volcano' ? 3000 : 5000} 
                  factor={4} 
                  saturation={0} 
                  fade 
                  speed={1} 
                />
              )}
              
              {/* 環境ライティング */}
              <Environment preset={selectedStage.envPreset as 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby'} />
            </ErrorBoundary>
          </Canvas>
        </Suspense>
      </ErrorBoundary>
      
      {/* デバッグ情報 */}
      <DebugInfo show={showDebug} />
    </div>
  );
} 