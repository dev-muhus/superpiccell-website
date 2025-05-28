'use client';

import React, { useState, useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { TextureLoader } from 'three';
import { useCallback } from 'react';
import * as THREE from 'three';

// アセット定義
export interface AssetDefinition {
  id: string;
  type: 'model' | 'texture' | 'audio';
  url: string;
  priority: 'high' | 'medium' | 'low';
  size?: number; // バイト単位
  compressed?: boolean;
}

// ステージ別アセット定義
export const STAGE_ASSETS: Record<string, AssetDefinition[]> = {
  'cyber-city': [
    {
      id: 'cyber-building-1',
      type: 'model',
      url: '/models/cyber-city/building-1.glb',
      priority: 'high',
      size: 2048000, // 2MB
      compressed: true
    },
    {
      id: 'cyber-building-2',
      type: 'model',
      url: '/models/cyber-city/building-2.glb',
      priority: 'medium',
      size: 1536000, // 1.5MB
      compressed: true
    },
    {
      id: 'cyber-ground-texture',
      type: 'texture',
      url: '/textures/cyber-city/ground.jpg',
      priority: 'high',
      size: 512000 // 512KB
    },
    {
      id: 'cyber-skybox',
      type: 'texture',
      url: '/textures/cyber-city/skybox.jpg',
      priority: 'medium',
      size: 1024000 // 1MB
    }
  ],
  'forest': [
    {
      id: 'tree-model-1',
      type: 'model',
      url: '/models/forest/tree-1.glb',
      priority: 'high',
      size: 1024000, // 1MB
      compressed: true
    },
    {
      id: 'tree-model-2',
      type: 'model',
      url: '/models/forest/tree-2.glb',
      priority: 'medium',
      size: 768000, // 768KB
      compressed: true
    },
    {
      id: 'forest-ground-texture',
      type: 'texture',
      url: '/textures/forest/ground.jpg',
      priority: 'high',
      size: 512000
    }
  ],
  'volcano': [
    {
      id: 'volcano-model',
      type: 'model',
      url: '/models/volcano/volcano.glb',
      priority: 'high',
      size: 3072000, // 3MB
      compressed: true
    },
    {
      id: 'lava-texture',
      type: 'texture',
      url: '/textures/volcano/lava.jpg',
      priority: 'high',
      size: 1024000
    },
    {
      id: 'rock-texture',
      type: 'texture',
      url: '/textures/volcano/rock.jpg',
      priority: 'medium',
      size: 768000
    }
  ]
};

// ローディング状態
export interface LoadingState {
  isLoading: boolean;
  progress: number;
  currentAsset: string;
  error: string | null;
  totalSize: number;
  loadedSize: number;
}

// アセットローダーフック
export function useAssetLoader(stageId: string) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    currentAsset: '',
    error: null,
    totalSize: 0,
    loadedSize: 0
  });
  
  const [loadedAssets, setLoadedAssets] = useState<Map<string, THREE.Object3D | THREE.Texture>>(new Map());

  // DRACOローダーの設定
  const setupDracoLoader = useCallback(() => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    return dracoLoader;
  }, []);

  // アセットの読み込み
  const loadAssets = useCallback(async (assets: AssetDefinition[]) => {
    const totalSize = assets.reduce((sum, asset) => sum + (asset.size || 0), 0);
    let loadedSize = 0;

    setLoadingState({
      isLoading: true,
      progress: 0,
      currentAsset: '',
      error: null,
      totalSize,
      loadedSize: 0
    });

    const newLoadedAssets = new Map();
    const dracoLoader = setupDracoLoader();

    try {
      // 優先度順にソート
      const sortedAssets = [...assets].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      for (const asset of sortedAssets) {
        setLoadingState(prev => ({
          ...prev,
          currentAsset: asset.id,
          progress: (loadedSize / totalSize) * 100
        }));

        try {
          let loadedAsset;

          if (asset.type === 'model') {
            const gltfLoader = new GLTFLoader();
            if (asset.compressed) {
              gltfLoader.setDRACOLoader(dracoLoader);
            }
            
            loadedAsset = await new Promise((resolve, reject) => {
              gltfLoader.load(
                asset.url,
                (gltf) => {
                  // モデルの最適化
                  gltf.scene.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;
                      
                      // マテリアルの最適化
                      if (child.material) {
                        if (Array.isArray(child.material)) {
                          child.material.forEach(mat => {
                            if (mat instanceof THREE.MeshStandardMaterial) {
                              mat.envMapIntensity = 0.5;
                            }
                          });
                        } else if (child.material instanceof THREE.MeshStandardMaterial) {
                          child.material.envMapIntensity = 0.5;
                        }
                      }
                    }
                  });
                  resolve(gltf);
                },
                undefined,
                reject
              );
            });
          } else if (asset.type === 'texture') {
            const textureLoader = new TextureLoader();
            loadedAsset = await new Promise((resolve, reject) => {
              textureLoader.load(
                asset.url,
                (texture) => {
                  // テクスチャの最適化
                  texture.generateMipmaps = true;
                  texture.minFilter = THREE.LinearMipmapLinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  texture.wrapS = THREE.RepeatWrapping;
                  texture.wrapT = THREE.RepeatWrapping;
                  resolve(texture);
                },
                undefined,
                reject
              );
            });
          }

          newLoadedAssets.set(asset.id, loadedAsset);
          loadedSize += asset.size || 0;

          setLoadingState(prev => ({
            ...prev,
            loadedSize,
            progress: (loadedSize / totalSize) * 100
          }));

        } catch (error) {
          console.warn(`Failed to load asset ${asset.id}:`, error);
          // 個別アセットの読み込み失敗は警告のみ（ゲーム続行）
        }
      }

      setLoadedAssets(newLoadedAssets);
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
        currentAsset: ''
      }));

    } catch (error) {
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [setupDracoLoader]);

  // ステージ変更時にアセットを読み込み
  useEffect(() => {
    const assets = STAGE_ASSETS[stageId];
    if (assets && assets.length > 0) {
      loadAssets(assets);
    }
  }, [stageId, loadAssets]);

  // アセット取得関数
  const getAsset = useCallback((assetId: string) => {
    return loadedAssets.get(assetId);
  }, [loadedAssets]);

  // アセットが読み込み済みかチェック
  const isAssetLoaded = useCallback((assetId: string) => {
    return loadedAssets.has(assetId);
  }, [loadedAssets]);

  return {
    loadingState,
    getAsset,
    isAssetLoaded,
    loadedAssets: loadedAssets.size
  };
}

