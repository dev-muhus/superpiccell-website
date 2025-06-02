'use client';

import Image from 'next/image';
import { PostMedia as Media } from '@/types/post';

interface PostMediaProps {
  media: Media[];
  postId: number;
}

/**
 * 投稿メディア（画像・動画）表示コンポーネント
 */
export default function PostMedia({ media, postId }: PostMediaProps) {
  if (!media || media.length === 0) return null;

  return (
    <div className={`rounded-lg overflow-hidden mb-3 relative ${media.length > 1 ? 'grid grid-cols-2 gap-1' : ''}`}>
      {media.map((mediaItem, index) => (
        <div 
          key={`media-${postId}-${index}`} 
          className={`${media && media.length > 1 ? (index === 0 && media.length === 3 ? 'col-span-2' : '') : ''} overflow-hidden rounded-lg`}
        >
          {isImageMedia(mediaItem) ? (
            <div className="relative aspect-video">
              <Image
                src={mediaItem.url}
                alt={`投稿画像 ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                onError={() => console.log(`投稿画像 ${index + 1} の読み込みに失敗しました`)}
              />
            </div>
          ) : (
            <div className="relative aspect-video">
              <video
                src={mediaItem.url}
                controls
                className="w-full h-full"
                onError={() => console.log(`投稿動画 ${index + 1} の読み込みに失敗しました`)}
              >
                お使いのブラウザは動画再生をサポートしていません。
              </video>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * メディアが画像かどうかを判定
 */
function isImageMedia(media: Media): boolean {
  return (
    media.mediaType === 'image' || 
    Boolean(media.url.match(/\.(jpe?g|png|gif|webp)$/i)) || 
    media.url.includes('/image/')
  );
} 