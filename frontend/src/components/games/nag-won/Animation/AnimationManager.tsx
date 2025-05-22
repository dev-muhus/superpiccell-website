'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { useAnimations } from '@react-three/drei';
import { usePlayerStore } from '../Utils/stores';
import * as THREE from 'three';
import { AnimationConfig } from '../Utils/types';

interface AnimationManagerProps {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  config?: Partial<AnimationConfig>;
}

export const AnimationManager: React.FC<AnimationManagerProps> = ({
  scene,
  animations,
  config = {}
}) => {
  // アニメーション状態を取得
  const { animationState } = usePlayerStore();
  
  // drei の useAnimations フックを使用してアニメーションをセットアップ
  const { actions, mixer } = useAnimations(animations, scene);
  
  // 現在再生中のアニメーション
  const currentAnimation = useRef<string | null>(null);
  
  // アニメーションの設定（デフォルト値とユーザー設定のマージ）
  const animConfig: AnimationConfig = {
    // アニメーション名のマッピング（異なるモデル間での名前の違いを吸収）
    mappings: {
      'idle': ['Idle', 'idle', 'IDLE', 'idle_clip', 'idle01', 'Idle01'],
      'walking': ['Walk', 'walk', 'WALK', 'Walking', 'WalkForward', 'walk_clip'],
      'running': ['Run', 'run', 'RUN', 'Running', 'Sprint', 'sprint', 'run_clip'],
      'jumping': ['Jump', 'jump', 'JUMP', 'Jumping', 'jump_clip'],
    },
    // クラウチ状態を回避するアニメーション名のパターン
    avoidPatterns: ['crouch', 'crch', 'Crouch'],
    fadeDuration: 0.3,
    crossFade: true,
    ...config
  };
  
  // 利用可能なアクション名を取得
  const getActionNames = useCallback(() => Object.keys(actions || {}), [actions]);
  
  // 最適なアニメーションクリップを検索する関数
  const findBestMatchingAnimation = useCallback((type: string): string | null => {
    const candidates = animConfig.mappings[type] || [];
    const actionNames = getActionNames();
    const avoidPatterns = animConfig.avoidPatterns || [];
    
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
    
    // デフォルトに戻る（idleでなければidle状態を探す）
    if (type !== 'idle') {
      return findBestMatchingAnimation('idle');
    }
    
    // Idleが見つからない場合は最初のアニメーションを返す
    return actionNames[0] || null;
  }, [animConfig.mappings, animConfig.avoidPatterns, getActionNames]);
  
  // アニメーション切り替え関数
  const changeAnimation = useCallback((newState: string) => {
    if (!actions || Object.keys(actions).length === 0) {
      console.warn('アニメーション変更ができません: アクションが利用できません');
      return;
    }
    
    const animationName = findBestMatchingAnimation(newState);
    const actionNames = getActionNames();
    
    // アニメーションが見つからない場合
    if (!animationName) {
      console.warn(`アニメーション ${newState} に対応するものが見つかりません。利用可能なアニメーション:`, actionNames);
      
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
      
      // アニメーションを開始
      newAnim.reset().fadeIn(animConfig.fadeDuration).play();
      
      // ジャンプアニメーションの場合はループしない、それ以外はループする
      if (newState === 'jumping') {
        newAnim.loop = THREE.LoopOnce;
        newAnim.clampWhenFinished = true; // 最後のフレームで停止
      } else {
        newAnim.loop = THREE.LoopRepeat;
      }
      
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
  
  // アニメーション状態の変更を監視して更新
  useEffect(() => {
    if (actions && getActionNames().length > 0) {
      changeAnimation(animationState);
    }
  }, [actions, animationState, changeAnimation, getActionNames]);
  
  // モデルが変更された場合に実行される処理（animationsの参照が変わったとき）
  useEffect(() => {
    if (animations && animations.length > 0) {
      
      // アニメーションが利用可能になったら処理を行う
      if (actions && Object.keys(actions).length > 0) {
        
        // 少し遅延させてアニメーション初期化を確実に行う
        const timer = setTimeout(() => {
          changeAnimation(animationState);
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [animations, actions, changeAnimation, animationState]);
  
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
            idleAction.fadeIn(0.5).play();
            
            // ミキサーを強制更新
            if (mixer) {
              mixer.update(0);
            }
            
            currentAnimation.current = idleAnimation;
          } else {
            console.warn('初期アニメーションが見つかりませんでした');
          }
        } catch (err) {
          console.error('アニメーション適用中にエラー:', err);
        }
      }, 500);
      
      return () => clearTimeout(initTimer);
    } else {
      console.warn('アニメーションが見つかりません！モデルにアニメーションが含まれているか確認してください。');
    }
  }, [actions, mixer, animations, findBestMatchingAnimation, getActionNames]);
  
  return null; // このコンポーネントは視覚的要素を持たない
}; 