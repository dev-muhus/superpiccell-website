'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// 岩のタイプ定義
type RockType = {
  id: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
  type: 'normal' | 'volcanic';
};

// 火山口の煙パーティクルタイプ
type SmokeParticleType = {
  id: string;
  position: [number, number, number];
  scale: number;
  speed: number;
  startTime: number;
};

// 衝突判定用オブジェクト配列（グローバルに公開）
export let volcanoRocksData: { position: THREE.Vector3, radius: number }[] = [];
export let volcanoObjectsData: { position: THREE.Vector3, radius: number, height?: number }[] = [];
export let volcanoLavaFlowsData: { position: THREE.Vector3, width: number, depth: number, rotation: number }[] = [];

export default function VolcanoWorld() {
  // 時間の参照
  const timeRef = useRef(0);
  
  // アニメーション
  useFrame((_, delta) => {
    timeRef.current += delta;
  });
  
  // 岩の生成
  const rocks = useMemo<RockType[]>(() => {
    const result: RockType[] = [];
    const worldSize = 150;
    const rockCount = 100; // 岩の総数
    
    // ランダムに岩を配置
    for (let i = 0; i < rockCount; i++) {
      // 火山に近いほど溶岩岩石の確率が上がる
      const x = (Math.random() * 2 - 1) * worldSize / 2;
      const z = (Math.random() * 2 - 1) * worldSize / 2;
      
      // 中央付近の道は避ける
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < 10) continue;
      
      // 火山に近いかどうか判定 - 火山は(0, 30)付近にある
      const distanceFromVolcano = Math.sqrt(x * x + (z - 30) * (z - 30));
      const isVolcanic = distanceFromVolcano < 40 ? Math.random() < 0.7 : Math.random() < 0.2;
      
      // スケールと回転をランダムに設定
      const scale = 0.5 + Math.random() * 1.5;
      const rotation = Math.random() * Math.PI * 2;
      
      result.push({
        id: `rock-${i}`,
        position: [x, 0, z],
        scale,
        rotation,
        type: isVolcanic ? 'volcanic' : 'normal'
      });
    }
    
    return result;
  }, []);
  
  // 煙パーティクルの生成
  const smokeParticles = useMemo<SmokeParticleType[]>(() => {
    const result: SmokeParticleType[] = [];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
      // ランダムな開始時間
      const startTime = Math.random() * 10;
      // 上昇スピード
      const speed = 0.5 + Math.random() * 1.0;
      // 初期位置のランダム化
      const offsetX = (Math.random() - 0.5) * 8;
      const offsetZ = (Math.random() - 0.5) * 8;
      
      result.push({
        id: `smoke-${i}`,
        position: [offsetX, 30, 30 + offsetZ],
        scale: 1 + Math.random() * 2,
        speed,
        startTime
      });
    }
    
    return result;
  }, []);
  
  // 衝突判定データの設定
  useEffect(() => {
    // 岩の衝突判定データ
    const newRocksData = rocks.map(rock => {
      // 衝突判定半径は実際のサイズより少し小さく
      const collisionRadius = rock.scale * 0.8;
      
      return {
        position: new THREE.Vector3(rock.position[0], rock.position[1] + rock.scale/2, rock.position[2]),
        radius: collisionRadius
      };
    });
    
    // 火山全体をカバーする単一の大きな衝突判定
    const simplifiedVolcanoCollision = {
      position: new THREE.Vector3(0, 30, 30), // 火山の中心位置
      radius: 40, // 火山全体をカバーする大きな半径
      height: 70 // 十分な高さ
    };
    
    // 溶岩流の衝突判定データ
    const lavaFlow1 = {
      position: new THREE.Vector3(20, 0.25, 0),
      width: 10,
      depth: 60,
      rotation: Math.PI * 0.1
    };
    
    const lavaFlow2 = {
      position: new THREE.Vector3(-15, 0.25, 15),
      width: 10,
      depth: 40,
      rotation: -Math.PI * 0.25
    };
    
    // グローバル変数にデータを設定
    volcanoRocksData = newRocksData;
    volcanoObjectsData = [simplifiedVolcanoCollision];
    volcanoLavaFlowsData = [lavaFlow1, lavaFlow2];
    
    // コンポーネントのアンマウント時にデータをクリア
    return () => {
      volcanoRocksData = [];
      volcanoObjectsData = [];
      volcanoLavaFlowsData = [];
    };
  }, [rocks]);
  
  // 岩のコンポーネント
  const Rock = ({ rock }: { rock: RockType }) => {
    const { position, scale, rotation, type } = rock;
    
    // 岩の種類に応じた色とマテリアル
    const rockColor = type === 'volcanic' 
      ? new THREE.Color(0.5 + Math.random() * 0.2, 0.2, 0.1)  // 赤黒い火山岩
      : new THREE.Color(0.3 + Math.random() * 0.2, 0.3 + Math.random() * 0.2, 0.3 + Math.random() * 0.2); // 通常の岩
    
    // 溶岩岩石の場合の発光パラメータ
    const emissive = type === 'volcanic' ? new THREE.Color(0.5, 0.1, 0) : undefined;
    const emissiveIntensity = type === 'volcanic' ? 0.3 + Math.sin(timeRef.current * 2) * 0.1 : 0;
    
    return (
      <group position={[position[0], scale / 2, position[2]]} rotation={[0, rotation, 0]} scale={[scale, scale, scale]}>
        <Sphere args={[1, 8, 8]} castShadow receiveShadow>
          <meshStandardMaterial 
            color={rockColor} 
            roughness={0.9}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity} 
          />
        </Sphere>
        
        {/* デバッグ用衝突球 - 本番では非表示にする */}
        {/* <Sphere args={[0.8, 8, 8]}>
          <meshBasicMaterial color="red" wireframe={true} transparent opacity={0.5} />
        </Sphere> */}
      </group>
    );
  };
  
  // 煙パーティクルコンポーネント
  const SmokeParticle = ({ particle }: { particle: SmokeParticleType }) => {
    const { position, scale, speed, startTime } = particle;
    
    // 時間経過による上昇と消滅
    const lifeTime = 15; // 寿命（秒）
    const currentTime = (timeRef.current + startTime) % (lifeTime + startTime);
    const normalizedTime = currentTime / lifeTime;
    
    // 一定の高さまで上昇したらフェードアウト
    const fadeOutStart = 0.6;
    const opacity = normalizedTime > fadeOutStart 
      ? 1 - (normalizedTime - fadeOutStart) / (1 - fadeOutStart) 
      : normalizedTime < 0.1 ? normalizedTime * 10 : 1;
    
    // 上昇位置
    const heightOffset = normalizedTime * 40 * speed;
    
    // X軸方向へのゆらぎ（風の効果）
    const windOffset = Math.sin(timeRef.current * 0.5 + startTime) * 3;
    
    return (
      <Sphere 
        args={[scale, 8, 8]} 
        position={[position[0] + windOffset, position[1] + heightOffset, position[2]]}
      >
        <meshStandardMaterial 
          color="#888888" 
          transparent
          opacity={opacity * 0.7}
          roughness={1}
        />
      </Sphere>
    );
  };
  
  // 火山コンポーネント
  const Volcano = () => {
    // 溶岩のぴくぴく光るアニメーション
    const lavaGlow = 0.5 + Math.sin(timeRef.current * 2) * 0.2;
    
    return (
      <group position={[0, 0, 30]}>
        {/* 火山本体 */}
        <Cylinder 
          args={[5, 50, 60, 16]} 
          position={[0, 30, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial 
            color="#4d4d4d" 
            roughness={0.9}
          />
        </Cylinder>
        
        {/* 火山口 */}
        <Cylinder 
          args={[15, 5, 10, 16]} 
          position={[0, 55, 0]}
          castShadow
        >
          <meshStandardMaterial 
            color="#333333" 
            roughness={0.8}
          />
        </Cylinder>
        
        {/* 溶岩 */}
        <Cylinder 
          args={[13, 4, 2, 16]} 
          position={[0, 51, 0]}
        >
          <meshStandardMaterial 
            color="#ff4500" 
            emissive="#ff2300"
            emissiveIntensity={lavaGlow}
            roughness={0.3}
          />
        </Cylinder>
        
        {/* デバッグ用衝突球 - 本番では非表示にする */}
        {/* <Sphere args={[30, 16, 16]} position={[0, 30, 0]}>
          <meshBasicMaterial color="red" wireframe={true} transparent opacity={0.2} />
        </Sphere> */}
      </group>
    );
  };
  
  // 溶岩流コンポーネント
  const LavaFlow = () => {
    // 流れる溶岩のアニメーション
    const lavaGlow = 0.7 + Math.sin(timeRef.current * 3) * 0.3;
    
    return (
      <group>
        {/* 溶岩の流れ - 火山から放射状に */}
        <Box 
          args={[10, 0.5, 60]} 
          position={[20, 0.25, 0]} 
          rotation={[0, Math.PI * 0.1, 0]}
        >
          <meshStandardMaterial 
            color="#ff4500" 
            emissive="#ff2300"
            emissiveIntensity={lavaGlow}
            roughness={0.3}
          />
        </Box>
        
        <Box 
          args={[10, 0.5, 40]} 
          position={[-15, 0.25, 15]} 
          rotation={[0, -Math.PI * 0.25, 0]}
        >
          <meshStandardMaterial 
            color="#ff4500" 
            emissive="#ff2300"
            emissiveIntensity={lavaGlow * 0.8}
            roughness={0.3}
          />
        </Box>
        
        {/* デバッグ用衝突ボックス - 本番では非表示にする */}
        {/* <Box 
          args={[10, 0.5, 60]} 
          position={[20, 0.25, 0]} 
          rotation={[0, Math.PI * 0.1, 0]}
        >
          <meshBasicMaterial color="red" wireframe={true} transparent opacity={0.3} />
        </Box>
        
        <Box 
          args={[10, 0.5, 40]} 
          position={[-15, 0.25, 15]} 
          rotation={[0, -Math.PI * 0.25, 0]}
        >
          <meshBasicMaterial color="red" wireframe={true} transparent opacity={0.3} />
        </Box> */}
      </group>
    );
  };
  
  // 地形コンポーネント
  const Terrain = () => {
    return (
      <>
        {/* 基本地形 - 黒い火山灰の地面 */}
        <Box 
          args={[300, 0.2, 300]} 
          position={[0, -0.2, 0]} // 地面をより下げてZファイティングを防止
          rotation={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#1d1d1d" roughness={0.9} />
        </Box>
        
        {/* 中央の道 */}
        <Box 
          args={[6, 0.05, 300]} 
          position={[0, -0.15, 0]} // 道も下げる
          rotation={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#4d4d4d" roughness={0.9} />
        </Box>
        <Box 
          args={[300, 0.05, 6]} 
          position={[0, -0.15, 0]} // 道も下げる
          rotation={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#4d4d4d" roughness={0.9} />
        </Box>
      </>
    );
  };
  
  return (
    <>
      {/* 地形 */}
      <Terrain />
      
      {/* 火山 */}
      <Volcano />
      
      {/* 溶岩流 */}
      <LavaFlow />
      
      {/* 岩 */}
      {rocks.map((rock) => (
        <Rock key={rock.id} rock={rock} />
      ))}
      
      {/* 煙 */}
      {smokeParticles.map((particle) => (
        <SmokeParticle key={particle.id} particle={particle} />
      ))}
    </>
  );
} 