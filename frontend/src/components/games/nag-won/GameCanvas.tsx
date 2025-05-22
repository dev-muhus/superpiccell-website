'use client';

import React, { Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ErrorBoundary } from 'react-error-boundary';
import { Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Player from './Player';
import Ground from './Ground';
import Items, { CollectibleItem, ITEM_TEMPLATES } from './Items';
import { useGameSettingsStore, getSelectedStage } from './Utils/stores';
import { CyberCity, ForestWorld, VolcanoWorld } from './World';

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
        <p className="mt-4 text-gray-300">高品質の3Dコンテンツを準備しています。</p>
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
}

// ステージごとのアイテム生成設定
const stageItemConfigs = {
  'cyber-city': {
    standardCount: 30,
    rareCount: 10,
    legendaryCount: 3,
    specialCount: 2,
    itemTemplates: {
      standard: {
        ...ITEM_TEMPLATES.standard,
        color: '#00ffff', // サイバー風の青色
      },
      rare: {
        ...ITEM_TEMPLATES.rare,
        color: '#00ffff', // サイバー風の青色
      },
      legendary: {
        ...ITEM_TEMPLATES.legendary,
        color: '#00ffff', // サイバー風の青色
      },
      special: {
        ...ITEM_TEMPLATES.special,
        color: '#00ffff', // サイバー風の青色
      }
    },
    citySize: 80,
    heightRange: [1, 20]
  },
  'forest': {
    standardCount: 25,
    rareCount: 8,
    legendaryCount: 2,
    specialCount: 3,
    itemTemplates: {
      standard: {
        ...ITEM_TEMPLATES.standard,
        color: '#7cfc00', // 森林風の緑色
      },
      rare: {
        ...ITEM_TEMPLATES.rare,
        color: '#7cfc00', // 森林風の緑色
      },
      legendary: {
        ...ITEM_TEMPLATES.legendary,
        color: '#7cfc00', // 森林風の緑色
      },
      special: {
        ...ITEM_TEMPLATES.special,
        color: '#32cd32', // 濃い緑色
      }
    },
    citySize: 80,
    heightRange: [0.5, 15]
  },
  'volcano': {
    standardCount: 20,
    rareCount: 12,
    legendaryCount: 4,
    specialCount: 2,
    itemTemplates: {
      standard: {
        ...ITEM_TEMPLATES.standard,
        color: '#ff4500', // 火山風のオレンジ色
      },
      rare: {
        ...ITEM_TEMPLATES.rare,
        color: '#ff0000', // 赤色
      },
      legendary: {
        ...ITEM_TEMPLATES.legendary,
        color: '#ff4500', // 火山風のオレンジ色
      },
      special: {
        ...ITEM_TEMPLATES.special,
        color: '#ff4500', // 火山風のオレンジ色
      }
    },
    citySize: 80,
    heightRange: [1, 25]
  }
};

// アイテム生成関数
const generateItems = (stageId: string) => {
  const config = stageItemConfigs[stageId as keyof typeof stageItemConfigs] || stageItemConfigs['cyber-city'];
  const items: CollectibleItem[] = [];
  
  // 標準アイテム
  for (let i = 0; i < config.standardCount; i++) {
    const x = (Math.random() * 2 - 1) * config.citySize / 2;
    const z = (Math.random() * 2 - 1) * config.citySize / 2;
    const y = config.heightRange[0] + Math.random() * (config.heightRange[1] - config.heightRange[0]);
    
    items.push({
      id: `standard-${i}-${stageId}`,
      position: [x, y, z],
      ...config.itemTemplates.standard,
      collected: false
    });
  }
  
  // レアアイテム
  for (let i = 0; i < config.rareCount; i++) {
    const x = (Math.random() * 2 - 1) * config.citySize / 2;
    const z = (Math.random() * 2 - 1) * config.citySize / 2;
    const y = config.heightRange[0] + Math.random() * (config.heightRange[1] - config.heightRange[0]) * 1.2;
    
    items.push({
      id: `rare-${i}-${stageId}`,
      position: [x, y, z],
      ...config.itemTemplates.rare,
      collected: false
    });
  }
  
  // レジェンダリーアイテム
  for (let i = 0; i < config.legendaryCount; i++) {
    const x = (Math.random() * 2 - 1) * config.citySize / 2;
    const z = (Math.random() * 2 - 1) * config.citySize / 2;
    const y = config.heightRange[0] + Math.random() * (config.heightRange[1] - config.heightRange[0]) * 1.5;
    
    items.push({
      id: `legendary-${i}-${stageId}`,
      position: [x, y, z],
      ...config.itemTemplates.legendary,
      collected: false
    });
  }
  
  // スペシャルアイテム
  for (let i = 0; i < config.specialCount; i++) {
    const x = (Math.random() * 2 - 1) * config.citySize / 2;
    const z = (Math.random() * 2 - 1) * config.citySize / 2;
    const y = config.heightRange[0] + Math.random() * (config.heightRange[1] - config.heightRange[0]) * 1.3;
    
    items.push({
      id: `special-${i}-${stageId}`,
      position: [x, y, z],
      ...config.itemTemplates.special,
      collected: false
    });
  }
  
  return items;
};

