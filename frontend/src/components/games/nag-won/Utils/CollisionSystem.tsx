'use client';

import React, { useRef, useCallback } from 'react';
import * as THREE from 'three';

// 衝突判定の種類
export type CollisionType = 'sphere' | 'box' | 'capsule' | 'mesh';

// 衝突オブジェクトの定義
export interface CollisionObject {
  id: string;
  type: CollisionType;
  position: THREE.Vector3;
  size: THREE.Vector3; // sphere: radius in x, box: width/height/depth, capsule: radius in x, height in y
  mesh?: THREE.Mesh;
  onCollision?: (other: CollisionObject) => void;
  isStatic?: boolean; // 静的オブジェクト（建物など）
  isTrigger?: boolean; // トリガー（アイテムなど）
  layer?: string; // 衝突レイヤー
}

// 衝突判定結果
export interface CollisionResult {
  hasCollision: boolean;
  distance: number;
  normal: THREE.Vector3;
  point: THREE.Vector3;
}

// 衝突判定システムクラス
export class CollisionSystem {
  private objects: Map<string, CollisionObject> = new Map();
  private spatialGrid: Map<string, Set<string>> = new Map();
  private gridSize = 10; // グリッドのサイズ

  // オブジェクトを追加
  addObject(obj: CollisionObject) {
    this.objects.set(obj.id, obj);
    this.updateSpatialGrid(obj);
  }

  // オブジェクトを削除
  removeObject(id: string) {
    const obj = this.objects.get(id);
    if (obj) {
      this.removeFromSpatialGrid(obj);
      this.objects.delete(id);
    }
  }

  // オブジェクトの位置を更新
  updateObject(id: string, position: THREE.Vector3) {
    const obj = this.objects.get(id);
    if (obj) {
      this.removeFromSpatialGrid(obj);
      obj.position.copy(position);
      this.updateSpatialGrid(obj);
    }
  }

  // 空間グリッドを更新
  private updateSpatialGrid(obj: CollisionObject) {
    const gridKey = this.getGridKey(obj.position);
    if (!this.spatialGrid.has(gridKey)) {
      this.spatialGrid.set(gridKey, new Set());
    }
    this.spatialGrid.get(gridKey)!.add(obj.id);
  }

  // 空間グリッドから削除
  private removeFromSpatialGrid(obj: CollisionObject) {
    const gridKey = this.getGridKey(obj.position);
    const grid = this.spatialGrid.get(gridKey);
    if (grid) {
      grid.delete(obj.id);
      if (grid.size === 0) {
        this.spatialGrid.delete(gridKey);
      }
    }
  }

  // グリッドキーを取得
  private getGridKey(position: THREE.Vector3): string {
    const x = Math.floor(position.x / this.gridSize);
    const z = Math.floor(position.z / this.gridSize);
    return `${x},${z}`;
  }

