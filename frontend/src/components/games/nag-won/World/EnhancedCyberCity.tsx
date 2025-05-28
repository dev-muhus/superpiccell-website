'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAssetLoader, LoadingOverlay } from '../Utils/AssetLoader';
import { useCollisionSystem, CollisionDebug } from '../Utils/CollisionSystem';

// GLTFアセットの型定義
interface GLTFResult {
  scene: THREE.Group;
  nodes: { [name: string]: THREE.Object3D };
  materials: { [name: string]: THREE.Material };
}

// 建物のタイプ定義（拡張版）
type EnhancedBuildingType = {
  id: string;
  position: [number, number, number];
  height: number;
  width: number;
  depth: number;
  color: string;
  hasNeon?: boolean;
  neonColor?: string;
  neonText?: string;
  rotation?: number;
  buildingType?: 'skyscraper' | 'office' | 'residential' | 'shop' | 'tower' | 'complex';
  windowDensity?: number;
  textureScale?: number;
  modelId?: string; // 3Dモデルを使用する場合
  hasCollision?: boolean;
  collisionType?: 'box' | 'sphere';
  hasParticles?: boolean; // パーティクルエフェクト
  animationType?: 'none' | 'rotate' | 'float' | 'pulse';
};

// パーティクルシステム
const ParticleSystem = ({ position, type }: { position: [number, number, number]; type: string }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 100;
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // パーティクルの位置
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = Math.random() * 30;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;
      
      // パーティクルの色（サイバーパンク風）
      if (type === 'cyber') {
        colors[i3] = Math.random() * 0.5 + 0.5; // R
        colors[i3 + 1] = Math.random() * 0.3; // G
        colors[i3 + 2] = Math.random() * 0.8 + 0.2; // B
      } else {
        colors[i3] = Math.random();
        colors[i3 + 1] = Math.random();
        colors[i3 + 2] = Math.random();
      }
    }
    
    return { positions, colors };
  }, [type]);
  
  useFrame((state, delta) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += delta * 2; // Y方向に移動
        
        // 上に行きすぎたら下に戻す
        if (positions[i3 + 1] > 30) {
          positions[i3 + 1] = 0;
        }
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
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

// 3Dモデル建物コンポーネント
const ModelBuilding = ({ 
  building, 
  modelAsset 
}: { 
  building: EnhancedBuildingType; 
  modelAsset: THREE.Object3D | THREE.Texture;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current && building.animationType) {
      switch (building.animationType) {
        case 'rotate':
          groupRef.current.rotation.y += delta * 0.5;
          break;
        case 'float':
          groupRef.current.position.y = building.position[1] + Math.sin(state.clock.elapsedTime) * 0.5;
          break;
        case 'pulse':
          const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
          groupRef.current.scale.setScalar(scale);
          break;
      }
    }
  });
  
  // GLTFアセットかどうかをチェック
  const isGLTFAsset = (asset: THREE.Object3D | THREE.Texture): boolean => {
    return asset && typeof asset === 'object' && 'scene' in asset;
  };
  
  if (!modelAsset || !isGLTFAsset(modelAsset)) return null;
  
  return (
    <group 
      ref={groupRef}
      position={building.position} 
      rotation={[0, building.rotation || 0, 0]}
    >
      <primitive object={(modelAsset as unknown as GLTFResult).scene.clone()} />
      
      {/* パーティクルエフェクト */}
      {building.hasParticles && (
        <ParticleSystem position={[0, building.height / 2, 0]} type="cyber" />
      )}
    </group>
  );
};

