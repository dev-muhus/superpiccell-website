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
  buildingType?: 'skyscraper' | 'office' | 'residential' | 'shop';
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

export default function CyberCity() {
  // プロシージャルに生成された建物
  const buildings = useMemo<BuildingType[]>(() => {
    const result: BuildingType[] = [];
    
    // 建物の生成パラメータ - サイズを大きく調整
    const citySize = 150; // より広い都市
    const gridSize = 30; // 間隔を広げる
    const maxHeight = 80; // 最大高さを2倍以上に
    const minHeight = 20; // 最小高さも調整
    
    // 建物カラーパレット（サイバーパンク）
    const baseColors = [
      '#1a1a2e', '#16213e', '#0f3460', '#252839', '#191e29', '#0d1117', '#2b2b2b'
    ];
    
    // ネオンカラーパレット
    const neonColors = [
      '#ff00ff', '#00ffff', '#ff2975', '#00ff9f', '#00f2ff', '#fd4556', '#fbff00'
    ];
    
    // ネオンテキスト候補
    const neonTexts = [
      'CYBER', 'NEON', 'TECH', 'LIFE', 'BYTE', 'FLOW', 'DATA', 'SYNC', 'EDGE', 
      'HACK', 'WAVE', 'GRID', 'CORE', 'NODE', 'PULSE', 'PIXEL', 'LINK', 'ZONE'
    ];
    
    // 建物タイプ
    const buildingTypes = ['skyscraper', 'office', 'residential', 'shop'];

    // グリッド状に建物を配置
    for (let x = -citySize / 2; x < citySize / 2; x += gridSize) {
      for (let z = -citySize / 2; z < citySize / 2; z += gridSize) {
        // ランダム要素を追加してグリッドを不規則に
        if (Math.random() > 0.7) continue;
        
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetZ = (Math.random() - 0.5) * 8;
        const width = Math.max(8, Math.random() * 15); // 幅を大きく
        const depth = Math.max(8, Math.random() * 15); // 奥行きも大きく
        
        // 建物タイプに基づいて高さを決定
        const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)] as 'skyscraper' | 'office' | 'residential' | 'shop';
        let height;
        
        switch(buildingType) {
          case 'skyscraper':
            height = minHeight + Math.random() * (maxHeight - minHeight);
            break;
          case 'office':
            height = minHeight + Math.random() * (maxHeight * 0.7 - minHeight);
            break;
          case 'residential':
            height = minHeight + Math.random() * (maxHeight * 0.5 - minHeight);
            break;
          case 'shop':
            height = minHeight * 0.5 + Math.random() * (minHeight * 0.8);
            break;
          default:
            height = minHeight + Math.random() * maxHeight;
        }
        
        // 窓の密度はタイプによって異なる
        let windowDensity = 1.0;
        if (buildingType === 'skyscraper') windowDensity = 1.2;
        if (buildingType === 'residential') windowDensity = 0.8;
        
        // 90%の建物に光る要素を追加
        const hasNeon = Math.random() > 0.1;
        const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        const neonText = neonTexts[Math.floor(Math.random() * neonTexts.length)];
        
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
    
    return result;
  }, []);
  
  // 道路網の生成
  const roads = useMemo<RoadType[]>(() => {
    const result: RoadType[] = [];
    const citySize = 150; // 都市サイズに合わせる
    const gridSize = 30; // グリッドサイズも合わせる
    
    // 横方向の道路
    for (let z = -citySize / 2; z <= citySize / 2; z += gridSize) {
      result.push({
        position: [0, 0.1, z],
        width: citySize,
        length: 12, // 道路幅を広げる
        rotation: 0
      });
    }
    
    // 縦方向の道路
    for (let x = -citySize / 2; x <= citySize / 2; x += gridSize) {
      result.push({
        position: [x, 0.1, 0],
        width: 12, // 道路幅を広げる
        length: citySize,
        rotation: Math.PI / 2
      });
    }
    
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
    </>
  );
} 