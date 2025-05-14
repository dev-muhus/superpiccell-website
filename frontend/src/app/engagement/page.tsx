'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { FaHeart, FaComment } from 'react-icons/fa';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import PostCard from '@/components/PostCard';
import Loading from '@/components/Loading';
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

// 投稿の型定義
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
  bookmark_count?: number;
  is_bookmarked?: boolean;
}

interface PaginationInfo {
  hasNextPage: boolean;
  nextCursor: string | null;
}

export default function EngagementPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  
  // 状態管理
  const [activeTab, setActiveTab] = useState<'likes' | 'comments'>('likes');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    hasNextPage: false,
    nextCursor: null
  });
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 投稿データ取得関数
  const fetchPosts = useCallback(async (isInitialLoad = false, cursor?: string) => {
    try {
      if (isInitialLoad) {
        setIsLoading(true);
        setPosts([]);
      } else {
        setIsLoading(true);
      }
      
      const currentCursor = isInitialLoad ? null : cursor || pagination.nextCursor;
      if (!isInitialLoad && !currentCursor) return;
      
      console.log(`Fetching posts with cursor: ${currentCursor}, type: ${activeTab}, limit: ${ITEMS_PER_PAGE}`);
      
      const response = await fetch(
        `/api/engagement?type=${activeTab}&limit=${ITEMS_PER_PAGE}${currentCursor ? `&cursor=${currentCursor}` : ''}`
      );
      
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.posts.length} posts, hasNextPage: ${data.pagination.hasNextPage}, nextCursor: ${data.pagination.nextCursor}`);
      
      if (isInitialLoad) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }
      
      setPagination({
        hasNextPage: data.pagination.hasNextPage,
        nextCursor: data.pagination.nextCursor
      });
    } catch (err) {
      console.error('エンゲージメントデータ取得エラー:', err);
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, pagination.nextCursor]);
  
  // 初回データ取得
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
      return;
    }
    
    if (isSignedIn) {
      fetchPosts(true);
    }
  }, [isSignedIn, isLoaded, activeTab, refreshKey, fetchPosts, router]);
  
  // 追加の投稿を読み込む
  const loadMorePosts = () => {
    if (pagination.hasNextPage && pagination.nextCursor && !isLoading) {
      fetchPosts(false, pagination.nextCursor);
    }
  };
  
  // いいね状態変更ハンドラ
  const handleLikeStateChange = (postId: number, isLiked: boolean, likeCount: number) => {
    setPosts(prev => 
      prev.map(post => 
        post.id === postId ? { ...post, is_liked: isLiked, like_count: likeCount } : post
      )
    );
  };
  
  // ブックマーク状態変更ハンドラ
  const handleBookmarkStateChange = (postId: number, isBookmarked: boolean, bookmarkCount: number) => {
    setPosts(prev => 
      prev.map(post => 
        post.id === postId ? { ...post, is_bookmarked: isBookmarked, bookmark_count: bookmarkCount } : post
      )
    );
  };
  
  // リポスト状態変更ハンドラ
  const handleRepostStateChange = (postId: number, isReposted: boolean) => {
    console.log(`Post ${postId} repost state changed: ${isReposted}`);
    // リポストが行われたらタイムラインを更新
    if (isReposted) {
      setRefreshKey(prev => prev + 1);
    }
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
  
  // タブ切り替えハンドラ
  const handleTabChange = (tab: 'likes' | 'comments') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };
  
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
        title="ENGAGEMENT"
        subtitle="いいねやコメントした投稿を確認できます"
        backUrl="/dashboard"
        backText="ダッシュボードに戻る"
      >
        {/* タブ切り替え */}
        <div className="flex border-b mb-4">
          <button
            className={`py-2 px-4 font-medium text-sm flex items-center ${
              activeTab === 'likes' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('likes')}
          >
            <FaHeart className={`mr-2 ${activeTab === 'likes' ? 'text-red-500' : 'text-gray-400'}`} />
            いいね
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm flex items-center ${
              activeTab === 'comments' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('comments')}
          >
            <FaComment className={`mr-2 ${activeTab === 'comments' ? 'text-blue-500' : 'text-gray-400'}`} />
            コメント
          </button>
        </div>
        
        {/* コンテンツ領域 */}
        <div className="mt-4">
          {isLoading && posts.length === 0 ? (
            <div className="py-8 flex justify-center">
              <Loading message="読み込み中..." />
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">{error}</p>
              <button 
                onClick={() => fetchPosts(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                再読み込み
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500 mb-4">
                {activeTab === 'likes' 
                  ? 'まだいいねした投稿はありません' 
                  : 'まだコメントした投稿はありません'}
              </p>
              <p className="text-gray-500 mb-4">
                {activeTab === 'likes' 
                  ? '気に入った投稿にいいねしてみましょう' 
                  : '投稿にコメントしてみましょう'}
              </p>
            </div>
          ) : (
            <InfiniteScroll
              hasNextPage={pagination.hasNextPage}
              isLoading={isLoading}
              onLoadMore={loadMorePosts}
            >
              <div className="space-y-1">
                {posts.map((post) => (
                  <PostCard
                    key={`${post.id}-${refreshKey}`}
                    post={post}
                    onLikeStateChange={handleLikeStateChange}
                    onRepostStateChange={handleRepostStateChange}
                    onBookmarkStateChange={handleBookmarkStateChange}
                    onReplySuccess={handlePostSuccess}
                    onDeletePost={handleDeletePost}
                  />
                ))}
              </div>
              {isLoading && (
                <div className="py-4 flex justify-center">
                  <Loading message="読み込み中..." size="sm" />
                </div>
              )}
            </InfiniteScroll>
          )}
        </div>
      </ContentLayout>
    </PageLayout>
  );
} 