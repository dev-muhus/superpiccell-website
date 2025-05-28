'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

// 建物のタイプ定義
type BuildingType = {
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
};

// 道路のタイプ定義
type RoadType = {
  position: [number, number, number];
  width: number;
  length: number;
  rotation: number;
};

// 建物配置データを外部から参照可能にするためのグローバル変数
export let cityBuildingsData: BuildingType[] = [];

// ホログラムのタイプ定義
type HologramType = {
  id: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
  type: 'advertisement' | 'info' | 'warning' | 'decoration';
  color: string;
  text?: string;
  animationType: 'rotate' | 'pulse' | 'float';
};

// ドローンのタイプ定義
type DroneType = {
  id: string;
  position: [number, number, number];
  scale: number;
  speed: number;
  path: THREE.Vector3[];
  color: string;
  lightColor: string;
};

// エネルギーフィールドのタイプ定義
type EnergyFieldType = {
  id: string;
  position: [number, number, number];
  radius: number;
  height: number;
  color: string;
  intensity: number;
  type: 'barrier' | 'portal' | 'generator';
};

// サイバーパーティクルのタイプ定義
type CyberParticleType = {
  id: string;
  position: [number, number, number];
  velocity: THREE.Vector3;
  color: string;
  size: number;
  lifeTime: number;
  type: 'data' | 'energy' | 'spark';
};