// 拡張版建物コンポーネント
const EnhancedBuilding = ({ 
  building, 
  getAsset, 
  isAssetLoaded 
}: { 
  building: EnhancedBuildingType;
  getAsset: (id: string) => THREE.Object3D | THREE.Texture | undefined;
  isAssetLoaded: (id: string) => boolean;
}) => {
  const { position, height, width, depth, color, hasNeon, neonColor, neonText, rotation, buildingType, windowDensity = 1.0, textureScale = 1.0, modelId } = building;
  const groupRef = useRef<THREE.Group>(null);
  
  // React Hooksを条件付きで呼び出さないように修正
  const windowPattern = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // グラデーション背景
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 建物タイプに基づいて窓パターンを変更
      let windowWidth, windowHeight, gapX, gapY;
      
      switch(buildingType) {
        case 'skyscraper':
          windowWidth = 12;
          windowHeight = 35;
          gapX = 18;
          gapY = 12;
          break;
        case 'tower':
          windowWidth = 20;
          windowHeight = 20;
          gapX = 25;
          gapY = 25;
          break;
        case 'complex':
          windowWidth = 30;
          windowHeight = 15;
          gapX = 20;
          gapY = 20;
          break;
        default:
          windowWidth = 20;
          windowHeight = 30;
          gapX = 25;
          gapY = 20;
      }
      
      // 窓を描画（改良版）
      const windowsX = Math.floor(canvas.width / (windowWidth + gapX));
      const windowsY = Math.floor(canvas.height / (windowHeight + gapY));
      
      for (let x = 0; x < windowsX; x++) {
        for (let y = 0; y < windowsY; y++) {
          if (Math.random() < 0.7 * windowDensity) {
            const wx = x * (windowWidth + gapX) + gapX / 2;
            const wy = y * (windowHeight + gapY) + gapY / 2;
            
            // 窓の種類をランダムに選択
            const windowType = Math.random();
            
            if (windowType < 0.6) {
              // 通常の窓（黄色い光）
              ctx.fillStyle = `rgba(255, 255, 150, ${0.6 + Math.random() * 0.4})`;
            } else if (windowType < 0.8) {
              // サイバーパンク風の窓（青い光）
              ctx.fillStyle = `rgba(0, 255, 255, ${0.5 + Math.random() * 0.5})`;
            } else {
              // 特殊な窓（ピンクの光）
              ctx.fillStyle = `rgba(255, 0, 255, ${0.4 + Math.random() * 0.6})`;
            }
            
            // 窓の形状をランダムに変更
            if (Math.random() < 0.1) {
              // 大きな窓
              ctx.fillRect(wx, wy, windowWidth * 2, windowHeight);
            } else if (Math.random() < 0.05) {
              // 縦長の窓
              ctx.fillRect(wx, wy, windowWidth, windowHeight * 2);
            } else {
              // 通常の窓
              ctx.fillRect(wx, wy, windowWidth, windowHeight);
            }
          }
        }
      }
      
      // 建物の特徴的な装飾を追加
      if (buildingType === 'tower') {
        // タワーには縦のライン
        ctx.strokeStyle = neonColor || '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(textureScale, 2);
    
    return texture;
  }, [color, buildingType, windowDensity, textureScale, neonColor]);
  
  // アニメーション
  useFrame((state, delta) => {
    if (groupRef.current && building.animationType) {
      switch (building.animationType) {
        case 'rotate':
          groupRef.current.rotation.y += delta * 0.2;
          break;
        case 'float':
          groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.3;
          break;
        case 'pulse':
          const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + position[0]) * 0.05;
          groupRef.current.scale.setScalar(scale);
          break;
      }
    }
  });
  
  // 3Dモデルを使用する場合
  if (modelId && isAssetLoaded(modelId)) {
    const modelAsset = getAsset(modelId);
    if (modelAsset) {
      return <ModelBuilding building={building} modelAsset={modelAsset} />;
    }
  }
  
  // 建物の形状（改良版）
  const BuildingShape = () => {
    const material = (
      <meshStandardMaterial 
        color={color} 
        map={windowPattern} 
        metalness={0.3} 
        roughness={0.7}
        emissive={neonColor || '#000000'}
        emissiveIntensity={0.1}
      />
    );
    
    switch(buildingType) {
      case 'tower':
        // タワーは円柱形
        return (
          <Cylinder args={[width / 2, width / 2, height, 8]} castShadow>
            {material}
          </Cylinder>
        );
      case 'complex':
        // 複合ビルは複数の箱を組み合わせ
        return (
          <group>
            <Box args={[width, height * 0.7, depth]} position={[0, height * 0.35, 0]} castShadow>
              {material}
            </Box>
            <Box args={[width * 0.7, height * 0.5, depth * 0.7]} position={[0, height * 0.85, 0]} castShadow>
              {material}
            </Box>
          </group>
        );
      default:
        // デフォルトは箱形
        return (
          <Box args={[width, height, depth]} castShadow>
            {material}
          </Box>
        );
    }
  };
  
  return (
    <group ref={groupRef} position={position} rotation={[0, rotation || 0, 0]}>
      <BuildingShape />
      
      {/* ネオンサイン（改良版） */}
      {hasNeon && neonText && (
        <Billboard position={[0, height / 2 + 3, 0]}>
          <Text
            fontSize={2.5}
            color={neonColor || '#ff00ff'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.1}
            outlineColor="#000000"
          >
            {neonText}
            <meshStandardMaterial
              emissive={neonColor || '#ff00ff'}
              emissiveIntensity={1.5}
              transparent
              opacity={0.9}
            />
          </Text>
        </Billboard>
      )}
      
      {/* パーティクルエフェクト */}
      {building.hasParticles && (
        <ParticleSystem position={[0, height / 2, 0]} type="cyber" />
      )}
    </group>
  );
};

