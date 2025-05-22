'use client';

import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Billboard, Text, useGLTF, Icosahedron, Dodecahedron, Octahedron } from '@react-three/drei';
import * as THREE from 'three';

// アイテムの見た目タイプ
export type ItemAppearanceType = 'sphere' | 'crystal' | 'star' | 'cube' | 'model';

// アイテムの見た目定義
export interface ItemAppearance {
  type: ItemAppearanceType;
  size: number;
  modelPath?: string; // カスタム3Dモデルへのパス
  modelScale?: number; // カスタムモデルのスケール
}

// アイテムの基本タイプ定義
export interface CollectibleItem {
  id: string;
  position: [number, number, number];
  type: 'standard' | 'rare' | 'legendary' | 'special';
  itemAppearance: ItemAppearance;
  points: number;
  color: string;
  collected: boolean;
  effectScale?: number;
  rotationSpeed?: number;
  hoverHeight?: number;
  label?: string; // オプションのラベルテキスト
}

// 利用可能なアイテムタイプテンプレート
export const ITEM_TEMPLATES: Record<string, Omit<CollectibleItem, 'id' | 'position' | 'collected'>> = {
  standard: {
    type: 'standard' as const,
    itemAppearance: {
      type: 'sphere' as const,
      size: 0.4
    },
    points: 10,
    color: '#00ffff',
    effectScale: 1.0,
    rotationSpeed: 0.5,
    hoverHeight: 0.2
  },
  rare: {
    type: 'rare' as const,
    itemAppearance: {
      type: 'crystal' as const,
      size: 0.6
    },
    points: 50,
    color: '#ff00ff',
    effectScale: 1.5,
    rotationSpeed: 1.0,
    hoverHeight: 0.3
  },
  legendary: {
    type: 'legendary' as const,
    itemAppearance: {
      type: 'star' as const,
      size: 0.8
    },
    points: 200,
    color: '#ffff00',
    effectScale: 2.0,
    rotationSpeed: 1.5,
    hoverHeight: 0.5,
    label: 'レジェンダリー'
  },
  special: {
    type: 'special' as const,
    itemAppearance: {
      type: 'cube' as const,
      size: 0.7
    },
    points: 100,
    color: '#00ff00',
    effectScale: 1.8,
    rotationSpeed: 1.2,
    hoverHeight: 0.4,
    label: 'スペシャル'
  }
};

interface ItemsProps {
  playerPosition: THREE.Vector3;
  onCollect: (item: CollectibleItem) => void;
  customItems?: CollectibleItem[]; // オプションでカスタムアイテムリストを渡せる
}