export default function CyberCity() {
  // プロシージャルに生成された建物
  const buildings = useMemo<BuildingType[]>(() => {
    const result: BuildingType[] = [];
    const citySize = 150;
    const gridSize = 25; // グリッドサイズを小さくして密度を上げる
    const maxHeight = 80;
    const minHeight = 15;
    
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
    
    for (let x = -citySize / 2; x < citySize / 2; x += gridSize) {
      for (let z = -citySize / 2; z < citySize / 2; z += gridSize) {
        // 中央の道路エリアを避ける
        const distanceFromCenterX = Math.abs(x);
        const distanceFromCenterZ = Math.abs(z);
        
        // 道路の幅を考慮して建物を配置しない範囲を設定
        if (distanceFromCenterX < 8 || distanceFromCenterZ < 8) continue;
        
        // 建物生成確率を上げる（30%から80%に変更）
        if (Math.random() > 0.8) continue;
        
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetZ = (Math.random() - 0.5) * 8;
        const width = Math.max(8, Math.random() * 15);
        const depth = Math.max(8, Math.random() * 15);
        const height = minHeight + Math.random() * (maxHeight - minHeight);
        
        const hasNeon = Math.random() > 0.1;
        const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        const neonText = neonTexts[Math.floor(Math.random() * neonTexts.length)];
        
        const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)] as 'skyscraper' | 'office' | 'residential' | 'shop' | 'tower' | 'complex';
        const windowDensity = 0.6 + Math.random() * 0.4;
        
        const building = {
          id: `building-${x}-${z}`,
          position: [x + offsetX, height / 2, z + offsetZ] as [number, number, number],
          height,
          width,
          depth,
          color: baseColors[Math.floor(Math.random() * baseColors.length)],
          hasNeon,
          neonColor,
          neonText,
          rotation: Math.random() * Math.PI * 2,
          buildingType,
          windowDensity,
          textureScale: 1 + Math.random() * 0.5
        };
        
        result.push(building);
      }
    }
    
    // 都市データをグローバル変数に保存
    cityBuildingsData = result;
    
    console.log(`CyberCity: Generated ${result.length} buildings`);
    return result;
  }, []);
  
  // ホログラムの生成
  const holograms = useMemo<HologramType[]>(() => {
    const result: HologramType[] = [];
    const hologramCount = 30;
    const hologramTypes = ['advertisement', 'info', 'warning', 'decoration'] as const;
    const hologramColors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0080'];
    const animationTypes = ['rotate', 'pulse', 'float'] as const;
    
    for (let i = 0; i < hologramCount; i++) {
      const x = (Math.random() * 2 - 1) * 60;
      const z = (Math.random() * 2 - 1) * 60;
      const y = 5 + Math.random() * 15;
      
      // 建物の近くに配置
      const nearBuilding = buildings.some(building => {
        const distance = Math.sqrt(
          Math.pow(x - building.position[0], 2) + Math.pow(z - building.position[2], 2)
        );
        return distance < 20;
      });
      
      if (!nearBuilding && Math.random() > 0.3) continue;
      
      const type = hologramTypes[Math.floor(Math.random() * hologramTypes.length)];
      const color = hologramColors[Math.floor(Math.random() * hologramColors.length)];
      const animationType = animationTypes[Math.floor(Math.random() * animationTypes.length)];
      
      result.push({
        id: `hologram-${i}`,
        position: [x, y, z],
        scale: 0.5 + Math.random() * 1.5,
        rotation: Math.random() * Math.PI * 2,
        type,
        color,
        text: type === 'advertisement' ? 'AD' : type === 'info' ? 'INFO' : type === 'warning' ? '!' : '◆',
        animationType
      });
    }
    
    return result;
  }, [buildings]);
  
  // ドローンの生成
  const drones = useMemo<DroneType[]>(() => {
    const result: DroneType[] = [];
    const droneCount = 15;
    const droneColors = ['#ffffff', '#00ffff', '#ff0080', '#ffff00'];
    const lightColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
    
    for (let i = 0; i < droneCount; i++) {
      const centerX = (Math.random() * 2 - 1) * 50;
      const centerZ = (Math.random() * 2 - 1) * 50;
      const flightHeight = 20 + Math.random() * 30;
      
      // ドローンの飛行パスを生成
      const path: THREE.Vector3[] = [];
      const pathPoints = 6;
      for (let j = 0; j < pathPoints; j++) {
        const angle = (j / pathPoints) * Math.PI * 2;
        const radius = 15 + Math.random() * 20;
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        const y = flightHeight + Math.sin(angle * 3) * 5;
        path.push(new THREE.Vector3(x, y, z));
      }
      
      const color = droneColors[Math.floor(Math.random() * droneColors.length)];
      const lightColor = lightColors[Math.floor(Math.random() * lightColors.length)];
      const speed = 0.3 + Math.random() * 0.7;
      
      result.push({
        id: `drone-${i}`,
        position: [centerX, flightHeight, centerZ],
        scale: 0.3 + Math.random() * 0.4,
        speed,
        path,
        color,
        lightColor
      });
    }
    
    return result;
  }, []);
  
  // エネルギーフィールドの生成
  const energyFields = useMemo<EnergyFieldType[]>(() => {
    const result: EnergyFieldType[] = [];
    const fieldCount = 8;
    const fieldTypes = ['barrier', 'portal', 'generator'] as const;
    const fieldColors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
    
    for (let i = 0; i < fieldCount; i++) {
      const x = (Math.random() * 2 - 1) * 70;
      const z = (Math.random() * 2 - 1) * 70;
      
      // 道路を避ける
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < 15) continue;
      
      const type = fieldTypes[Math.floor(Math.random() * fieldTypes.length)];
      const color = fieldColors[Math.floor(Math.random() * fieldColors.length)];
      
      let radius, height;
      switch (type) {
        case 'barrier':
          radius = 3 + Math.random() * 5;
          height = 8 + Math.random() * 12;
          break;
        case 'portal':
          radius = 4 + Math.random() * 3;
          height = 10 + Math.random() * 8;
          break;
        case 'generator':
          radius = 2 + Math.random() * 3;
          height = 6 + Math.random() * 6;
          break;
      }
      
      result.push({
        id: `field-${i}`,
        position: [x, height / 2, z],
        radius,
        height,
        color,
        intensity: 0.5 + Math.random() * 0.5,
        type
      });
    }
    
    return result;
  }, []);
  
  // サイバーパーティクルの生成
  const cyberParticles = useMemo<CyberParticleType[]>(() => {
    const result: CyberParticleType[] = [];
    const particleCount = 50;
    const particleTypes = ['data', 'energy', 'spark'] as const;
    const particleColors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0080'];
    
    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() * 2 - 1) * 80;
      const z = (Math.random() * 2 - 1) * 80;
      const y = 1 + Math.random() * 20;
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 3,
        (Math.random() - 0.5) * 2
      );
      
      const type = particleTypes[Math.floor(Math.random() * particleTypes.length)];
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      
      result.push({
        id: `particle-${i}`,
        position: [x, y, z],
        velocity,
        color,
        size: 0.1 + Math.random() * 0.3,
        lifeTime: 5 + Math.random() * 10,
        type
      });
    }
    
    return result;
  }, []);
  
  // 道路網の生成
  const roads = useMemo<RoadType[]>(() => {
    const result: RoadType[] = [];
    const citySize = 150;
    const gridSize = 25; // 建物のグリッドサイズと合わせる
    
    // メイン道路（中央十字）
    // 横方向のメイン道路
    result.push({
      position: [0, 0.1, 0],
      width: citySize,
      length: 15, // 道路幅を広げる
      rotation: 0
    });
    
    // 縦方向のメイン道路
    result.push({
      position: [0, 0.1, 0],
      width: 15, // 道路幅を広げる
      length: citySize,
      rotation: Math.PI / 2
    });
    
    // サブ道路（グリッドに沿って）
    for (let z = -citySize / 2; z <= citySize / 2; z += gridSize) {
      if (Math.abs(z) > 15) { // メイン道路と重複しないように
        result.push({
          position: [0, 0.1, z],
          width: citySize,
          length: 8,
          rotation: 0
        });
      }
    }
    
    for (let x = -citySize / 2; x <= citySize / 2; x += gridSize) {
      if (Math.abs(x) > 15) { // メイン道路と重複しないように
        result.push({
          position: [x, 0.1, 0],
          width: 8,
          length: citySize,
          rotation: Math.PI / 2
        });
      }
    }
    
    console.log(`CyberCity: Generated ${result.length} roads`);
    return result;
  }, []);

  // 時間に依存するエフェクト用の参照
  const timeRef = useRef(0);
  
  // アニメーション制御
  useFrame((state, delta) => {
    timeRef.current += delta;
  });
  
  // ネオンサインコンポーネント
  const NeonSign = ({ 
    position, 
    text, 
    color 
  }: { 
    position: [number, number, number]; 
    text: string; 
    color: string; 
  }) => {
    const glowIntensity = (1 + Math.sin(timeRef.current * 3)) * 0.5;
    
    return (
      <Billboard position={position}>
        <Text
          fontSize={2.0} // フォントサイズ大きく
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {text}
          <meshStandardMaterial
            emissive={color}
            emissiveIntensity={glowIntensity}
          />
        </Text>
      </Billboard>
    );
  };
  
  // 建物コンポーネント
  const Building = ({ building }: { building: BuildingType }) => {
    const { position, height, width, depth, color, hasNeon, neonColor, neonText, rotation, buildingType, windowDensity = 1.0, textureScale = 1.0 } = building;
    
    // 窓のパターンを生成
    const windowPattern = useMemo(() => {
      // 窓のUVマッピング用のキャンバスを作成
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 建物タイプに基づいて窓パターンを変更
        let windowWidth, windowHeight, gapX, gapY;
        
        switch(buildingType) {
          case 'skyscraper':
            // スカイスクレイパーは細長い窓
            windowWidth = 15;
            windowHeight = 40;
            gapX = 20;
            gapY = 15;
            break;
          case 'office':
            // オフィスビルは規則的な四角い窓
            windowWidth = 25;
            windowHeight = 25;
            gapX = 15;
            gapY = 15;
            break;
          case 'residential':
            // 住宅は小さめでばらつきのある窓
            windowWidth = 20;
            windowHeight = 30;
            gapX = 30;
            gapY = 30;
            break;
          case 'shop':
            // 店舗は大きなディスプレイ窓
            windowWidth = 60;
            windowHeight = 50;
            gapX = 30;
            gapY = 100;
            break;
          default:
            windowWidth = 20;
            windowHeight = 30;
            gapX = 25;
            gapY = 20;
        }
        
        // 窓を描画（時間ごとにランダムに点灯）
        ctx.fillStyle = '#ffff77';
        const windowsX = Math.floor(canvas.width / (windowWidth + gapX));
        const windowsY = Math.floor(canvas.height / (windowHeight + gapY));
        
        for (let x = 0; x < windowsX; x++) {
          for (let y = 0; y < windowsY; y++) {
            // 窓を描画するかをランダムに決定
            if (Math.random() < 0.5 * windowDensity) {
              // 窓のX座標
              const wx = x * (windowWidth + gapX) + gapX / 2;
              // 窓のY座標
              const wy = y * (windowHeight + gapY) + gapY / 2;
              
              // ときどき窓を複数連結させる
              const extraWidth = Math.random() < 0.1 ? windowWidth : 0;
              const extraHeight = Math.random() < 0.05 ? windowHeight : 0;
              
              // 窓の色をランダムに調整（明かりが点いてるっぽく）
              const brightness = 0.5 + Math.random() * 0.5;
              ctx.fillStyle = `rgba(255, 255, ${Math.floor(100 + Math.random() * 155)}, ${brightness})`;
              
              // 窓を描画
              ctx.fillRect(wx, wy, windowWidth + extraWidth, windowHeight + extraHeight);
            }
          }
        }
      }
      
      // キャンバスからテクスチャを作成
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(textureScale, 2);
      
      return texture;
    }, [color, buildingType, windowDensity, textureScale]);
    
    // 建物の形状とマテリアルを返す
    const BuildingShape = () => {
      // 建物タイプに応じた形状を生成
      switch(buildingType) {
        case 'skyscraper':
          // スカイスクレイパーは高層ビル
          return (
            <Box args={[width, height, depth]} castShadow>
              <meshStandardMaterial color={color} map={windowPattern} metalness={0.5} roughness={0.7} />
            </Box>
          );
        case 'office':
          // オフィスビルは通常の四角いビル
          return (
            <Box args={[width, height, depth]} castShadow>
              <meshStandardMaterial color={color} map={windowPattern} metalness={0.3} roughness={0.8} />
            </Box>
          );
        case 'residential':
          // 住宅ビルは若干不規則な形
          return (
            <group>
              <Box args={[width, height, depth]} castShadow>
                <meshStandardMaterial color={color} map={windowPattern} metalness={0.1} roughness={0.9} />
              </Box>
              {/* 屋上構造物 */}
              {Math.random() > 0.3 && (
                <Box 
                  args={[width * 0.5, height * 0.1, depth * 0.5]} 
                  position={[0, height / 2 + height * 0.05, 0]}
                  castShadow
                >
                  <meshStandardMaterial color={color} metalness={0.1} roughness={0.9} />
                </Box>
              )}
            </group>
          );
        case 'shop':
          // 店舗は低層で幅広
          return (
            <group>
              <Box args={[width, height, depth]} castShadow>
                <meshStandardMaterial color={color} map={windowPattern} metalness={0.2} roughness={0.8} />
              </Box>
              {/* 看板 */}
              {Math.random() > 0.5 && (
                <Box 
                  args={[width * 1.1, height * 0.2, depth * 0.1]} 
                  position={[0, height / 2 + height * 0.1, depth / 2 - depth * 0.05]}
                  castShadow
                >
                  <meshStandardMaterial color={neonColor || '#ff00ff'} emissive={neonColor || '#ff00ff'} emissiveIntensity={0.5} />
                </Box>
              )}
            </group>
          );
        default:
          // デフォルトは基本的な箱形
          return (
            <Box args={[width, height, depth]} castShadow>
              <meshStandardMaterial color={color} map={windowPattern} metalness={0.3} roughness={0.7} />
            </Box>
          );
      }
    };
    
    return (
      <group position={position} rotation={[0, rotation || 0, 0]}>
        <BuildingShape />
        
        {/* ネオンサイン */}
        {hasNeon && neonText && (
          <NeonSign 
            position={[0, height / 2 + 2, 0]} 
            text={neonText} 
            color={neonColor || '#ff00ff'} 
          />
        )}
      </group>
    );
  };
  
  // 道路コンポーネント
  const Road = ({ road }: { road: RoadType }) => {
    const { position, width, length, rotation } = road;
    
    return (
      <group position={position} rotation={[0, rotation, 0]}>
        <Box args={[width, 0.1, length]} receiveShadow>
          <meshStandardMaterial 
            color="#333333" 
            roughness={0.9}
            metalness={0.1}
          />
        </Box>
        
        {/* 道路の中央線 */}
        <Box 
          args={[0.3, 0.12, length]} 
          position={[0, 0.01, 0]}
        >
          <meshStandardMaterial 
            color="#ffff00" 
            emissive="#ffff00"
            emissiveIntensity={0.3}
          />
        </Box>
      </group>
    );
  };
  
  // 信号機コンポーネント
  const TrafficLight = ({ position }: { position: [number, number, number] }) => {
    const lightColor = useMemo(() => {
      // 赤、黄、緑のいずれかをランダムに選択
      const colors = ['#ff0000', '#ffff00', '#00ff00'];
      return colors[Math.floor(Math.random() * colors.length)];
    }, []);
    
    return (
      <group position={position}>
        {/* 支柱 */}
        <Cylinder args={[0.2, 0.2, 7, 8]} position={[0, 3.5, 0]}>
          <meshStandardMaterial color="#555555" />
        </Cylinder>
        
        {/* 信号機本体 */}
        <Box args={[1, 2, 0.5]} position={[0, 6.5, 0]}>
          <meshStandardMaterial color="#222222" />
        </Box>
        
        {/* 光る部分 */}
        <Cylinder 
          args={[0.3, 0.3, 0.2, 16]} 
          position={[0, 6.5, 0.4]} 
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial 
            color={lightColor} 
            emissive={lightColor}
            emissiveIntensity={2}
          />
        </Cylinder>
      </group>
    );
  };
  
  // 信号機の配置
  const trafficLights = useMemo(() => {
    const result = [];
    const citySize = 150;
    const gridSize = 30;
    
    // 交差点に信号機を配置
    for (let x = -citySize / 2 + gridSize; x < citySize / 2; x += gridSize) {
      for (let z = -citySize / 2 + gridSize; z < citySize / 2; z += gridSize) {
        // 4分の1の交差点にだけ配置
        if (Math.random() < 0.25) {
          result.push([x, 0, z] as [number, number, number]);
        }
      }
    }
    
    return result;
  }, []);
  
  // ホログラムのコンポーネント
  const Hologram = ({ hologram }: { hologram: HologramType }) => {
    const { position, scale, rotation, color, text, animationType } = hologram;
    const hologramRef = useRef<THREE.Group>(null);
    
    // アニメーション
    useFrame(() => {
      if (hologramRef.current) {
        switch (animationType) {
          case 'rotate':
            hologramRef.current.rotation.y += 0.02;
            break;
          case 'pulse':
            const pulseScale = 1 + Math.sin(timeRef.current * 4) * 0.2;
            hologramRef.current.scale.setScalar(scale * pulseScale);
            break;
          case 'float':
            hologramRef.current.position.y = position[1] + Math.sin(timeRef.current * 2) * 0.5;
            break;
        }
      }
    });
    
    return (
      <group ref={hologramRef} position={position} rotation={[0, rotation, 0]} scale={[scale, scale, scale]}>
        {/* ホログラムベース */}
        <Box args={[2, 3, 0.1]} position={[0, 0, 0]}>
          <meshStandardMaterial 
            color={color} 
            emissive={color}
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </Box>
        
        {/* テキスト */}
        {text && (
          <mesh position={[0, 0, 0.1]}>
            <planeGeometry args={[1.5, 0.5]} />
            <meshStandardMaterial 
              color="#ffffff" 
              emissive="#ffffff"
              emissiveIntensity={0.8}
              transparent
              opacity={0.9}
            />
          </mesh>
        )}
      </group>
    );
  };
  
  // ドローンのコンポーネント
  const Drone = ({ drone }: { drone: DroneType }) => {
    const { scale, speed, path, color, lightColor } = drone;
    const droneRef = useRef<THREE.Group>(null);
    
    useFrame(() => {
      if (droneRef.current && path.length > 0) {
        const time = timeRef.current * speed;
        const pathIndex = Math.floor(time) % path.length;
        const nextIndex = (pathIndex + 1) % path.length;
        const t = time - Math.floor(time);
        
        const currentPos = path[pathIndex];
        const nextPos = path[nextIndex];
        
        // 補間して滑らかな移動
        droneRef.current.position.lerpVectors(currentPos, nextPos, t);
        
        // 進行方向を向く
        const direction = new THREE.Vector3().subVectors(nextPos, currentPos).normalize();
        droneRef.current.lookAt(droneRef.current.position.clone().add(direction));
        
        // プロペラの回転
        droneRef.current.rotation.z += 0.3;
      }
    });
    
    return (
      <group ref={droneRef} scale={[scale, scale, scale]}>
        {/* ドローン本体 */}
        <mesh>
          <boxGeometry args={[1, 0.3, 1]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* プロペラ */}
        {(
          [
            [-0.4, 0.2, -0.4] as [number, number, number], 
            [0.4, 0.2, -0.4] as [number, number, number], 
            [-0.4, 0.2, 0.4] as [number, number, number], 
            [0.4, 0.2, 0.4] as [number, number, number]
          ]
        ).map((pos, i) => (
          <mesh key={i} position={pos}>
            <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        ))}
        
        {/* ライト */}
        <mesh position={[0, -0.2, 0.6]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial 
            color={lightColor}
            emissive={lightColor}
            emissiveIntensity={1.5}
          />
        </mesh>
        
        {/* ライトビーム */}
        <mesh position={[0, -1, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.5, 2, 8]} />
          <meshStandardMaterial 
            color={lightColor}
            emissive={lightColor}
            emissiveIntensity={0.3}
            transparent
            opacity={0.2}
          />
        </mesh>
      </group>
    );
  };
  
  // エネルギーフィールドのコンポーネント
  const EnergyField = ({ field }: { field: EnergyFieldType }) => {
    const { position, radius, height, color, intensity, type } = field;
    const fieldRef = useRef<THREE.Group>(null);
    
    useFrame(() => {
      if (fieldRef.current) {
        fieldRef.current.rotation.y += 0.01;
        
        // タイプ別のアニメーション
        if (type === 'portal') {
          fieldRef.current.rotation.x += 0.005;
        }
      }
    });
    
    const glowIntensity = intensity + Math.sin(timeRef.current * 4) * 0.3;
    
    return (
      <group ref={fieldRef} position={position}>
        {/* メインフィールド */}
        <mesh>
          <cylinderGeometry args={[radius, radius, height, 16]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={glowIntensity}
            transparent
            opacity={0.3}
          />
        </mesh>
        
        {/* 内部エネルギー */}
        <mesh>
          <cylinderGeometry args={[radius * 0.7, radius * 0.7, height * 0.9, 12]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={glowIntensity * 1.5}
            transparent
            opacity={0.5}
          />
        </mesh>
        
        {/* エネルギーリング */}
        {[...Array(3)].map((_, i) => (
          <mesh 
            key={i} 
            position={[0, (i - 1) * height * 0.3, 0]} 
            rotation={[Math.PI / 2, 0, timeRef.current + i]}
          >
            <ringGeometry args={[radius * 0.8, radius * 1.2, 16]} />
            <meshStandardMaterial 
              color={color}
              emissive={color}
              emissiveIntensity={0.8}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
        
        {/* ポータル特有のエフェクト */}
        {type === 'portal' && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0, radius * 0.8, 32]} />
            <meshStandardMaterial 
              color={color}
              emissive={color}
              emissiveIntensity={2.0}
              transparent
              opacity={0.8}
            />
          </mesh>
        )}
      </group>
    );
  };
  
  // サイバーパーティクルのコンポーネント
  const CyberParticle = ({ particle }: { particle: CyberParticleType }) => {
    const particleRef = useRef<THREE.Group>(null);
    const [currentPosition, setCurrentPosition] = React.useState(new THREE.Vector3(...particle.position));
    const [currentVelocity, setCurrentVelocity] = React.useState(particle.velocity.clone());
    
    useFrame((_, delta) => {
      if (particleRef.current) {
        // 物理シミュレーション
        const newPosition = currentPosition.clone();
        newPosition.add(currentVelocity.clone().multiplyScalar(delta));
        
        // 境界でリセット
        if (newPosition.y > 50 || newPosition.y < 0 || 
            Math.abs(newPosition.x) > 100 || Math.abs(newPosition.z) > 100) {
          newPosition.set(particle.position[0], particle.position[1], particle.position[2]);
          setCurrentVelocity(particle.velocity.clone());
        }
        
        setCurrentPosition(newPosition);
        particleRef.current.position.copy(newPosition);
        
        // タイプ別のアニメーション
        switch (particle.type) {
          case 'data':
            particleRef.current.rotation.y += delta * 5;
            break;
          case 'energy':
            particleRef.current.rotation.x += delta * 3;
            particleRef.current.rotation.z += delta * 2;
            break;
          case 'spark':
            particleRef.current.rotation.y += delta * 8;
            break;
        }
      }
    });
    
    const opacity = 0.7 + Math.sin(timeRef.current * 6) * 0.3;
    
    return (
      <group ref={particleRef} scale={[particle.size, particle.size, particle.size]}>
        {particle.type === 'data' ? (
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial 
              color={particle.color}
              emissive={particle.color}
              emissiveIntensity={1.0}
              transparent
              opacity={opacity}
            />
          </mesh>
        ) : particle.type === 'energy' ? (
          <mesh>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial 
              color={particle.color}
              emissive={particle.color}
              emissiveIntensity={1.5}
              transparent
              opacity={opacity}
            />
          </mesh>
        ) : (
          <mesh>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial 
              color={particle.color}
              emissive={particle.color}
              emissiveIntensity={2.0}
              transparent
              opacity={opacity}
            />
          </mesh>
        )}
      </group>
    );
  };

  return (
    <>
      {/* すべての建物をレンダリング */}
      {buildings.map((building) => (
        <Building key={building.id} building={building} />
      ))}
      
      {/* すべての道路をレンダリング */}
      {roads.map((road, index) => (
        <Road key={`road-${index}`} road={road} />
      ))}
      
      {/* 信号機をレンダリング */}
      {trafficLights.map((position, index) => (
        <TrafficLight key={`traffic-${index}`} position={position} />
      ))}
      
      {/* ホログラム */}
      {holograms.map((hologram) => (
        <Hologram key={hologram.id} hologram={hologram} />
      ))}
      
      {/* ドローン */}
      {drones.map((drone) => (
        <Drone key={drone.id} drone={drone} />
      ))}
      
      {/* エネルギーフィールド */}
      {energyFields.map((field) => (
        <EnergyField key={field.id} field={field} />
      ))}
      
      {/* サイバーパーティクル */}
      {cyberParticles.map((particle) => (
        <CyberParticle key={particle.id} particle={particle} />
      ))}
    </>
  );
} 