export default function EnhancedCyberCity() {
  const { loadingState, getAsset, isAssetLoaded } = useAssetLoader('cyber-city');
  const { addCollisionObject, system } = useCollisionSystem();
  
  // 拡張された建物データ
  const enhancedBuildings = useMemo<EnhancedBuildingType[]>(() => {
    const result: EnhancedBuildingType[] = [];
    
    const citySize = 200; // さらに大きな都市
    const gridSize = 35;
    const maxHeight = 120; // より高い建物
    const minHeight = 25;
    
    const baseColors = [
      '#1a1a2e', '#16213e', '#0f3460', '#252839', '#191e29', '#0d1117', '#2b2b2b', '#1e1e3f'
    ];
    
    const neonColors = [
      '#ff00ff', '#00ffff', '#ff2975', '#00ff9f', '#00f2ff', '#fd4556', '#fbff00', '#ff6b35'
    ];
    
    const neonTexts = [
      'CYBER', 'NEON', 'TECH', 'LIFE', 'BYTE', 'FLOW', 'DATA', 'SYNC', 'EDGE', 
      'HACK', 'WAVE', 'GRID', 'CORE', 'NODE', 'PULSE', 'PIXEL', 'LINK', 'ZONE',
      'MATRIX', 'GHOST', 'SHELL', 'NEXUS', 'VOID', 'FLUX'
    ];
    
    const buildingTypes = ['skyscraper', 'office', 'residential', 'shop', 'tower', 'complex'];
    const animationTypes = ['none', 'rotate', 'float', 'pulse'];
    
    for (let x = -citySize / 2; x < citySize / 2; x += gridSize) {
      for (let z = -citySize / 2; z < citySize / 2; z += gridSize) {
        if (Math.random() > 0.65) continue; // より密度を下げる
        
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetZ = (Math.random() - 0.5) * 10;
        const width = Math.max(10, Math.random() * 20);
        const depth = Math.max(10, Math.random() * 20);
        
        const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)] as 'skyscraper' | 'office' | 'residential' | 'shop' | 'tower' | 'complex';
        let height;
        
        switch(buildingType) {
          case 'skyscraper':
            height = minHeight * 2 + Math.random() * (maxHeight - minHeight * 2);
            break;
          case 'tower':
            height = minHeight * 1.5 + Math.random() * (maxHeight * 0.8 - minHeight * 1.5);
            break;
          case 'complex':
            height = minHeight * 1.2 + Math.random() * (maxHeight * 0.6 - minHeight * 1.2);
            break;
          default:
            height = minHeight + Math.random() * (maxHeight * 0.7 - minHeight);
        }
        
        const hasNeon = Math.random() > 0.05; // ほぼ全ての建物に光る要素
        const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        const neonText = neonTexts[Math.floor(Math.random() * neonTexts.length)];
        const animationType = animationTypes[Math.floor(Math.random() * animationTypes.length)] as 'none' | 'rotate' | 'float' | 'pulse';
        
        // 特別な建物には3Dモデルを使用
        let modelId;
        if (Math.random() < 0.1 && buildingType === 'skyscraper') {
          modelId = Math.random() < 0.5 ? 'cyber-building-1' : 'cyber-building-2';
        }
        
        const building: EnhancedBuildingType = {
          id: `enhanced-building-${x}-${z}`,
          position: [x + offsetX, height / 2, z + offsetZ],
          height,
          width,
          depth,
          color: baseColors[Math.floor(Math.random() * baseColors.length)],
          hasNeon,
          neonColor,
          neonText,
          rotation: Math.random() * Math.PI * 2,
          buildingType,
          windowDensity: 0.8 + Math.random() * 0.4,
          textureScale: 1 + Math.random() * 0.5,
          modelId,
          hasCollision: true,
          collisionType: buildingType === 'tower' ? 'sphere' : 'box',
          hasParticles: Math.random() < 0.15, // 15%の建物にパーティクル
          animationType: animationType === 'none' ? undefined : animationType
        };
        
        result.push(building);
      }
    }
    
    return result;
  }, []);
  
  // 衝突判定オブジェクトを登録
  useEffect(() => {
    enhancedBuildings.forEach(building => {
      if (building.hasCollision) {
        addCollisionObject({
          id: building.id,
          type: building.collisionType || 'box',
          position: new THREE.Vector3(...building.position),
          size: new THREE.Vector3(building.width, building.height, building.depth),
          isStatic: true,
          layer: 'buildings'
        });
      }
    });
  }, [enhancedBuildings, addCollisionObject]);
  
  // ローディング中の表示
  if (loadingState.isLoading) {
    return <LoadingOverlay loadingState={loadingState} />;
  }
  
  return (
    <>
      {/* 拡張された建物をレンダリング */}
      {enhancedBuildings.map((building) => (
        <EnhancedBuilding 
          key={building.id} 
          building={building} 
          getAsset={getAsset}
          isAssetLoaded={isAssetLoaded}
        />
      ))}
      
      {/* 環境エフェクト */}
      <ambientLight intensity={0.2} color="#4a90e2" />
      <directionalLight 
        position={[100, 100, 50]} 
        intensity={0.8} 
        color="#ffffff"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      
      {/* フォグエフェクト */}
      <fog attach="fog" args={['#1a1a2e', 50, 300]} />
      
      {/* デバッグ用衝突判定表示（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <CollisionDebug system={system} visible={false} />
      )}
    </>
  );
} 