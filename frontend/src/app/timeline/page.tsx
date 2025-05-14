'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import PostCard from '@/components/PostCard';
import Loading from '@/components/Loading';
import PostModal from '@/components/PostModal';
import { FaEdit } from 'react-icons/fa';
import InfiniteScroll from '@/components/InfiniteScroll';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

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
  reply_count?: number;
  like_count?: number;
  is_liked?: boolean;
}

interface PaginationInfo {
  hasNextPage: boolean;
  nextCursor: string | null;
}

export default function Timeline() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    hasNextPage: false,
    nextCursor: null
  });
  const [refreshKey, setRefreshKey] = useState(0); // タイムライン更新用のキー

  // タイムラインデータを取得
  const fetchTimelineData = async (cursor?: string, append: boolean = false) => {
    try {
      if (!append) {
        setIsLoading(true);
      }
      
      const url = new URL('/api/posts', window.location.origin);
      if (cursor) {
        url.searchParams.append('cursor', cursor);
      }
      url.searchParams.append('limit', ITEMS_PER_PAGE.toString());
      // 返信先の投稿データなど関連データを含めて取得するオプション
      url.searchParams.append('include_related', 'true');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('タイムラインの取得に失敗しました');
      }
      
      const data = await response.json();
      
      if (append) {
        // 既存の投稿に追加
        setPosts(prevPosts => [...prevPosts, ...data.posts]);
      } else {
        // 初期ロードまたはリフレッシュ時は置き換え
        setPosts(data.posts);
      }
      
      setPagination(data.pagination);
    } catch (error) {
      console.error('タイムライン取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 追加の投稿を読み込む
  const loadMorePosts = () => {
    if (pagination.hasNextPage && pagination.nextCursor && !isLoading) {
      fetchTimelineData(pagination.nextCursor, true);
    }
  };

  // ページ読み込み時にタイムラインデータを取得
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchTimelineData();
    }
  }, [isLoaded, isSignedIn, refreshKey]);

  // モーダルが閉じられたときの処理
  const handleClosePostModal = (postSubmitted = false) => {
    setIsPostModalOpen(false);
    
    // 投稿が行われた場合はタイムラインを更新
    if (postSubmitted) {
      setRefreshKey(prev => prev + 1);
    }
  };

  // いいね状態が変更された時のコールバック
  const handleLikeStateChange = (postId: number, isLiked: boolean, likeCount: number) => {
    console.log(`Post ${postId} like state changed: ${isLiked}, count: ${likeCount}`);
    // 必要に応じてここで追加の処理を行う
  };

  // リポスト状態が変更された時のコールバック
  const handleRepostStateChange = (postId: number, isReposted: boolean) => {
    console.log(`Post ${postId} repost state changed: ${isReposted}`);
    // リポストが行われたらタイムラインを更新
    if (isReposted) {
      setRefreshKey(prev => prev + 1);
    }
  };

  // ブックマーク状態が変更された時のコールバック
  const handleBookmarkStateChange = (postId: number, isBookmarked: boolean) => {
    console.log(`Post ${postId} bookmark state changed: ${isBookmarked}`);
    // 必要に応じてここで追加の処理を行う
  };
  
  // 引用処理
  const handleQuote = (postId: number) => {
    router.push(`/compose?quote=${postId}`);
  };

  // 投稿が成功した時の処理
  const handlePostSuccess = () => {
    // タイムラインを更新
    setRefreshKey(prev => prev + 1);
  };

  // 投稿削除処理
  const handleDeletePost = (postId: number) => {
    // 削除した投稿を状態から除外
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
  };

  // プロフィールボタン
  const NewPostButton = (
    <button
      onClick={() => setIsPostModalOpen(true)}
      className="bg-blue-500 text-white px-4 py-1.5 rounded-full hover:bg-blue-600 transition-colors text-sm flex items-center"
    >
      <FaEdit className="mr-1" /> 新規投稿
    </button>
  );

  // 認証中の表示
  if (!isLoaded) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center py-12">
          <Loading message="読み込み中..." />
        </div>
      </PageLayout>
    );
  }

  // 未認証の場合
  if (!isSignedIn) {
    router.push('/');
    return (
      <PageLayout>
        <div className="flex justify-center items-center py-12">
          <Loading message="ログインページにリダイレクト中..." />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <ContentLayout 
        title="TIMELINE" 
        subtitle="他のユーザーの投稿をチェック"
        backUrl="/dashboard"
        backText="ダッシュボードに戻る"
        rightContent={NewPostButton}
      >
        {isLoading && posts.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <Loading message="タイムライン読み込み中..." />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h3 className="text-xl font-medium mb-2">まだ投稿がありません</h3>
            <p className="text-gray-600 mb-4">
              タイムラインには、あなたやあなたがフォローしているユーザーの投稿が表示されます。
            </p>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <FaEdit className="mr-2" /> 最初の投稿を作成する
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <InfiniteScroll
              hasNextPage={pagination.hasNextPage}
              isLoading={isLoading}
              onLoadMore={loadMorePosts}
            >
              <div className="divide-y divide-gray-100">
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLikeStateChange={handleLikeStateChange}
                    onRepostStateChange={handleRepostStateChange}
                    onBookmarkStateChange={handleBookmarkStateChange}
                    onQuote={handleQuote}
                    onDeletePost={handleDeletePost}
                    onReplySuccess={handlePostSuccess}
                  />
                ))}
              </div>
              
              {isLoading && (
                <div className="py-4 flex justify-center">
                  <Loading message="投稿を読み込み中..." size="sm" />
                </div>
              )}
            </InfiniteScroll>
          </div>
        )}
      </ContentLayout>
      
      <PostModal
        isOpen={isPostModalOpen}
        onClose={handleClosePostModal}
        initialType="post"
      />
    </PageLayout>
  );
} 