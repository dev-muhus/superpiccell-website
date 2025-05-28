'use client';

import React, { useEffect, useRef, useState } from 'react';

interface VirtualJoystickProps {
  size?: number;
  baseColor?: string;
  stickColor?: string;
  baseOpacity?: number;
  stickOpacity?: number;
  disabled?: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  size = 120,
  baseColor = '#4a5568',
  stickColor = '#3182ce',
  baseOpacity = 0.5,
  stickOpacity = 0.8,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [center, setCenter] = useState({ x: 0, y: 0 });
  // 未使用の変数を削除
  
  // 前回のキー状態を追跡するためのRef
  const previousKeysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false
  });
  
  // ジョイスティックの初期化
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCenter({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }
    
    // リサイズ時にセンター位置を更新（スロットリング付き）
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setCenter({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          });
        }
      }, 100); // 100ms のデバウンス
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);
  
  // タッチ操作の処理
  useEffect(() => {
    if (disabled) return;
    
    // タッチ開始時の処理
    const handleTouchStart = (e: TouchEvent) => {
      if (!containerRef.current) return;
      
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      
      // ジョイスティック内のタッチかを確認
      const touchX = touch.clientX;
      const touchY = touch.clientY;
      
      if (
        touchX >= rect.left && 
        touchX <= rect.right && 
        touchY >= rect.top && 
        touchY <= rect.bottom
      ) {
        setActive(true);
        updateJoystickPosition(touch.clientX, touch.clientY);
      }
    };
    
    // タッチ移動時の処理
    const handleTouchMove = (e: TouchEvent) => {
      if (active && e.touches.length > 0) {
        e.preventDefault(); // スクロール防止
        updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    // タッチ終了時の処理
    const handleTouchEnd = () => {
      if (active) {
        setActive(false);
        setPosition({ x: 0, y: 0 });
        resetKeyPresses();
      }
    };
    
    // キーイベントをシミュレート
    const simulateKeyEvent = (pressed: boolean, keyCode: string) => {
      const eventType = pressed ? 'keydown' : 'keyup';
      const event = new KeyboardEvent(eventType, { code: keyCode, bubbles: true });
      window.dispatchEvent(event);
    };
    
    // すべてのキーを離す
    const resetKeyPresses = () => {
      if (previousKeysRef.current.w) simulateKeyEvent(false, 'KeyW');
      if (previousKeysRef.current.a) simulateKeyEvent(false, 'KeyA');
      if (previousKeysRef.current.s) simulateKeyEvent(false, 'KeyS');
      if (previousKeysRef.current.d) simulateKeyEvent(false, 'KeyD');
      previousKeysRef.current = { w: false, a: false, s: false, d: false };
    };
    
    // 方向に基づいてキー入力をシミュレート
    const simulateKeyPresses = (normX: number, normY: number) => {
      const threshold = 0.5;
      
      // 新しいキー状態
      const newKeys = {
        w: normY < -threshold,
        a: normX < -threshold,
        s: normY > threshold,
        d: normX > threshold
      };
      
      // 前回と異なる場合のみイベントを発火
      if (newKeys.w !== previousKeysRef.current.w) {
        simulateKeyEvent(newKeys.w, 'KeyW');
      }
      if (newKeys.a !== previousKeysRef.current.a) {
        simulateKeyEvent(newKeys.a, 'KeyA');
      }
      if (newKeys.s !== previousKeysRef.current.s) {
        simulateKeyEvent(newKeys.s, 'KeyS');
      }
      if (newKeys.d !== previousKeysRef.current.d) {
        simulateKeyEvent(newKeys.d, 'KeyD');
      }
      
      // 状態を更新
      previousKeysRef.current = newKeys;
    };
    
    // ジョイスティックの位置を更新
    const updateJoystickPosition = (clientX: number, clientY: number) => {
      // ジョイスティックの中心からの距離を計算
      const deltaX = clientX - center.x;
      const deltaY = clientY - center.y;
      
      // 距離の計算
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 最大距離（ジョイスティックのサイズの半分）
      const maxDistance = size / 2;
      
      // 正規化された方向
      let normX = deltaX / distance;
      let normY = deltaY / distance;
      
      // NaNをチェック
      if (isNaN(normX)) normX = 0;
      if (isNaN(normY)) normY = 0;
      
      // 実際の位置（制限あり）
      const actualDistance = Math.min(distance, maxDistance);
      const posX = normX * actualDistance;
      const posY = normY * actualDistance;
      
      setPosition({ x: posX, y: posY });
      
      // 方向に基づいてキー入力をシミュレート
      simulateKeyPresses(normX, normY);
    };
    
    // イベントリスナーの登録
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      
      // コンポーネントアンマウント時にすべてのキーを離す
      resetKeyPresses();
    };
  }, [center, active, size, disabled]);
  
  if (disabled) return null;
  
  return (
    <div 
      ref={containerRef}
      className="absolute left-4 bottom-20 z-30 touch-manipulation"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: baseColor,
        opacity: baseOpacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none'
      }}
      data-joystick="virtual-joystick"
      data-ui-element="virtual-joystick"
    >
      <div
        style={{
          width: `${size * 0.5}px`,
          height: `${size * 0.5}px`,
          borderRadius: '50%',
          backgroundColor: stickColor,
          opacity: stickOpacity,
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: active ? 'none' : 'transform 0.2s ease-out',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}; 