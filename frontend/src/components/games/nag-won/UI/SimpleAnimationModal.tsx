'use client';

import React, { useState, useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

interface SimpleAnimationModalProps {
  isVisible: boolean;
  availableAnimations: string[];
  currentAnimation: string;
  onAnimationSelect: (animationName: string) => void;
  onClose: () => void;
}

// アニメーション表示名のマッピング
const getDisplayName = (animationName: string): string => {
  const name = animationName.toLowerCase();
  if (name.includes('idle')) return '🧘 待機';
  if (name.includes('walk')) return '🚶 歩行';
  if (name.includes('run')) return '🏃 走行';
  if (name.includes('jump')) return '🦘 ジャンプ';
  return `🎭 ${animationName}`;
};

export const SimpleAnimationModal: React.FC<SimpleAnimationModalProps> = ({
  isVisible,
  availableAnimations,
  currentAnimation,
  onAnimationSelect,
  onClose
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // モバイル判定
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileDevices = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i;
      setIsMobile(mobileDevices.test(userAgent) || window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // 選択されたアイテムを自動スクロール
  useEffect(() => {
    if (isVisible && selectedItemRef.current && listContainerRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [selectedIndex, isVisible]);

  // キーボード操作（デスクトップのみ）
  useEffect(() => {
    if (!isVisible || isMobile) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      event.preventDefault();
      
      switch (event.key) {
        case 'ArrowUp':
          setSelectedIndex(prev => {
            const animations = availableAnimations;
            const newIndex = prev === 0 ? animations.length - 1 : prev - 1;
            logger.debug(`⬆️ Arrow Up: ${prev} -> ${newIndex}`);
            return newIndex;
          });
          break;
        case 'ArrowDown':
          setSelectedIndex(prev => {
            const animations = availableAnimations;
            const newIndex = prev === animations.length - 1 ? 0 : prev + 1;
            logger.debug(`⬇️ Arrow Down: ${prev} -> ${newIndex}`);
            return newIndex;
          });
          break;
        case 'Enter':
          // refではなく現在のstateとpropsを直接使用して確実に最新の値を取得
          const currentSelectedIndex = selectedIndex;
          const animations = availableAnimations;
          const selectedAnimation = animations[currentSelectedIndex];
          logger.debug(`🎮 Keyboard selection - Index: ${currentSelectedIndex}, Animation: "${selectedAnimation}"`);
          logger.debug(`📝 Available animations:`, animations);
          
          if (selectedAnimation) {
            logger.debug(`✅ Calling onAnimationSelect with: "${selectedAnimation}"`);
            onAnimationSelect(selectedAnimation);
            onClose();
          } else {
            logger.warn(`❌ No animation found at index ${currentSelectedIndex}`);
          }
          break;
        case 'Escape':
        case 't':
        case 'T':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isVisible, isMobile, onAnimationSelect, onClose, selectedIndex, availableAnimations]);

  // 現在のアニメーションに合わせてインデックスを更新
  useEffect(() => {
    const currentIndex = availableAnimations.findIndex(anim => anim === currentAnimation);
    if (currentIndex !== -1) {
      setSelectedIndex(currentIndex);
    }
  }, [currentAnimation, availableAnimations]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 pointer-events-auto p-4">
        <div className="bg-gray-900/95 backdrop-blur-md border border-gray-600/50 rounded-lg shadow-2xl w-full max-w-md max-h-96 overflow-hidden">
          {/* ヘッダー */}
          <div className="p-3 border-b border-gray-600/30">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">🎭 アニメーション選択</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {isMobile 
                ? "タップして選択 | 🎭ボタンで閉じる"
                : "↑↓: 選択 | Enter: 決定 | T/Esc: 閉じる"
              }
            </div>
          </div>

          {/* アニメーションリスト */}
          <div ref={listContainerRef} className="max-h-60 overflow-y-auto">
            <div className="p-2">
              {availableAnimations.map((animation, index) => {
                const isSelected = index === selectedIndex;
                const isCurrent = animation === currentAnimation;

                return (
                  <div
                    key={animation}
                    ref={isSelected ? selectedItemRef : null}
                    onClick={() => {
                      logger.debug(`🖱️ Mouse click selection: "${animation}"`);
                      onAnimationSelect(animation);
                      onClose();
                    }}
                    className={`
                      ${isMobile ? 'p-4 m-2' : 'p-2 m-1'} rounded cursor-pointer transition-all duration-200 touch-manipulation
                      ${isSelected 
                        ? 'bg-blue-600/30 border border-blue-400/50 scale-105' 
                        : 'bg-gray-800/50 hover:bg-gray-700/50 active:bg-gray-600/50'
                      }
                      ${isCurrent ? 'ring-2 ring-yellow-400/50' : ''}
                      ${isMobile ? 'min-h-[60px] text-base' : 'text-sm'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-white ${isMobile ? 'text-base' : 'text-sm'}`}>
                        {getDisplayName(animation)}
                      </span>
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className={`text-yellow-400 ${isMobile ? 'text-sm' : 'text-xs'}`}>現在</span>
                        )}
                        {isSelected && (
                          <div className={`bg-blue-400 rounded-full animate-pulse ${isMobile ? 'w-3 h-3' : 'w-2 h-2'}`}></div>
                        )}
                      </div>
                    </div>
                    <div className={`text-gray-400 mt-1 ${isMobile ? 'text-sm' : 'text-xs'}`}>
                      {animation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* フッター */}
          <div className="p-2 border-t border-gray-600/30 bg-gray-800/30">
            <div className="text-center text-xs text-gray-400">
              {availableAnimations.length}個のアニメーションが利用可能
            </div>
          </div>
        </div>
      </div>
  );
};