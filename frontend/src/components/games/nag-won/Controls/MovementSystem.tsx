'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useCameraStore, usePlayerStore, useGameSettingsStore } from '../Utils/stores';
import { PhysicsParams } from '../Utils/types';
import { cityBuildingsData, forestTreesData, forestRocksData, volcanoRocksData, volcanoObjectsData, volcanoLavaFlowsData } from '../World';

// 火山ステージの安全距離設定
const VOLCANO_CENTER = new Vector3(0, 30, 30);
const VOLCANO_MIN_SAFE_DISTANCE = 40; // 少し緩和

interface MovementSystemProps {
  playerRef: React.RefObject<THREE.Group>;
  config?: Partial<PhysicsParams>;
  manualAnimationMode?: boolean;
}

export const MovementSystem: React.FC<MovementSystemProps> = ({ 
  playerRef,
  config = {},
  manualAnimationMode = false
}) => {
  // 物理パラメータのデフォルト値とマージ
  const physicsParams: PhysicsParams = {
    gravity: 9.8,
    jumpForce: 5.0,
    walkSpeed: 4.0,
    runSpeed: 8.0,
    airControl: 0.3,
    groundFriction: 0.8,
    airFriction: 0.05,
    groundLevel: 0.0, // 地面レベル（0.0が地面）
    characterHeight: 1.0, // キャラクターの実際の足元から頭までの高さ（スケール適用後）
    ...config
  };
  
  // 状態の取得
  const {
    position,
    velocity,
    onGround,
    inputs,
    setPosition,
    setVelocity,
    setOnGround,
    setAnimationState
  } = usePlayerStore();
  
  const { rotation, cameraMode } = useCameraStore();
  
  // 現在のステージを取得
  const { selectedStageId } = useGameSettingsStore();
  
  // フレーム間の時間を追跡
  const lastTime = useRef(0);
  // デバッグ情報
  const debugInfo = useRef({
    lastGroundCheck: 0,
    airTime: 0,
  });
  
  // プレイヤーの衝突判定用パラメータ
  const PLAYER_RADIUS = 1.2; // プレイヤーの衝突半径（小さめに修正）
  const COLLISION_MARGIN = 0.3; // 衝突余裕度（小さめに修正）
  
  // 建物との衝突をチェック - サイバーシティ
  const checkCyberCityCollision = (newPos: Vector3): boolean => {
    // 衝突判定用のプレイヤーの中心位置（足元ではなく胴体あたり）
    const playerCenter = new Vector3(
      newPos.x,
      newPos.y + physicsParams.characterHeight / 2, // キャラクターの高さ/2を足して中心にする
      newPos.z
    );
    
    // 有効な衝突判定用データがなければスキップ
    if (!cityBuildingsData || cityBuildingsData.length === 0) {
      return false;
    }
    
    // 各建物との衝突をチェック
    for (const building of cityBuildingsData) {
      // 位置は配列で来るので変換
      const buildingPos = new Vector3(
        building.position[0],
        building.position[1],
        building.position[2]
      );
      
      // XZ平面での距離を計算（高さは考慮しない）
      const distanceXZ = Math.sqrt(
        Math.pow(playerCenter.x - buildingPos.x, 2) +
        Math.pow(playerCenter.z - buildingPos.z, 2)
      );
      
      // 建物の半分の幅/奥行きと、プレイヤーの半径を足した値より距離が小さければ衝突
      const collisionThreshold = 
        Math.max(building.width, building.depth) / 2 + PLAYER_RADIUS + COLLISION_MARGIN;
      
      if (distanceXZ < collisionThreshold) {
        // Y軸方向も考慮（プレイヤーがジャンプして建物の上にいる場合は衝突しない）
        const playerBottom = newPos.y;
        const buildingTop = buildingPos.y + building.height / 2;
        
        // プレイヤーが建物より下にいる場合は衝突
        if (playerBottom < buildingTop) {
          return true; // 衝突あり
        }
      }
    }
    
    return false; // 衝突なし
  };
  
  // 森林ステージでの衝突判定
  const checkForestCollision = (newPos: Vector3): boolean => {
    // プレイヤーの位置（足元ではなく胴体あたり）
    const playerCenter = new Vector3(
      newPos.x,
      newPos.y + physicsParams.characterHeight / 2,
      newPos.z
    );
    
    // 木との衝突判定
    if (forestTreesData && forestTreesData.length > 0) {
      for (const tree of forestTreesData) {
        const treePos = tree.position;
        
        // XZ平面での距離を計算
        const distanceXZ = Math.sqrt(
          Math.pow(playerCenter.x - treePos.x, 2) +
          Math.pow(playerCenter.z - treePos.z, 2)
        );
        
        // 衝突判定
        if (distanceXZ < tree.radius + PLAYER_RADIUS) {
          // 高さも考慮（ジャンプで乗り越える可能性）
          if (newPos.y < treePos.y + tree.height) {
            return true; // 衝突あり
          }
        }
      }
    }
    
    // 岩との衝突判定
    if (forestRocksData && forestRocksData.length > 0) {
      for (const rock of forestRocksData) {
        const rockPos = rock.position;
        
        // 距離を計算
        const distance = playerCenter.distanceTo(rockPos);
        
        if (distance < rock.radius + PLAYER_RADIUS) {
          return true; // 衝突あり
        }
      }
    }
    
    return false; // 衝突なし
  };
  
  // 火山ステージでの衝突判定
  const checkVolcanoCollision = (newPos: Vector3): boolean => {
    // プレイヤーの位置（足元ではなく胴体あたり）
    const playerCenter = new Vector3(
      newPos.x,
      newPos.y + physicsParams.characterHeight / 2,
      newPos.z
    );
    
    // 火山の中心からの距離をチェック（安全半径による判定）
    const distanceFromVolcano = Math.sqrt(
      Math.pow(playerCenter.x - VOLCANO_CENTER.x, 2) +
      Math.pow(playerCenter.z - VOLCANO_CENTER.z, 2)
    );
    
    // 安全半径内なら常に衝突として扱う（火山に近づきすぎない）
    if (distanceFromVolcano < VOLCANO_MIN_SAFE_DISTANCE) {
      return true; // 火山に近すぎるので衝突あり
    }
    
    // 岩との衝突判定 - パフォーマンス改善のためにnullチェックを最初に行う
    if (volcanoRocksData?.length > 0) {
      for (const rock of volcanoRocksData) {
        const rockPos = rock.position;
        
        // 距離を計算
        const distance = playerCenter.distanceTo(rockPos);
        
        if (distance < rock.radius + PLAYER_RADIUS) {
          return true; // 衝突あり
        }
      }
    }
    
    // 火山などの大きなオブジェクトとの衝突判定
    if (volcanoObjectsData?.length > 0) {
      for (const obj of volcanoObjectsData) {
        const objPos = obj.position;
        
        // XZ平面での距離を計算
        const distanceXZ = Math.sqrt(
          Math.pow(playerCenter.x - objPos.x, 2) +
          Math.pow(playerCenter.z - objPos.z, 2)
        );
        
        // 衝突判定 - 水平方向のチェック
        if (distanceXZ < obj.radius + PLAYER_RADIUS) {
          // 高さも考慮（非常に高いオブジェクトの場合）
          if (obj.height) {
            // y座標がオブジェクトの高さ範囲内かチェック
            // objPos.yはオブジェクトの中心なので、高さの半分を加減して範囲を計算
            const objBottom = objPos.y - (obj.height / 2);
            const objTop = objPos.y + (obj.height / 2);
            
            // プレイヤーの足元から頭までの範囲がオブジェクトと重なるかチェック
            const playerBottom = newPos.y;
            const playerTop = newPos.y + physicsParams.characterHeight;
            
            // 高さ範囲が重なる場合は衝突
            if (!(playerBottom > objTop || playerTop < objBottom)) {
              return true; // 衝突あり
            }
          } else {
            return true; // 高さが指定されていない場合は単純な球体として扱う
          }
        }
      }
    }
    
    // 溶岩流との衝突判定
    if (volcanoLavaFlowsData?.length > 0) {
      for (const lavaFlow of volcanoLavaFlowsData) {
        const lavaPos = lavaFlow.position;
        
        // 溶岩流は回転を考慮した矩形の衝突判定
        // 回転行列をプレイヤー位置に適用して逆変換
        const relX = playerCenter.x - lavaPos.x;
        const relZ = playerCenter.z - lavaPos.z;
        
        // 回転角度で逆回転
        const rotatedX = relX * Math.cos(-lavaFlow.rotation) - relZ * Math.sin(-lavaFlow.rotation);
        const rotatedZ = relX * Math.sin(-lavaFlow.rotation) + relZ * Math.cos(-lavaFlow.rotation);
        
        // 矩形内にいるかチェック
        if (Math.abs(rotatedX) < lavaFlow.width / 2 + PLAYER_RADIUS && 
            Math.abs(rotatedZ) < lavaFlow.depth / 2 + PLAYER_RADIUS) {
          return true; // 衝突あり
        }
      }
    }
    
    return false; // 衝突なし
  };
  
  // 現在のステージに基づいて衝突判定を行う
  const checkBuildingCollision = (newPos: Vector3): boolean => {
    switch (selectedStageId) {
      case 'forest':
        return checkForestCollision(newPos);
      case 'volcano':
        return checkVolcanoCollision(newPos);
      case 'cyber-city':
      default:
        return checkCyberCityCollision(newPos);
    }
  };
  
  // 衝突時のスライド処理（壁に沿って移動）
  const handleCollisionSlide = (oldPos: Vector3, newPos: Vector3): Vector3 => {
    // X方向とZ方向を個別にテスト
    const testX = new Vector3(newPos.x, oldPos.y, oldPos.z);
    const testZ = new Vector3(oldPos.x, oldPos.y, newPos.z);
    
    const collideX = checkBuildingCollision(testX);
    const collideZ = checkBuildingCollision(testZ);
    
    // 結果に基づいて、許可された方向にのみ移動
    if (!collideX && collideZ) {
      // X方向のみ移動可能
      return new Vector3(newPos.x, newPos.y, oldPos.z);
    } else if (collideX && !collideZ) {
      // Z方向のみ移動可能
      return new Vector3(oldPos.x, newPos.y, newPos.z);
    } else if (collideX && collideZ) {
      // 両方向とも衝突する場合は移動しない
      return new Vector3(oldPos.x, newPos.y, oldPos.z);
    }
    
    // 衝突なしの場合は新しい位置をそのまま返す
    return newPos;
  };
  
  // 移動とアニメーションの更新
  useFrame((state) => {
    if (!playerRef.current) return;
    
    // デルタ時間の計算（一定のシミュレーション速度のため）
    const time = state.clock.getElapsedTime();
    const delta = Math.min(time - lastTime.current, 0.1); // 最大100msに制限
    lastTime.current = time;
    
    // 現在の状態をコピー
    const newPosition = position.clone();
    const newVelocity = velocity.clone();
    
    // 入力方向を計算（コントロールを完全に修正）
    const inputDir = new Vector3(0, 0, 0);
    
    // カメラベースの方向に変換（修正版 - 方向を正しく設定）
    const cameraForward = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), rotation.y);
    const cameraRight = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), rotation.y);
    
    // 入力を適用（従来のゲーム操作に合わせる）
    if (inputs.forward) inputDir.sub(cameraForward); // 前方向 = カメラの反対方向
    if (inputs.backward) inputDir.add(cameraForward); // 後方向 = カメラの方向
    if (inputs.right) inputDir.sub(cameraRight); // 右方向 = カメラ右の反対
    if (inputs.left) inputDir.add(cameraRight); // 左方向 = カメラ右の方向
    
    // 入力がある場合は正規化
    if (inputDir.lengthSq() > 0) {
      inputDir.normalize();
    }
    
    // 地上での移動
    if (onGround) {
      // 目標速度を計算
      const targetSpeed = inputs.sprint ? physicsParams.runSpeed : physicsParams.walkSpeed;
      const targetVelocity = inputDir.clone().multiplyScalar(targetSpeed);
      
      // 実際の速度を滑らかに調整（地上の摩擦）
      newVelocity.x += (targetVelocity.x - newVelocity.x) * (1 - Math.pow(1 - physicsParams.groundFriction, delta * 60));
      newVelocity.z += (targetVelocity.z - newVelocity.z) * (1 - Math.pow(1 - physicsParams.groundFriction, delta * 60));
      
      // ジャンプ
      if (inputs.jump) {
        newVelocity.y = physicsParams.jumpForce;
        setOnGround(false);
        debugInfo.current.lastGroundCheck = time;
        debugInfo.current.airTime = 0;
      }
    } else {
      // 空中での制御（より制限された動き）
      newVelocity.x += inputDir.x * physicsParams.airControl * delta * 60;
      newVelocity.z += inputDir.z * physicsParams.airControl * delta * 60;
      
      // 空気抵抗
      newVelocity.x *= 1 - physicsParams.airFriction * delta;
      newVelocity.z *= 1 - physicsParams.airFriction * delta;
      
      // 空中時間を追跡
      debugInfo.current.airTime += delta;
    }
    
    // 重力の適用
    newVelocity.y -= physicsParams.gravity * delta;
    
    // 位置の更新
    const positionBeforeCollision = position.clone();
    newPosition.addScaledVector(newVelocity, delta);
    
    // 衝突判定
    if (checkBuildingCollision(newPosition)) {
      // 衝突した場合、壁に沿ってスライドするように調整
      const adjustedPosition = handleCollisionSlide(positionBeforeCollision, newPosition);
      newPosition.copy(adjustedPosition);
      
      // 衝突した方向の速度を0に
      if (Math.abs(newPosition.x - positionBeforeCollision.x) < 0.01) {
        newVelocity.x = 0;
      }
      if (Math.abs(newPosition.z - positionBeforeCollision.z) < 0.01) {
        newVelocity.z = 0;
      }
    }
    
    // 地面との衝突（より正確な計算）
    const groundY = physicsParams.groundLevel + 0.15;
    if (newPosition.y < groundY) {
      newPosition.y = groundY;
      newVelocity.y = 0;
      
      // 着地時にのみ状態を変更（バウンスを防止）
      if (!onGround) {
        setOnGround(true);
      }
    } else if (onGround && newPosition.y > groundY + 0.1) {
      // 地面から離れた場合
      setOnGround(false);
      debugInfo.current.lastGroundCheck = time;
      debugInfo.current.airTime = 0;
    }
    
    // アニメーション状態の更新（手動モード中はスキップ）
    if (!manualAnimationMode) {
      updateAnimationState();
    }
    
    // プレイヤーの位置と回転の更新
    setPosition(newPosition);
    setVelocity(newVelocity);
    playerRef.current.position.copy(newPosition);
    
    // カメラモードに基づく回転の設定（修正版）
    if (cameraMode !== 'firstPerson') {
      // 移動方向がある場合は、その方向にキャラクターを回転
      if (inputDir.lengthSq() > 0.1) {
        // 移動方向に基づいて回転（方向を反転して修正）
        const targetRotation = Math.atan2(-inputDir.x, -inputDir.z);
        // スムーズに回転させる
        const currentRotation = playerRef.current.rotation.y;
        const angleDiff = Math.atan2(Math.sin(targetRotation - currentRotation), Math.cos(targetRotation - currentRotation));
        playerRef.current.rotation.y += angleDiff * Math.min(delta * 10, 1.0);
      }
    }
  });
  
  // アニメーション状態の決定
  const updateAnimationState = () => {
    // 地上にいない場合はジャンプアニメーション
    if (!onGround) {
      setAnimationState('jumping');
      return;
    }
    
    // 入力状態に基づいてアニメーションを決定
    // 速度ではなく入力を優先することで、衝突時もアニメーションが継続する
    const hasMovementInput = inputs.forward || inputs.backward || inputs.left || inputs.right;
    
    if (!hasMovementInput) {
      // 移動入力がなければアイドル
      setAnimationState('idle');
    } else if (inputs.sprint) {
      // 走りの入力があれば走る
      setAnimationState('running');
    } else {
      // それ以外は歩く
      setAnimationState('walking');
    }
  };
  
  return null; // このコンポーネントは視覚的要素を持たない
}; 