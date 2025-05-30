'use client';

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Billboard, Text, Icosahedron, Dodecahedron, Octahedron } from '@react-three/drei';
import * as THREE from 'three';
import { useCollisionSystem } from '../Utils/CollisionSystem';

// アイテムの見た目タイプ（拡張版）
export type ItemAppearanceType = 'sphere' | 'crystal' | 'star' | 'cube' | 'model' | 'gem' | 'orb' | 'shard';

// アイテムの見た目定義（拡張版）
export interface ItemAppearance {
  type: ItemAppearanceType;
  size: number;
  modelPath?: string;
  modelScale?: number;
  particleEffect?: boolean; // パーティクルエフェクト
  trailEffect?: boolean; // トレイルエフェクト
  glowIntensity?: number; // 光る強さ
}

// アイテムの基本タイプ定義（拡張版）
export interface EnhancedCollectibleItem {
  id: string;
  position: [number, number, number];
  type: 'standard' | 'rare' | 'legendary' | 'special' | 'epic' | 'mythic';
  itemAppearance: ItemAppearance;
  points: number;
  color: string;
  collected: boolean;
  effectScale?: number;
  rotationSpeed?: number;
  hoverHeight?: number;
  label?: string;
  collectRadius?: number; // 収集判定の半径
  magneticRange?: number; // プレイヤーを引き寄せる範囲
  soundEffect?: string; // 収集時のサウンドエフェクト
  animationType?: 'float' | 'rotate' | 'pulse' | 'orbit' | 'spiral';
  rarity?: number; // レア度（0-1）
}

