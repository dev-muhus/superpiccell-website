'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaUnlock, FaEllipsisH } from 'react-icons/fa';
import Loading from '@/components/Loading';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import UserAvatar from '@/components/UserAvatar';
import InfiniteScroll from '@/components/InfiniteScroll';
import { ITEMS_PER_PAGE } from '@/constants/pagination';
import { toast } from 'sonner';

interface BlockedUser {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
}

interface Block {
  id: number;
  blocker_id: number;
  blocked_id: number;
  created_at: string;
  blocked_user: BlockedUser;
}

interface Pagination {
  hasNextPage: boolean;
  nextCursor: string | null;
  total: number;
}

export default function BlocksPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    hasNextPage: false,
    nextCursor: null,
    total: 0
  });
  
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // ブロック一覧を取得
  const fetchBlocks = async (cursor?: string, append: boolean = false) => {
    try {
      if (!append) {
        setIsLoading(true);
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
      
      const response = await fetch(`/api/blocks?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('ブロック一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      
      // ページネーション情報を更新
      setPagination({
        hasNextPage: data.pagination.hasNextPage,
        nextCursor: data.pagination.nextCursor,
        total: data.pagination.total
      });
      
      // 既存のブロックに追加するか、置き換えるか
      if (append) {
        setBlocks(prev => [...prev, ...data.blocks]);
      } else {
        setBlocks(data.blocks);
      }
    } catch (error) {
      console.error('ブロック一覧取得エラー:', error);
      setError('ブロック一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchBlocks();
    } else if (isLoaded && !isSignedIn) {
      // 未ログインの場合はタイムラインにリダイレクト
      router.push('/timeline');
    }
  }, [isLoaded, isSignedIn, router]);

  // 次のページを読み込む
  const loadMoreBlocks = () => {
    if (pagination.hasNextPage && pagination.nextCursor) {
      fetchBlocks(pagination.nextCursor, true);
    }
  };

  // メニューの表示を切り替え
  const toggleMenu = (id: number) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  // ブロック解除の処理
  const handleUnblock = async (userId: number, username: string) => {
    // 先にUIを更新（Optimistic UI）
    const removedBlock = blocks.find(block => block.blocked_id === userId);
    
    try {
      // 成功したらリストから削除
      setBlocks(prev => prev.filter(block => block.blocked_id !== userId));
      // ページネーションの数字も更新
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1
      }));
      
      // メニューを閉じる
      setOpenMenuId(null);
      
      toast.success(`${username}さんのブロックを解除しました`);
      
      // APIコールは並行して行う
      const response = await fetch(`/api/users/${userId}/block`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('ブロック解除に失敗しました');
      }
    } catch (error) {
      console.error('ブロック解除エラー:', error);
      toast.error('ブロック解除に失敗しました');
      
      // エラーが発生した場合、削除したブロックを元に戻す（ロールバック）
      if (removedBlock) {
        setBlocks(prev => [...prev, removedBlock]);
        setPagination(prev => ({
          ...prev,
          total: prev.total + 1
        }));
      }
    }
  };

  // 認証ロード中
  if (!isLoaded) {
    return (
      <PageLayout>
        <ContentLayout
          title="BLOCKS"
          subtitle="ブロック中のユーザー一覧"
          backUrl="/dashboard"
          backText="ダッシュボードに戻る"
          contentClass="p-4 max-w-full"
        >
          <div className="flex justify-center items-center h-64">
            <Loading />
          </div>
        </ContentLayout>
      </PageLayout>
    );
  }

  // サインインしていない場合
  if (!isSignedIn) {
    router.push('/timeline');
    return (
      <PageLayout>
        <ContentLayout
          title="BLOCKS"
          subtitle="ブロック中のユーザー一覧"
          backUrl="/dashboard"
          backText="ダッシュボードに戻る"
          contentClass="p-4 max-w-full"
        >
          <div className="flex justify-center items-center h-64">
            <Loading message="リダイレクト中..." />
          </div>
        </ContentLayout>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <ContentLayout
        title="BLOCKS"
        subtitle="ブロック中のユーザー一覧"
        backUrl="/dashboard"
        backText="ダッシュボードに戻る"
        contentClass="p-4 max-w-full"
      >
        <div className="bg-white rounded-lg shadow-sm p-6 w-full overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">ブロック中ユーザー</h3>
            <div className="text-sm text-gray-500">
              {pagination.total}人のユーザーをブロック中
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {isLoading && blocks.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loading message="ブロック中ユーザーを読み込み中..." />
            </div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              ブロック中のユーザーはいません
            </div>
          ) : (
            <InfiniteScroll
              hasNextPage={pagination.hasNextPage}
              isLoading={isLoading}
              onLoadMore={loadMoreBlocks}
              threshold={0.8}
            >
              <div className="space-y-1">
                {blocks.map((block) => (
                  <div key={block.id} className="p-4 border-b hover:bg-gray-50 transition-colors relative">
                    <div className="flex items-start">
                      <Link href={`/profile/${block.blocked_user.username}`} className="mr-3">
                        <UserAvatar 
                          imageUrl={block.blocked_user.profile_image_url}
                          username={block.blocked_user.username}
                          size={48} 
                        />
                      </Link>
                      
                      <div className="flex-grow overflow-hidden">
                        <Link href={`/profile/${block.blocked_user.username}`} className="hover:underline">
                          <h3 className="font-bold truncate">
                            {block.blocked_user.first_name && block.blocked_user.last_name
                              ? `${block.blocked_user.first_name} ${block.blocked_user.last_name}`
                              : block.blocked_user.username}
                          </h3>
                        </Link>
                        <p className="text-gray-600">@{block.blocked_user.username}</p>
                        {block.blocked_user.bio && (
                          <p className="mt-1 text-gray-700 line-clamp-2 break-words">{block.blocked_user.bio}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          ブロック日: {new Date(block.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="relative flex-shrink-0">
                        <button 
                          onClick={() => toggleMenu(block.id)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                        >
                          <FaEllipsisH />
                        </button>
                        
                        {openMenuId === block.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10">
                            <div className="py-1">
                              <button
                                onClick={() => handleUnblock(block.blocked_id, block.blocked_user.username)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <FaUnlock className="mr-2" /> ブロック解除
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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