import React from 'react';
import { Environment } from './Environment';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

// モジュールのエクスポート
import CyberCityComponent, { cityBuildingsData } from './CyberCity';
import ForestWorldComponent, { forestTreesData, forestRocksData } from './ForestWorld';
import VolcanoWorldComponent, { volcanoRocksData, volcanoObjectsData, volcanoLavaFlowsData } from './VolcanoWorld';

// 型情報とともに再エクスポート
export const CyberCity = CyberCityComponent;
export const ForestWorld = ForestWorldComponent;
export const VolcanoWorld = VolcanoWorldComponent;

// データもエクスポート
export { cityBuildingsData, forestTreesData, forestRocksData, volcanoRocksData, volcanoObjectsData, volcanoLavaFlowsData };

// 型定義
export type BuildingData = {
  position: [number, number, number] | THREE.Vector3;
  height: number;
  width: number;
  depth: number;
};

export type ForestTreeData = {
  position: THREE.Vector3;
  radius: number;
  height: number;
};

export type RockData = {
  position: THREE.Vector3;
  radius: number;
};

export type VolcanoObjectData = {
  position: THREE.Vector3;
  radius: number;
  height?: number;
};

export type LavaFlowData = {
  position: THREE.Vector3;
  width: number;
  depth: number;
  rotation: number;
};

interface WorldProps {
  environmentPreset?: 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby';
}

export const World: React.FC<WorldProps> = ({
  environmentPreset = 'city'
}) => {
  return (
    <>
      {/* 環境設定 */}
      <Environment 
        environmentPreset={environmentPreset} 
        groundColor="#303030"
        groundSize={200}
        skyProps={{
          sunPosition: [100, 30, 100],
          rayleigh: 0.5,
        }}
      />
      
      {/* 物理エンジン */}
      <Physics>
        <mesh />
      </Physics>
    </>
  );
};

// デフォルトエクスポート
export default World; 