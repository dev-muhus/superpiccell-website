'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// 木のタイプ定義
type TreeType = {
  id: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
  type: 'pine' | 'oak' | 'birch';
};

// 岩のタイプ定義
type RockType = {
  id: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
};

// 衝突判定用オブジェクト配列（グローバルに公開）
export let forestTreesData: { position: THREE.Vector3, radius: number, height: number }[] = [];
export let forestRocksData: { position: THREE.Vector3, radius: number }[] = [];

export default function ForestWorld() {
  // 時間参照
  const timeRef = useRef(0);
  
  // アニメーション
  useFrame((_, delta) => {
    timeRef.current += delta;
  });
  
  // 木の生成
  const trees = useMemo<TreeType[]>(() => {
    const result: TreeType[] = [];
    const forestSize = 150;
    const treeCount = 150; // 木の総数
    const treeTypes = ['pine', 'oak', 'birch'] as const;
    
    // ランダムに木を配置
    for (let i = 0; i < treeCount; i++) {
      const x = (Math.random() * 2 - 1) * forestSize / 2;
      const z = (Math.random() * 2 - 1) * forestSize / 2;
      
      // 道路と水辺を避ける（中央付近）
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < 15) continue;
      
      // 円形の水辺を避ける
      const distanceFromLake = Math.sqrt(x * x + Math.pow(z - 40, 2));
      if (distanceFromLake < 35) continue;
      
      const scale = 0.8 + Math.random() * 0.5;
      const rotation = Math.random() * Math.PI * 2;
      const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
      
      result.push({
        id: `tree-${i}`,
        position: [x, 0, z],
        scale,
        rotation,
        type
      });
    }
    
    return result;
  }, []);
  
  // 岩の生成
  const rocks = useMemo<RockType[]>(() => {
    const result: RockType[] = [];
    const forestSize = 150;
    const rockCount = 50; // 岩の総数
    
    // ランダムに岩を配置
    for (let i = 0; i < rockCount; i++) {
      const x = (Math.random() * 2 - 1) * forestSize / 2;
      const z = (Math.random() * 2 - 1) * forestSize / 2;
      
      // 道路を避ける（中央付近）
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < 10) continue;
      
      // 湖の周りに岩を多く配置
      const distanceFromLake = Math.sqrt(x * x + Math.pow(z - 40, 2));
      const isNearLake = distanceFromLake < 40 && distanceFromLake > 30;
      if (!isNearLake && Math.random() > 0.3) continue;
      
      const scale = 0.5 + Math.random() * 1.0;
      const rotation = Math.random() * Math.PI * 2;
      
      result.push({
        id: `rock-${i}`,
        position: [x, 0, z],
        scale,
        rotation
      });
    }
    
    return result;
  }, []);
  
  // 衝突判定データの作成
  useEffect(() => {
    const newTreesData = trees.map(tree => {
      const trunkHeight = tree.type === 'pine' ? 6 : (tree.type === 'oak' ? 4 : 5);
      const trunkRadius = tree.type === 'pine' ? 0.4 : (tree.type === 'oak' ? 0.6 : 0.3);
      
      // 衝突判定は実際のサイズより少し小さく
      const collisionRadius = trunkRadius * tree.scale * 0.8;
      const collisionHeight = trunkHeight * tree.scale;
      
      return {
        position: new THREE.Vector3(tree.position[0], tree.position[1] + collisionHeight/2, tree.position[2]),
        radius: collisionRadius,
        height: collisionHeight
      };
    });
    
    const newRocksData = rocks.map(rock => {
      // 衝突判定半径は実際のサイズより少し小さく
      const collisionRadius = rock.scale * 0.8;
      
      return {
        position: new THREE.Vector3(rock.position[0], rock.position[1] + rock.scale/2, rock.position[2]),
        radius: collisionRadius
      };
    });
    
    forestTreesData = newTreesData;
    forestRocksData = newRocksData;
    
    // コンポーネントのアンマウント時にデータをクリア
    return () => {
      forestTreesData = [];
      forestRocksData = [];
    };
  }, [trees, rocks]);
  
  // 木のコンポーネント
  const Tree = ({ tree }: { tree: TreeType }) => {
    const { position, scale, rotation, type } = tree;
    
    // 木のタイプに応じた色と形状
    const trunkColor = type === 'birch' ? '#f5f5dc' : (type === 'oak' ? '#8b4513' : '#5e2605');
    const leavesColor = type === 'pine' ? '#2e8b57' : (type === 'oak' ? '#228b22' : '#7cfc00');
    
    const trunkHeight = type === 'pine' ? 6 : (type === 'oak' ? 4 : 5);
    const trunkRadius = type === 'pine' ? 0.4 : (type === 'oak' ? 0.6 : 0.3);
    
    // 風による揺れアニメーション（オーク、白樺のみ）
    const swayFactor = type !== 'pine' ? Math.sin(timeRef.current * 0.5) * 0.01 : 0;
    
    return (
      <group position={position} rotation={[0, rotation, swayFactor]} scale={[scale, scale, scale]}>
        {/* 幹 */}
        <Cylinder 
          args={[trunkRadius, trunkRadius * 1.2, trunkHeight, 8]} 
          position={[0, trunkHeight / 2, 0]}
          castShadow
        >
          <meshStandardMaterial color={trunkColor} roughness={0.9} />
        </Cylinder>
        
        {/* 葉 - 木のタイプによって形状が異なる */}
        {type === 'pine' ? (
          // 松の木
          <>
            <Cylinder 
              args={[0, 2.5, 6, 8]} 
              position={[0, trunkHeight - 1, 0]}
              castShadow
            >
              <meshStandardMaterial color={leavesColor} roughness={0.8} />
            </Cylinder>
            <Cylinder 
              args={[0, 2, 4, 8]} 
              position={[0, trunkHeight + 2, 0]}
              castShadow
            >
              <meshStandardMaterial color={leavesColor} roughness={0.8} />
            </Cylinder>
            <Cylinder 
              args={[0, 1.5, 3, 8]} 
              position={[0, trunkHeight + 4.5, 0]}
              castShadow
            >
              <meshStandardMaterial color={leavesColor} roughness={0.8} />
            </Cylinder>
          </>
        ) : type === 'oak' ? (
          // オークの木
          <Sphere 
            args={[2.5, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.8]} 
            position={[0, trunkHeight + 1.5, 0]}
            castShadow
          >
            <meshStandardMaterial color={leavesColor} roughness={0.8} />
          </Sphere>
        ) : (
          // 白樺
          <Sphere 
            args={[1.8, 8, 8]} 
            position={[0, trunkHeight + 1, 0]}
            castShadow
          >
            <meshStandardMaterial color={leavesColor} roughness={0.7} />
          </Sphere>
        )}
        
        {/* デバッグ用衝突ボックス - 本番では非表示にする */}
        {/* <Cylinder 
          args={[trunkRadius * 0.8, trunkRadius * 0.8, trunkHeight, 8]} 
          position={[0, trunkHeight / 2, 0]}
        >
          <meshBasicMaterial color="red" wireframe={true} transparent opacity={0.5} />
        </Cylinder> */}
      </group>
    );
  };
  
  // 岩のコンポーネント
  const Rock = ({ rock }: { rock: RockType }) => {
    const { position, scale, rotation } = rock;
    
    // 岩の色をランダムに少し変える
    const grayShade = 0.4 + Math.random() * 0.2;
    const rockColor = new THREE.Color(grayShade, grayShade, grayShade);
    
    // 岩の種類をランダムに（球体または立方体ベース）
    const isRounded = Math.random() > 0.5;
    
    return (
      <group position={[position[0], scale / 2, position[2]]} rotation={[0, rotation, 0]} scale={[scale, scale, scale]}>
        {isRounded ? (
          // 丸みのある岩
          <Sphere args={[1, 6, 6]} castShadow receiveShadow>
            <meshStandardMaterial color={rockColor} roughness={0.9} />
          </Sphere>
        ) : (
          // 角のある岩
          <Box 
            args={[1, 0.8, 1]} 
            castShadow 
            receiveShadow
          >
            <meshStandardMaterial color={rockColor} roughness={0.9} />
          </Box>
        )}
        
        {/* デバッグ用衝突球 - 本番では非表示にする */}
        {/* <Sphere args={[0.8, 8, 8]}>
          <meshBasicMaterial color="red" wireframe={true} transparent opacity={0.5} />
        </Sphere> */}
      </group>
    );
  };
  
  // 地形コンポーネント - 芝生の地面と水辺
  const Terrain = () => {
    // 水面アニメーション用
    const waterMovement = Math.sin(timeRef.current * 0.2) * 0.05;
    
    return (
      <>
        {/* 草地 */}
        <Box 
          args={[300, 0.2, 300]} 
          position={[0, -0.05, 0]} // Zファイティング防止のため少し上げる
          rotation={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#4caf50" roughness={0.9} />
        </Box>
        
        {/* 湖 - 円形に変更 */}
        <Cylinder 
          args={[30, 30, 0.5, 32]} 
          position={[0, waterMovement - 0.04, 40]} // Zファイティング防止のため調整
          rotation={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial 
            color="#1e88e5" 
            roughness={0.2} 
            metalness={0.1} 
            transparent 
            opacity={0.8} 
          />
        </Cylinder>
        
        {/* 砂浜 - 円形に変更 */}
        <Cylinder 
          args={[32.5, 32.5, 0.15, 32]} 
          position={[0, -0.07, 40]} // Zファイティング防止のため調整
          rotation={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#e0e0e0" roughness={0.8} />
        </Cylinder>
        
        {/* 小道 */}
        <Box 
          args={[6, 0.05, 300]} 
          position={[0, 0, 0]} // これより下のオブジェクトを配置しない
          rotation={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#a1887f" roughness={0.9} />
        </Box>
        <Box 
          args={[300, 0.05, 6]} 
          position={[0, 0, 0]} // これより下のオブジェクトを配置しない
          rotation={[0, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial color="#a1887f" roughness={0.9} />
        </Box>
      </>
    );
  };
  
  return (
    <>
      {/* 地形 */}
      <Terrain />
      
      {/* 木 */}
      {trees.map((tree) => (
        <Tree key={tree.id} tree={tree} />
      ))}
      
      {/* 岩 */}
      {rocks.map((rock) => (
        <Rock key={rock.id} rock={rock} />
      ))}
    </>
  );
} 