export default function Items({ playerPosition, onCollect, customItems }: ItemsProps) {
  // すべてのアイテムを一度生成
  const [items, setItems] = useState<CollectibleItem[]>(() => {
    // カスタムアイテムが指定されていればそれを使用
    if (customItems && customItems.length > 0) {
      return customItems;
    }
    
    // アイテムの初期生成
    const initialItems: CollectibleItem[] = [];
    const citySize = 80; // 都市のサイズに合わせる
    
    // 標準アイテム（多め）
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() * 2 - 1) * citySize / 2;
      const z = (Math.random() * 2 - 1) * citySize / 2;
      
      const template = ITEM_TEMPLATES.standard;
      initialItems.push({
        id: `standard-${i}`,
        position: [x, 1 + Math.random() * 3, z],
        ...template,
        collected: false
      });
    }
    
    // レアアイテム（少なめ）
    for (let i = 0; i < 10; i++) {
      const x = (Math.random() * 2 - 1) * citySize / 2;
      const z = (Math.random() * 2 - 1) * citySize / 2;
      
      const template = ITEM_TEMPLATES.rare;
      initialItems.push({
        id: `rare-${i}`,
        position: [x, 1 + Math.random() * 5, z],
        ...template,
        collected: false
      });
    }
    
    // レジェンダリーアイテム（ごく少数）
    for (let i = 0; i < 3; i++) {
      const x = (Math.random() * 2 - 1) * citySize / 2;
      const z = (Math.random() * 2 - 1) * citySize / 2;
      
      const template = ITEM_TEMPLATES.legendary;
      initialItems.push({
        id: `legendary-${i}`,
        position: [x, 10 + Math.random() * 10, z], // 高い位置に配置
        ...template,
        collected: false
      });
    }
    
    // スペシャルアイテム（まれに）
    for (let i = 0; i < 2; i++) {
      const x = (Math.random() * 2 - 1) * citySize / 2;
      const z = (Math.random() * 2 - 1) * citySize / 2;
      
      const template = ITEM_TEMPLATES.special;
      initialItems.push({
        id: `special-${i}`,
        position: [x, 5 + Math.random() * 5, z],
        ...template,
        collected: false
      });
    }
    
    return initialItems;
  });
  
  // 未収集のアイテムのみを表示
  const visibleItems = useMemo(() => {
    return items.filter(item => !item.collected);
  }, [items]);
  
  // 収集処理の実装
  useFrame(() => {
    if (!playerPosition) return;
    
    const collectDistance = 2; // プレイヤーからの収集距離
    
    // 未収集のアイテムをチェック
    visibleItems.forEach(item => {
      const itemPosition = new THREE.Vector3(...item.position);
      const distance = itemPosition.distanceTo(playerPosition);
      
      // 収集距離内なら収集
      if (distance < collectDistance) {
        // 収集状態を更新
        setItems(prevItems => 
          prevItems.map(prevItem => 
            prevItem.id === item.id 
              ? { ...prevItem, collected: true } 
              : prevItem
          )
        );
        
        // 親コンポーネントに通知
        onCollect(item);
      }
    });
  });
  
  // 時間のリファレンスを保持
  const timeRef = useRef(0);
  
  // アイテムのアニメーション
  useFrame((_, delta) => {
    timeRef.current += delta;
  });
  
  // モデルキャッシュ
  const modelCache = useRef<Record<string, THREE.Group>>({});
  
  // アイテムエフェクトの型定義
  interface ItemEffect {
    emissiveIntensity: number;
    pulseSpeed: number;
  }
  
  // アイテム形状に基づくコンポーネント
  const ItemShape = ({ item, effect }: { item: CollectibleItem, effect: ItemEffect }) => {
    const { type, size } = item.itemAppearance;
    
    // カスタム3Dモデルの場合
    if (type === 'model' && item.itemAppearance.modelPath) {
      const modelPath = item.itemAppearance.modelPath;
      const scale = item.itemAppearance.modelScale || 1.0;
      
      // GLTFモデルをロードするコンポーネント（条件分岐の外でフックを呼び出す）
      const ModelLoader = () => {
        // useGLTFは常に呼び出す（条件分岐の外）
        const { scene } = useGLTF(modelPath);
        
        // マウント時にモデルをキャッシュに登録
        React.useEffect(() => {
          if (!modelCache.current[modelPath]) {
            modelCache.current[modelPath] = scene.clone();
          }
        }, [scene]);
        
        // キャッシュされたモデルがあれば使用、なければシーンから
        const model = modelCache.current[modelPath] || scene;
        
        return (
          <primitive 
            object={model.clone()} 
            scale={[scale, scale, scale]}
            material-emissive={item.color}
            material-emissiveIntensity={effect.emissiveIntensity}
          />
        );
      };
      
      // もしキャッシュにモデルがあればそれを使用、なければローダーコンポーネントを表示
      return modelCache.current[modelPath] ? (
        <primitive 
          object={modelCache.current[modelPath].clone()} 
          scale={[scale, scale, scale]}
          material-emissive={item.color}
          material-emissiveIntensity={effect.emissiveIntensity}
        />
      ) : (
        <ModelLoader />
      );
    }
    
    // 基本形状
    switch (type) {
      case 'crystal':
        return (
          <Icosahedron args={[size, 1]}>
            <meshStandardMaterial
              color={item.color}
              emissive={item.color}
              emissiveIntensity={effect.emissiveIntensity}
              metalness={0.9}
              roughness={0.1}
            />
          </Icosahedron>
        );
      case 'star':
        return (
          <Dodecahedron args={[size, 1]}>
            <meshStandardMaterial
              color={item.color}
              emissive={item.color}
              emissiveIntensity={effect.emissiveIntensity}
              metalness={0.8}
              roughness={0.2}
              wireframe={true}
            />
          </Dodecahedron>
        );
      case 'cube':
        return (
          <Octahedron args={[size, 2]}>
            <meshStandardMaterial
              color={item.color}
              emissive={item.color}
              emissiveIntensity={effect.emissiveIntensity}
              metalness={0.7}
              roughness={0.3}
            />
          </Octahedron>
        );
      case 'sphere':
      default:
        return (
          <Sphere args={[size, 16, 16]}>
            <meshStandardMaterial
              color={item.color}
              emissive={item.color}
              emissiveIntensity={effect.emissiveIntensity}
              metalness={0.8}
              roughness={0.2}
            />
          </Sphere>
        );
    }
  };
  
  // アイテムコンポーネント
  const Item = ({ item }: { item: CollectibleItem }) => {
    // アイテムの浮遊アニメーション用の参照
    const itemRef = useRef<THREE.Group>(null);
    
    // 回転と浮遊のスピードと高さを取得
    const rotationSpeed = item.rotationSpeed || 0.5;
    const hoverHeight = item.hoverHeight || 0.2;
    
    // アイテムの回転と浮遊アニメーション
    useFrame((_, delta) => {
      if (!itemRef.current) return;
      
      // 回転アニメーション - アイテム固有の速度で
      itemRef.current.rotation.y += delta * rotationSpeed;
      
      // 浮遊アニメーション - アイテム固有の高さで
      const hoverOffset = Math.sin(timeRef.current * 2) * hoverHeight;
      itemRef.current.position.y = item.position[1] + hoverOffset;
    });
    
    // アイテムタイプに応じたエフェクト
    const getItemEffect = () => {
      const effectScale = item.effectScale || 1.0;
      
      switch (item.type) {
        case 'legendary':
          return {
            emissiveIntensity: (2 + Math.sin(timeRef.current * 5) * 0.5) * effectScale,
            pulseSpeed: 3 * effectScale
          };
        case 'rare':
          return {
            emissiveIntensity: (1.5 + Math.sin(timeRef.current * 3) * 0.3) * effectScale,
            pulseSpeed: 2 * effectScale
          };
        case 'special':
          return {
            emissiveIntensity: (1.8 + Math.sin(timeRef.current * 4) * 0.4) * effectScale,
            pulseSpeed: 2.5 * effectScale
          };
        default:
          return {
            emissiveIntensity: (1 + Math.sin(timeRef.current * 2) * 0.2) * effectScale,
            pulseSpeed: 1 * effectScale
          };
      }
    };
    
    const effect = getItemEffect();
    
    return (
      <group position={item.position} ref={itemRef}>
        {/* アイテム本体 */}
        <ItemShape item={item} effect={effect} />
        
        {/* ラベルがある場合は表示 */}
        {item.label && (
          <Billboard position={[0, 2, 0]}>
            <Text
              fontSize={0.5}
              color={item.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.05}
              outlineColor="#000000"
            >
              {item.label}
              <meshStandardMaterial
                emissive={item.color}
                emissiveIntensity={1 + Math.sin(timeRef.current * 3) * 0.5}
              />
            </Text>
          </Billboard>
        )}
      </group>
    );
  };

  return (
    <group>
      {visibleItems.map(item => (
        <Item key={item.id} item={item} />
      ))}
    </group>
  );
} 