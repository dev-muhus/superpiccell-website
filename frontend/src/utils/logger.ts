/**
 * ログユーティリティ
 * 開発環境では詳細ログを出力、本番環境では警告とエラーのみ出力
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  // 開発環境のみで情報ログを出力
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  // 開発環境のみでデバッグログを出力
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  // 常に警告を出力
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  // 常にエラーを出力
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  // ゲーム関連の詳細ログ（開発環境のみ）
  game: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[GAME]', ...args);
    }
  },

  // アニメーション関連の詳細ログ（開発環境のみ）
  animation: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[ANIMATION]', ...args);
    }
  }
};