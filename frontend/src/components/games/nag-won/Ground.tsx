'use client';

import React, { useMemo } from 'react';
import { Plane } from '@react-three/drei';
import * as THREE from 'three';
import { useGameSettingsStore } from './Utils/stores';

export default function Ground() {
  // 現在選択されているステージIDを取得
  const { selectedStageId } = useGameSettingsStore();
  
  // グリッドテクスチャを動的に生成
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    if (context) {
      // ステージに基づいて背景色とグリッド線の色を設定
      let backgroundColor = '#020206';
      let gridColor = '#101346';
      
      // ステージによって色を変更
      if (selectedStageId === 'forest') {
        backgroundColor = '#0a380a';
        gridColor = '#124a12';
      } else if (selectedStageId === 'volcano') {
        backgroundColor = '#2c0505';
        gridColor = '#4a1212';
      }
      
      // 背景を描画
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // グリッド線を描画
      const gridSize = 64;
      const lineWidth = 1;
      
      // グリッドラインの色
      context.strokeStyle = gridColor;
      context.lineWidth = lineWidth;
      
      // 垂直線
      for (let x = 0; x <= canvas.width; x += gridSize) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
      }
      
      // 水平線
      for (let y = 0; y <= canvas.height; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    
    return texture;
  }, [selectedStageId]); // ステージIDが変わったら再生成

  // ステージに基づいて色を設定
  const getGroundColor = () => {
    switch (selectedStageId) {
      case 'forest':
        return "#072507"; // 森林ステージ用の暗い緑
      case 'volcano':
        return "#1a0404"; // 火山ステージ用の暗い赤
      default:
        return "#050516"; // サイバーシティ用の暗い青
    }
  };

  // ステージに基づいて地面の高さを調整
  const getGroundPosition = () => {
    switch (selectedStageId) {
      case 'forest':
        return -0.15; // 森林ステージの地面を少し下げる
      case 'volcano':
        return -0.3; // 火山ステージの地面をさらに下げる（Z-fighting防止）
      default:
        return -0.1; // サイバーシティの標準高さ
    }
  };

  return (
    <Plane 
      args={[500, 500]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, getGroundPosition(), 0]} // ステージごとに地面を下げる
      receiveShadow
    >
      <meshStandardMaterial 
        map={gridTexture} 
        roughness={0.8}
        metalness={0.2}
        color={getGroundColor()}
      />
    </Plane>
  );
} 