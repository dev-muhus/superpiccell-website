import { Vector3 } from 'three';

// アバターモデルのインターフェース
export interface AvatarModel {
  id: string;          // モデルID
  name: string;        // モデル名
  path: string;        // モデルファイルパス
  description: string; // モデルの説明
  scale: number;       // モデル固有のスケール調整
  heightOffset?: number; // 必要に応じた高さ調整
}

// ステージ環境のインターフェース
export interface GameStage {
  id: string;           // ステージID
  name: string;         // ステージ名
  description: string;  // ステージの説明
  envPreset: string;    // 環境プリセット ('night', 'sunset', 'dawn' など)
  skyColor: string;     // 空の色
  initialPlayerPosition: Vector3; // プレイヤーの初期位置
}

// 利用可能なアバターモデルリスト
export const AVATAR_MODELS: AvatarModel[] = [
  {
    id: 'bearded-daddy',
    name: 'The Beared Daddy',
    path: '/games/nag-won/models/TheBearedDaddy.gltf',
    description: 'サイバーパンク風の男性キャラクター',
    scale: 0.1,
    heightOffset: 0.0
  },
  {
    id: 'tokyo-girl',
    name: 'The Little Tokyo Girl',
    path: '/games/nag-won/models/TheLittleTokyoGirl.gltf',
    description: '東京スタイルの女性キャラクター',
    scale: 0.1,
    heightOffset: 0.0
  },
  {
    id: 'volcano',
    name: 'The Volcano',
    path: '/games/nag-won/models/theVolcano.gltf',
    description: '火山をモチーフにしたキャラクター',
    scale: 0.1,
    heightOffset: 0.0
  }
];

// 利用可能なステージリスト
export const GAME_STAGES: GameStage[] = [
  {
    id: 'cyber-city',
    name: 'サイバーシティ',
    description: '未来的なネオン都市の環境',
    envPreset: 'night',
    skyColor: '#000814',
    initialPlayerPosition: new Vector3(0, 0.2, 0),
  },
  {
    id: 'forest',
    name: '森林（青空）',
    description: '自然豊かな森林環境',
    envPreset: 'dawn',
    skyColor: '#87CEEB',
    initialPlayerPosition: new Vector3(0, 0.2, 0),
  },
  {
    id: 'volcano',
    name: '火山（夕焼け空）',
    description: '活火山と溶岩の危険な環境',
    envPreset: 'sunset',
    skyColor: '#FF7F50',
    initialPlayerPosition: new Vector3(0, 0.2, -60),
  }
];

// デフォルトのプレイヤー設定を生成する関数
export const createPlayerConfig = (avatarModel: AvatarModel) => {
  return {
    scale: avatarModel.scale,
    height: 0.2,
    initialPosition: new Vector3(0, 0.2, 0),
    collisionOffset: 0.1,
    heightOffset: avatarModel.heightOffset || 0.0
  };
}; 