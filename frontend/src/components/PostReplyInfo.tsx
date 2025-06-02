'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaReply } from 'react-icons/fa';
import UserAvatar from './UserAvatar';
import { ReplyToPost } from '@/types/post';

interface PostReplyInfoProps {
  replyToPostId: number | undefined;
  replyToPost: ReplyToPost | null;
}

/**
 * 返信情報表示コンポーネント
 */
export default function PostReplyInfo({ replyToPostId, replyToPost }: PostReplyInfoProps) {
  if (!replyToPostId) return null;
  
  return (
    <>
      <div className="flex items-center text-gray-500 text-sm mb-3">
        <FaReply className="mr-2 text-blue-500" />
        <span>
          {replyToPost ? (
            <>
              <Link 
                href={`/profile/${replyToPost.user?.username}`} 
                className="hover:underline text-blue-600 font-medium"
              >
                @{replyToPost.user?.username || 'ユーザー'}
              </Link>
              <span className="mx-1">さんの</span>
              <Link 
                href={`/post/${replyToPostId}`}
                className="hover:underline text-blue-600 font-medium"
              >
                投稿
              </Link>
              <span>への返信</span>
            </>
          ) : (
            <span>投稿への返信</span>
          )}
        </span>
      </div>

      {/* 返信先投稿のプレビュー */}
      {replyToPost && (
        <div className="mb-3 border-l-2 border-gray-200 pl-3 text-sm text-gray-600">
          <div className="flex items-center">
            <UserAvatar 
              imageUrl={replyToPost.user?.profile_image_url} 
              username={replyToPost.user?.username || 'ユーザー'} 
              size={16} 
            />
            <span className="ml-1 font-medium">{replyToPost.user?.username || 'ユーザー'}</span>
          </div>
          <p className="line-clamp-2 mt-1">{replyToPost.content}</p>
          
          {/* 返信先投稿のメディアを表示 */}
          {replyToPost.media && replyToPost.media.length > 0 && (
            <div className="mt-2 rounded-lg overflow-hidden relative">
              <div className="h-24 w-32 relative rounded-lg overflow-hidden">
                {(() => {
                  // メディアの判定ロジックを強化
                  const media = replyToPost.media[0];
                  const url = media.url;
                  const mediaType = media.mediaType || 'image';
                  
                  // URLのパターンも確認して画像か動画かを判定
                  const isImage = 
                    mediaType === 'image' || 
                    url.match(/\.(jpe?g|png|gif|webp)$/i) || 
                    url.includes('/image/');
                    
                  if (isImage) {
                    return (
                      <Image
                        src={url}
                        alt="返信先の画像"
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    );
                  } else {
                    return (
                      <video
                        src={url}
                        className="w-full h-full object-cover"
                        controls
                      >
                        お使いのブラウザは動画再生をサポートしていません。
                      </video>
                    );
                  }
                })()}
              </div>
              
              {replyToPost.media.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                  +{replyToPost.media.length - 1}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
} 