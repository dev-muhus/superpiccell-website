import { Vector3 } from 'three';
import { LocalAvatarConfig } from './avatarTypes';

// カメラ状態の型定義
export interface CameraState {
  rotation: { x: number; y: number };
  zoom: number;
  pointerLocked: boolean;
  cameraMode: 'thirdPerson' | 'firstPerson' | 'drone';
  
  // アクション
  setRotation: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  setPointerLocked: (locked: boolean) => void;
  setCameraMode: (mode: 'thirdPerson' | 'firstPerson' | 'drone') => void;
}

// プレイヤー状態の型定義
export interface PlayerState {
  position: Vector3;
  velocity: Vector3;
  onGround: boolean;
  animationState: string;
  inputs: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    sprint: boolean;
  };
  
  // アクション
  setPosition: (position: Vector3) => void;
  setVelocity: (velocity: Vector3) => void;
  setOnGround: (onGround: boolean) => void;
  setAnimationState: (state: string) => void;
  setInput: (input: keyof PlayerState['inputs'], value: boolean) => void;
}

// ゲーム設定状態の型定義
export interface GameSettingsState {
  selectedAvatarId: string;
  selectedStageId: string;
  localAvatars: LocalAvatarConfig[]; // ローカルアバターリスト
  
  // アクション
  setSelectedAvatar: (avatarId: string) => void;
  setSelectedStage: (stageId: string) => void;
  addLocalAvatar: (avatar: LocalAvatarConfig) => void; // ローカルアバター追加
  removeLocalAvatar: (avatarId: string) => void; // ローカルアバター削除
  loadLocalAvatars: () => Promise<void>; // ローカルアバター読み込み
}

// アニメーション関連の型定義
export interface AnimationConfig {
  mappings: Record<string, string[]>;
  avoidPatterns?: string[]; // 避けるべきアニメーション名のパターン
  fadeDuration: number;
  crossFade: boolean;
}

// 物理パラメータの型定義
export interface PhysicsParams {
  gravity: number;
  jumpForce: number;
  walkSpeed: number;
  runSpeed: number;
  airControl: number;
  groundFriction: number;
  airFriction: number;
  groundLevel: number; // 地面のY座標レベル
  characterHeight: number; // キャラクターの高さ
}

// 入力マッピングの型定義
export type InputAction = 'forward' | 'backward' | 'left' | 'right' | 'jump' | 'sprint';
export type InputKeyMap = Record<string, InputAction>; 