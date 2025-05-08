'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import MainLayout from '@/components/MainLayout';
import PostModal from '@/components/PostModal';
import PostCard from '@/components/PostCard';

// media_dataのインターフェース定義
interface MediaData {
  url?: string;
  type?: string;
  width?: number;
  height?: number;
  // 明示的な型を使用してanyを避ける
  [key: string]: string | number | boolean | null | undefined;
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
  media_data?: MediaData;
  user: {
    id: number;
    username: string;
    profile_image_url?: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

export default function ReplyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [parentPost, setParentPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const postId = parseInt(params.id);

  // 返信先の投稿を取得
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/posts/${postId}`);
        
        if (!response.ok) {
          throw new Error('投稿の取得に失敗しました');
        }
        
        const data = await response.json();
        setParentPost(data.post);
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

  // モーダルクローズ時の処理
  const handleCloseModal = (postSubmitted = false) => {
    setIsModalOpen(false);
    
    // 投稿が行われたかどうかに関わらず、元の投稿詳細ページに戻る
    if (postSubmitted) {
      router.push(`/post/${postId}`);
    } else {
      router.push(`/post/${postId}`);
    }
  };

  // 認証中の表示
  if (!isLoaded) {
    return (
      <MainLayout title="返信" backUrl={`/post/${postId}`}>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p>読み込み中...</p>
        </div>
      </MainLayout>
    );
  }

  // 未認証の場合
  if (!isSignedIn) {
    return (
      <MainLayout title="返信" backUrl="/">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p>返信するにはログインが必要です</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="返信" backUrl={`/post/${postId}`}>
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* 返信先の投稿 */}
      <div className="bg-white rounded-lg shadow mb-4 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p>読み込み中...</p>
          </div>
        ) : parentPost ? (
          <PostCard post={parentPost} showActions={false} />
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>投稿が見つかりませんでした</p>
          </div>
        )}
      </div>
      
      {/* 返信モーダル */}
      {parentPost && (
        <PostModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialType="reply"
          replyToPost={{
            id: parentPost.id,
            content: parentPost.content,
            user: parentPost.user ? { username: parentPost.user.username } : undefined
          }}
          replyToPostId={postId}
        />
      )}
    </MainLayout>
  );
} 