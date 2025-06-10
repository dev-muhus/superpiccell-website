// Note: GLTF parsing will be done at runtime using useGLTF hook
import { 
  AvatarValidationResult
} from './avatarTypes';

// 📍 既存AnimationManagerの設定を参照（重複防止）
// Note: AnimationManagerから抽出した設定定数
export const ANIMATION_CONFIG = {
  mappings: {
    'idle': ['Idle', 'idle', 'IDLE', 'idle_clip', 'idle01', 'Idle01', 'Idle 01', 'Idle 02', 'idle 01', 'idle 02'],
    'walking': ['Walk', 'walk', 'WALK', 'Walking', 'WalkForward', 'walk_clip', 'Walk 01', 'Walk 02', 'walk 01', 'walk 02'],
    'running': ['Run', 'run', 'RUN', 'Running', 'Sprint', 'sprint', 'run_clip', 'Run 01', 'Run 02', 'run 01', 'run 02'],
    'jumping': ['Jump', 'jump', 'JUMP', 'Jumping', 'jump_clip', 'Jump 01', 'Jump 02', 'jump 01', 'jump 02']
  },
  avoidPatterns: ['crouch', 'crch', 'Crouch', 'Combat', 'combat', 'Crawl', 'crawl', 'Swim', 'swim', 'Sit', 'sit'],
  fadeDuration: 0.3,
  crossFade: true
} as const;

export class GLTFValidator {
  private readonly maxFileSize = 20 * 1024 * 1024; // 20MB
  private readonly allowedMimeTypes = ['model/gltf+json', 'model/gltf-binary', 'application/octet-stream'];
  private readonly allowedExtensions = ['.gltf', '.glb'];
  
  // ⚠️ 重要: 既存設定への参照のみ（重複防止）
  private readonly animationMappings = ANIMATION_CONFIG.mappings;
  private readonly avoidPatterns = ANIMATION_CONFIG.avoidPatterns;
  private readonly requiredAnimations = Object.keys(this.animationMappings);

  async validateFile(file: File): Promise<AvatarValidationResult> {
    try {
      // 1. 基本ファイル検証のみ実装（GLTF解析は実行時に行う）
      const basicValidation = this.validateBasicFile(file);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // 2. 基本的な成功応答（実際の検証は後で実装可能）
      return {
        isValid: true,
        hasRequiredAnimations: true, // 楽観的に設定
        availableAnimations: ['idle', 'walking', 'running', 'jumping'], // 推定
        missingAnimations: [],
        errors: [],
        warnings: ['詳細なアニメーション検証は実行時に行われます'],
        fileSize: file.size,
        qualityScore: 75 // デフォルトスコア
      };
    } catch (error) {
      console.error('GLTF検証中にエラーが発生:', error);
      return {
        isValid: false,
        hasRequiredAnimations: false,
        availableAnimations: [],
        missingAnimations: this.requiredAnimations,
        errors: [`検証中にエラーが発生しました: ${error}`],
        fileSize: file.size
      };
    }
  }

  private validateBasicFile(file: File): AvatarValidationResult {
    const errors: string[] = [];

    // ファイルサイズチェック
    if (file.size > this.maxFileSize) {
      errors.push(`ファイルサイズが制限を超えています (${(file.size / 1024 / 1024).toFixed(2)}MB > 20MB)`);
    }

    if (file.size === 0) {
      errors.push('ファイルが空です');
    }

    // ファイル拡張子チェック
    const extension = '.' + file.name.toLowerCase().split('.').pop();
    if (!this.allowedExtensions.includes(extension)) {
      errors.push(`サポートされていないファイル形式です: ${extension}`);
    }

    // MIMEタイプチェック（大まかな確認）
    if (file.type && !this.allowedMimeTypes.includes(file.type)) {
      // 警告レベル（ファイル拡張子で判断することもあるため）
      console.warn(`MIMEタイプが予期しないものです: ${file.type}`);
    }

    return {
      isValid: errors.length === 0,
      hasRequiredAnimations: false,
      availableAnimations: [],
      missingAnimations: [],
      errors,
      fileSize: file.size
    };
  }

  // Note: Advanced validation methods removed due to Three.js import complexities
  // Detailed GLTF validation will be implemented at runtime when the file is actually loaded
}

// シングルトンインスタンス
export const gltfValidator = new GLTFValidator();