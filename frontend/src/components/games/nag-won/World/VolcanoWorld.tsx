'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Cone } from '@react-three/drei';
import * as THREE from 'three';

// 岩のタイプ定義（拡張版）
type RockType = {
  id: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
  type: 'normal' | 'volcanic' | 'obsidian' | 'pumice';
  temperature?: 'hot' | 'warm' | 'cool';
};

// 火山口の煙パーティクルタイプ（拡張版）
type SmokeParticleType = {
  id: string;
  position: [number, number, number];
  scale: number;
  speed: number;
  startTime: number;
  type: 'smoke' | 'ash' | 'steam';
  color: string;
};

// 火山弾のタイプ定義
type VolcanicBombType = {
  id: string;
  position: [number, number, number];
  velocity: THREE.Vector3;
  scale: number;
  temperature: number;
  lifeTime: number;
};

// 溶岩プールのタイプ定義
type LavaPoolType = {
  id: string;
  position: [number, number, number];
  radius: number;
  depth: number;
  bubbleIntensity: number;
};

// 火山ガスのタイプ定義
type VolcanicGasType = {
  id: string;
  position: [number, number, number];
  scale: number;
  speed: number;
  opacity: number;
  color: string;
};

// 火山岩の柱のタイプ定義
type VolcanicPillarType = {
  id: string;
  position: [number, number, number];
  height: number;
  radius: number;
  segments: number;
  rotation: number;
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
  
  // 拡張された岩の生成
  const rocks = useMemo<RockType[]>(() => {
    const result: RockType[] = [];
    const worldSize = 150;
    const rockCount = 150; // 岩の総数を増加
    
    // ランダムに岩を配置
    for (let i = 0; i < rockCount; i++) {
      const x = (Math.random() * 2 - 1) * worldSize / 2;
      const z = (Math.random() * 2 - 1) * worldSize / 2;
      
      // 中央付近の道は避ける
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < 10) continue;
      
      // 火山に近いかどうか判定 - 複数の火山を考慮
      const volcanoes = [
        { x: 0, z: 30 },
        { x: -40, z: -20 },
        { x: 35, z: -35 }
      ];
      
      let nearestVolcanoDistance = Infinity;
      volcanoes.forEach(volcano => {
        const distance = Math.sqrt(Math.pow(x - volcano.x, 2) + Math.pow(z - volcano.z, 2));
        nearestVolcanoDistance = Math.min(nearestVolcanoDistance, distance);
      });
      
      // 火山に近いほど火山岩の確率が上がる
      let type: 'normal' | 'volcanic' | 'obsidian' | 'pumice';
      let temperature: 'hot' | 'warm' | 'cool';
      
      if (nearestVolcanoDistance < 25) {
        type = Math.random() < 0.8 ? 'volcanic' : (Math.random() < 0.5 ? 'obsidian' : 'pumice');
        temperature = Math.random() < 0.6 ? 'hot' : 'warm';
      } else if (nearestVolcanoDistance < 50) {
        type = Math.random() < 0.5 ? 'volcanic' : (Math.random() < 0.3 ? 'obsidian' : 'normal');
        temperature = Math.random() < 0.3 ? 'warm' : 'cool';
      } else {
        type = Math.random() < 0.3 ? 'volcanic' : 'normal';
        temperature = 'cool';
      }
      
      const scale = 0.4 + Math.random() * 2.0;
      const rotation = Math.random() * Math.PI * 2;
      
      result.push({
        id: `rock-${i}`,
        position: [x, 0, z],
        scale,
        rotation,
        type,
        temperature
      });
    }
    
    return result;
  }, []);
  
  // 拡張された煙パーティクルの生成
  const smokeParticles = useMemo<SmokeParticleType[]>(() => {
    const result: SmokeParticleType[] = [];
    const particleCount = 60; // パーティクル数を増加
    const particleTypes = ['smoke', 'ash', 'steam'] as const;
    
    // 複数の火山からパーティクルを生成
    const volcanoes = [
      { x: 0, z: 30, intensity: 1.0 },
      { x: -40, z: -20, intensity: 0.7 },
      { x: 35, z: -35, intensity: 0.8 }
    ];
    
    volcanoes.forEach((volcano, volcanoIndex) => {
      const particlesPerVolcano = Math.floor(particleCount * volcano.intensity / volcanoes.length);
      
      for (let i = 0; i < particlesPerVolcano; i++) {
        const startTime = Math.random() * 15;
        const speed = 0.3 + Math.random() * 1.2;
        const offsetX = (Math.random() - 0.5) * 12;
        const offsetZ = (Math.random() - 0.5) * 12;
        const type = particleTypes[Math.floor(Math.random() * particleTypes.length)];
        
        let color;
        switch (type) {
          case 'smoke':
            color = '#555555';
            break;
          case 'ash':
            color = '#333333';
            break;
          case 'steam':
            color = '#cccccc';
            break;
        }
        
        result.push({
          id: `smoke-${volcanoIndex}-${i}`,
          position: [volcano.x + offsetX, 30, volcano.z + offsetZ],
          scale: 0.8 + Math.random() * 2.5,
          speed,
          startTime,
          type,
          color
        });
      }
    });
    
    return result;
  }, []);
  
  // 火山弾の生成
  const volcanicBombs = useMemo<VolcanicBombType[]>(() => {
    const result: VolcanicBombType[] = [];
    const bombCount = 15;
    
    for (let i = 0; i < bombCount; i++) {
      // メイン火山から発射
      const angle = Math.random() * Math.PI * 2;
      const power = 5 + Math.random() * 15;
      const height = 10 + Math.random() * 20;
      
      const velocity = new THREE.Vector3(
        Math.cos(angle) * power,
        height,
        Math.sin(angle) * power
      );
      
      result.push({
        id: `bomb-${i}`,
        position: [0, 50, 30], // メイン火山の頂上から
        velocity,
        scale: 0.3 + Math.random() * 0.7,
        temperature: 1000 + Math.random() * 500,
        lifeTime: 10 + Math.random() * 10
      });
    }
    
    return result;
  }, []);
  
  // 溶岩プールの生成
  const lavaPools = useMemo<LavaPoolType[]>(() => {
    const result: LavaPoolType[] = [];
    const poolCount = 8;
    
    for (let i = 0; i < poolCount; i++) {
      // 火山の周辺に配置
      const angle = (i / poolCount) * Math.PI * 2;
      const distance = 15 + Math.random() * 25;
      const x = Math.cos(angle) * distance;
      const z = 30 + Math.sin(angle) * distance;
      
      result.push({
        id: `pool-${i}`,
        position: [x, 0, z],
        radius: 3 + Math.random() * 5,
        depth: 0.5 + Math.random() * 1.0,
        bubbleIntensity: 0.5 + Math.random() * 0.5
      });
    }
    
    return result;
  }, []);
  
  // 火山ガスの生成
  const volcanicGases = useMemo<VolcanicGasType[]>(() => {
    const result: VolcanicGasType[] = [];
    const gasCount = 25;
    const gasColors = ['#ffff00', '#ff8c00', '#ff4500', '#dc143c'];
    
    for (let i = 0; i < gasCount; i++) {
      const x = (Math.random() * 2 - 1) * 80;
      const z = (Math.random() * 2 - 1) * 80;
      
      result.push({
        id: `gas-${i}`,
        position: [x, 1 + Math.random() * 3, z],
        scale: 0.5 + Math.random() * 1.5,
        speed: 0.2 + Math.random() * 0.8,
        opacity: 0.3 + Math.random() * 0.4,
        color: gasColors[Math.floor(Math.random() * gasColors.length)]
      });
    }
    
    return result;
  }, []);
  
  // 火山岩の柱の生成
  const volcanicPillars = useMemo<VolcanicPillarType[]>(() => {
    const result: VolcanicPillarType[] = [];
    const pillarCount = 12;
    
    for (let i = 0; i < pillarCount; i++) {
      const x = (Math.random() * 2 - 1) * 70;
      const z = (Math.random() * 2 - 1) * 70;
      
      // 道路を避ける
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < 15) continue;
      
      result.push({
        id: `pillar-${i}`,
        position: [x, 0, z],
        height: 8 + Math.random() * 25,
        radius: 1 + Math.random() * 3,
        segments: 6 + Math.floor(Math.random() * 6),
        rotation: Math.random() * Math.PI * 2
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
    
    // 複数の火山の衝突判定
    const volcanoCollisions = [
      {
        position: new THREE.Vector3(0, 30, 30), // メイン火山
        radius: 40,
        height: 70
      },
      {
        position: new THREE.Vector3(-40, 20, -20), // サブ火山1
        radius: 25,
        height: 50
      },
      {
        position: new THREE.Vector3(35, 15, -35), // サブ火山2
        radius: 20,
        height: 40
      }
    ];
    
    // 火山岩の柱の衝突判定
    const pillarCollisions = volcanicPillars.map(pillar => ({
      position: new THREE.Vector3(pillar.position[0], pillar.height / 2, pillar.position[2]),
      radius: pillar.radius,
      height: pillar.height
    }));
    
    // 溶岩流の衝突判定データ（拡張版）
    const lavaFlows = [
      {
        position: new THREE.Vector3(20, 0.25, 0),
        width: 10,
        depth: 60,
        rotation: Math.PI * 0.1
      },
      {
        position: new THREE.Vector3(-15, 0.25, 15),
        width: 10,
        depth: 40,
        rotation: -Math.PI * 0.25
      },
      {
        position: new THREE.Vector3(-25, 0.25, -10),
        width: 8,
        depth: 35,
        rotation: Math.PI * 0.3
      },
      {
        position: new THREE.Vector3(30, 0.25, -20),
        width: 12,
        depth: 45,
        rotation: -Math.PI * 0.15
      }
    ];
    
    // グローバル変数にデータを設定
    volcanoRocksData = newRocksData;
    volcanoObjectsData = [...volcanoCollisions, ...pillarCollisions];
    volcanoLavaFlowsData = lavaFlows;
    
    // コンポーネントのアンマウント時にデータをクリア
    return () => {
      volcanoRocksData = [];
      volcanoObjectsData = [];
      volcanoLavaFlowsData = [];
    };
  }, [rocks, volcanicPillars]);
  
  // 岩のコンポーネント
  const Rock = ({ rock }: { rock: RockType }) => {
    const { position, scale, rotation, type, temperature } = rock;
    
    // 岩の種類に応じた色とマテリアル
    const getRockColor = () => {
      switch (type) {
        case 'volcanic':
          return new THREE.Color(0.5 + Math.random() * 0.2, 0.2, 0.1); // 赤黒い火山岩
        case 'obsidian':
          return new THREE.Color(0.1, 0.1, 0.15); // 黒曜石
        case 'pumice':
          return new THREE.Color(0.7, 0.7, 0.6); // 軽石
        default:
          const grayShade = 0.3 + Math.random() * 0.2;
          return new THREE.Color(grayShade, grayShade, grayShade); // 通常の岩
      }
    };
    
    const rockColor = getRockColor();
    
    // 温度による発光パラメータ
    const getEmissiveProps = () => {
      if (temperature === 'hot') {
        return {
          emissive: new THREE.Color(0.8, 0.2, 0),
          emissiveIntensity: 0.4 + Math.sin(timeRef.current * 3) * 0.2
        };
      } else if (temperature === 'warm') {
        return {
          emissive: new THREE.Color(0.4, 0.1, 0),
          emissiveIntensity: 0.2 + Math.sin(timeRef.current * 2) * 0.1
        };
      }
      return {
        emissive: undefined,
        emissiveIntensity: 0
      };
    };
    
    const emissiveProps = getEmissiveProps();
    
    return (
      <group position={[position[0], scale / 2, position[2]]} rotation={[0, rotation, 0]} scale={[scale, scale, scale]}>
        <Sphere args={[1, 8, 8]} castShadow receiveShadow>
          <meshStandardMaterial 
            color={rockColor} 
            roughness={type === 'obsidian' ? 0.1 : 0.9}
            metalness={type === 'obsidian' ? 0.8 : 0.1}
            emissive={emissiveProps.emissive}
            emissiveIntensity={emissiveProps.emissiveIntensity}
          />
        </Sphere>
        
        {/* 蒸気エフェクト（熱い岩の場合） */}
        {temperature === 'hot' && (
          <Sphere args={[1.2, 6, 6]} position={[0, 0.5, 0]}>
            <meshStandardMaterial 
              color="#ffffff" 
              transparent
              opacity={0.1 + Math.sin(timeRef.current * 4) * 0.05}
            />
          </Sphere>
        )}
      </group>
    );
  };
  
  // 拡張された煙パーティクルコンポーネント
  const SmokeParticle = ({ particle }: { particle: SmokeParticleType }) => {
    const { position, scale, speed, startTime, type, color } = particle;
    
    // 時間経過による上昇と消滅
    const lifeTime = type === 'steam' ? 10 : 20; // 蒸気は短命
    const currentTime = (timeRef.current + startTime) % (lifeTime + startTime);
    const normalizedTime = currentTime / lifeTime;
    
    // 一定の高さまで上昇したらフェードアウト
    const fadeOutStart = 0.6;
    const opacity = normalizedTime > fadeOutStart 
      ? 1 - (normalizedTime - fadeOutStart) / (1 - fadeOutStart) 
      : normalizedTime < 0.1 ? normalizedTime * 10 : 1;
    
    // 上昇位置
    const heightOffset = normalizedTime * (type === 'ash' ? 60 : 40) * speed;
    
    // X軸方向へのゆらぎ（風の効果）
    const windOffset = Math.sin(timeRef.current * 0.5 + startTime) * (type === 'steam' ? 1 : 3);
    
    return (
      <Sphere 
        args={[scale, 8, 8]} 
        position={[position[0] + windOffset, position[1] + heightOffset, position[2]]}
      >
        <meshStandardMaterial 
          color={color} 
          transparent
          opacity={opacity * (type === 'steam' ? 0.5 : 0.7)}
          roughness={1}
        />
      </Sphere>
    );
  };
  
  // 火山弾のコンポーネント
  const VolcanicBomb = ({ bomb }: { bomb: VolcanicBombType }) => {
    const bombRef = useRef<THREE.Group>(null);
    const [currentPosition, setCurrentPosition] = React.useState(new THREE.Vector3(...bomb.position));
    const [currentVelocity, setCurrentVelocity] = React.useState(bomb.velocity.clone());
    
    useFrame((_, delta) => {
      if (bombRef.current) {
        // 物理シミュレーション
        const gravity = -9.8;
        const newVelocity = currentVelocity.clone();
        newVelocity.y += gravity * delta;
        
        const newPosition = currentPosition.clone();
        newPosition.add(newVelocity.clone().multiplyScalar(delta));
        
        // 地面に衝突したらリセット
        if (newPosition.y <= 0) {
          newPosition.set(bomb.position[0], bomb.position[1], bomb.position[2]);
          newVelocity.copy(bomb.velocity);
        }
        
        setCurrentPosition(newPosition);
        setCurrentVelocity(newVelocity);
        
        bombRef.current.position.copy(newPosition);
        
        // 回転アニメーション
        bombRef.current.rotation.x += delta * 5;
        bombRef.current.rotation.z += delta * 3;
      }
    });
    
    const glowIntensity = 0.8 + Math.sin(timeRef.current * 8) * 0.4;
    
    return (
      <group ref={bombRef} scale={[bomb.scale, bomb.scale, bomb.scale]}>
        <Sphere args={[1, 8, 8]} castShadow>
          <meshStandardMaterial 
            color="#ff4500" 
            emissive="#ff2300"
            emissiveIntensity={glowIntensity}
            roughness={0.8}
          />
        </Sphere>
        
        {/* 火花エフェクト */}
        {[...Array(5)].map((_, i) => (
          <Sphere
            key={i}
            args={[0.1, 4, 4]}
            position={[
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2
            ]}
          >
            <meshStandardMaterial 
              color="#ffff00" 
              emissive="#ffff00"
              emissiveIntensity={Math.random() * 2}
            />
          </Sphere>
        ))}
      </group>
    );
  };
  
  // 溶岩プールのコンポーネント
  const LavaPool = ({ pool }: { pool: LavaPoolType }) => {
    const { position, radius, depth, bubbleIntensity } = pool;
    
    // 泡のアニメーション
    const bubbleGlow = 0.8 + Math.sin(timeRef.current * 4 * bubbleIntensity) * 0.4;
    
    return (
      <group position={position}>
        {/* 溶岩プール本体 */}
        <Cylinder args={[radius, radius, depth, 16]} position={[0, -depth / 2, 0]}>
          <meshStandardMaterial 
            color="#ff4500" 
            emissive="#ff2300"
            emissiveIntensity={bubbleGlow}
            roughness={0.2}
          />
        </Cylinder>
        
        {/* 泡エフェクト */}
        {[...Array(Math.floor(radius * bubbleIntensity))].map((_, i) => (
          <Sphere
            key={i}
            args={[0.2 + Math.random() * 0.3, 6, 6]}
            position={[
              (Math.random() - 0.5) * radius * 1.5,
              Math.sin(timeRef.current * 2 + i) * 0.5,
              (Math.random() - 0.5) * radius * 1.5
            ]}
          >
            <meshStandardMaterial 
              color="#ff6600" 
              emissive="#ff4400"
              emissiveIntensity={0.6}
              transparent
              opacity={0.8}
            />
          </Sphere>
        ))}
      </group>
    );
  };
  
  // 火山ガスのコンポーネント
  const VolcanicGas = ({ gas }: { gas: VolcanicGasType }) => {
    const gasRef = useRef<THREE.Group>(null);
    
    useFrame(() => {
      if (gasRef.current) {
        // ゆらゆらと上昇
        const time = timeRef.current * gas.speed;
        gasRef.current.position.y = gas.position[1] + Math.sin(time) * 2;
        gasRef.current.position.x = gas.position[0] + Math.cos(time * 0.7) * 1;
        gasRef.current.position.z = gas.position[2] + Math.sin(time * 0.5) * 1;
        
        // 回転
        gasRef.current.rotation.y += 0.01;
      }
    });
    
    return (
      <group ref={gasRef} scale={[gas.scale, gas.scale, gas.scale]}>
        <Sphere args={[1, 8, 8]}>
          <meshStandardMaterial 
            color={gas.color} 
            emissive={gas.color}
            emissiveIntensity={0.3}
            transparent
            opacity={gas.opacity}
          />
        </Sphere>
      </group>
    );
  };
  
  // 火山岩の柱のコンポーネント
  const VolcanicPillar = ({ pillar }: { pillar: VolcanicPillarType }) => {
    const { position, height, radius, segments, rotation } = pillar;
    
    return (
      <group position={position} rotation={[0, rotation, 0]}>
        <Cylinder 
          args={[radius, radius * 0.8, height, segments]} 
          position={[0, height / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial 
            color="#2d2d2d" 
            roughness={0.9}
          />
        </Cylinder>
        
        {/* 柱の上部の装飾 */}
        <Cone 
          args={[radius * 1.2, height * 0.1, segments]} 
          position={[0, height + height * 0.05, 0]}
          castShadow
        >
          <meshStandardMaterial 
            color="#1a1a1a" 
            roughness={0.8}
          />
        </Cone>
      </group>
    );
  };
  
  // 複数の火山コンポーネント
  const Volcanoes = () => {
    const volcanoes = [
      { position: [0, 0, 30] as [number, number, number], scale: 1.0, intensity: 1.0 },
      { position: [-40, 0, -20] as [number, number, number], scale: 0.7, intensity: 0.7 },
      { position: [35, 0, -35] as [number, number, number], scale: 0.6, intensity: 0.8 }
    ];
    
    return (
      <>
        {volcanoes.map((volcano, index) => (
          <group key={index} position={volcano.position} scale={[volcano.scale, volcano.scale, volcano.scale]}>
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
                emissiveIntensity={0.5 + Math.sin(timeRef.current * 2) * 0.2 * volcano.intensity}
                roughness={0.3}
              />
            </Cylinder>
          </group>
        ))}
      </>
    );
  };
  
  // 拡張された溶岩流コンポーネント
  const LavaFlows = () => {
    const lavaGlow = 0.7 + Math.sin(timeRef.current * 3) * 0.3;
    
    const flows = [
      { position: [20, 0.25, 0] as [number, number, number], rotation: Math.PI * 0.1, size: [10, 0.5, 60] as [number, number, number] },
      { position: [-15, 0.25, 15] as [number, number, number], rotation: -Math.PI * 0.25, size: [10, 0.5, 40] as [number, number, number] },
      { position: [-25, 0.25, -10] as [number, number, number], rotation: Math.PI * 0.3, size: [8, 0.5, 35] as [number, number, number] },
      { position: [30, 0.25, -20] as [number, number, number], rotation: -Math.PI * 0.15, size: [12, 0.5, 45] as [number, number, number] }
    ];
    
    return (
      <group>
        {flows.map((flow, index) => (
          <Box 
            key={index}
            args={flow.size} 
            position={flow.position} 
            rotation={[0, flow.rotation, 0]}
          >
            <meshStandardMaterial 
              color="#ff4500" 
              emissive="#ff2300"
              emissiveIntensity={lavaGlow * (0.8 + index * 0.1)}
              roughness={0.3}
            />
          </Box>
        ))}
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
      
      {/* 複数の火山 */}
      <Volcanoes />
      
      {/* 拡張された溶岩流 */}
      <LavaFlows />
      
      {/* 岩 */}
      {rocks.map((rock) => (
        <Rock key={rock.id} rock={rock} />
      ))}
      
      {/* 煙 */}
      {smokeParticles.map((particle) => (
        <SmokeParticle key={particle.id} particle={particle} />
      ))}
      
      {/* 火山弾 */}
      {volcanicBombs.map((bomb) => (
        <VolcanicBomb key={bomb.id} bomb={bomb} />
      ))}
      
      {/* 溶岩プール */}
      {lavaPools.map((pool) => (
        <LavaPool key={pool.id} pool={pool} />
      ))}
      
      {/* 火山ガス */}
      {volcanicGases.map((gas) => (
        <VolcanicGas key={gas.id} gas={gas} />
      ))}
      
      {/* 火山岩の柱 */}
      {volcanicPillars.map((pillar) => (
        <VolcanicPillar key={pillar.id} pillar={pillar} />
      ))}
    </>
  );
} 