import React, { useState, useEffect } from 'react';
import { usePlayerStore, useCameraStore } from '../Utils/stores';

export const UI: React.FC = () => {
  const { position, velocity, onGround, animationState, inputs } = usePlayerStore();
  const { cameraMode, pointerLocked } = useCameraStore();
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // デバッグUIのスタイル
  const debugStyle: React.CSSProperties = {
    position: 'absolute',
    top: '140px', // 位置を下げて上部のスコア表示と被らないように
    right: '10px', // 右側に表示
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '8px',
    borderRadius: '5px',
    fontFamily: 'monospace',
    fontSize: '9px', // フォントサイズをさらに小さく
    zIndex: 100,
    maxWidth: '200px',
    pointerEvents: 'none',
    border: '1px solid rgba(255, 50, 50, 0.5)',
  };
  
  // スマホサイズの場合のメディアクエリでチェック
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  // 画面サイズの監視
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640);
    };
    
    // 初期チェック
    checkScreenSize();
    
    // リサイズイベント登録
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // F3キーでデバッグ情報の表示/非表示を切り替え
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        // 開発環境でのみデバッグ情報を表示
        if (process.env.NODE_ENV === 'development') {
          setShowDebugInfo(prev => !prev);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // UIステータス表示文字列の生成
  const formatVector = (v: { x: number, y: number, z?: number }) => {
    if (v.z !== undefined) {
      return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
    }
    return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`;
  };
  
  // 操作説明文字列の生成
  const getControlHints = () => {
    if (!pointerLocked) {
      return 'クリックでゲーム開始';
    }
    
    // スマホサイズの場合は短縮版を返す
    if (isSmallScreen) {
      return `WASD:移動 Space:ジャンプ ESC:メニュー`;
    }
    
    return `WASD/矢印:移動 Space:ジャンプ Shift:ダッシュ V:カメラ切替 ESC:メニュー`;
  };
  
  // デバッグモードがオフの場合は何も表示しない
  if (!showDebugInfo) {
    return null;
  }
  
  // スマホサイズの場合は位置を調整
  const finalStyle = {
    ...debugStyle,
    ...(isSmallScreen && {
      top: '100px',
      right: '5px',
      maxWidth: '150px',
      padding: '5px',
    })
  };
  
  return (
    <>
      {/* デバッグ情報表示 */}
      <div style={finalStyle}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '3px', color: '#ff5555' }}>
          開発者情報
        </div>
        <div>Camera: {cameraMode}</div>
        <div>Pos: {formatVector(position)}</div>
        <div>Vel: {formatVector(velocity)}</div>
        <div>Ground: {onGround ? 'Yes' : 'No'}</div>
        <div>Anim: {animationState}</div>
        <div>
          Input: 
          {inputs.forward ? '↑' : ''}
          {inputs.backward ? '↓' : ''}
          {inputs.left ? '←' : ''}
          {inputs.right ? '→' : ''}
          {inputs.jump ? 'J' : ''}
        </div>
        <hr style={{ border: '1px solid rgba(255,50,50,0.3)', margin: '3px 0' }} />
        <div style={{ fontSize: '8px' }}>{getControlHints()}</div>
      </div>
    </>
  );
};

export default UI; 