'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaUserPlus, FaUserMinus, FaUserFriends, FaEllipsisH } from 'react-icons/fa';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import Loading from '@/components/Loading';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import UserAvatar from '@/components/UserAvatar';
import InfiniteScroll from '@/components/InfiniteScroll';
import { ITEMS_PER_PAGE } from '@/constants/pagination';
import { cn } from '@/lib/utils';

// ユーザー型定義
interface User {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
}

// フォロー型定義
interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  following_user: User;
}

// フォロワー型定義
interface Follower {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  follower_user: User;
}

// ページネーション情報型定義
interface Pagination {
  hasNextPage: boolean;
  nextCursor: string | null;
  total: number;
}

export default function ConnectionsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  
  // アクティブなタブ（初期値はフォロー）
  const [activeTab, setActiveTab] = useState<'follows' | 'followers'>('follows');
  
  // フォロー一覧の状態
  const [follows, setFollows] = useState<Follow[]>([]);
  const [followsLoading, setFollowsLoading] = useState(true);
  const [followsError, setFollowsError] = useState<string | null>(null);
  const [followsPagination, setFollowsPagination] = useState<Pagination>({
    hasNextPage: false,
    nextCursor: null,
    total: 0
  });
  
  // フォロワー一覧の状態
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followersLoading, setFollowersLoading] = useState(true);
  const [followersError, setFollowersError] = useState<string | null>(null);
  const [followersPagination, setFollowersPagination] = useState<Pagination>({
    hasNextPage: false,
    nextCursor: null,
    total: 0
  });
  
  // メニュー表示の状態
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  
  // ユーザーがフォローしているユーザーID一覧
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
  
  // メニュー参照用のref
  const menuRef = useRef<HTMLDivElement>(null);
  
  // アニメーション用の状態
  const [animatingUserId, setAnimatingUserId] = useState<number | null>(null);
  
  // ポータル用の状態
  const [isMounted, setIsMounted] = useState(false);
  
  // メニュー位置の状態
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // コンポーネントがマウントされたらポータルを有効化
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // メニューの表示を切り替え
  const toggleMenu = (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // すでに開いているメニューをクリックした場合は閉じるだけ
    if (openMenuId === id) {
      setOpenMenuId(null);
      return;
    }
    
    // ボタンの位置を取得してメニュー位置を設定（新しいメニューを開く場合のみ）
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    setMenuPosition({
      x: rect.left + rect.width,
      y: rect.top + rect.height + window.scrollY
    });
    
    // メニューの表示を切り替え
    setOpenMenuId(id);
  };

  // メニューポップアップのレンダリング
  const renderMenu = (followId: number, followingUserId: number, username: string) => {
    if (!isMounted) return null;
    
    // メモ化したスタイル計算でパフォーマンス改善
    const menuStyle = {
      top: menuPosition.y,
      left: menuPosition.x,
      transform: 'translate(-90%, 0)',
    };
    
    return createPortal(
      <div 
        className="fixed inset-0 bg-transparent z-50"
        onClick={() => setOpenMenuId(null)}
        aria-hidden="true"
      >
        <div 
          className="absolute bg-white rounded-md shadow-lg overflow-hidden border border-gray-200 w-48 z-50"
          style={menuStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFollowToggle(followingUserId, username, true);
                setOpenMenuId(null);
              }}
              className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center ${
                animatingUserId === followingUserId ? 'unfollow-animation' : ''
              }`}
            >
              <FaUserMinus className="mr-2" />
              フォロー解除
            </button>
            <Link
              href={`/profile/${username}`}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setOpenMenuId(null)}
            >
              プロフィールを見る
            </Link>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // メニューの外側をクリックした時にメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // フォロー中ユーザー一覧を取得
  const fetchFollows = useCallback(async (cursor?: string, append: boolean = false) => {
    try {
      if (!append) {
        setFollowsLoading(true);
      }

      // URLクエリパラメータを構築
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        sort: 'desc'
      });
      
      // カーソルが指定されていれば追加
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      const response = await fetch(`/api/follows?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('フォロー中ユーザーの取得に失敗しました');
      }
      
      const data = await response.json();
      
      // ページネーション情報を更新
      setFollowsPagination({
        hasNextPage: data.pagination.hasNextPage,
        nextCursor: data.pagination.nextCursor,
        total: data.pagination.total
      });
      
      // フォロー中ユーザーID一覧を更新
      const newFollowingIds = new Set<number>(followingIds);
      data.follows.forEach((follow: Follow) => {
        newFollowingIds.add(follow.following_user.id);
      });
      setFollowingIds(newFollowingIds);
      
      // 既存のフォローに追加するか、置き換えるか
      if (append) {
        setFollows(prev => [...prev, ...data.follows]);
      } else {
        setFollows(data.follows);
      }
    } catch (error) {
      console.error('フォロー中ユーザー一覧取得エラー:', error);
      setFollowsError('フォロー中ユーザーの取得に失敗しました');
    } finally {
      setFollowsLoading(false);
    }
  }, [followingIds]);

  // フォロワー一覧を取得
  const fetchFollowers = async (cursor?: string, append: boolean = false) => {
    try {
      if (!append) {
        setFollowersLoading(true);
      }

      // URLクエリパラメータを構築
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        sort: 'desc'
      });
      
      // カーソルが指定されていれば追加
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      const response = await fetch(`/api/followers?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('フォロワーの取得に失敗しました');
      }
      
      const data = await response.json();
      
      // ページネーション情報を更新
      setFollowersPagination({
        hasNextPage: data.pagination.hasNextPage,
        nextCursor: data.pagination.nextCursor,
        total: data.pagination.total
      });
      
      // 既存のフォロワーに追加するか、置き換えるか
      if (append) {
        setFollowers(prev => [...prev, ...data.followers]);
      } else {
        setFollowers(data.followers);
      }
    } catch (error) {
      console.error('フォロワー一覧取得エラー:', error);
      setFollowersError('フォロワーの取得に失敗しました');
    } finally {
      setFollowersLoading(false);
    }
  };

  // 初期ロード時にデータを取得
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // アクティブなタブに応じてデータ取得
      if (activeTab === 'follows') {
        fetchFollows();
      } else {
        fetchFollowers();
      }
    } else if (isLoaded && !isSignedIn) {
      // 未ログインの場合はタイムラインにリダイレクト
      router.push('/timeline');
    }
  }, [activeTab, isSignedIn, isLoaded, router, fetchFollows]);

  // タブ切り替え時の処理
  const handleTabChange = (tab: 'follows' | 'followers') => {
    setActiveTab(tab);
    // タブ切り替え時に対応するデータがまだ取得されていない場合は取得する
    if (tab === 'follows' && follows.length === 0) {
      fetchFollows();
    } else if (tab === 'followers' && followers.length === 0) {
      fetchFollowers();
    }
  };

  // 次のページを読み込む（フォロー）
  const loadMoreFollows = () => {
    if (followsPagination.hasNextPage && followsPagination.nextCursor) {
      fetchFollows(followsPagination.nextCursor, true);
    }
  };

  // 次のページを読み込む（フォロワー）
  const loadMoreFollowers = () => {
    if (followersPagination.hasNextPage && followersPagination.nextCursor) {
      fetchFollowers(followersPagination.nextCursor, true);
    }
  };

  // フォロー/フォロー解除の処理
  const handleFollowToggle = async (userId: number, username: string, isFollowing: boolean) => {
    try {
      // アニメーション開始
      setAnimatingUserId(userId);
      
      // 先にUIを更新（Optimistic UI）
      if (isFollowing) {
        // フォロー解除の場合
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        
        // フォロー一覧から該当ユーザーを削除
        if (activeTab === 'follows') {
          setFollows(prev => prev.filter(follow => follow.following_user.id !== userId));
          
          // フォロー数を減らす
          setFollowsPagination(prev => ({
            ...prev,
            total: Math.max(0, prev.total - 1)
          }));
        }
        
        toast.success(`${username}さんのフォローを解除しました`);
      } else {
        // フォローの場合
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });
        toast.success(`${username}さんをフォローしました`);
      }
      
      // メニューを閉じる
      setOpenMenuId(null);
      
      // APIコールは並行して行う
      const endpoint = `/api/users/${userId}/follow`;
      const method = isFollowing ? 'DELETE' : 'POST';
      
      const response = await fetch(endpoint, { method });
      
      if (!response.ok) {
        throw new Error(`${isFollowing ? 'フォロー解除' : 'フォロー'}に失敗しました`);
      }
      
      // アニメーション終了までに少し待つ
      setTimeout(() => {
        setAnimatingUserId(null);
      }, 800);
    } catch (error) {
      console.error('フォロー処理エラー:', error);
      toast.error('フォロー処理に失敗しました');
      
      // エラーが発生した場合、状態を元に戻す（ロールバック）
      if (isFollowing) {
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });
        
        // フォロー一覧の状態も戻す
        if (activeTab === 'follows') {
          // フォロー数も元に戻す
          setFollowsPagination(prev => ({
            ...prev,
            total: prev.total + 1
          }));
          
          // 一覧を再読み込み
          fetchFollows();
        }
      } else {
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
      
      // アニメーションの状態もリセット
      setAnimatingUserId(null);
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

  if (!isSignedIn) {
    router.push('/timeline');
    return null;
  }

  return (
    <PageLayout>
      <ContentLayout
        title="CONNECTIONS"
        subtitle="フォロー中のユーザーとフォロワーを管理"
        backUrl="/dashboard"
        backText="ダッシュボードに戻る"
        contentClass="p-4 max-w-full"
      >
        <div className="bg-white rounded-lg shadow-sm p-6 w-full overflow-hidden">
          {/* タブ切り替え */}
          <div className="flex space-x-1 border-b mb-6">
            <button
              onClick={() => handleTabChange('follows')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none",
                activeTab === 'follows'
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              フォロー中 {followsPagination.total > 0 && `(${followsPagination.total})`}
            </button>
            <button
              onClick={() => handleTabChange('followers')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none",
                activeTab === 'followers'
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              フォロワー {followersPagination.total > 0 && `(${followersPagination.total})`}
            </button>
          </div>
          
          {/* エラー表示 */}
          {activeTab === 'follows' && followsError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {followsError}
            </div>
          )}
          {activeTab === 'followers' && followersError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {followersError}
            </div>
          )}
          
          {/* フォロー中ユーザー一覧 */}
          {activeTab === 'follows' && (
            <>
              {followsLoading && follows.length === 0 ? (
                <div className="text-center py-12">
                  <Loading message="フォロー中ユーザーを読み込み中..." />
                </div>
              ) : follows.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaUserFriends className="mx-auto text-4xl mb-4 text-gray-400" />
                  <p className="text-lg mb-1">まだフォローしているユーザーはいません</p>
                  <p className="text-sm mb-4">気になるユーザーをフォローしましょう</p>
                  <Link href="/timeline" className="inline-block px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                    タイムラインを見る
                  </Link>
                </div>
              ) : (
                <InfiniteScroll
                  hasNextPage={followsPagination.hasNextPage}
                  isLoading={followsLoading}
                  onLoadMore={loadMoreFollows}
                  threshold={0.8}
                >
                  <div className="space-y-1">
                    {follows.map((follow) => (
                      <div key={follow.id} className="p-4 border-b hover:bg-gray-50 transition-colors relative">
                        <div className="flex flex-col w-full">
                          <div className="flex items-start">
                            <Link href={`/profile/${follow.following_user.username}`} className="mr-3">
                              <UserAvatar 
                                imageUrl={follow.following_user.profile_image_url}
                                username={follow.following_user.username}
                                size={48} 
                              />
                            </Link>
                            
                            <div className="flex-grow overflow-hidden min-w-0">
                              <div className="flex items-center justify-between">
                                <Link href={`/profile/${follow.following_user.username}`} className="hover:underline">
                                  <h3 className="font-bold truncate">
                                    {follow.following_user.first_name && follow.following_user.last_name
                                      ? `${follow.following_user.first_name} ${follow.following_user.last_name}`
                                      : follow.following_user.username}
                                  </h3>
                                </Link>
                                
                                <div className="relative flex-shrink-0">
                                  <button 
                                    onClick={(e) => toggleMenu(follow.id, e)}
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                    aria-label="メニューを開く"
                                  >
                                    <FaEllipsisH />
                                  </button>
                                  
                                  {openMenuId === follow.id && 
                                    renderMenu(follow.id, follow.following_user.id, follow.following_user.username)
                                  }
                                </div>
                              </div>
                              
                              <p className="text-gray-600 truncate">@{follow.following_user.username}</p>
                              
                              {follow.following_user.bio && (
                                <p className="mt-1 text-gray-700 line-clamp-2 break-words text-sm">{follow.following_user.bio}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                フォロー日: {new Date(follow.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {followsLoading && follows.length > 0 && (
                    <div className="py-4 flex justify-center">
                      <Loading message="読み込み中..." size="sm" />
                    </div>
                  )}
                </InfiniteScroll>
              )}
            </>
          )}
          
          {/* フォロワー一覧 */}
          {activeTab === 'followers' && (
            <>
              {followersLoading && followers.length === 0 ? (
                <div className="text-center py-12">
                  <Loading message="フォロワーを読み込み中..." />
                </div>
              ) : followers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaUserFriends className="mx-auto text-4xl mb-4 text-gray-400" />
                  <p className="text-lg mb-1">まだフォロワーはいません</p>
                  <p className="text-sm mb-4">他のユーザーとつながりましょう</p>
                  <Link href="/timeline" className="inline-block px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                    タイムラインを見る
                  </Link>
                </div>
              ) : (
                <InfiniteScroll
                  hasNextPage={followersPagination.hasNextPage}
                  isLoading={followersLoading}
                  onLoadMore={loadMoreFollowers}
                  threshold={0.8}
                >
                  <div className="space-y-1">
                    {followers.map((follower) => (
                      <div key={follower.id} className="p-4 border-b hover:bg-gray-50 transition-colors relative">
                        <div className="flex flex-col w-full">
                          <div className="flex items-start">
                            <Link href={`/profile/${follower.follower_user.username}`} className="mr-3 flex-shrink-0">
                              <UserAvatar 
                                imageUrl={follower.follower_user.profile_image_url}
                                username={follower.follower_user.username}
                                size={48} 
                              />
                            </Link>
                            
                            <div className="flex-grow overflow-hidden min-w-0">
                              <div className="flex justify-between items-start">
                                <div className="min-w-0 pr-2">
                                  <Link href={`/profile/${follower.follower_user.username}`} className="hover:underline">
                                    <h3 className="font-bold truncate">
                                      {follower.follower_user.first_name && follower.follower_user.last_name
                                        ? `${follower.follower_user.first_name} ${follower.follower_user.last_name}`
                                        : follower.follower_user.username}
                                    </h3>
                                  </Link>
                                  <p className="text-gray-600 truncate">@{follower.follower_user.username}</p>
                                </div>
                                
                                <div className="flex-shrink-0">
                                  {!followingIds.has(follower.follower_user.id) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFollowToggle(
                                          follower.follower_user.id, 
                                          follower.follower_user.username, 
                                          false
                                        );
                                      }}
                                      className={`px-3 py-1 rounded-full text-sm font-medium flex items-center bg-blue-500 text-white hover:bg-blue-600 whitespace-nowrap ${
                                        animatingUserId === follower.follower_user.id ? 'follow-animation' : ''
                                      }`}
                                    >
                                      <FaUserPlus className="mr-1" />
                                      フォロー
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {follower.follower_user.bio && (
                                <p className="mt-1 text-gray-700 line-clamp-2 break-words text-sm">{follower.follower_user.bio}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                フォロワー登録日: {new Date(follower.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {followersLoading && followers.length > 0 && (
                    <div className="py-4 flex justify-center">
                      <Loading message="読み込み中..." size="sm" />
                    </div>
                  )}
                </InfiniteScroll>
              )}
            </>
          )}
        </div>
      </ContentLayout>
      
      {/* フォロー/フォロー解除のアニメーションスタイルを追加 */}
      <style jsx global>{`
        .follow-animation {
          animation: follow-pulse 0.8s ease;
        }
        
        @keyframes follow-pulse {
          0% { transform: scale(1); }
          30% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .unfollow-animation {
          animation: unfollow-fade 0.8s ease;
        }
        
        @keyframes unfollow-fade {
          0% { background-color: rgba(220, 38, 38, 0.1); }
          50% { background-color: rgba(220, 38, 38, 0.2); }
          100% { background-color: transparent; }
        }

        @media (max-width: 640px) {
          .follower-card-content {
            width: 100%;
          }
          
          .follower-card-content .user-info {
            max-width: calc(100% - 20px);
          }
          
          .follower-card-content .follow-button {
            margin-top: 8px;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </PageLayout>
  );
} 