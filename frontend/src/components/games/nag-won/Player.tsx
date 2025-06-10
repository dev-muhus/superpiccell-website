'use client';

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { usePlayerStore, useGameSettingsStore, getSelectedAvatar } from './Utils/stores';
import { CameraSystem } from './Controls/CameraSystem';
import { InputManager } from './Controls/InputManager';
import { MovementSystem } from './Controls/MovementSystem';
import { AnimationManager, AnimationManagerRef } from './Animation/AnimationManager';
import { Vector3 } from 'three';
import { AVATAR_MODELS, GAME_STAGES } from './Utils/config';
import { useCollisionSystem } from './Utils/CollisionSystem';
import { ANIMATION_CONFIG } from './Utils/gltfValidator';
import { LocalAvatarConfig } from './Utils/avatarTypes';
import { logger } from '@/utils/logger';

// デフォルトモデルインデックス
const DEFAULT_MODEL_INDEX = 0;

// アニメーション監視システムの型定義
interface AnimationMonitor {
  onAnimationChange: (from: string, to: string) => void;
  trackAnimationPerformance: () => void;
  detectAnimationErrors: () => AnimationError[];
  attemptAnimationRepair: (error: AnimationError) => boolean;
}

interface AnimationError {
  type: 'missing' | 'corrupted' | 'performance' | 'compatibility';
  animationName: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  canAutoRepair: boolean;
}

// AnimationPerformanceMetrics interface removed - not needed for this implementation

// AnimationDebugInfo interface removed - not needed for this implementation

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
  onAnimationInfoUpdate?: (animations: string[], current: string) => void;
}

