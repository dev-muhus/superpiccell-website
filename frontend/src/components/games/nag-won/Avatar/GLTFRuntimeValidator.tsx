'use client';

import React, { useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { AvatarValidationResult } from '../Utils/avatarTypes';
import { ANIMATION_CONFIG } from '../Utils/gltfValidator';

interface GLTFRuntimeValidatorProps {
  fileUrl: string;
  onValidationComplete: (result: AvatarValidationResult) => void;
}

// ランタイムGLTF検証コンポーネント（Three.jsコンテキスト内で動作）
export const GLTFRuntimeValidator: React.FC<GLTFRuntimeValidatorProps> = ({
  fileUrl,
  onValidationComplete
}) => {
  const [, setIsValidating] = useState(true);

  // useGLTFフックでファイルを実際に読み込み
  const { scene, animations } = useGLTF(fileUrl);

  useEffect(() => {
    if (scene && animations !== undefined) {
      // 実際のアニメーション検証を実行
      const validationResult = validateAnimations(animations);
      onValidationComplete(validationResult);
      setIsValidating(false);
    }
  }, [scene, animations, onValidationComplete]);

  // レンダリングは不要（検証のみ）
  return null;
};

// アニメーション検証関数
function validateAnimations(animations: THREE.AnimationClip[]): AvatarValidationResult {
  const availableAnimations = animations.map(clip => clip.name).filter(name => name && name.trim().length > 0);
  const requiredAnimations = Object.keys(ANIMATION_CONFIG.mappings);
  const missingAnimations: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // 基本的なアニメーション存在チェック
  if (animations.length === 0) {
    errors.push('このファイルにはアニメーションが含まれていません');
    return {
      isValid: false,
      hasRequiredAnimations: false,
      availableAnimations: [],
      missingAnimations: requiredAnimations,
      errors,
      fileSize: 0
    };
  }

  // 必須アニメーションの存在確認
  for (const requiredType of requiredAnimations) {
    const expectedNames = ANIMATION_CONFIG.mappings[requiredType as keyof typeof ANIMATION_CONFIG.mappings];
    const hasCompatibleAnimation = expectedNames?.some(expectedName => 
      availableAnimations.some(available => 
        available.toLowerCase().includes(expectedName.toLowerCase()) &&
        !ANIMATION_CONFIG.avoidPatterns.some(avoid => 
          available.toLowerCase().includes(avoid.toLowerCase())
        )
      )
    );

    if (!hasCompatibleAnimation) {
      missingAnimations.push(requiredType);
    }
  }

  // 結果判定
  const hasRequiredAnimations = missingAnimations.length === 0;
  
  if (!hasRequiredAnimations) {
    errors.push(`必須アニメーションが不足しています: ${missingAnimations.join(', ')}`);
    errors.push('アバターファイルには以下のアニメーションが必要です: idle, walking, running, jumping');
  }

  // アニメーション品質の基本チェック
  const shortAnimations = animations.filter(clip => clip.duration < 0.5);
  if (shortAnimations.length > 0) {
    warnings.push(`短すぎるアニメーション: ${shortAnimations.map(a => a.name).join(', ')}`);
  }

  const tracklessAnimations = animations.filter(clip => !clip.tracks || clip.tracks.length === 0);
  if (tracklessAnimations.length > 0) {
    warnings.push(`トラックのないアニメーション: ${tracklessAnimations.map(a => a.name).join(', ')}`);
  }

  return {
    isValid: hasRequiredAnimations && errors.length === 0,
    hasRequiredAnimations,
    availableAnimations,
    missingAnimations,
    errors,
    warnings,
    fileSize: 0,
    qualityScore: hasRequiredAnimations ? (warnings.length === 0 ? 95 : 75) : 25
  };
}

// useGLTFのpreload機能を使用してファイルを事前検証する関数
export async function preValidateGLTF(fileUrl: string): Promise<boolean> {
  try {
    // ファイルのpreloadを試行
    useGLTF.preload(fileUrl);
    return true;
  } catch (error) {
    console.error('GLTF preload failed:', error);
    return false;
  }
}