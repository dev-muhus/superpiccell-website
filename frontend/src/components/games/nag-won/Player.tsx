'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import { usePlayerStore, useGameSettingsStore } from './Utils/stores';
import { CameraSystem } from './Controls/CameraSystem';
import { InputManager } from './Controls/InputManager';
import { MovementSystem } from './Controls/MovementSystem';
import { AnimationManager } from './Animation/AnimationManager';
import { Vector3 } from 'three';
import { AVATAR_MODELS, GAME_STAGES, createPlayerConfig } from './Utils/config';
import { useCollisionSystem } from './Utils/CollisionSystem';

// デフォルトモデルインデックス
const DEFAULT_MODEL_INDEX = 0;

// モデルのプリロード（パフォーマンス向上のため）
// すべてのモデルパスを予めプリロード対象として登録
AVATAR_MODELS.forEach(model => {
  // useGLTF.preloadはTS定義が不完全だが機能する
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  useGLTF.preload(model.path);
});

// プレイヤーコンポーネントのプロパティ
interface PlayerProps {
  onMove?: (position: Vector3) => void;
  modelId?: string; // オプションでモデルIDを指定可能
}

const Player: React.FC<PlayerProps> = ({ onMove, modelId }) => {
  // キャンバス要素への参照
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // プレイヤーオブジェクトへの参照
  const playerRef = useRef<THREE.Group>(null);
  
  // 衝突判定システム
  const { addCollisionObject, updateCollisionObject, checkCollisions } = useCollisionSystem();
  
  // 状態設定にアクセス
  const { setPosition } = usePlayerStore();
  
  // 現在選択されているステージIDを取得
  const { selectedStageId } = useGameSettingsStore();
  
  // 使用するモデルを決定（useMemoで安定化）
  const modelToUse = useMemo(() => {
    const foundModel = modelId 
      ? AVATAR_MODELS.find(model => model.id === modelId) 
      : null;
    return foundModel || AVATAR_MODELS[DEFAULT_MODEL_INDEX];
  }, [modelId]);
  
  // 現在のステージの初期位置を取得
  const stageInitialPosition = useMemo(() => {
    const currentStage = GAME_STAGES.find(stage => stage.id === selectedStageId);
    return currentStage?.initialPlayerPosition || new Vector3(0, 0.2, 0);
  }, [selectedStageId]);
  
  // プレイヤー設定を生成（useMemoで安定化）
  const playerConfig = useMemo(() => {
    const config = createPlayerConfig(modelToUse);
    // ステージに応じた初期位置を設定
    config.initialPosition = stageInitialPosition;
    return config;
  }, [modelToUse, stageInitialPosition]);
  
  // キャンバス要素へのアクセスを設定（一度だけ実行）
  useEffect(() => {
    canvasRef.current = document.querySelector('canvas');
  }, []);

  // 初期位置を設定
  useEffect(() => {
    setPosition(playerConfig.initialPosition);
    
    // プレイヤーオブジェクトが存在する場合は直接位置も設定
    if (playerRef.current) {
      playerRef.current.position.copy(playerConfig.initialPosition);
    }
  }, [setPosition, playerConfig.initialPosition]);
  
  // プレイヤー位置リセットイベントのリスナー
  useEffect(() => {
    const handlePlayerReset = () => {
      if (playerRef.current) {
        playerRef.current.position.copy(playerConfig.initialPosition);
        setPosition(playerConfig.initialPosition);
        console.log('Player position reset to:', playerConfig.initialPosition);
      }
    };
    
    window.addEventListener('player-reset', handlePlayerReset);
    
    return () => {
      window.removeEventListener('player-reset', handlePlayerReset);
    };
  }, [playerConfig.initialPosition, setPosition]);
  
  // モデルの読み込み - キーをmodelToUse.pathに設定して確実に更新されるようにする
  const { scene, animations } = useGLTF(modelToUse.path);
  
  // アニメーションの情報を確認（デバッグ用）
  useEffect(() => {
    if (animations.length > 0) {
      //
    } else {
      console.warn(`モデル ${modelToUse.name} にアニメーションが含まれていません`);
    }
  }, [animations, modelToUse.name]);
  
  // アニメーションデータの変更を追跡するためのキー
  const animationKey = useMemo(() => `${modelToUse.id}-${animations.length}`, [modelToUse.id, animations.length]);
  
  // シーンのクローンを作成（modelToUse.pathが変わった時のみ再計算）
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    return clone;
  }, [scene]);
  
  // モデルサイズの設定関数
  const setupModel = useCallback(() => {
    if (!playerRef.current) return;
    
    const group = playerRef.current;
    
    // モデルのスケール設定
    group.scale.set(
      playerConfig.scale, 
      playerConfig.scale, 
      playerConfig.scale
    );
    
    // Y軸方向の調整（地面に接するように）
    const positionWithOffset = playerConfig.initialPosition.clone();
    if (playerConfig.heightOffset) {
      positionWithOffset.y += playerConfig.heightOffset;
    }
    group.position.copy(positionWithOffset);
    
    // シャドウを有効化
    group.traverse((obj) => {
      if (obj.type === 'Mesh') {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [playerConfig]);

  // モデルサイズの設定（playerRefが変わった時、もしくはsetupModel関数が変わった時のみ実行）
  useEffect(() => {
    setupModel();
  }, [setupModel]);
  
  // プレイヤーの衝突判定オブジェクトを登録
  useEffect(() => {
    if (playerRef.current) {
      addCollisionObject({
        id: 'player',
        type: 'sphere',
        position: playerRef.current.position,
        size: new Vector3(0.5, 1.0, 0.5), // プレイヤーのサイズ
        layer: 'player'
      });
    }
  }, [addCollisionObject]);
  
  // 位置更新時のコールバック（playerRefが存在するときのみ実行）
  useEffect(() => {
    if (!onMove || !playerRef.current) return;
    
    let lastPosition = playerRef.current.position.clone();
    
    // 位置が変更されたときにのみonMoveコールバックを呼び出す
    const handlePositionChange = () => {
      if (playerRef.current) {
        const currentPosition = playerRef.current.position;
        // 位置が実際に変わった場合のみコールバックを呼び出す
        if (!currentPosition.equals(lastPosition)) {
          lastPosition = currentPosition.clone();
          
          // 衝突判定オブジェクトの位置を更新
          updateCollisionObject('player', currentPosition);
          
          // 衝突判定をチェック（より頻繁に）
          const collisions = checkCollisions('player');
          if (collisions.length > 0) {
            console.log('Player collision detected with:', collisions.map(c => c.distance));
          }
          
          onMove(currentPosition);
        }
      }
    };
    
    // より頻繁にチェック（60FPS想定）
    const interval = setInterval(handlePositionChange, 16);
    
    return () => {
      clearInterval(interval);
    };
  }, [onMove, updateCollisionObject, checkCollisions]);
  
  return (
    <>
      {/* 入力管理システム */}
      {canvasRef.current && <InputManager canvasRef={canvasRef} />}
      
      {/* プレイヤーモデル */}
      <group ref={playerRef}>
        <primitive object={clonedScene} />
      </group>
      
      {/* アニメーション管理システム - keyプロパティを追加してアバター変更時に強制的に再マウント */}
      {animations.length > 0 && playerRef.current && (
        <AnimationManager 
          key={animationKey}
          scene={playerRef.current}
          animations={animations}
          config={{
            fadeDuration: 0.2,
            crossFade: true,
            mappings: {
              'idle': ['Idle 01', 'Idle', 'idle', 'IDLE', 'Stand', 'stand', 'STAND', 'A_idle_01', 'idle_a', 'Wait', 'wait', 'A_Idle_01'],
              'walking': ['Walk 01', 'Walk', 'walk', 'WALK', 'Walking', 'walking', 'A_walk_01', 'walk_f', 'A_Walk_01'],
              'running': ['Run 01', 'Run', 'run', 'RUN', 'Running', 'Sprint', 'sprint', 'A_run_01', 'run_forward', 'A_Run_01'],
              'jumping': ['Jump 01', 'Jump', 'jump', 'JUMP', 'Jumping', 'jumping', 'A_jump_01', 'A_Jump_01'],
            }
          }}
        />
      )}
      
      {/* カメラ制御システム */}
      {playerRef.current && <CameraSystem target={playerRef} />}
      
      {/* 移動制御システム */}
      {playerRef.current && (
        <MovementSystem 
          playerRef={playerRef}
          config={{
            gravity: 9.8,
            jumpForce: 5.0,
            walkSpeed: 4.0,
            runSpeed: 8.0,
            airControl: 0.3,
            groundFriction: 0.8,
            airFriction: 0.05,
            groundLevel: 0.0,
            characterHeight: playerConfig.height,
          }}
        />
      )}
    </>
  );
};

export default Player; 