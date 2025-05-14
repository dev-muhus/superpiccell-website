'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { FaEdit } from 'react-icons/fa';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import PostCard from '@/components/PostCard';
import Loading from '@/components/Loading';
import PostModal from '@/components/PostModal';
import InfiniteScroll from '@/components/InfiniteScroll';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

// 共通インターフェース定義

// メディアアイテムの定義
interface MediaItem {
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
  media?: MediaItem[];
  user: {
    id: number;
    username: string;
    profile_image_url?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  in_reply_to_post?: Post | null;
  quote_of_post?: Post | null;
  repost_of_post?: Post | null;
  reply_count?: number;
  like_count?: number;
  is_liked?: boolean;
  bookmark_count?: number;
  is_bookmarked?: boolean;
}

// PostModalで使用するインターフェース
interface PostData {
  id: number;
  content: string;
  user?: {
    username?: string;
  };
}

interface PaginationInfo {
  hasNextPage: boolean;
  nextCursor: string | null;
}

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isSignedIn, isLoaded } = useUser();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    hasNextPage: false,
    nextCursor: null
  });
  
  const postId = params?.id as string;

  // 投稿詳細を取得する関数
  const fetchPostDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/posts/${postId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch post');
      }
      
      const data = await response.json();
      setPost(data.post);
    } catch (err) {
      console.error('投稿詳細取得エラー:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  // 返信一覧を取得する関数
  const fetchReplies = useCallback(async (cursor?: string, append: boolean = false) => {
    try {
      if (!append) {
        setIsLoadingReplies(true);
      }
      
      const url = new URL(`/api/posts/${postId}/replies`, window.location.origin);
      if (cursor) {
        url.searchParams.append('cursor', cursor);
      }
      url.searchParams.append('limit', ITEMS_PER_PAGE.toString());
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '返信の取得に失敗しました');
      }
      
      const data = await response.json();
      
      if (append) {
        // 既存の返信に追加
        setReplies(prevReplies => [...prevReplies, ...data.replies]);
      } else {
        // 初期ロード時は置き換え
        setReplies(data.replies);
      }
      
      setPagination(data.pagination);
    } catch (err) {
      console.error('返信取得エラー:', err);
    } finally {
      setIsLoadingReplies(false);
    }
  }, [postId]);

  // 追加の返信を読み込む関数
  const loadMoreReplies = () => {
    if (pagination.hasNextPage && pagination.nextCursor && !isLoadingReplies) {
      fetchReplies(pagination.nextCursor, true);
    }
  };

  // ページロード時に投稿詳細を取得
  useEffect(() => {
    if (isLoaded && isSignedIn && postId) {
      fetchPostDetail();
      fetchReplies();
    }
  }, [isLoaded, isSignedIn, postId, fetchPostDetail, fetchReplies]);

  // いいね状態が変更された時のコールバック
  const handleLikeStateChange = (postId: number, isLiked: boolean, likeCount: number) => {
    console.log(`Post ${postId} like state changed: ${isLiked}, count: ${likeCount}`);
    // メイン投稿のいいね状態を更新
    if (post && post.id === postId) {
      setPost({
        ...post,
        is_liked: isLiked,
        like_count: likeCount
      });
    }
    // 返信リストの中の投稿のいいね状態を更新
    setReplies(prevReplies => 
      prevReplies.map(reply => 
        reply.id === postId 
          ? { ...reply, is_liked: isLiked, like_count: likeCount } 
          : reply
      )
    );
  };

  // リポスト状態が変更された時のコールバック
  const handleRepostStateChange = (postId: number, isReposted: boolean) => {
    console.log(`Post ${postId} repost state changed: ${isReposted}`);
    // リポストが行われたら詳細を再取得
    if (isReposted) {
      fetchPostDetail();
    }
  };

  // ブックマーク状態が変更された時のコールバック
  const handleBookmarkStateChange = (postId: number, isBookmarked: boolean, bookmarkCount: number) => {
    console.log(`Post ${postId} bookmark state changed: ${isBookmarked}, count: ${bookmarkCount}`);
    // メイン投稿のブックマーク状態を更新
    if (post && post.id === postId) {
      setPost({
        ...post,
        is_bookmarked: isBookmarked,
        bookmark_count: bookmarkCount
      });
    }
    // 返信リストの中の投稿のブックマーク状態を更新
    setReplies(prevReplies => 
      prevReplies.map(reply => 
        reply.id === postId 
          ? { ...reply, is_bookmarked: isBookmarked, bookmark_count: bookmarkCount } 
          : reply
      )
    );
  };

  // 引用処理
  const handleQuote = (postId: number) => {
    console.log('引用:', postId);
    // 引用処理の実装
  };

  // 返信が成功した時の処理（PostCardからのコールバック）
  const handleReplySuccess = () => {
    // 投稿詳細を最新化（返信数反映などのため）
    fetchPostDetail();
    
    // 返信一覧も再取得
    fetchReplies();
  };

  // 投稿削除時の処理
  const handleDeletePost = (postId: number) => {
    // メイン投稿が削除された場合、タイムラインにリダイレクト
    if (post && post.id === postId) {
      router.push('/timeline');
    } else {
      // 返信が削除された場合は、返信一覧を再取得
      fetchReplies();
    }
  };

  // モーダルが閉じられたときの処理
  const handleClosePostModal = (postSubmitted = false) => {
    setIsPostModalOpen(false);
    
    if (postSubmitted) {
      // 投稿が行われた場合は投稿と返信を最新化
      fetchPostDetail();
      fetchReplies();
    }
  };

  // PostModalに渡すデータを整形
  const getPostDataForModal = (): PostData | undefined => {
    if (!post) return undefined;
    
    return {
      id: post.id,
      content: post.content,
      user: {
        username: post.user?.username
      }
    };
  };

  // 新規返信ボタン
  const NewReplyButton = (
    <button
      onClick={() => setIsPostModalOpen(true)}
      className="bg-blue-500 text-white px-4 py-1.5 rounded-full hover:bg-blue-600 transition-colors text-sm flex items-center"
    >
      <FaEdit className="mr-1" /> 新規コメント
    </button>
  );

  // 認証中の表示
  if (!isLoaded) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center py-12">
          <Loading message="Loading..." />
        </div>
      </PageLayout>
    );
  }

  // 未認証の場合
  if (!isSignedIn) {
    return (
      <PageLayout>
        <ContentLayout title="Post" backUrl="/timeline">
          <div className="p-8 text-center">
            <p>You need to be logged in to view this page</p>
            <div className="mt-4">
              <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                ホームに戻る
              </Link>
            </div>
          </div>
        </ContentLayout>
      </PageLayout>
    );
  }

  // 投稿取得中
  if (isLoading) {
    return (
      <PageLayout>
        <ContentLayout title="Post" backUrl="/timeline">
          <div className="py-8 flex justify-center">
            <Loading message="Loading..." />
          </div>
        </ContentLayout>
      </PageLayout>
    );
  }

  // エラーがある場合
  if (error || !post) {
    return (
      <PageLayout>
        <ContentLayout title="Post" backUrl="/timeline">
          <div className="p-8 text-center">
            <p className="text-red-500">{error || 'Failed to fetch post'}</p>
            <div className="mt-4">
              <Link href="/timeline" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                タイムラインに戻る
              </Link>
            </div>
          </div>
        </ContentLayout>
      </PageLayout>
    );
  }

  // 投稿者のユーザー名を取得
  const username = post.user?.username || 'User';

  return (
    <PageLayout>
      <ContentLayout
        title="Post"
        subtitle={`@${username}`}
        backUrl="/timeline"
        backText="タイムラインに戻る"
        rightContent={NewReplyButton}
      >
        <div className="pb-4">
          {/* メインの投稿表示 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            {/* 元の投稿を返信先として表示（もし返信の場合） */}
            {post.post_type === 'reply' && post.in_reply_to_post && (
              <div className="border-b border-gray-100">
                <div className="p-4">
                  <PostCard
                    post={post.in_reply_to_post}
                    showActions={false}
                    hideReplyInfo={true}
                    compactMode={true}
                  />
                </div>
              </div>
            )}
            
            {/* 引用元の投稿を表示（もし引用の場合） */}
            {post.post_type === 'quote' && post.quote_of_post && (
              <div className="border-b border-gray-100">
                <div className="p-4">
                  <PostCard
                    post={post.quote_of_post}
                    showActions={false}
                    hideReplyInfo={true}
                    compactMode={true}
                  />
                </div>
              </div>
            )}
            
            {/* リポスト元の投稿を表示（もしリポストの場合） */}
            {post.post_type === 'repost' && post.repost_of_post && (
              <div className="border-b border-gray-100">
                <div className="p-4">
                  <PostCard
                    post={post.repost_of_post}
                    showActions={false}
                    hideReplyInfo={true}
                    compactMode={true}
                  />
                </div>
              </div>
            )}
            
            {/* 現在表示中のメイン投稿 */}
            <div className={post.post_type !== 'original' ? "border-t border-gray-100 bg-white" : ""}>
              <PostCard
                post={post}
                onLikeStateChange={handleLikeStateChange}
                onRepostStateChange={handleRepostStateChange}
                onBookmarkStateChange={handleBookmarkStateChange}
                onQuote={handleQuote}
                onReplySuccess={handleReplySuccess}
                onDeletePost={handleDeletePost}
                hideReplyInfo={true}
              />
            </div>
          </div>

          {/* 返信一覧 - シンプルなラベル */}
          <div className="mt-6">
            <div className="mb-4 flex items-center">
              <h3 className="text-lg font-semibold">Comments</h3>
              {post.reply_count !== undefined && (
                <span className="ml-2 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-sm">
                  {post.reply_count}
                </span>
              )}
            </div>

            {/* 返信がなければわかりやすいメッセージを表示 */}
            {replies.length === 0 ? (
              <div className="py-6 text-center text-gray-500 bg-gray-50 rounded-lg">
                <p>No comments yet</p>
                <button
                  onClick={() => setIsPostModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-sm"
                >
                  Post First Comment
                </button>
              </div>
            ) : (
              <InfiniteScroll
                hasNextPage={pagination.hasNextPage}
                isLoading={isLoadingReplies}
                onLoadMore={loadMoreReplies}
              >
                <div className="space-y-1 border-t border-gray-100">
                  {replies.map((reply) => (
                    <PostCard
                      key={reply.id}
                      post={reply}
                      onLikeStateChange={handleLikeStateChange}
                      onRepostStateChange={handleRepostStateChange}
                      onBookmarkStateChange={handleBookmarkStateChange}
                      onQuote={handleQuote}
                      onReplySuccess={handleReplySuccess}
                      onDeletePost={handleDeletePost}
                      hideReplyInfo={true}
                    />
                  ))}
                </div>
                {isLoadingReplies && (
                  <div className="py-4 flex justify-center">
                    <Loading message="Loading..." size="sm" />
                  </div>
                )}
              </InfiniteScroll>
            )}
          </div>
        </div>
      </ContentLayout>

      {/* 返信投稿モーダル */}
      <PostModal
        isOpen={isPostModalOpen}
        onClose={handleClosePostModal}
        initialType="reply"
        replyToPost={getPostDataForModal()}
      />
    </PageLayout>
  );
} 