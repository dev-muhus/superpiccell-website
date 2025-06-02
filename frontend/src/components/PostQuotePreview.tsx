'use client';

import Link from 'next/link';
import Image from 'next/image';
import UserAvatar from './UserAvatar';
import { QuotePost } from '@/types/post';
import { formatDate } from '@/utils/dateFormatter';

interface PostQuotePreviewProps {
  quotePost: QuotePost;
  quotePostId: number;
}

/**
 * 引用投稿プレビューコンポーネント
 */
export default function PostQuotePreview({ quotePost, quotePostId }: PostQuotePreviewProps) {
  if (!quotePost) return null;

  return (
    <div className="mb-3 border rounded-lg border-gray-200 p-3 bg-gray-50">
      <div className="text-sm">
        <Link href={`/post/${quotePostId}`} className="hover:underline">
          <div className="flex items-center mb-1">
            <UserAvatar 
              imageUrl={quotePost.user?.profile_image_url} 
              username={quotePost.user?.username || 'ユーザー'} 
              size={20} 
            />
            <span className="ml-1 font-medium">{quotePost.user?.username || 'ユーザー'}</span>
            <span className="mx-1 text-gray-500">·</span>
            <span className="text-gray-500 text-xs">{formatDate(quotePost.created_at)}</span>
          </div>
          <p className="line-clamp-3 mt-1">{quotePost.content}</p>
          {quotePost.media && quotePost.media.length > 0 && (
            <div className="mt-2 rounded-lg overflow-hidden h-20 w-20 bg-gray-100">
              <Image
                src={quotePost.media[0].url}
                alt="引用元画像"
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            </div>
          )}
        </Link>
      </div>
    </div>
  );
} 