// ローディングオーバーレイコンポーネント
interface LoadingOverlayProps {
  loadingState: LoadingState;
  onSkip?: () => void;
}

export function LoadingOverlay({ loadingState, onSkip }: LoadingOverlayProps) {
  if (!loadingState.isLoading) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-8 rounded-lg max-w-md w-full mx-4 text-white">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-2">高品質3Dアセットを読み込み中</h3>
          <p className="text-gray-300 text-sm">
            より美しいゲーム体験のために、3Dモデルとテクスチャを準備しています
          </p>
        </div>

        {/* 進捗バー */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>進捗: {Math.round(loadingState.progress)}%</span>
            <span>
              {formatBytes(loadingState.loadedSize)} / {formatBytes(loadingState.totalSize)}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${loadingState.progress}%` }}
            />
          </div>
        </div>

        {/* 現在読み込み中のアセット */}
        {loadingState.currentAsset && (
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-400">
              読み込み中: <span className="text-blue-400">{loadingState.currentAsset}</span>
            </p>
          </div>
        )}

        {/* エラー表示 */}
        {loadingState.error && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-50 rounded text-red-300 text-sm">
            エラー: {loadingState.error}
          </div>
        )}

        {/* スキップボタン（オプション） */}
        {onSkip && (
          <div className="text-center">
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-white text-sm underline"
            >
              基本グラフィックでプレイ
            </button>
          </div>
        )}

        {/* ローディングアニメーション */}
        <div className="flex justify-center mt-4">
          <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
} 