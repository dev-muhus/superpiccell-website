'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { FaUser, FaEdit, FaUserPlus, FaUserCheck, FaBan, FaUnlock, FaTimes, FaSave } from 'react-icons/fa';
import Loading from '@/components/Loading';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import PostCard from '@/components/PostCard';
import InfiniteScroll from '@/components/InfiniteScroll';
import { ITEMS_PER_PAGE } from '@/constants/pagination';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import ContentRenderer from '@/components/ContentRenderer';
import { generateProfileBackgroundStyle } from '@/lib/utils';

interface User {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  follower_count?: number;
  following_count?: number;
}

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
  created_at: string;
  post_type: 'original' | 'reply' | 'quote' | 'repost';
  user_id: number;
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
  repost_count?: number;
  is_reposted?: boolean;
  bookmark_count?: number;
  is_bookmarked?: boolean;
  // リポスト関連の情報
  repost_of_post?: Post;
  quote_of_post?: Post;
  in_reply_to_post?: Post;
}

interface Pagination {
  hasNextPage: boolean;
  nextCursor: string | null;
}

// プロフィール編集モーダルコンポーネント
interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: (updated?: boolean) => void;
  user: User;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, user }) => {
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setBio(user.bio || '');
      setError(null);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          bio
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'プロフィールの更新に失敗しました');
      }

      toast.success('プロフィールを更新しました');
      onClose(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新中にエラーが発生しました';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => onClose(false)} 
      title="Profile Edit" 
      className="w-full max-w-2xl"
    >
      <div style={{ width: '100%', maxWidth: '100%' }}>
        <form onSubmit={handleSubmit} className="space-y-6 px-2">
          {error && (
            <div className="bg-red-50 p-4 rounded-md text-red-600 mb-4">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              名前
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="名"
              maxLength={50}
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              苗字
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="苗字"
              maxLength={50}
            />
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              自己紹介
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="自己紹介を入力してください"
              maxLength={200}
            />
            <p className="text-right text-xs text-gray-500 mt-1">{bio.length}/200</p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
            <button
              type="button"
              onClick={() => onClose(false)}
              className={`px-4 py-2 rounded-full text-gray-700 flex items-center justify-center ${
                isSubmitting
                  ? 'bg-gray-200 cursor-not-allowed'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              } sm:flex-1`}
              disabled={isSubmitting}
            >
              <FaTimes className="mr-1" />
              <span>キャンセル</span>
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-full text-white flex items-center justify-center ${
                isSubmitting
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              } sm:flex-1`}
              disabled={isSubmitting}
            >
              <FaSave className="mr-1" />
              <span>{isSubmitting ? '更新中...' : '保存する'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { user: currentUser, isLoaded, isSignedIn } = useUser();
  
  // 状態管理
  const [profile, setProfile] = useState<User | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    hasNextPage: false,
    nextCursor: null
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followActionLoading, setFollowActionLoading] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  
  // ユーザープロフィールを取得する関数
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // ユーザー名でプロフィールを取得
      const response = await fetch(`/api/profile/${params.username}`);
      
      if (!response.ok) {
        // エラーレスポンスを取得
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profile');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      
      // フォロー状態を設定
      setIsFollowing(data.isFollowing || false);
      
      // ブロック状態を設定
      setIsBlocked(data.isBlocked || false);
      
      // フォロワー数とフォロー中の数を設定
      setFollowerCount(data.profile.follower_count || 0);
      setFollowingCount(data.profile.following_count || 0);
      
      // 自分のプロフィールかどうかを判断
      if (currentUser?.username === params.username) {
        setIsOwnProfile(true);
      }
      
    } catch (err) {
      console.error('プロフィール取得エラー:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.username, params.username]);
  
  // ユーザーの投稿を取得する関数
  const fetchUserPosts = useCallback(async (cursor?: string | null, append: boolean = false) => {
    try {
      if (!profile) return;
      
      setIsLoadingPosts(true);
      
      // APIリクエストのパラメータを構築
      const params = new URLSearchParams({
        userId: profile.id.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        include_related: 'true' // リポスト元の投稿情報を含める
      });
      
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      // 投稿を取得
      const response = await fetch(`/api/posts?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch posts');
      }
      
      const data = await response.json();
      
      // APIレスポンスをPostCardコンポーネントの形式に合わせる
      // 元のpost情報をすべて保持し、必要に応じてユーザー情報のみを補完する
      const formattedPosts = data.posts.map((post: Post) => ({
        ...post, // エンゲージメント情報を含むすべての情報を保持
        // ユーザー情報が取得できなければプロフィール情報を使用
        user: post.user || {
          id: profile.id,
          username: profile.username,
          profile_image_url: profile.profile_image_url || '',
          first_name: profile.first_name || '',
          last_name: profile.last_name || ''
        }
      }));
      
      if (append) {
        // 既存の投稿リストに追加
        setPosts(prevPosts => [...prevPosts, ...formattedPosts]);
      } else {
        // 初期ロード時は置き換え
        setPosts(formattedPosts);
      }
      
      // ページネーション情報を更新
      setPagination({
        hasNextPage: data.pagination.hasNextPage,
        nextCursor: data.pagination.nextCursor
      });
      
    } catch (err) {
      console.error('投稿取得エラー:', err);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [profile]);
  
  // ページロード時にプロフィールを取得
  useEffect(() => {
    if (isLoaded) {
      fetchProfile();
    }
  }, [isLoaded, params.username, fetchProfile]);
  
  // プロフィール情報が取得できたら投稿を取得
  useEffect(() => {
    if (profile) {
      fetchUserPosts();
    }
  }, [profile, fetchUserPosts]);
  
  // 次のページを読み込む
  const loadMorePosts = () => {
    if (pagination.hasNextPage && pagination.nextCursor && !isLoadingPosts) {
      fetchUserPosts(pagination.nextCursor, true);
    }
  };

  // フォロー/フォロー解除の処理
  const handleFollowToggle = async () => {
    if (!profile || !currentUser) return;
    
    // 現在の状態を保存
    const currentIsFollowing = isFollowing;
    const currentFollowerCount = followerCount;
    
    try {
      // 先にUIを更新（Optimistic UI）
      setFollowActionLoading(true);
      setIsFollowing(!currentIsFollowing);
      
      // フォロワー数を更新
      setFollowerCount(prev => currentIsFollowing ? prev - 1 : prev + 1);
      
      // プロフィール情報を更新
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          follower_count: currentIsFollowing 
            ? (prev.follower_count || 0) - 1 
            : (prev.follower_count || 0) + 1
        };
      });
      
      toast.success(`${profile.username}さんを${isFollowing ? 'フォロー解除' : 'フォロー'}しました`);
      
      // APIコールは並行して行う
      const endpoint = `/api/users/${profile.id}/follow`;
      const method = currentIsFollowing ? 'DELETE' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`フォロー${currentIsFollowing ? '解除' : ''}に失敗しました`);
      }
      
    } catch (error) {
      console.error('フォロー操作エラー:', error);
      toast.error(`エラーが発生しました: ${error instanceof Error ? error.message : 'フォロー操作に失敗しました'}`);
      
      // エラーが発生した場合、状態を元に戻す（ロールバック）
      setIsFollowing(currentIsFollowing);
      setFollowerCount(currentFollowerCount);
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          follower_count: currentFollowerCount
        };
      });
    } finally {
      setFollowActionLoading(false);
    }
  };

  // いいね状態が変更された時のコールバック
  const handleLikeStateChange = (postId: number, isLiked: boolean, likeCount: number) => {
    // 投稿一覧の該当投稿の状態を更新
    setPosts(prev => 
      prev.map(post => 
        post.id === postId 
          ? { ...post, is_liked: isLiked, like_count: likeCount } 
          : post
      )
    );
  };

  // リポスト状態が変更された時のコールバック
  const handleRepostStateChange = (postId: number, isReposted: boolean) => {
    // 投稿一覧の該当投稿の状態を更新
    setPosts(prev => 
      prev.map(post => 
        post.id === postId 
          ? { ...post, is_reposted: isReposted, repost_count: (post.repost_count || 0) + (isReposted ? 1 : -1) } 
          : post
      )
    );
  };

  // ブックマーク状態が変更された時のコールバック
  const handleBookmarkStateChange = (postId: number, isBookmarked: boolean) => {
    // 投稿一覧の該当投稿の状態を更新
    setPosts(prev => 
      prev.map(post => 
        post.id === postId 
          ? { ...post, is_bookmarked: isBookmarked } 
          : post
      )
    );
  };

  // 引用処理
  const handleQuote = (postId: number) => {
    console.log('引用:', postId);
  };

  // 返信成功時の処理
  const handleReplySuccess = () => {
    fetchUserPosts();
  };

  // 投稿削除時の処理
  const handleDeletePost = (postId: number) => {
    // 削除された投稿を状態から除外
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  // ブロック/ブロック解除の処理
  const handleBlockToggle = async () => {
    if (!profile || !currentUser) return;
    
    // 現在の状態を保存
    const currentIsBlocked = isBlocked;
    
    try {
      // 先にUIを更新（Optimistic UI）
      setBlockActionLoading(true);
      setIsBlocked(!isBlocked);
      toast.success(`${profile.username}さんを${isBlocked ? 'ブロック解除' : 'ブロック'}しました`);
      
      // APIコールは並行して行う
      const endpoint = `/api/users/${profile.id}/block`;
      const method = currentIsBlocked ? 'DELETE' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`ブロック${currentIsBlocked ? '解除' : ''}に失敗しました`);
      }
      
    } catch (error) {
      console.error('ブロック操作エラー:', error);
      toast.error(`エラーが発生しました: ${error instanceof Error ? error.message : 'ブロック操作に失敗しました'}`);
      
      // エラーが発生した場合、状態を元に戻す
      setIsBlocked(currentIsBlocked);
    } finally {
      setBlockActionLoading(false);
    }
  };

  // プロフィール編集モーダルを開く
  const handleOpenProfileEditModal = () => {
    setShowEditModal(true);
  };

  // プロフィール編集モーダルを閉じる
  const handleCloseProfileEditModal = (updated: boolean = false) => {
    setShowEditModal(false);
    
    // 更新された場合、プロフィール情報を再取得
    if (updated) {
      fetchProfile();
    }
  };

  return (
    <PageLayout>
      <ContentLayout
        title="PROFILE"
        subtitle={`@${params.username}`}
        backUrl="/dashboard"
        backText="ダッシュボードに戻る"
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loading message="読み込み中..." />
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
            <span className="block sm:inline">{error}</span>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* プロフィールヘッダー */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* ヘッダー背景 */}
              <div 
                className="h-32 relative profile-header"
                style={profile ? generateProfileBackgroundStyle(profile.username) : {}}
              >
                {/* プロフィール画像 */}
                <div className="absolute -bottom-16 left-8">
                  <div className="relative w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden">
                    {profile.profile_image_url ? (
                      <Image
                        src={profile.profile_image_url}
                        alt={profile.username}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        <FaUser className="text-4xl" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* アクションボタン */}
                <div className="absolute bottom-4 right-6 flex space-x-2">
                  {isOwnProfile ? (
                    <button
                      onClick={handleOpenProfileEditModal}
                      className="px-4 py-1.5 bg-white text-gray-800 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors text-sm font-medium flex items-center shadow-sm md:ml-auto sm:static edit-button"
                    >
                      <FaEdit className="sm:mr-1.5" /> <span className="hidden sm:inline">プロフィール編集</span>
                    </button>
                  ) : isLoaded && isSignedIn ? (
                    <>
                      <button
                        onClick={handleFollowToggle}
                        disabled={followActionLoading}
                        className={`px-4 py-1.5 rounded-full transition-colors text-sm font-medium flex items-center shadow-sm ${
                          isFollowing
                            ? 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {followActionLoading ? (
                          '処理中...'
                        ) : isFollowing ? (
                          <>
                            <FaUserCheck className="mr-1.5" /> フォロー中
                          </>
                        ) : (
                          <>
                            <FaUserPlus className="mr-1.5" /> フォローする
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleBlockToggle}
                        disabled={blockActionLoading}
                        className="p-2 bg-white text-gray-600 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors text-sm font-medium flex items-center shadow-sm"
                        title={isBlocked ? 'ブロック解除' : 'ブロックする'}
                      >
                        {blockActionLoading ? (
                          '...'
                        ) : isBlocked ? (
                          <FaUnlock />
                        ) : (
                          <FaBan />
                        )}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              
              {/* プロフィール情報 */}
              <div className="pt-20 px-8 pb-6">
                <h1 className="text-2xl font-bold mb-1">
                  {profile.first_name || profile.last_name 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
                    : profile.username
                  }
                </h1>
                <p className="text-gray-600 mb-4">@{profile.username}</p>
                
                {profile.bio && (
                  <div className="mb-4">
                    <ContentRenderer text={profile.bio} />
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-600 space-x-6">
                  <span className="text-gray-600">
                    <span className="font-bold">{followerCount}</span> フォロワー
                  </span>
                  <span className="text-gray-600">
                    <span className="font-bold">{followingCount}</span> フォロー中
                  </span>
                </div>
              </div>
            </div>
            
            {/* 投稿一覧 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <h2 className="text-lg font-semibold p-4 border-b border-gray-100">
                投稿
              </h2>
              
              {posts.length === 0 && !isLoadingPosts ? (
                <div className="p-8 text-center text-gray-500">
                  {isOwnProfile 
                    ? '投稿がありません。最初の投稿を作成しましょう！'
                    : `${profile.username}さんはまだ投稿していません`
                  }
                </div>
              ) : (
                <InfiniteScroll
                  hasNextPage={pagination.hasNextPage}
                  isLoading={isLoadingPosts}
                  onLoadMore={loadMorePosts}
                >
                  <div className="divide-y divide-gray-100">
                    {posts.map(post => {
                      // デバッグ: プロフィールページで投稿データを確認
                      if (process.env.NODE_ENV === 'development') {
                        console.log(`📄 [Profile Page] Post ${post.id} data:`, {
                          id: post.id,
                          like_count: post.like_count,
                          repost_count: post.repost_count,
                          bookmark_count: post.bookmark_count,
                          is_liked: post.is_liked,
                          is_reposted: post.is_reposted,
                          is_bookmarked: post.is_bookmarked,
                          fullPost: post
                        });
                      }
                      
                      return (
                        <PostCard
                          key={post.id}
                          post={post}
                          onLikeStateChange={handleLikeStateChange}
                          onRepostStateChange={handleRepostStateChange}
                          onBookmarkStateChange={handleBookmarkStateChange}
                          onQuote={handleQuote}
                          onReplySuccess={handleReplySuccess}
                          onDeletePost={handleDeletePost}
                          // エンゲージメント情報を明示的に渡す
                          likeCount={post.like_count || 0}
                          isLiked={post.is_liked || false}
                          replyCount={post.reply_count || 0}
                          isBookmarked={post.is_bookmarked || false}
                        />
                      );
                    })}
                  </div>
                  
                  {isLoadingPosts && (
                    <div className="p-4 flex justify-center">
                      <Loading message="投稿を読み込み中..." size="sm" />
                    </div>
                  )}
                </InfiniteScroll>
              )}
            </div>
          </div>
        ) : null}
      </ContentLayout>
      
      {/* プロフィール編集モーダル */}
      {profile && (
        <ProfileEditModal
          isOpen={showEditModal}
          onClose={handleCloseProfileEditModal}
          user={profile}
        />
      )}

      <style jsx global>{`
        /* スマホ対応のためのスタイル */
        @media (max-width: 640px) {
          .profile-header {
            position: relative;
          }
          
          .profile-header .edit-button {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 10;
            padding: 0.5rem !important;
            border-radius: 9999px !important;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
          
          .profile-header .edit-button svg {
            margin-right: 0 !important;
            font-size: 16px;
          }
        }
      `}</style>
    </PageLayout>
  );
} 