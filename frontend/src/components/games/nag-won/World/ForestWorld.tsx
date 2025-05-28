'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Cone } from '@react-three/drei';
import * as THREE from 'three';

// 木のタイプ定義（拡張版）
type TreeType = {
  id: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
  type: 'pine' | 'oak' | 'birch' | 'willow' | 'maple' | 'cherry';
  age?: 'young' | 'mature' | 'old';
};

// 岩のタイプ定義
type RockType = {
  id: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
  type: 'normal' | 'moss' | 'crystal';
};

// 花のタイプ定義
type FlowerType = {
  id: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
  type: 'daisy' | 'rose' | 'tulip' | 'sunflower';
  color: string;
};

// きのこのタイプ定義
type MushroomType = {
  id: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
  type: 'normal' | 'magic' | 'giant';
  glowing?: boolean;
};

// 蝶々のタイプ定義
type ButterflyType = {
  id: string;
  position: [number, number, number];
  scale: number;
  color: string;
  speed: number;
  path: THREE.Vector3[];
};

// 鳥のタイプ定義
type BirdType = {
  id: string;
  position: [number, number, number];
  scale: number;
  color: string;
  speed: number;
  flightHeight: number;
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
  
  // 拡張された木の生成
  const trees = useMemo<TreeType[]>(() => {
    const result: TreeType[] = [];
    const forestSize = 150;
    const treeCount = 120; // 木の総数を削減（200→120）
    const treeTypes = ['pine', 'oak', 'birch', 'willow', 'maple', 'cherry'] as const;
    const ageTypes = ['young', 'mature', 'old'] as const;
    
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
      
      const scale = 0.6 + Math.random() * 0.8;
      const rotation = Math.random() * Math.PI * 2;
      const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
      const age = ageTypes[Math.floor(Math.random() * ageTypes.length)];
      
      result.push({
        id: `tree-${i}`,
        position: [x, 0, z],
        scale,
        rotation,
        type,
        age
      });
    }
    
    return result;
  }, []);
  
  // 岩の生成（拡張版）
  const rocks = useMemo<RockType[]>(() => {
    const result: RockType[] = [];
    const forestSize = 150;
    const rockCount = 50; // 岩の総数を削減（80→50）
    const rockTypes = ['normal', 'moss', 'crystal'] as const;
    
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
      if (!isNearLake && Math.random() > 0.4) continue;
      
      const scale = 0.4 + Math.random() * 1.2;
      const rotation = Math.random() * Math.PI * 2;
      const type = rockTypes[Math.floor(Math.random() * rockTypes.length)];
      
      result.push({
        id: `rock-${i}`,
        position: [x, 0, z],
        scale,
        rotation,
        type
      });
    }
    
    return result;
  }, []);
  
  // 花の生成
  const flowers = useMemo<FlowerType[]>(() => {
    const result: FlowerType[] = [];
    const forestSize = 150;
    const flowerCount = 80; // 花の数を削減（150→80）
    const flowerTypes = ['daisy', 'rose', 'tulip', 'sunflower'] as const;
    const flowerColors = ['#ff69b4', '#ff0000', '#ffff00', '#ff8c00', '#9370db', '#00ff7f'];
    
    for (let i = 0; i < flowerCount; i++) {
      const x = (Math.random() * 2 - 1) * forestSize / 2;
      const z = (Math.random() * 2 - 1) * forestSize / 2;
      
      // 道路を避ける
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < 12) continue;
      
      // 湖の近くを避ける
      const distanceFromLake = Math.sqrt(x * x + Math.pow(z - 40, 2));
      if (distanceFromLake < 32) continue;
      
      const scale = 0.3 + Math.random() * 0.4;
      const rotation = Math.random() * Math.PI * 2;
      const type = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      
      result.push({
        id: `flower-${i}`,
        position: [x, 0, z],
        scale,
        rotation,
        type,
        color
      });
    }
    
    return result;
  }, []);
  
  // きのこの生成
  const mushrooms = useMemo<MushroomType[]>(() => {
    const result: MushroomType[] = [];
    const forestSize = 150;
    const mushroomCount = 40; // きのこの数を削減（60→40）
    const mushroomTypes = ['normal', 'magic', 'giant'] as const;
    
    for (let i = 0; i < mushroomCount; i++) {
      const x = (Math.random() * 2 - 1) * forestSize / 2;
      const z = (Math.random() * 2 - 1) * forestSize / 2;
      
      // 道路を避ける
      const distanceFromCenter = Math.sqrt(x * x + z * z);
      if (distanceFromCenter < 10) continue;
      
      // 木の近くに配置する傾向
      const nearTree = trees.some(tree => {
        const treeDistance = Math.sqrt(
          Math.pow(x - tree.position[0], 2) + Math.pow(z - tree.position[2], 2)
        );
        return treeDistance < 5;
      });
      
      if (!nearTree && Math.random() > 0.3) continue;
      
      const scale = 0.2 + Math.random() * 0.6;
      const rotation = Math.random() * Math.PI * 2;
      const type = mushroomTypes[Math.floor(Math.random() * mushroomTypes.length)];
      const glowing = type === 'magic' && Math.random() > 0.5;
      
      result.push({
        id: `mushroom-${i}`,
        position: [x, 0, z],
        scale,
        rotation,
        type,
        glowing
      });
    }
    
    return result;
  }, [trees]);
  
  // 蝶々の生成
  const butterflies = useMemo<ButterflyType[]>(() => {
    const result: ButterflyType[] = [];
    const butterflyCount = 10; // 蝶々の数を削減（20→10）
    const butterflyColors = ['#ff69b4', '#00bfff', '#ffff00', '#ff8c00', '#9370db'];
    
    for (let i = 0; i < butterflyCount; i++) {
      const centerX = (Math.random() * 2 - 1) * 60;
      const centerZ = (Math.random() * 2 - 1) * 60;
      const height = 2 + Math.random() * 8;
      
      // 蝶々の飛行パスを生成（簡略化）
      const path: THREE.Vector3[] = [];
      const pathPoints = 6; // パスポイントを削減（8→6）
      for (let j = 0; j < pathPoints; j++) {
        const angle = (j / pathPoints) * Math.PI * 2;
        const radius = 5 + Math.random() * 10;
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        const y = height + Math.sin(angle * 2) * 2;
        path.push(new THREE.Vector3(x, y, z));
      }
      
      const scale = 0.1 + Math.random() * 0.1;
      const color = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
      const speed = 0.5 + Math.random() * 1.0;
      
      result.push({
        id: `butterfly-${i}`,
        position: [centerX, height, centerZ],
        scale,
        color,
        speed,
        path
      });
    }
    
    return result;
  }, []);
  
  // 鳥の生成
  const birds = useMemo<BirdType[]>(() => {
    const result: BirdType[] = [];
    const birdCount = 6; // 鳥の数を削減（10→6）
    const birdColors = ['#8b4513', '#000000', '#ff0000', '#0000ff', '#ffff00'];
    
    for (let i = 0; i < birdCount; i++) {
      const x = (Math.random() * 2 - 1) * 100;
      const z = (Math.random() * 2 - 1) * 100;
      const flightHeight = 15 + Math.random() * 20;
      
      const scale = 0.2 + Math.random() * 0.3;
      const color = birdColors[Math.floor(Math.random() * birdColors.length)];
      const speed = 1.0 + Math.random() * 2.0;
      
      result.push({
        id: `bird-${i}`,
        position: [x, flightHeight, z],
        scale,
        color,
        speed,
        flightHeight
      });
    }
    
    return result;
  }, []);
  
  // 衝突判定データの作成
  useEffect(() => {
    const newTreesData = trees.map(tree => {
      let trunkHeight, trunkRadius;
      
      switch (tree.type) {
        case 'pine':
          trunkHeight = 6;
          trunkRadius = 0.4;
          break;
        case 'oak':
          trunkHeight = 4;
          trunkRadius = 0.6;
          break;
        case 'birch':
          trunkHeight = 5;
          trunkRadius = 0.3;
          break;
        case 'willow':
          trunkHeight = 7;
          trunkRadius = 0.5;
          break;
        case 'maple':
          trunkHeight = 5.5;
          trunkRadius = 0.45;
          break;
        case 'cherry':
          trunkHeight = 4.5;
          trunkRadius = 0.35;
          break;
        default:
          trunkHeight = 5;
          trunkRadius = 0.4;
      }
      
      // 年齢による調整
      if (tree.age === 'young') {
        trunkHeight *= 0.7;
        trunkRadius *= 0.8;
      } else if (tree.age === 'old') {
        trunkHeight *= 1.2;
        trunkRadius *= 1.3;
      }
      
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
    const { position, scale, rotation, type, age } = tree;
    
    // 木のタイプと年齢に応じた色と形状
    const getTrunkColor = () => {
      switch (type) {
        case 'birch': return '#f5f5dc';
        case 'oak': return '#8b4513';
        case 'pine': return '#5e2605';
        case 'willow': return '#696969';
        case 'maple': return '#a0522d';
        case 'cherry': return '#8b4513';
        default: return '#8b4513';
      }
    };
    
    const getLeavesColor = () => {
      const baseColors = {
        pine: '#2e8b57',
        oak: '#228b22',
        birch: '#7cfc00',
        willow: '#9acd32',
        maple: '#ff8c00', // 秋の色
        cherry: '#ffb6c1'  // 桜色
      };
      
      let color = baseColors[type] || '#228b22';
      
      // 年齢による色の調整
      if (age === 'old') {
        // 古い木は少し暗く
        const threeColor = new THREE.Color(color);
        threeColor.multiplyScalar(0.8);
        color = `#${threeColor.getHexString()}`;
      } else if (age === 'young') {
        // 若い木は少し明るく
        const threeColor = new THREE.Color(color);
        threeColor.multiplyScalar(1.2);
        color = `#${threeColor.getHexString()}`;
      }
      
      return color;
    };
    
    const trunkColor = getTrunkColor();
    const leavesColor = getLeavesColor();
    
    let trunkHeight, trunkRadius;
    switch (type) {
      case 'pine':
        trunkHeight = 6;
        trunkRadius = 0.4;
        break;
      case 'oak':
        trunkHeight = 4;
        trunkRadius = 0.6;
        break;
      case 'birch':
        trunkHeight = 5;
        trunkRadius = 0.3;
        break;
      case 'willow':
        trunkHeight = 7;
        trunkRadius = 0.5;
        break;
      case 'maple':
        trunkHeight = 5.5;
        trunkRadius = 0.45;
        break;
      case 'cherry':
        trunkHeight = 4.5;
        trunkRadius = 0.35;
        break;
      default:
        trunkHeight = 5;
        trunkRadius = 0.4;
    }
    
    // 年齢による調整
    if (age === 'young') {
      trunkHeight *= 0.7;
      trunkRadius *= 0.8;
    } else if (age === 'old') {
      trunkHeight *= 1.2;
      trunkRadius *= 1.3;
    }
    
    // 風による揺れアニメーション
    const swayFactor = type !== 'pine' ? Math.sin(timeRef.current * 0.5 + position[0]) * 0.01 : 0;
    
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
        ) : type === 'willow' ? (
          // 柳の木（垂れ下がる葉）
          <>
            <Sphere 
              args={[2.5, 8, 8]} 
              position={[0, trunkHeight + 1.5, 0]}
              castShadow
            >
              <meshStandardMaterial color={leavesColor} roughness={0.8} />
            </Sphere>
            {/* 垂れ下がる枝（簡略化：8本→4本） */}
            {[...Array(4)].map((__, i) => (
              <Cylinder
                key={i}
                args={[0.05, 0.05, 3, 4]}
                position={[
                  Math.cos(i * Math.PI / 2) * 2,
                  trunkHeight - 0.5,
                  Math.sin(i * Math.PI / 2) * 2
                ]}
                rotation={[Math.PI * 0.1, 0, 0]}
                castShadow
              >
                <meshStandardMaterial color={leavesColor} roughness={0.8} />
              </Cylinder>
            ))}
          </>
        ) : type === 'cherry' ? (
          // 桜の木（花びら付き）
          <>
            <Sphere 
              args={[2.2, 8, 8]} 
              position={[0, trunkHeight + 1.2, 0]}
              castShadow
            >
              <meshStandardMaterial color={leavesColor} roughness={0.7} />
            </Sphere>
            {/* 花びら（簡略化：20個→8個） */}
            {[...Array(8)].map((_, i) => (
              <Sphere
                key={i}
                args={[0.1, 4, 4]}
                position={[
                  (Math.random() - 0.5) * 4,
                  trunkHeight + 1 + Math.random() * 2,
                  (Math.random() - 0.5) * 4
                ]}
              >
                <meshStandardMaterial color="#ffb6c1" emissive="#ffb6c1" emissiveIntensity={0.2} />
              </Sphere>
            ))}
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
          // その他（白樺、メープル）
          <Sphere 
            args={[1.8, 8, 8]} 
            position={[0, trunkHeight + 1, 0]}
            castShadow
          >
            <meshStandardMaterial color={leavesColor} roughness={0.7} />
          </Sphere>
        )}
      </group>
    );
  };
  
  // 岩のコンポーネント
  const Rock = ({ rock }: { rock: RockType }) => {
    const { position, scale, rotation, type } = rock;
    
    // 岩の種類に応じた色とエフェクト
    const getRockColor = () => {
      switch (type) {
        case 'moss':
          return new THREE.Color(0.2 + Math.random() * 0.2, 0.4 + Math.random() * 0.2, 0.2);
        case 'crystal':
          return new THREE.Color(0.7, 0.7, 1.0);
        default:
    const grayShade = 0.4 + Math.random() * 0.2;
          return new THREE.Color(grayShade, grayShade, grayShade);
      }
    };
    
    const rockColor = getRockColor();
    const isRounded = Math.random() > 0.5;
    
    return (
      <group position={[position[0], scale / 2, position[2]]} rotation={[0, rotation, 0]} scale={[scale, scale, scale]}>
        {isRounded ? (
          <Sphere args={[1, 6, 6]} castShadow receiveShadow>
            <meshStandardMaterial 
              color={rockColor} 
              roughness={type === 'crystal' ? 0.1 : 0.9}
              metalness={type === 'crystal' ? 0.8 : 0.1}
              emissive={type === 'crystal' ? new THREE.Color(0.1, 0.1, 0.3) : undefined}
              emissiveIntensity={type === 'crystal' ? 0.3 : 0}
            />
          </Sphere>
        ) : (
          <Box args={[1, 0.8, 1]} castShadow receiveShadow>
            <meshStandardMaterial 
              color={rockColor} 
              roughness={type === 'crystal' ? 0.1 : 0.9}
              metalness={type === 'crystal' ? 0.8 : 0.1}
              emissive={type === 'crystal' ? new THREE.Color(0.1, 0.1, 0.3) : undefined}
              emissiveIntensity={type === 'crystal' ? 0.3 : 0}
            />
          </Box>
        )}
        
        {/* 苔の表現 */}
        {type === 'moss' && (
          <Sphere args={[1.1, 6, 6]} receiveShadow>
            <meshStandardMaterial 
              color="#228b22" 
              roughness={1.0}
              transparent
              opacity={0.3}
            />
          </Sphere>
        )}
      </group>
    );
  };
  
  // 花のコンポーネント
  const Flower = ({ flower }: { flower: FlowerType }) => {
    const { position, scale, rotation, type, color } = flower;
    
    // 風による揺れアニメーション
    const swayFactor = Math.sin(timeRef.current * 2 + position[0] + position[2]) * 0.05;
    
    return (
      <group position={position} rotation={[0, rotation, swayFactor]} scale={[scale, scale, scale]}>
        {/* 茎 */}
        <Cylinder args={[0.02, 0.02, 0.5, 4]} position={[0, 0.25, 0]} castShadow>
          <meshStandardMaterial color="#228b22" roughness={0.8} />
        </Cylinder>
        
        {/* 花 */}
        {type === 'daisy' ? (
          // デイジー（花びら）
          <>
            <Sphere args={[0.05, 6, 6]} position={[0, 0.5, 0]}>
              <meshStandardMaterial color="#ffff00" />
            </Sphere>
            {[...Array(8)].map((_, i) => (
              <Box
                key={i}
                args={[0.15, 0.02, 0.05]}
                position={[
                  Math.cos(i * Math.PI / 4) * 0.08,
                  0.5,
                  Math.sin(i * Math.PI / 4) * 0.08
                ]}
                rotation={[0, i * Math.PI / 4, 0]}
              >
                <meshStandardMaterial color={color} />
              </Box>
            ))}
          </>
        ) : type === 'rose' ? (
          // バラ
          <Sphere args={[0.08, 8, 8]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color={color} roughness={0.6} />
          </Sphere>
        ) : type === 'tulip' ? (
          // チューリップ
          <Cone args={[0.06, 0.12, 6]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color={color} roughness={0.7} />
          </Cone>
        ) : (
          // ひまわり
          <>
            <Sphere args={[0.1, 8, 8]} position={[0, 0.5, 0]}>
              <meshStandardMaterial color="#8b4513" />
            </Sphere>
            {[...Array(12)].map((_, i) => (
              <Box
                key={i}
                args={[0.2, 0.03, 0.06]}
                position={[
                  Math.cos(i * Math.PI / 6) * 0.12,
                  0.5,
                  Math.sin(i * Math.PI / 6) * 0.12
                ]}
                rotation={[0, i * Math.PI / 6, 0]}
              >
                <meshStandardMaterial color={color} />
              </Box>
            ))}
          </>
        )}
      </group>
    );
  };
  
  // きのこのコンポーネント
  const Mushroom = ({ mushroom }: { mushroom: MushroomType }) => {
    const { position, scale, rotation, type, glowing } = mushroom;
    
    // きのこの種類に応じた色とサイズ
    const getMushroomProps = () => {
      switch (type) {
        case 'magic':
          return {
            capColor: '#9370db',
            stemColor: '#f5f5dc',
            capSize: 0.3,
            stemHeight: 0.4,
            spots: true
          };
        case 'giant':
          return {
            capColor: '#8b4513',
            stemColor: '#f5f5dc',
            capSize: 0.8,
            stemHeight: 1.0,
            spots: false
          };
        default:
          return {
            capColor: '#ff6347',
            stemColor: '#f5f5dc',
            capSize: 0.2,
            stemHeight: 0.3,
            spots: true
          };
      }
    };
    
    const props = getMushroomProps();
    const glowIntensity = glowing ? 0.5 + Math.sin(timeRef.current * 3) * 0.3 : 0;
    
    return (
      <group position={position} rotation={[0, rotation, 0]} scale={[scale, scale, scale]}>
        {/* 茎 */}
        <Cylinder 
          args={[0.05, 0.08, props.stemHeight, 6]} 
          position={[0, props.stemHeight / 2, 0]}
          castShadow
        >
          <meshStandardMaterial color={props.stemColor} roughness={0.8} />
        </Cylinder>
        
        {/* かさ */}
        <Sphere 
          args={[props.capSize, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]} 
          position={[0, props.stemHeight, 0]}
          castShadow
        >
          <meshStandardMaterial 
            color={props.capColor} 
            roughness={0.7}
            emissive={glowing ? props.capColor : '#000000'}
            emissiveIntensity={glowIntensity}
          />
        </Sphere>
        
        {/* 斑点 */}
        {props.spots && [...Array(6)].map((_, i) => (
          <Sphere
            key={i}
            args={[0.03, 4, 4]}
            position={[
              (Math.random() - 0.5) * props.capSize * 1.5,
              props.stemHeight + 0.05,
              (Math.random() - 0.5) * props.capSize * 1.5
            ]}
          >
            <meshStandardMaterial color="#ffffff" />
          </Sphere>
        ))}
      </group>
    );
  };
  
  // 蝶々のコンポーネント
  const Butterfly = ({ butterfly }: { butterfly: ButterflyType }) => {
    const { scale, color, speed, path } = butterfly;
    const butterflyRef = useRef<THREE.Group>(null);
    
    // アニメーション更新頻度を下げる（毎フレーム→3フレームに1回）
    useFrame(() => {
      if (butterflyRef.current && path.length > 0 && Math.random() < 0.33) {
        const time = timeRef.current * speed;
        const pathIndex = Math.floor(time) % path.length;
        const nextIndex = (pathIndex + 1) % path.length;
        const t = time - Math.floor(time);
        
        const currentPos = path[pathIndex];
        const nextPos = path[nextIndex];
        
        // 補間して滑らかな移動
        butterflyRef.current.position.lerpVectors(currentPos, nextPos, t);
        
        // 羽ばたきアニメーション（簡略化）
        const flapSpeed = 8; // 10→8に削減
        const flapAngle = Math.sin(timeRef.current * flapSpeed) * 0.2; // 0.3→0.2に削減
        butterflyRef.current.rotation.z = flapAngle;
      }
    });
    
    return (
      <group ref={butterflyRef} scale={[scale, scale, scale]}>
        {/* 体 */}
        <Cylinder args={[0.02, 0.02, 0.3, 4]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#000000" />
        </Cylinder>
        
        {/* 羽（簡略化：4枚→2枚） */}
        <Box args={[0.4, 0.01, 0.2]} position={[-0.1, 0, 0]} rotation={[0, 0, 0.2]}>
          <meshStandardMaterial color={color} transparent opacity={0.8} />
        </Box>
        <Box args={[0.4, 0.01, 0.2]} position={[0.1, 0, 0]} rotation={[0, 0, -0.2]}>
          <meshStandardMaterial color={color} transparent opacity={0.8} />
        </Box>
      </group>
    );
  };
  
  // 鳥のコンポーネント
  const Bird = ({ bird }: { bird: BirdType }) => {
    const { scale, color, speed, flightHeight } = bird;
    const birdRef = useRef<THREE.Group>(null);
    
    // アニメーション更新頻度を下げる（毎フレーム→2フレームに1回）
    useFrame(() => {
      if (birdRef.current && Math.random() < 0.5) {
        // 円形の飛行パターン（簡略化）
        const radius = 25; // 30→25に削減
        const time = timeRef.current * speed * 0.08; // 0.1→0.08に削減
        const x = Math.cos(time) * radius;
        const z = Math.sin(time) * radius;
        const y = flightHeight + Math.sin(time * 2) * 1.5; // 3→2、2→1.5に削減
        
        birdRef.current.position.set(x, y, z);
        birdRef.current.lookAt(
          x + Math.cos(time + 0.1) * radius,
          y,
          z + Math.sin(time + 0.1) * radius
        );
        
        // 羽ばたきアニメーション（簡略化）
        const flapSpeed = 6; // 8→6に削減
        const flapAngle = Math.sin(timeRef.current * flapSpeed) * 0.3; // 0.5→0.3に削減
        birdRef.current.rotation.z += flapAngle * 0.05; // 0.1→0.05に削減
      }
    });
    
    return (
      <group ref={birdRef} scale={[scale, scale, scale]}>
        {/* 体 */}
        <Box args={[0.3, 0.15, 0.8]}>
          <meshStandardMaterial color={color} />
        </Box>
        
        {/* 頭 */}
        <Sphere args={[0.12, 6, 6]} position={[0, 0.05, 0.5]}>
          <meshStandardMaterial color={color} />
        </Sphere>
        
        {/* くちばし */}
        <Cone args={[0.03, 0.15, 4]} position={[0, 0.05, 0.65]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color="#ffa500" />
        </Cone>
        
        {/* 羽（アニメーション簡略化） */}
        <Box args={[0.8, 0.05, 0.3]} position={[0, 0, -0.1]} rotation={[0, 0, Math.sin(timeRef.current * 6) * 0.2]}>
          <meshStandardMaterial color={color} />
        </Box>
        
        {/* 尻尾 */}
        <Box args={[0.1, 0.05, 0.4]} position={[0, 0, -0.6]}>
          <meshStandardMaterial color={color} />
        </Box>
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
      
      {/* 花 */}
      {flowers.map((flower) => (
        <Flower key={flower.id} flower={flower} />
      ))}
      
      {/* きのこ */}
      {mushrooms.map((mushroom) => (
        <Mushroom key={mushroom.id} mushroom={mushroom} />
      ))}
      
      {/* 蝶々 */}
      {butterflies.map((butterfly) => (
        <Butterfly key={butterfly.id} butterfly={butterfly} />
      ))}
      
      {/* 鳥 */}
      {birds.map((bird) => (
        <Bird key={bird.id} bird={bird} />
      ))}
    </>
  );
} 