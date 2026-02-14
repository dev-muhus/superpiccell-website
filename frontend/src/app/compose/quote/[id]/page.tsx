'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import MainLayout from '@/components/MainLayout';
import PostModal from '@/components/PostModal';
import PostCard from '@/components/PostCard';

// メディアのインターフェース定義
interface Media {
  id?: number;
  url: string;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
  duration_sec?: number;
}

interface Post {
  id: number;
  content: string;
  post_type: 'original' | 'reply' | 'quote' | 'repost';
  user_id: number;
  created_at: string;
  in_reply_to_post_id?: number;
  quote_of_post_id?: number;
  repost_of_post_id?: number;
  media?: Media[];
  user: {
    id: number;
    username: string;
    profile_image_url?: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

export default function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const postId = parseInt(id);

  // 引用元の投稿を取得
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/posts/${postId}`);
        
        if (!response.ok) {
          throw new Error('投稿の取得に失敗しました');
        }
        
        const data = await response.json();
        setQuotedPost(data.post);
      } catch (err) {
        console.error('投稿取得エラー:', err);
        setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isLoaded && isSignedIn) {
      fetchPost();
    }
  }, [isLoaded, isSignedIn, postId]);

  // モーダルが閉じられたときの処理
  const handleCloseModal = (postSubmitted = false) => {
    setIsModalOpen(false);
    
    // 投稿が行われたかどうかに関わらず、元のページに戻る
    if (postSubmitted) {
      router.push('/timeline');
    } else {
      router.push(`/post/${postId}`);
    }
  };

  // 認証中の表示
  if (!isLoaded) {
    return (
      <MainLayout title="引用投稿" backUrl={`/post/${postId}`}>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p>読み込み中...</p>
        </div>
      </MainLayout>
    );
  }

  // 未認証の場合
  if (!isSignedIn) {
    return (
      <MainLayout title="引用投稿" backUrl="/">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p>引用投稿するにはログインが必要です</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="引用投稿" backUrl={`/post/${postId}`}>
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* 引用元の投稿 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p>読み込み中...</p>
          </div>
        ) : quotedPost ? (
          <div className="p-4 border-t border-gray-200">
            <h2 className="font-bold text-gray-500 mb-2">引用元投稿</h2>
            <PostCard post={quotedPost} showActions={false} />
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>投稿が見つかりませんでした</p>
          </div>
        )}
      </div>

      {/* 引用投稿モーダル */}
      {quotedPost && (
        <PostModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialType="quote"
          quotePost={{
            id: quotedPost.id,
            content: quotedPost.content,
            user: quotedPost.user ? { username: quotedPost.user.username } : undefined
          }}
        />
      )}
    </MainLayout>
  );
} 