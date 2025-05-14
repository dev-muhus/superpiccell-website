import { z } from 'zod';
import { MAX_MEDIA_ATTACHMENTS } from '@/constants/media';

/**
 * メディア添付のバリデーションスキーマ
 * 画像と動画で異なるバリデーションルールを適用
 */
export const mediaSchema = z.array(
  z.discriminatedUnion('mediaType', [
    // 画像用スキーマ
    z.object({
      url: z.string().url(),
      mediaType: z.literal('image'),
      width: z.number().int().positive().optional().nullable(),
      height: z.number().int().positive().optional().nullable(),
      duration_sec: z.null().optional()
    }),
    // 動画用スキーマ
    z.object({
      url: z.string().url(),
      mediaType: z.literal('video'),
      width: z.number().int().positive().optional().nullable(),
      height: z.number().int().positive().optional().nullable(),
      duration_sec: z.number().positive().optional().nullable()
    })
  ])
).max(MAX_MEDIA_ATTACHMENTS).optional(); // 最大X個のメディア

/**
 * 基本的なコンテンツスキーマ - 拡張可能な形
 */
export const baseContentSchema = z.object({
  content: z.string().max(500).optional(),
  media: mediaSchema
});

/**
 * contentかmediaのどちらかは必須という制約を適用したスキーマ
 */
export const contentSchema = baseContentSchema.refine(
  // contentかmediaのどちらかは必須
  (data) => {
    return (!!data.content && data.content.trim().length > 0) || 
           (!!data.media && data.media.length > 0);
  },
  {
    message: "投稿内容またはメディアのいずれかは入力必須です",
    path: ["content"]
  }
);

/**
 * メディア項目の型定義（TypeScript用）
 */
export interface MediaItem {
  url: string;
  mediaType: 'image' | 'video';
  width?: number | null;
  height?: number | null;
  duration_sec?: number | null;
} 