const Player: React.FC<PlayerProps> = ({ onMove, modelId, onAnimationInfoUpdate }) => {
  // キャンバス要素への参照
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // プレイヤーオブジェクトへの参照
  const playerRef = useRef<THREE.Group>(null);
  
  // 衝突判定システム
  const { addCollisionObject, updateCollisionObject, checkCollisions } = useCollisionSystem();
  
  // 状態設定にアクセス
  const { setPosition } = usePlayerStore();
  
  // ゲーム設定ストアからアバター情報を取得
  const gameSettingsState = useGameSettingsStore();
  const { selectedStageId } = gameSettingsState;

  // 🎭 アニメーション監視・動作保証システム
  const [animationMonitor] = useState<AnimationMonitor | null>(null);
  const [currentAnimationState, setCurrentAnimationState] = useState<string>('idle');
  const [loadError, setLoadError] = useState(false);
  
  // 🎯 手動アニメーション選択システム
  const [manualAnimationMode, setManualAnimationMode] = useState(false);
  const animationManagerRef = useRef<AnimationManagerRef>(null);
  
  // 🎮 使用するアバターを決定（ローカル・デフォルト両対応）
  type AvatarWithType = (LocalAvatarConfig & { type: 'local' }) | (typeof AVATAR_MODELS[0] & { type: 'default' });
  
  const [currentAvatar, setCurrentAvatar] = useState<AvatarWithType>(() => {
    // 初期値としてデフォルトアバターを設定
    return { ...AVATAR_MODELS[DEFAULT_MODEL_INDEX], type: 'default' as const } as AvatarWithType;
  });

  // アバター選択の変更を監視して非同期でアバターを読み込み
  useEffect(() => {
    const loadSelectedAvatar = async () => {
      try {
        // modelIdが指定されている場合はそれを優先
        if (modelId) {
          const foundModel = AVATAR_MODELS.find(model => model.id === modelId);
          if (foundModel) {
            setCurrentAvatar({ ...foundModel, type: 'default' as const });
            return;
          }
        }
        
        // 選択されたアバターを非同期で取得
        const selectedAvatar = await getSelectedAvatar(gameSettingsState);
        
        // ローカルアバターの場合はそのまま設定（既にtype: 'local'を持っている）
        if ('type' in selectedAvatar && selectedAvatar.type === 'local') {
          setCurrentAvatar(selectedAvatar as AvatarWithType);
        } else {
          // デフォルトアバターの場合はtype識別子を追加
          const defaultAvatar = selectedAvatar as typeof AVATAR_MODELS[0];
          setCurrentAvatar({ ...defaultAvatar, type: 'default' as const } as AvatarWithType);
        }
      } catch (error) {
        logger.error('アバター読み込み中にエラー:', error);
        // エラー時はデフォルトアバターにフォールバック
        setCurrentAvatar({ ...AVATAR_MODELS[DEFAULT_MODEL_INDEX], type: 'default' as const } as AvatarWithType);
      }
    };

    loadSelectedAvatar();
  }, [modelId, gameSettingsState]);

  
  // 現在のステージの初期位置を取得
  const stageInitialPosition = useMemo(() => {
    const currentStage = GAME_STAGES.find(stage => stage.id === selectedStageId);
    return currentStage?.initialPlayerPosition || new Vector3(0, 0.2, 0);
  }, [selectedStageId]);
  
  // 🎯 プレイヤー設定を生成（ローカルアバター対応）
  const playerConfig = useMemo(() => {
    // ローカルアバター用のベース設定
    const baseConfig = {
      scale: currentAvatar.scale || 0.1,
      height: 0.2,
      initialPosition: stageInitialPosition,
      collisionOffset: 0.1,
      heightOffset: currentAvatar.heightOffset || 0.0
    };
    
    return baseConfig;
  }, [currentAvatar, stageInitialPosition]);
  
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
        logger.debug('Player position reset to:', playerConfig.initialPosition);
      }
    };
    
    window.addEventListener('player-reset', handlePlayerReset);
    
    return () => {
      window.removeEventListener('player-reset', handlePlayerReset);
    };
  }, [playerConfig.initialPosition, setPosition]);
  
  // 🎬 モデルの読み込み（エラーハンドリング付き）
  // 安全なモデルパス（常に有効なパスを保証）
  const safeModelPath = useMemo(() => {
    if (currentAvatar.type === 'local') {
      if (currentAvatar.blobUrl && currentAvatar.blobUrl.startsWith('blob:')) {
        return currentAvatar.blobUrl;
      } else {
        // 無効なBlob URLの場合はデフォルトにフォールバック
        logger.warn('Invalid blob URL, using fallback avatar');
        setLoadError(true);
        return AVATAR_MODELS[DEFAULT_MODEL_INDEX].path;
      }
    }
    
    // デフォルトアバターの場合：通常のパス
    return 'path' in currentAvatar ? currentAvatar.path : AVATAR_MODELS[DEFAULT_MODEL_INDEX].path;
  }, [currentAvatar]);

  // GLTFロード（常に有効なパスを使用）
  const { scene, animations } = useGLTF(safeModelPath);
  const fallbackGltf = useGLTF(AVATAR_MODELS[DEFAULT_MODEL_INDEX].path);
  
  // GLTFロードエラーを監視（sceneやanimationsの状態で判定）
  useEffect(() => {
    if (currentAvatar.type === 'local' && (!scene || !animations)) {
      logger.warn('Local avatar failed to load properly, may switch to fallback');
    }
  }, [scene, animations, currentAvatar.type]);
  
  // 🎭 アニメーション動作保証システム
  const animationSystem = useMemo(() => {
    if (!animations || animations.length === 0) return null;
    
    return {
      // 全アニメーション動作検証
      validateAllAnimations: async (): Promise<boolean> => {
        const requiredTypes = Object.keys(ANIMATION_CONFIG.mappings);
        const availableAnimations = animations.map(clip => clip.name);
        
        for (const type of requiredTypes) {
          const mappings = ANIMATION_CONFIG.mappings[type as keyof typeof ANIMATION_CONFIG.mappings];
          const hasCompatibleAnimation = mappings?.some(name => 
            availableAnimations.includes(name)
          );
          
          if (!hasCompatibleAnimation) {
            logger.warn(`Missing animation type: ${type}`, {
              required: mappings,
              available: availableAnimations
            });
            return false;
          }
        }
        
        return true;
      },
      
      // アニメーション切り替え監視
      monitorAnimationChanges: (newAnimation: string) => {
        logger.debug(`Animation changed: ${currentAnimationState} → ${newAnimation}`);
        setCurrentAnimationState(newAnimation);
        
        // パフォーマンス監視
        if (animationMonitor) {
          animationMonitor.onAnimationChange(currentAnimationState, newAnimation);
        }
      },
      
      // フォールバック機能
      fallbackToDefaultAnimation: (failedAnimationType: string) => {
        logger.warn(`Animation fallback triggered for: ${failedAnimationType}`);
        
        // デフォルトアバターのアニメーションにフォールバック
        if (currentAvatar.type === 'local') {
          logger.debug('Switching to default avatar due to animation failure');
          setLoadError(true);
        }
      }
    };
  }, [animations, currentAnimationState, animationMonitor, currentAvatar]);

  // 🔍 アニメーション情報確認・デバッグ情報更新
  useEffect(() => {
    const availableAnimations = animations.map(clip => clip.name);
    
    if (animations.length > 0) {
      // アニメーション検証
      if (animationSystem) {
        animationSystem.validateAllAnimations().then(isValid => {
          if (!isValid && currentAvatar.type === 'local') {
            logger.error('Local avatar animations validation failed');
            setLoadError(true);
          }
        });
      }
      
      // アニメーション情報確認完了
      logger.info(`Animation system ready with ${availableAnimations.length} animations`);
      
      // アニメーション情報を親コンポーネントに送信
      if (onAnimationInfoUpdate) {
        onAnimationInfoUpdate(availableAnimations, currentAnimationState);
      }
    } else {
      logger.warn(`モデル ${currentAvatar.name} にアニメーションが含まれていません`);
      
      // ローカルアバターでアニメーションがない場合はエラーとして扱う
      if (currentAvatar.type === 'local') {
        setLoadError(true);
      }
    }
  }, [animations, currentAvatar, animationSystem, currentAnimationState, onAnimationInfoUpdate]);
  
  // アニメーションデータの変更を追跡するためのキー
  const animationKey = useMemo(() => {
    const avatarId = currentAvatar.id;
    return `${avatarId}-${animations.length}-${currentAvatar.type}`;
  }, [currentAvatar, animations.length]);

  // 🎮 ゲーム内アニメーション制御統合
  useEffect(() => {
    // 既存のAnimationManagerとの統合
    const handleAnimationRequest = (event: CustomEvent<string>) => {
      const animationType = event.detail;
      if (animationSystem) {
        animationSystem.monitorAnimationChanges(animationType);
      }
    };
    
    // ゲーム内イベントリスナー設定
    window.addEventListener('game:requestAnimation', handleAnimationRequest as EventListener);
    
    return () => {
      window.removeEventListener('game:requestAnimation', handleAnimationRequest as EventListener);
    };
  }, [animationSystem]);
  

  // 🎭 手動アニメーション選択イベントのリスナー（直接制御版）
  useEffect(() => {
    const handleManualAnimationSelect = (event: CustomEvent<string>) => {
      const animationName = event.detail;
      logger.animation(`🎭 Manual animation selected: ${animationName}`);
      
      // AnimationManagerに直接アニメーション再生を指示
      if (animationManagerRef.current) {
        const success = animationManagerRef.current.playAnimation(animationName);
        if (success) {
          logger.animation(`✅ Animation "${animationName}" started successfully via direct control`);
          setManualAnimationMode(true);
          
          // usePlayerStoreも更新（MovementSystemとの整合性のため）
          const { setAnimationState } = usePlayerStore.getState();
          setAnimationState(animationName);
        } else {
          logger.error(`❌ Failed to start animation "${animationName}" via direct control`);
        }
      } else {
        logger.error('❌ AnimationManager ref not available');
        
        // フォールバック: 従来の方法
        logger.info('🔄 Falling back to usePlayerStore method');
        const { setAnimationState } = usePlayerStore.getState();
        setAnimationState(animationName);
        setManualAnimationMode(true);
      }
    };

    window.addEventListener('game:manualAnimationSelect', handleManualAnimationSelect as EventListener);
    
    return () => {
      window.removeEventListener('game:manualAnimationSelect', handleManualAnimationSelect as EventListener);
    };
  }, []);

  // 🔄 移動開始時に自動モードに復帰
  const { inputs } = usePlayerStore();
  useEffect(() => {
    if (manualAnimationMode) {
      // WASDキーまたはスペースキーが押されたら自動モードに復帰
      const hasMovementInput = inputs.forward || inputs.backward || inputs.left || inputs.right || inputs.jump;
      if (hasMovementInput) {
        logger.debug('🔄 Movement detected, returning to automatic animation mode');
        setManualAnimationMode(false);
      }
    }
  }, [inputs, manualAnimationMode]);
  
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
            logger.debug('Player collision detected with:', collisions.map(c => c.distance));
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
  
  // フォールバック用デフォルトアバター表示
  if (loadError) {
    return (
      <>
        {/* フォールバックアバター */}
        <group ref={playerRef}>
          <primitive object={fallbackGltf.scene} />
        </group>
        
        {/* エラー表示 */}
        <Html position={[0, 2, 0]}>
          <div className="bg-red-900 bg-opacity-75 text-white p-2 rounded text-xs text-center">
            <div>⚠️ アバター読み込みエラー</div>
            <div>デフォルトアバターを使用中</div>
          </div>
        </Html>
        
        {/* 基本システム */}
        {canvasRef.current && <InputManager canvasRef={canvasRef} />}
        {playerRef.current && <CameraSystem target={playerRef} />}
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
  }

  return (
    <>
      {/* 入力管理システム */}
      {canvasRef.current && <InputManager canvasRef={canvasRef} />}
      
      {/* 🎭 プレイヤーモデル（拡張スケール対応） */}
      <group 
        ref={playerRef} 
        scale={[playerConfig.scale, playerConfig.scale, playerConfig.scale]}
        position={[0, playerConfig.heightOffset, 0]}
      >
        <primitive object={clonedScene} />
      </group>
      
      {/* 🎬 アニメーション管理システム（設定参照版） */}
      {animations.length > 0 && playerRef.current && (
        <AnimationManager 
          ref={animationManagerRef}
          key={animationKey}
          scene={playerRef.current}
          animations={animations}
          manualAnimationMode={manualAnimationMode}
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
          manualAnimationMode={manualAnimationMode}
        />
      )}
    </>
  );
};

export default Player; 