  // 近隣のオブジェクトを取得
  private getNearbyObjects(position: THREE.Vector3): CollisionObject[] {
    const nearby: CollisionObject[] = [];
    
    // 周囲9グリッドをチェック
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const x = Math.floor(position.x / this.gridSize) + dx;
        const z = Math.floor(position.z / this.gridSize) + dz;
        const key = `${x},${z}`;
        
        const grid = this.spatialGrid.get(key);
        if (grid) {
          for (const objId of grid) {
            const obj = this.objects.get(objId);
            if (obj) {
              nearby.push(obj);
            }
          }
        }
      }
    }
    
    return nearby;
  }

  // 球と球の衝突判定
  private sphereToSphere(a: CollisionObject, b: CollisionObject): CollisionResult {
    const distance = a.position.distanceTo(b.position);
    const radiusSum = a.size.x + b.size.x;
    const hasCollision = distance < radiusSum;
    
    const normal = new THREE.Vector3().subVectors(b.position, a.position).normalize();
    const point = new THREE.Vector3().addVectors(a.position, normal.clone().multiplyScalar(a.size.x));
    
    return {
      hasCollision,
      distance,
      normal,
      point
    };
  }

  // 球とボックスの衝突判定
  private sphereToBox(sphere: CollisionObject, box: CollisionObject): CollisionResult {
    const spherePos = sphere.position;
    const boxPos = box.position;
    const boxSize = box.size;
    
    // ボックスの最も近い点を計算
    const closestPoint = new THREE.Vector3(
      Math.max(boxPos.x - boxSize.x / 2, Math.min(spherePos.x, boxPos.x + boxSize.x / 2)),
      Math.max(boxPos.y - boxSize.y / 2, Math.min(spherePos.y, boxPos.y + boxSize.y / 2)),
      Math.max(boxPos.z - boxSize.z / 2, Math.min(spherePos.z, boxPos.z + boxSize.z / 2))
    );
    
    const distance = spherePos.distanceTo(closestPoint);
    const hasCollision = distance < sphere.size.x;
    
    const normal = new THREE.Vector3().subVectors(spherePos, closestPoint).normalize();
    
    return {
      hasCollision,
      distance,
      normal,
      point: closestPoint
    };
  }

  // メイン衝突判定関数
  checkCollision(a: CollisionObject, b: CollisionObject): CollisionResult {
    if (a.type === 'sphere' && b.type === 'sphere') {
      return this.sphereToSphere(a, b);
    } else if (a.type === 'sphere' && b.type === 'box') {
      return this.sphereToBox(a, b);
    } else if (a.type === 'box' && b.type === 'sphere') {
      const result = this.sphereToBox(b, a);
      result.normal.negate(); // 法線を反転
      return result;
    }
    
    // デフォルト（簡易的な球判定）
    return this.sphereToSphere(a, b);
  }

  // 特定のオブジェクトとの衝突をチェック
  checkCollisions(objectId: string): CollisionResult[] {
    const obj = this.objects.get(objectId);
    if (!obj) return [];
    
    const results: CollisionResult[] = [];
    const nearby = this.getNearbyObjects(obj.position);
    
    for (const other of nearby) {
      if (other.id === objectId) continue;
      
      // レイヤーチェック
      if (obj.layer && other.layer && obj.layer !== other.layer) continue;
      
      const result = this.checkCollision(obj, other);
      if (result.hasCollision) {
        results.push(result);
        
        // コールバック実行
        if (obj.onCollision) {
          obj.onCollision(other);
        }
        if (other.onCollision) {
          other.onCollision(obj);
        }
      }
    }
    
    return results;
  }

  // 全ての衝突をチェック
  checkAllCollisions(): Map<string, CollisionResult[]> {
    const allResults = new Map<string, CollisionResult[]>();
    
    for (const [id] of this.objects) {
      const results = this.checkCollisions(id);
      if (results.length > 0) {
        allResults.set(id, results);
      }
    }
    
    return allResults;
  }

  // レイキャスト（光線による衝突判定）
  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 100): CollisionResult | null {
    const ray = new THREE.Ray(origin, direction.normalize());
    let closestResult: CollisionResult | null = null;
    let closestDistance = maxDistance;
    
    for (const [, obj] of this.objects) {
      if (obj.type === 'sphere') {
        const sphere = new THREE.Sphere(obj.position, obj.size.x);
        const intersectionPoint = new THREE.Vector3();
        
        if (ray.intersectSphere(sphere, intersectionPoint)) {
          const distance = origin.distanceTo(intersectionPoint);
          if (distance < closestDistance) {
            closestDistance = distance;
            const normal = new THREE.Vector3().subVectors(intersectionPoint, obj.position).normalize();
            
            closestResult = {
              hasCollision: true,
              distance,
              normal,
              point: intersectionPoint
            };
          }
        }
      } else if (obj.type === 'box') {
        const box = new THREE.Box3().setFromCenterAndSize(obj.position, obj.size);
        const intersectionPoint = new THREE.Vector3();
        
        if (ray.intersectBox(box, intersectionPoint)) {
          const distance = origin.distanceTo(intersectionPoint);
          if (distance < closestDistance) {
            closestDistance = distance;
            
            // ボックスの法線を計算（簡易版）
            const center = obj.position;
            const diff = new THREE.Vector3().subVectors(intersectionPoint, center);
            const normal = new THREE.Vector3();
            
            if (Math.abs(diff.x) > Math.abs(diff.y) && Math.abs(diff.x) > Math.abs(diff.z)) {
              normal.set(Math.sign(diff.x), 0, 0);
            } else if (Math.abs(diff.y) > Math.abs(diff.z)) {
              normal.set(0, Math.sign(diff.y), 0);
            } else {
              normal.set(0, 0, Math.sign(diff.z));
            }
            
            closestResult = {
              hasCollision: true,
              distance,
              normal,
              point: intersectionPoint
            };
          }
        }
      }
    }
    
    return closestResult;
  }

  // デバッグ情報を取得
  getDebugInfo() {
    return {
      objectCount: this.objects.size,
      gridCount: this.spatialGrid.size,
      objects: Array.from(this.objects.values())
    };
  }
}

// 衝突判定システムのフック
export function useCollisionSystem() {
  const systemRef = useRef<CollisionSystem>(new CollisionSystem());
  
  const addCollisionObject = useCallback((obj: CollisionObject) => {
    systemRef.current.addObject(obj);
  }, []);
  
  const removeCollisionObject = useCallback((id: string) => {
    systemRef.current.removeObject(id);
  }, []);
  
  const updateCollisionObject = useCallback((id: string, position: THREE.Vector3) => {
    systemRef.current.updateObject(id, position);
  }, []);
  
  const checkCollisions = useCallback((objectId: string) => {
    return systemRef.current.checkCollisions(objectId);
  }, []);
  
  const raycast = useCallback((origin: THREE.Vector3, direction: THREE.Vector3, maxDistance?: number) => {
    return systemRef.current.raycast(origin, direction, maxDistance);
  }, []);
  
  return {
    addCollisionObject,
    removeCollisionObject,
    updateCollisionObject,
    checkCollisions,
    raycast,
    system: systemRef.current
  };
}

// 衝突判定可視化コンポーネント（デバッグ用）
interface CollisionDebugProps {
  system: CollisionSystem;
  visible?: boolean;
}

export function CollisionDebug({ system, visible = false }: CollisionDebugProps) {
  if (!visible) return null;
  
  const debugInfo = system.getDebugInfo();
  
  return (
    <>
      {debugInfo.objects.map((obj) => (
        <group key={obj.id} position={obj.position}>
          {obj.type === 'sphere' && (
            <mesh>
              <sphereGeometry args={[obj.size.x, 16, 16]} />
              <meshBasicMaterial 
                color={obj.isTrigger ? 0x00ff00 : 0xff0000} 
                wireframe 
                transparent 
                opacity={0.3} 
              />
            </mesh>
          )}
          {obj.type === 'box' && (
            <mesh>
              <boxGeometry args={[obj.size.x, obj.size.y, obj.size.z]} />
              <meshBasicMaterial 
                color={obj.isTrigger ? 0x00ff00 : 0xff0000} 
                wireframe 
                transparent 
                opacity={0.3} 
              />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
} 