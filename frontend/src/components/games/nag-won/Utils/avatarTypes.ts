import { AvatarModel } from './config';

// ローカルアバター設定インターフェース
export interface LocalAvatarConfig {
  id: string;
  name: string;
  type: 'local';
  fileBlob: Blob;
  blobUrl: string;
  fileSize: number;
  uploadDate: Date;
  validAnimations: string[];
  thumbnail?: string;
  // AvatarModelとの互換性のため
  scale: number;
  heightOffset?: number;
}

// デフォルトアバター（既存のAvatarModelにtype識別子を追加）
export interface DefaultAvatarModel extends AvatarModel {
  type: 'default';
}

// アバター検証結果
export interface AvatarValidationResult {
  isValid: boolean;
  hasRequiredAnimations: boolean;
  availableAnimations: string[];
  missingAnimations: string[];
  errors: string[];
  warnings?: string[];
  fileSize: number;
  
  // 拡張情報（仕様書で定義された高度な検証機能）
  detailedAnimationInfo?: DetailedAnimationInfo;
  performanceMetrics?: PerformanceTestResult;
  qualityScore?: number;
}

// 詳細なアニメーション情報
export interface DetailedAnimationInfo {
  requiredAnimations: string[];
  availableAnimations: string[];
  qualityResults: AnimationQualityResult[];
  performanceResults: AnimationPerformanceResult[];
  compatibilityResults: AnimationCompatibilityResult;
}

// アニメーション品質結果
export interface AnimationQualityResult {
  name: string;
  duration: number;
  frameRate: number;
  smoothness: number;
  hasKeyframeIssues: boolean;
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
}

// アニメーションパフォーマンス結果
export interface AnimationPerformanceResult {
  name: string;
  memoryUsage: number;
  renderTime: number;
  complexity: 'low' | 'medium' | 'high';
}

// アニメーション互換性結果
export interface AnimationCompatibilityResult {
  compatible: Array<{
    type: string;
    matchedNames: string[];
  }>;
  missing: string[];
  conflicts: string[];
}

// パフォーマンステスト結果
export interface PerformanceTestResult {
  loadTime: number;
  memoryUsage: number;
  renderPerformance: number;
  overallScore: number;
}

// アニメーションテスト結果（インタラクティブプレビュー用）
export interface AnimationTestResult {
  animationType: string;
  isWorking: boolean;
  duration: number;
  frameRate: number;
  issues: string[];
}

// アニメーション情報（プレビュー表示用）
export interface AnimationInfo {
  name: string;
  duration: number;
  frameCount: number;
  fps: number;
  hasLoops: boolean;
  quality: 'excellent' | 'good' | 'acceptable' | 'poor';
}

// アニメーション統合設定（既存設定参照用）
export interface AnimationIntegrationConfig {
  // 📍 既存設定への参照（重複防止）
  animationMappings: Record<string, string[]>;
  avoidPatterns: string[];
  
  // ローカルアバター専用設定
  localAvatarOverrides: {
    fadeInDuration: number;    // ローカルアバター切り替え時のフェード
    scaleAdjustment: number;   // サイズ自動調整
    positionOffset: [number, number, number];   // 位置オフセット
  };
}

// アニメーションエラー（監視・修復用）
export interface AnimationError {
  type: 'missing' | 'corrupted' | 'performance' | 'compatibility';
  animationName: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  canAutoRepair: boolean;
}

// 統合アバター型（既存とローカルの両方をサポート）
export type ExtendedAvatarModel = DefaultAvatarModel | LocalAvatarConfig;

// アバタータイプ判定用のタイプガード
export function isLocalAvatar(avatar: ExtendedAvatarModel): avatar is LocalAvatarConfig {
  return avatar.type === 'local';
}

export function isDefaultAvatar(avatar: ExtendedAvatarModel): avatar is DefaultAvatarModel {
  return avatar.type === 'default';
}

// ローカルアバターデータベーススキーマ（IndexedDB用）
export interface LocalAvatarDB {
  id: string;
  name: string;
  fileBlob: Blob;
  validAnimations: string[];
  uploadDate: Date;
  fileSize: number;
  thumbnail?: string;
  scale: number;
  heightOffset?: number;
}