export default function GameCanvas({ onScoreUpdate, showDebug = false }: GameCanvasProps) {
  const [playerPosition, setPlayerPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  
  // ゲーム設定ストアの状態を直接購読
  const { selectedStageId, selectedAvatarId } = useGameSettingsStore();
  
  // セレクター関数を使用して現在選択中のステージとアバターを取得（useMemoで最適化）
  const selectedStage = useMemo(() => {
    const gameSettings = useGameSettingsStore.getState();
    return getSelectedStage(gameSettings);
  }, []);
  
  // 選択されたステージに基づいてアイテムを生成
  const [stageItems, setStageItems] = useState<CollectibleItem[]>([]);
  
  // ステージが変更されたときにアイテムを再生成
  useEffect(() => {
    setStageItems(generateItems(selectedStageId));
  }, [selectedStageId]);
  
  // エラーをコンソールに記録
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Three.jsレンダリングエラー:", error);
    console.error("エラー詳細情報:", errorInfo);
    // この時点で親コンポーネントにエラーを通知することも可能
  };

  // プレイヤー位置の更新
  const handlePlayerMove = useCallback((position: THREE.Vector3) => {
    setPlayerPosition(position);
  }, []);
  
  // アイテム収集時の処理
  const handleItemCollect = useCallback((item: CollectibleItem) => {
    // スコア更新
    onScoreUpdate(item.points);
    
    // 収集エフェクト（TODO: サウンドなど）
    console.log(`アイテム収集: ${item.id}, ポイント: ${item.points}`);
  }, [onScoreUpdate]);

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

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError} onReset={() => {
        // エラーリセット時の処理（コンポーネントの再マウントなど）
        console.log("エラーバウンダリーをリセットしました");
      }}>
        <Suspense fallback={<LoadingFallback />}>
          <Canvas 
            camera={{ 
              position: [0, 2, 8], // 初期カメラ位置を調整（低く、近く）
              fov: 60, // 視野角を少し狭く
              near: 0.1,
              far: 1000
            }}
            dpr={[1, 1.5]} // パフォーマンス向上のためデバイスピクセル比を制限
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
              
              {/* プレイヤー - 選択したアバターを適用（keyプロパティを追加して確実に再マウント） */}
              <Player 
                key={`player-${selectedStageId}-${selectedAvatarId}`} 
                onMove={handlePlayerMove} 
                modelId={selectedAvatarId} 
              />
              
              {/* 選択されたステージに対応するワールドコンポーネントを表示 */}
              {renderWorldForStage(selectedStageId)}
              
              {/* 地面 */}
              <Ground />
              
              {/* 収集アイテム - ステージごとに異なるアイテムを表示 */}
              <Items 
                key={`items-${selectedStageId}`}
                playerPosition={playerPosition} 
                onCollect={handleItemCollect}
                customItems={stageItems}
              />
              
              {/* 星空 - ステージに応じて表示調整 */}
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
              
              {/* 環境ライティング - 選択したステージの環境プリセットを適用 */}
              <Environment preset={selectedStage.envPreset as 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby'} />
            </ErrorBoundary>
          </Canvas>
        </Suspense>
      </ErrorBoundary>
      
      {/* デバッグ情報（showDebugがtrueの場合のみ表示） */}
      <DebugInfo show={showDebug} />
    </div>
  );
} 