// パーティクルエフェクトコンポーネント
const ItemParticleEffect = ({ 
  position, 
  color, 
  intensity = 1.0 
}: { 
  position: [number, number, number]; 
  color: string; 
  intensity?: number;
}) => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = Math.floor(20 * intensity);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const colorObj = new THREE.Color(color);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // 球状に配置
      const radius = 0.5 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi);
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      colors[i3] = colorObj.r;
      colors[i3 + 1] = colorObj.g;
      colors[i3 + 2] = colorObj.b;
      
      sizes[i] = Math.random() * 0.1 + 0.05;
    }
    
    return { positions, colors, sizes };
  }, [color, particleCount]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // 回転運動
        const angle = state.clock.elapsedTime * 0.5 + i * 0.1;
        const radius = 0.5 + Math.sin(state.clock.elapsedTime + i) * 0.3;
        
        positions[i3] = radius * Math.cos(angle);
        positions[i3 + 1] += Math.sin(state.clock.elapsedTime * 2 + i) * 0.01;
        positions[i3 + 2] = radius * Math.sin(angle);
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <group position={position}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={particles.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleCount}
            array={particles.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

// 拡張版アイテムテンプレート
export const ENHANCED_ITEM_TEMPLATES: Record<string, Omit<EnhancedCollectibleItem, 'id' | 'position' | 'collected'>> = {
  standard: {
    type: 'standard',
    itemAppearance: {
      type: 'sphere',
      size: 0.4,
      particleEffect: false,
      glowIntensity: 1.0
    },
    points: 10,
    color: '#00ffff',
    effectScale: 1.0,
    rotationSpeed: 0.5,
    hoverHeight: 0.2,
    collectRadius: 2.5,
    magneticRange: 6.0,
    animationType: 'float',
    rarity: 0.1
  },
  rare: {
    type: 'rare',
    itemAppearance: {
      type: 'crystal',
      size: 0.6,
      particleEffect: true,
      glowIntensity: 1.5
    },
    points: 50,
    color: '#ff00ff',
    effectScale: 1.5,
    rotationSpeed: 1.0,
    hoverHeight: 0.3,
    collectRadius: 3.0,
    magneticRange: 7.0,
    animationType: 'rotate',
    rarity: 0.3
  },
  legendary: {
    type: 'legendary',
    itemAppearance: {
      type: 'star',
      size: 0.8,
      particleEffect: true,
      trailEffect: true,
      glowIntensity: 2.0
    },
    points: 200,
    color: '#ffff00',
    effectScale: 2.0,
    rotationSpeed: 1.5,
    hoverHeight: 0.5,
    collectRadius: 3.5,
    magneticRange: 8.0,
    label: 'レジェンダリー',
    animationType: 'pulse',
    rarity: 0.7
  },
  special: {
    type: 'special',
    itemAppearance: {
      type: 'cube',
      size: 0.7,
      particleEffect: true,
      glowIntensity: 1.8
    },
    points: 100,
    color: '#00ff00',
    effectScale: 1.8,
    rotationSpeed: 1.2,
    hoverHeight: 0.4,
    collectRadius: 3.0,
    magneticRange: 7.5,
    label: 'スペシャル',
    animationType: 'orbit',
    rarity: 0.5
  },
  epic: {
    type: 'epic',
    itemAppearance: {
      type: 'gem',
      size: 0.9,
      particleEffect: true,
      trailEffect: true,
      glowIntensity: 2.5
    },
    points: 500,
    color: '#ff6600',
    effectScale: 2.5,
    rotationSpeed: 2.0,
    hoverHeight: 0.6,
    collectRadius: 4.0,
    magneticRange: 10.0,
    label: 'エピック',
    animationType: 'spiral',
    rarity: 0.9
  },
  mythic: {
    type: 'mythic',
    itemAppearance: {
      type: 'orb',
      size: 1.0,
      particleEffect: true,
      trailEffect: true,
      glowIntensity: 3.0
    },
    points: 1000,
    color: '#9900ff',
    effectScale: 3.0,
    rotationSpeed: 2.5,
    hoverHeight: 0.8,
    collectRadius: 4.5,
    magneticRange: 12.0,
    label: 'ミシック',
    animationType: 'pulse',
    rarity: 1.0
  }
};

interface EnhancedItemsProps {
  playerPosition: THREE.Vector3;
  onCollect: (item: EnhancedCollectibleItem) => void;
  customItems?: EnhancedCollectibleItem[];
  stageId?: string; // ステージに応じたアイテム生成
  gameKey?: number; // ゲーム再開時のキー
}

export default function EnhancedItems({ 
  playerPosition, 
  onCollect, 
  customItems,
  stageId = 'cyber-city',
  gameKey
}: EnhancedItemsProps) {
  const { addCollisionObject, removeCollisionObject, updateCollisionObject } = useCollisionSystem();
  
  // removeCollisionObjectをメモ化して安定化
  const stableRemoveCollisionObject = useCallback((id: string) => {
    removeCollisionObject(id);
  }, [removeCollisionObject]);
  
  // アイテム状態管理
  const [items, setItems] = useState<EnhancedCollectibleItem[]>(() => {
    if (customItems && customItems.length > 0) {
      return customItems;
    }
    
    // ステージに応じたアイテム生成
    const generateStageItems = (stage: string): EnhancedCollectibleItem[] => {
      const result: EnhancedCollectibleItem[] = [];
      const citySize = 150; // 都市サイズを調整
      
      // ステージ別のアイテム配置設定
      const stageConfigs = {
        'cyber-city': {
          standard: 50,
          rare: 20,
          legendary: 8,
          special: 5,
          epic: 3,
          mythic: 2,
          heightRange: [1, 30]
        },
        'forest': {
          standard: 35,
          rare: 12,
          legendary: 4,
          special: 4,
          epic: 1,
          mythic: 1,
          heightRange: [0.5, 15]
        },
        'volcano': {
          standard: 30,
          rare: 18,
          legendary: 6,
          special: 2,
          epic: 3,
          mythic: 1,
          heightRange: [1, 30]
        }
      };
      
      const config = stageConfigs[stage as keyof typeof stageConfigs] || stageConfigs['cyber-city'];
      
      // 各タイプのアイテムを生成
      Object.entries(config).forEach(([type, count]) => {
        if (type === 'heightRange') return;
        
        const template = ENHANCED_ITEM_TEMPLATES[type];
        if (!template || typeof count !== 'number') return;
        
        for (let i = 0; i < count; i++) {
          // より広い範囲に配置
          const x = (Math.random() * 2 - 1) * citySize / 2;
          const z = (Math.random() * 2 - 1) * citySize / 2;
          const y = config.heightRange[0] + Math.random() * (config.heightRange[1] - config.heightRange[0]);
          
          // レア度に応じて配置高度を調整
          const rarityBonus = template.rarity || 0;
          const finalY = y + rarityBonus * 5; // 高度ボーナスを調整
          
          // サイバーシティステージの場合、アイテムの色を調整
          let itemColor = template.color;
          if (stage === 'cyber-city') {
            const cyberColors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0080'];
            itemColor = cyberColors[Math.floor(Math.random() * cyberColors.length)];
          }
          
          result.push({
            id: `${type}-${i}-${stage}-${gameKey || 0}`, // gameKeyを含めてユニークIDを生成
            position: [x, finalY, z],
            ...template,
            color: itemColor,
            collected: false
          });
        }
      });
      
      console.log(`Generated ${result.length} items for stage: ${stage}, gameKey: ${gameKey || 0}`);
      return result;
    };
    
    return generateStageItems(stageId);
  });
  
  // ゲーム再開時（gameKeyが変更された時）にアイテムを再生成
  useEffect(() => {
    if (gameKey !== undefined && gameKey > 0) {
      console.log(`Game restarted (gameKey: ${gameKey}), regenerating items for stage: ${stageId}`);
      
      // 既存の衝突判定オブジェクトをクリア（現在のitemsの状態を取得）
      setItems(currentItems => {
        currentItems.forEach(item => {
          stableRemoveCollisionObject(item.id);
        });
        
        // アイテムを再生成
        const generateStageItems = (stage: string): EnhancedCollectibleItem[] => {
          const result: EnhancedCollectibleItem[] = [];
          const citySize = 150;
          
          const stageConfigs = {
            'cyber-city': {
              standard: 50,
              rare: 20,
              legendary: 8,
              special: 5,
              epic: 3,
              mythic: 2,
              heightRange: [1, 30]
            },
            'forest': {
              standard: 35,
              rare: 12,
              legendary: 4,
              special: 4,
              epic: 1,
              mythic: 1,
              heightRange: [0.5, 15]
            },
            'volcano': {
              standard: 30,
              rare: 18,
              legendary: 6,
              special: 2,
              epic: 3,
              mythic: 1,
              heightRange: [1, 30]
            }
          };
          
          const config = stageConfigs[stage as keyof typeof stageConfigs] || stageConfigs['cyber-city'];
          
          Object.entries(config).forEach(([type, count]) => {
            if (type === 'heightRange') return;
            
            const template = ENHANCED_ITEM_TEMPLATES[type];
            if (!template || typeof count !== 'number') return;
            
            for (let i = 0; i < count; i++) {
              const x = (Math.random() * 2 - 1) * citySize / 2;
              const z = (Math.random() * 2 - 1) * citySize / 2;
              const y = config.heightRange[0] + Math.random() * (config.heightRange[1] - config.heightRange[0]);
              
              const rarityBonus = template.rarity || 0;
              const finalY = y + rarityBonus * 5;
              
              let itemColor = template.color;
              if (stage === 'cyber-city') {
                const cyberColors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0080'];
                itemColor = cyberColors[Math.floor(Math.random() * cyberColors.length)];
              }
              
              result.push({
                id: `${type}-${i}-${stage}-${gameKey}`,
                position: [x, finalY, z],
                ...template,
                color: itemColor,
                collected: false
              });
            }
          });
          
          return result;
        };
        
        return generateStageItems(stageId);
      });
    }
  }, [gameKey, stageId, stableRemoveCollisionObject]);
  
  // 未収集のアイテムのみを表示
  const visibleItems = useMemo(() => {
    return items.filter(item => !item.collected);
  }, [items]);
  
  // 改善された衝突判定システム
  useEffect(() => {
    visibleItems.forEach(item => {
      const collectRadius = item.collectRadius || 2.0; // 収集半径を大きく
      
      addCollisionObject({
        id: item.id,
        type: 'sphere',
        position: new THREE.Vector3(...item.position),
        size: new THREE.Vector3(collectRadius, collectRadius, collectRadius),
        isTrigger: true,
        layer: 'items', // アイテムレイヤー
        onCollision: (other) => {
          // プレイヤーとの衝突のみ処理
          if (other.layer === 'player' || other.id === 'player') {
            console.log(`Item collision detected: ${item.id}, Points: ${item.points}, Other: ${other.id}, Layer: ${other.layer}`);
            
            // 収集処理
            setItems(prevItems => 
              prevItems.map(prevItem => 
                prevItem.id === item.id 
                  ? { ...prevItem, collected: true } 
                  : prevItem
              )
            );
            
            // 衝突判定オブジェクトを削除
            stableRemoveCollisionObject(item.id);
            
            // 親コンポーネントに通知
            onCollect(item);
          }
        }
      });
    });
    
    // クリーンアップ
    return () => {
      visibleItems.forEach(item => {
        stableRemoveCollisionObject(item.id);
      });
    };
  }, [visibleItems, addCollisionObject, stableRemoveCollisionObject, onCollect]);
  
  // 改善されたマグネット効果とリアルタイム衝突判定
  useFrame(() => {
    if (!playerPosition) return;
    
    visibleItems.forEach(item => {
      const magneticRange = item.magneticRange || 5.0; // マグネット範囲を大きく
      const collectRadius = item.collectRadius || 2.0; // 収集半径を大きく
      const itemPosition = new THREE.Vector3(...item.position);
      const distance = itemPosition.distanceTo(playerPosition);
      
      // 直接的な衝突判定（フレームごと）
      if (distance <= collectRadius) {
        console.log(`Direct collision detected: ${item.id}, Distance: ${distance.toFixed(2)}, Player: ${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)}`);
        
        // 即座に収集
        setItems(prevItems => 
          prevItems.map(prevItem => 
            prevItem.id === item.id 
              ? { ...prevItem, collected: true } 
              : prevItem
          )
        );
        
        stableRemoveCollisionObject(item.id);
        onCollect(item);
        return;
      }
      
      // マグネット効果（改善版）
      if (distance < magneticRange && distance > collectRadius) {
        // プレイヤーに向かって移動
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, itemPosition)
          .normalize();
        
        // 距離に応じた引力の強さ（2次関数）
        const magneticForce = Math.pow((magneticRange - distance) / magneticRange, 2);
        const moveSpeed = magneticForce * 12; // 引力をさらに強化
        
        // アイテムの新しい位置を計算
        const newPosition = itemPosition.add(direction.multiplyScalar(moveSpeed * 0.016)); // 60FPS想定
        
        // アイテムの位置を更新
        setItems(prevItems => 
          prevItems.map(prevItem => 
            prevItem.id === item.id 
              ? { 
                  ...prevItem, 
                  position: [newPosition.x, newPosition.y, newPosition.z] 
                } 
              : prevItem
          )
        );
        
        // 衝突判定オブジェクトの位置も更新
        updateCollisionObject(item.id, newPosition);
      }
    });
  });
  
  // 時間のリファレンス
  const timeRef = useRef(0);
  
  useFrame((state, delta) => {
    timeRef.current += delta;
  });
  
  // 拡張されたアイテム形状コンポーネント
  const EnhancedItemShape = ({ 
    item, 
    effect 
  }: { 
    item: EnhancedCollectibleItem; 
    effect: { emissiveIntensity: number; pulseSpeed: number; };
  }) => {
    const { type, size, glowIntensity = 1.0 } = item.itemAppearance;
    
    const material = (
      <meshStandardMaterial
        color={item.color}
        emissive={item.color}
        emissiveIntensity={effect.emissiveIntensity * glowIntensity}
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={0.9}
      />
    );
    
    switch (type) {
      case 'crystal':
        return (
          <Icosahedron args={[size, 2]}>
            {material}
          </Icosahedron>
        );
      case 'star':
        return (
          <Dodecahedron args={[size, 2]}>
            <meshStandardMaterial
              color={item.color}
              emissive={item.color}
              emissiveIntensity={effect.emissiveIntensity * glowIntensity}
              metalness={0.9}
              roughness={0.1}
              wireframe={true}
              transparent
              opacity={0.8}
            />
          </Dodecahedron>
        );
      case 'cube':
        return (
          <Octahedron args={[size, 3]}>
            {material}
          </Octahedron>
        );
      case 'gem':
        return (
          <group>
            <Icosahedron args={[size, 3]}>
              {material}
            </Icosahedron>
            <Icosahedron args={[size * 0.7, 2]}>
              <meshStandardMaterial
                color={item.color}
                emissive={item.color}
                emissiveIntensity={effect.emissiveIntensity * glowIntensity * 1.5}
                transparent
                opacity={0.5}
              />
            </Icosahedron>
          </group>
        );
      case 'orb':
        return (
          <group>
            <Sphere args={[size, 32, 32]}>
              <meshStandardMaterial
                color={item.color}
                emissive={item.color}
                emissiveIntensity={effect.emissiveIntensity * glowIntensity}
                metalness={0.9}
                roughness={0.0}
                transparent
                opacity={0.7}
              />
            </Sphere>
            <Sphere args={[size * 0.8, 16, 16]}>
              <meshStandardMaterial
                color={item.color}
                emissive={item.color}
                emissiveIntensity={effect.emissiveIntensity * glowIntensity * 2}
                transparent
                opacity={0.3}
              />
            </Sphere>
          </group>
        );
      case 'shard':
        return (
          <group>
            {[...Array(5)].map((_, i) => (
              <mesh key={i} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]}>
                <coneGeometry args={[size * 0.3, size * 1.5, 4]} />
                {material}
              </mesh>
            ))}
          </group>
        );
      case 'sphere':
      default:
        return (
          <Sphere args={[size, 16, 16]}>
            {material}
          </Sphere>
        );
    }
  };
  
  // 拡張されたアイテムコンポーネント
  const EnhancedItem = ({ item }: { item: EnhancedCollectibleItem }) => {
    const itemRef = useRef<THREE.Group>(null);
    
    const rotationSpeed = item.rotationSpeed || 0.5;
    const hoverHeight = item.hoverHeight || 0.2;
    
    // 複雑なアニメーション
    useFrame((state) => {
      if (!itemRef.current) return;
      
      const time = state.clock.elapsedTime;
      
      switch (item.animationType) {
        case 'rotate':
          itemRef.current.rotation.y += rotationSpeed;
          itemRef.current.rotation.x += rotationSpeed * 0.5;
          break;
        case 'pulse':
          const scale = 1 + Math.sin(time * 3) * 0.2;
          itemRef.current.scale.setScalar(scale);
          itemRef.current.rotation.y += rotationSpeed;
          break;
        case 'orbit':
          itemRef.current.rotation.y += rotationSpeed;
          const orbitRadius = 0.5;
          itemRef.current.position.x = item.position[0] + Math.cos(time) * orbitRadius;
          itemRef.current.position.z = item.position[2] + Math.sin(time) * orbitRadius;
          break;
        case 'spiral':
          itemRef.current.rotation.y += rotationSpeed;
          const spiralHeight = Math.sin(time * 2) * hoverHeight;
          const spiralRadius = Math.cos(time * 1.5) * 0.3;
          itemRef.current.position.x = item.position[0] + spiralRadius;
          itemRef.current.position.y = item.position[1] + spiralHeight;
          itemRef.current.position.z = item.position[2] + Math.sin(time * 1.5) * 0.3;
          break;
        case 'float':
        default:
          itemRef.current.rotation.y += rotationSpeed;
          const hoverOffset = Math.sin(time * 2) * hoverHeight;
          itemRef.current.position.y = item.position[1] + hoverOffset;
          break;
      }
    });
    
    // アイテムタイプに応じたエフェクト（拡張版）
    const getItemEffect = () => {
      const effectScale = item.effectScale || 1.0;
      const rarity = item.rarity || 0.1;
      
      const baseIntensity = 1 + rarity * 2;
      const pulseSpeed = 2 + rarity * 3;
      
      return {
        emissiveIntensity: (baseIntensity + Math.sin(timeRef.current * pulseSpeed) * 0.5) * effectScale,
        pulseSpeed: pulseSpeed * effectScale
      };
    };
    
    const effect = getItemEffect();
    
    return (
      <group position={item.position} ref={itemRef}>
        {/* アイテム本体 */}
        <EnhancedItemShape item={item} effect={effect} />
        
        {/* パーティクルエフェクト */}
        {item.itemAppearance.particleEffect && (
          <ItemParticleEffect 
            position={[0, 0, 0]} 
            color={item.color} 
            intensity={item.rarity || 1.0}
          />
        )}
        
        {/* ラベル */}
        {item.label && (
          <Billboard position={[0, 2.5, 0]}>
            <Text
              fontSize={0.6}
              color={item.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.1}
              outlineColor="#000000"
            >
              {item.label}
              <meshStandardMaterial
                emissive={item.color}
                emissiveIntensity={effect.emissiveIntensity}
                transparent
                opacity={0.9}
              />
            </Text>
          </Billboard>
        )}
        
        {/* 光のリング（高レアアイテム用） */}
        {(item.rarity || 0) > 0.5 && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, 2.0, 32]} />
            <meshStandardMaterial
              color={item.color}
              emissive={item.color}
              emissiveIntensity={effect.emissiveIntensity * 0.5}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    );
  };

  // 衝突判定データの更新
  useEffect(() => {
    // 衝突判定用のデータを更新
    const newCollisionData = items.map(item => ({
      id: item.id,
      position: new THREE.Vector3(...item.position),
      radius: item.collectRadius || 2.0,
      collected: item.collected
    }));
    
    // グローバルに公開（他のコンポーネントから参照可能）
    interface WindowWithCollisionData extends Window {
      enhancedItemsCollisionData?: typeof newCollisionData;
    }
    
    (window as WindowWithCollisionData).enhancedItemsCollisionData = newCollisionData;
    
    return () => {
      // クリーンアップ
      delete (window as WindowWithCollisionData).enhancedItemsCollisionData;
    };
  }, [items, gameKey]);

  return (
    <group>
      {visibleItems.map(item => (
        <EnhancedItem key={item.id} item={item} />
      ))}
      
      {/* デバッグ情報 */}
      {visibleItems.length > 0 && (
        <mesh position={[0, 50, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  );
} 