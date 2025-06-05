'use client';

import { useState, useEffect } from 'react';
import PostCard from '@/components/PostCard';
import InfiniteScroll from '@/components/InfiniteScroll';
import Loading from '@/components/Loading';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import Link from 'next/link';
import { FaBookmark } from 'react-icons/fa';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

// 投稿データの型定義
interface Post {
  id: number;
  content: string;
  created_at: string;
  user_id: number;
  post_type: 'original' | 'reply' | 'quote' | 'repost';
  is_liked?: boolean;
  like_count?: number;
  is_bookmarked?: boolean;
  bookmark_count?: number;
  reply_count?: number;
  repost_count?: number;
  is_reposted?: boolean;
  in_reply_to_post_id?: number;
  quote_of_post_id?: number;
  repost_of_post_id?: number;
  media?: Array<{
    id?: number;
    url: string;
    mediaType: 'image' | 'video';
    width?: number;
    height?: number;
    duration_sec?: number;
  }>;
  user: {
    id: number;
    username: string;
    profile_image_url?: string;
    first_name?: string;
    last_name?: string;
    clerk_id?: string;
    bio?: string;
  } | null;
  // リポスト関連の情報
  repost_of_post?: Post;
  quote_of_post?: Post;
  in_reply_to_post?: Post;
}

export default function BookmarksPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{hasNextPage: boolean, nextCursor: string | null}>({
    hasNextPage: false,
    nextCursor: null
  });

  // 投稿を取得する関数
  const fetchBookmarkedPosts = async (cursor?: string, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const params = new URLSearchParams();
      if (cursor) {
        params.append('cursor', cursor);
      }
      params.append('limit', ITEMS_PER_PAGE.toString());
      params.append('include_related', 'true'); // 関連データも取得
      
      const response = await fetch(`/api/bookmarks?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`ブックマーク投稿の取得に失敗しました (${response.status})`);
      }
      
      const data = await response.json();
      
      if (append) {
        // 既存の投稿に追加
        setPosts(prevPosts => [...prevPosts, ...data.posts]);
      } else {
        // 初期ロード時は置き換え
        setPosts(data.posts || []);
      }
      
      setPagination({
        hasNextPage: data.pagination?.hasNextPage || false,
        nextCursor: data.pagination?.nextCursor || null
      });
    } catch (error) {
      console.error('ブックマーク投稿取得エラー:', error);
      setError('ブックマークした投稿の読み込みに失敗しました。再度お試しください。');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchBookmarkedPosts();
  }, []);

  // 続きを読み込む
  const loadMorePosts = () => {
    if (pagination.hasNextPage && pagination.nextCursor && !loading && !isLoadingMore) {
      fetchBookmarkedPosts(pagination.nextCursor, true);
    }
  };

  // いいね状態が変更されたときの処理
  const handleLikeStateChange = (postId: number, isLiked: boolean, likeCount: number) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, is_liked: isLiked, like_count: likeCount } 
          : post
      )
    );
  };

  // ブックマーク状態が変更されたときの処理
  const handleBookmarkStateChange = (postId: number, isBookmarked: boolean, bookmarkCount: number) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, is_bookmarked: isBookmarked, bookmark_count: bookmarkCount } 
          : post
      )
    );
    
    // ブックマーク解除時は投稿を一覧から削除
    if (!isBookmarked) {
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    }
  };

  // リポスト状態が変更されたときの処理
  const handleRepostStateChange = (postId: number, isReposted: boolean) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, is_reposted: isReposted, repost_count: (post.repost_count || 0) + (isReposted ? 1 : -1) } 
          : post
      )
    );
  };

  return (
    <PageLayout>
      <ContentLayout
        title="BOOKMARKS"
        subtitle="保存した投稿を表示"
        backUrl="/dashboard"
        backText="ダッシュボードに戻る"
      >
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {loading && posts.length === 0 ? (
          <div className="py-8 flex justify-center">
            <Loading message="読み込み中..." />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-gray-500 mb-6">
              <FaBookmark className="mx-auto text-4xl mb-4 text-gray-400" />
              <p className="text-lg mb-1">ブックマークした投稿はありません</p>
              <p className="text-sm mb-4">気になる投稿を保存しておくと、ここに表示されます</p>
              <Link href="/timeline" className="inline-block px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                タイムラインを見る
              </Link>
            </div>
          </div>
        ) : (
          <InfiniteScroll
            onLoadMore={loadMorePosts}
            hasNextPage={pagination.hasNextPage}
            isLoading={isLoadingMore}
          >
            <div className="space-y-1">
              {posts.map(post => (
                <PostCard 
                  key={post.id}
                  post={post}
                  onLikeStateChange={handleLikeStateChange}
                  onRepostStateChange={handleRepostStateChange}
                  onBookmarkStateChange={handleBookmarkStateChange}
                  onReplySuccess={(postId) => {
                    // 返信が投稿された場合、その投稿の返信数を更新
                    setPosts(prevPosts => 
                      prevPosts.map(p => 
                        p.id === postId 
                          ? { ...p, reply_count: (p.reply_count || 0) + 1 } 
                          : p
                      )
                    );
                  }}
                />
              ))}
            </div>
            {isLoadingMore && (
              <div className="py-4 flex justify-center">
                <Loading message="読み込み中..." size="sm" />
              </div>
            )}
          </InfiniteScroll>
        )}
      </ContentLayout>
    </PageLayout>
  );
} 