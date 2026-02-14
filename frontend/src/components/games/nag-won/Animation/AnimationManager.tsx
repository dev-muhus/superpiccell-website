'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useAnimations } from '@react-three/drei';
import { usePlayerStore } from '../Utils/stores';
import * as THREE from 'three';
import { AnimationConfig } from '../Utils/types';
import { ANIMATION_CONFIG } from '../Utils/gltfValidator';
import { logger } from '@/utils/logger';

interface AnimationManagerProps {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  config?: Partial<AnimationConfig>;
  manualAnimationMode?: boolean;
}

export interface AnimationManagerRef {
  playAnimation: (animationName: string) => boolean;
  getCurrentAnimation: () => string | null;
  getAvailableAnimations: () => string[];
}

export const AnimationManager = forwardRef<AnimationManagerRef, AnimationManagerProps>(({
  scene,
  animations,
  config = {},
  manualAnimationMode = false
}, ref) => {
  // アニメーション状態を取得
  const { animationState } = usePlayerStore();
  
  // drei の useAnimations フックを使用してアニメーションをセットアップ
  const { actions, mixer } = useAnimations(animations, scene);
  
  // 現在再生中のアニメーション
  const currentAnimation = useRef<string | null>(null);
  
  // アニメーションの設定（gltfValidatorから取得し、ユーザー設定でオーバーライド）
  const animConfig: AnimationConfig = {
    mappings: {
      idle: [...ANIMATION_CONFIG.mappings.idle],
      walking: [...ANIMATION_CONFIG.mappings.walking],
      running: [...ANIMATION_CONFIG.mappings.running],
      jumping: [...ANIMATION_CONFIG.mappings.jumping]
    },
    avoidPatterns: [...ANIMATION_CONFIG.avoidPatterns],
    fadeDuration: ANIMATION_CONFIG.fadeDuration,
    crossFade: ANIMATION_CONFIG.crossFade,
    ...config
  };
  
  // 利用可能なアクション名を取得
  const getActionNames = useCallback(() => Object.keys(actions || {}), [actions]);
  
  // 最適なアニメーションクリップを検索する関数
  const findBestMatchingAnimation = useCallback((startType: string): string | null => {
    const actionNames = getActionNames();
    const avoidPatterns = animConfig.avoidPatterns || [];
    
    // 検索ロジックをループで実行して再帰を回避
    let type = startType;
    // 最大2回試行（指定タイプ -> idle）
    for (let i = 0; i < 2; i++) {
        // 0. まず直接のアニメーション名として存在するかチェック
        if (actionNames.includes(type)) {
          logger.animation(`🎯 Direct animation name match found: "${type}"`);
          return type;
        }
        
        const candidates = animConfig.mappings[type] || [];
        
        // 1. 優先的に使用するアニメーション（完全一致）
        for (const candidate of candidates) {
          const exactMatch = actionNames.find(name => name === candidate);
          if (exactMatch) return exactMatch;
        }
        
        // 2. クラウチ等の避けるべきアニメーションを除外したリストを作成
        const filteredNames = actionNames.filter(name => 
          !avoidPatterns.some(pattern => 
            name.toLowerCase().includes(pattern.toLowerCase())
          )
        );
        
        // 3. 部分一致で検索（除外パターンを避ける）
        for (const candidate of candidates) {
          const partialMatch = filteredNames.find(name => 
            name.toLowerCase().includes(candidate.toLowerCase())
          );
          if (partialMatch) return partialMatch;
        }
        
        // 4. 単語の最初の部分だけ一致で検索（除外パターンを避ける）
        for (const candidate of candidates) {
          const wordStartMatch = filteredNames.find(name => 
            name.toLowerCase().startsWith(candidate.toLowerCase())
          );
          if (wordStartMatch) return wordStartMatch;
        }
        
        // 5. 最後の手段として、通常のリストから選択
        for (const candidate of candidates) {
          const lastResortMatch = actionNames.find(name => 
            name.toLowerCase().includes(candidate.toLowerCase())
          );
          if (lastResortMatch) return lastResortMatch;
        }

        // ここまで見つからず、かつ現在の検索タイプがidleでない場合、次はidleで検索
        if (type !== 'idle') {
            type = 'idle';
            continue; // 次の反復へ
        } else {
            break; // idleでも見つからなければ終了
        }
    }
    
    // Idleが見つからない場合は最初のアニメーションを返す
    return actionNames[0] || null;
  }, [animConfig.mappings, animConfig.avoidPatterns, getActionNames]);
  
  // アニメーション切り替え関数
  const changeAnimation = useCallback((newState: string) => {
    logger.animation(`🎬 AnimationManager: Attempting to change to "${newState}"`);
    
    if (!actions || Object.keys(actions).length === 0) {
      logger.warn('アニメーション変更ができません: アクションが利用できません');
      return;
    }
    
    const animationName = findBestMatchingAnimation(newState);
    const actionNames = getActionNames();
    
    logger.animation(`🔍 Found animation mapping: "${newState}" -> "${animationName}"`);
    logger.animation(`📋 Available actions:`, actionNames);
    
    // アニメーションが見つからない場合
    if (!animationName) {
      logger.warn(`アニメーション ${newState} に対応するものが見つかりません。利用可能なアニメーション:`, actionNames);
      
      // どんなアニメーションでも良いので最初のものを使用
      if (actionNames.length > 0 && !currentAnimation.current) {
        const firstAnim = actionNames[0];
        const action = actions[firstAnim];
        if (action) {
          action.reset().play();
          currentAnimation.current = firstAnim;
        }
      }
      return;
    }
    
    // 同じアニメーションの場合は何もしない
    if (animationName === currentAnimation.current) {
      return;
    }
    
    // 前のアニメーションを停止
    const currentAnim = currentAnimation.current;
    if (currentAnim && actions[currentAnim]) {
      actions[currentAnim].fadeOut(animConfig.fadeDuration);
    }
    
    // 新しいアニメーションを開始
    const newAnim = actions[animationName];
    if (newAnim) {
      // ミキサーの更新を確認
      if (mixer) {
        mixer.update(0); // ミキサーを強制更新
      }
      
      // ループ設定を先に行う（play()前に設定）
      if (newState === 'jumping') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks, react-hooks/immutability
        (newAnim as any).loop = THREE.LoopOnce;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, react-hooks/immutability
        (newAnim as any).clampWhenFinished = true; // 最後のフレームで停止
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newAnim as any).loop = THREE.LoopRepeat;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newAnim as any).clampWhenFinished = false;
      }
      
      // アニメーションを開始
      newAnim.reset().fadeIn(animConfig.fadeDuration).play();
      
      currentAnimation.current = animationName;
    }
  }, [actions, mixer, animConfig.fadeDuration, findBestMatchingAnimation, getActionNames]);

  // コンポーネントがマウントされたときに一度だけ初期アニメーションの情報をログ出力
  useEffect(() => {
    // すべてのアニメーションを一度停止（初期化時）
    if (actions) {
      Object.values(actions).forEach(action => {
        if (action) action.stop();
      });
    }
    
    // 現在のアニメーション参照をリセット
    currentAnimation.current = null;
    
    // コンポーネントのアンマウント時に全アニメーションを停止
    return () => {
      if (actions) {
        Object.values(actions).forEach(action => {
          if (action) action.stop();
        });
      }
    };
  }, [actions, animations.length, getActionNames]);
  
  // アニメーション状態の変更を監視して更新（手動モード中はスキップ）
  useEffect(() => {
    if (actions && getActionNames().length > 0 && !manualAnimationMode) {
      changeAnimation(animationState);
    }
  }, [actions, animationState, changeAnimation, getActionNames, manualAnimationMode]);
  
  // モデルが変更された場合に実行される処理（animationsの参照が変わったとき）
  useEffect(() => {
    if (animations && animations.length > 0) {
      
      // アニメーションが利用可能になったら処理を行う
      if (actions && Object.keys(actions).length > 0) {
        
        // 少し遅延させてアニメーション初期化を確実に行う（手動モード中はスキップ）
        const timer = setTimeout(() => {
          if (!manualAnimationMode) {
            changeAnimation(animationState);
          }
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [animations, actions, changeAnimation, animationState, manualAnimationMode]);
  
  // デバッグ：利用可能なアニメーション一覧をコンソールに表示
  useEffect(() => {
    const actionNames = getActionNames();
    
    if (actionNames.length > 0) {
      // 初期アニメーションを強制的に開始
      const initTimer = setTimeout(() => {
        try {
          // アニメーションを適用
          const idleAnimation = findBestMatchingAnimation('idle');
          if (idleAnimation && actions[idleAnimation]) {
            // すべてのアニメーションを一時停止
            Object.values(actions).forEach(action => {
              if (action) action.stop();
            });
            
            // idleアニメーションを開始
            const idleAction = actions[idleAnimation];
            idleAction.reset();
            idleAction.setEffectiveTimeScale(1);
            idleAction.setEffectiveWeight(1);
            
            // ループ設定（play()前に設定）
            idleAction.loop = THREE.LoopRepeat;
            idleAction.clampWhenFinished = false;
            
            idleAction.fadeIn(0.5).play();
            
            // ミキサーを強制更新
            if (mixer) {
              mixer.update(0);
            }
            
            currentAnimation.current = idleAnimation;
          } else {
            logger.warn('初期アニメーションが見つかりませんでした');
          }
        } catch (err) {
          logger.error('アニメーション適用中にエラー:', err);
        }
      }, 500);
      
      return () => clearTimeout(initTimer);
    } else {
      logger.warn('アニメーションが見つかりません！モデルにアニメーションが含まれているか確認してください。');
    }
  }, [actions, mixer, animations, findBestMatchingAnimation, getActionNames]);

  // 外部からアクセス可能なメソッドを定義
  useImperativeHandle(ref, () => ({
    playAnimation: (animationName: string): boolean => {
      logger.animation(`🎭 Direct playAnimation called with: "${animationName}"`);
      
      if (!actions || Object.keys(actions).length === 0) {
        logger.warn('❌ Actions not available for direct animation');
        return false;
      }
      
      const actionNames = getActionNames();
      logger.animation(`📋 Available actions for direct play:`, actionNames);
      
      // 直接のアニメーション名として存在するかチェック
      if (actionNames.includes(animationName)) {
        try {
          // すべてのアニメーションを停止
          Object.values(actions).forEach(action => {
            if (action) action.stop();
          });
          
          // 指定されたアニメーションを再生
          const targetAction = actions[animationName];
          if (targetAction) {
            targetAction.reset();
            targetAction.setEffectiveTimeScale(1);
            targetAction.setEffectiveWeight(1);
            
            // 手動選択されたアニメーションは常にループさせる（play()前に設定）
            targetAction.loop = THREE.LoopRepeat;
            targetAction.clampWhenFinished = false;
            
            targetAction.fadeIn(0.2).play();
            
            // ミキサーを更新
            if (mixer) {
              mixer.update(0);
            }
            
            currentAnimation.current = animationName;
            logger.animation(`✅ Direct animation "${animationName}" started successfully with looping`);
            return true;
          }
        } catch (error) {
          logger.error(`❌ Error playing animation "${animationName}":`, error);
          return false;
        }
      } else {
        logger.warn(`❌ Animation "${animationName}" not found in available actions`);
        return false;
      }
      
      return false;
    },
    
    getCurrentAnimation: (): string | null => {
      return currentAnimation.current;
    },
    
    getAvailableAnimations: (): string[] => {
      return getActionNames();
    }
  }), [actions, mixer, getActionNames]);
  
  return null; // このコンポーネントは視覚的要素を持たない
});

AnimationManager.displayName = 'AnimationManager'; 