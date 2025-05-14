'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { FaEdit, FaRegTrashAlt, FaExclamationCircle } from 'react-icons/fa';
import Loading from '@/components/Loading';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import InfiniteScroll from '@/components/InfiniteScroll';
import { ITEMS_PER_PAGE } from '@/constants/pagination';
import { toast } from 'sonner';
import PostModal from '@/components/PostModal';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';

// メディアのインターフェース定義
interface Media {
  id?: number;
  url: string;
  mediaType: 'image' | 'video';
  media_type?: 'image' | 'video'; // APIレスポンスで返る形式に対応
  width?: number;
  height?: number;
  duration_sec?: number;
}

// 返信先投稿のインターフェース - PostModalのPostData型に合わせる
interface ReplyToPost {
  id: number;
  content: string;
  user?: {
    username?: string;
  };
}

interface Draft {
  id: number;
  content: string;
  in_reply_to_post_id?: number | null;
  media?: Media[];
  created_at: string;
  updated_at: string;
  replyToPost?: ReplyToPost;
}

interface PaginationInfo {
  hasNextPage: boolean;
  nextCursor: string | null;
}

export default function DraftsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    hasNextPage: false,
    nextCursor: null
  });
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 下書き一覧を取得する関数
  const fetchDrafts = async (cursor?: string, append: boolean = false) => {
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
      
      const response = await fetch(`/api/drafts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`下書きの取得に失敗しました (${response.status})`);
      }
      
      const data = await response.json();
      
      if (append) {
        // 既存の下書きに追加
        setDrafts(prevDrafts => [...prevDrafts, ...data.drafts]);
      } else {
        // 初期ロード時は置き換え
        setDrafts(data.drafts || []);
      }
      
      setPagination({
        hasNextPage: data.pagination?.hasNextPage || false,
        nextCursor: data.pagination?.nextCursor || null
      });
    } catch (error) {
      console.error('下書き取得エラー:', error);
      setError('下書きの読み込みに失敗しました。再度お試しください。');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchDrafts();
    } else if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, refreshKey, router]);

  // 続きを読み込む
  const loadMoreDrafts = () => {
    if (pagination.hasNextPage && pagination.nextCursor && !loading && !isLoadingMore) {
      fetchDrafts(pagination.nextCursor, true);
    }
  };

  // 下書きを削除する関数
  const handleDeleteDraft = async (draftId: number) => {
    try {
      const response = await fetch(`/api/drafts?id=${draftId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('下書きの削除に失敗しました');
      }
      
      // 成功したら一覧から削除
      setDrafts(prevDrafts => prevDrafts.filter(draft => draft.id !== draftId));
      toast.success('下書きを削除しました');
    } catch (error) {
      console.error('下書き削除エラー:', error);
      toast.error('下書きの削除に失敗しました');
    }
  };

  // 下書きを編集する関数
  const handleEditDraft = (draft: Draft) => {
    setSelectedDraft(draft);
    setIsPostModalOpen(true);
  };

  // モーダルが閉じられたときの処理
  const handleClosePostModal = (postSubmitted = false) => {
    setIsPostModalOpen(false);
    setSelectedDraft(null);
    
    // 投稿が行われた場合またはモーダルが閉じられた場合は一覧を更新
    if (postSubmitted) {
      setRefreshKey(prev => prev + 1);
    } else {
      // 下書き保存の場合も一覧を更新
      setRefreshKey(prev => prev + 1);
    }
  };

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
        title="DRAFTS"
        subtitle="保存した下書きを表示"
        backUrl="/dashboard"
        backText="ダッシュボードに戻る"
      >
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {loading && drafts.length === 0 ? (
          <div className="py-8 flex justify-center">
            <Loading message="読み込み中..." />
          </div>
        ) : drafts.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-gray-500 mb-6">
              <FaExclamationCircle className="mx-auto text-4xl mb-4 text-gray-400" />
              <p className="text-lg mb-1">下書きはありません</p>
              <p className="text-sm mb-4">投稿フォームから下書き保存ボタンを使って下書きを作成できます</p>
            </div>
          </div>
        ) : (
          <InfiniteScroll
            onLoadMore={loadMoreDrafts}
            hasNextPage={pagination.hasNextPage}
            isLoading={isLoadingMore}
          >
            <div className="space-y-4">
              {drafts.map(draft => (
                <div key={draft.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <div className="mb-2 text-sm text-gray-500">
                    {draft.in_reply_to_post_id ? (
                      <span className="flex items-center">
                        <span>返信の下書き</span>
                        {draft.replyToPost && (
                          <span className="ml-1">
                            - 返信先: @{draft.replyToPost.user?.username || 'user'}
                          </span>
                        )}
                      </span>
                    ) : (
                      '投稿の下書き'
                    )} - 
                    最終更新: {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true, locale: ja })}
                  </div>
                  <div className="mb-3 line-clamp-3">{draft.content}</div>
                  
                  {/* メディア表示エリア */}
                  {draft.media && draft.media.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {draft.media.map((mediaItem, index) => (
                        <div key={index} className="relative rounded overflow-hidden" style={{ maxWidth: '200px', maxHeight: '150px' }}>
                          {(mediaItem.mediaType === 'image' || mediaItem.media_type === 'image') ? (
                            <div className="relative w-[200px] h-[150px]">
                              <Image 
                                src={mediaItem.url} 
                                alt="添付画像" 
                                className="object-cover"
                                fill
                                sizes="200px"
                              />
                            </div>
                          ) : (
                            <div className="relative w-[200px] h-[150px] bg-gray-100 flex items-center justify-center">
                              <video 
                                src={mediaItem.url} 
                                className="object-cover w-full h-full"
                                controls
                                muted
                              />
                              <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5">
                                動画
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="px-3 py-1 text-sm text-red-500 hover:text-red-700 flex items-center"
                    >
                      <FaRegTrashAlt className="mr-1" /> 削除
                    </button>
                    <button
                      onClick={() => handleEditDraft(draft)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center"
                    >
                      <FaEdit className="mr-1" /> 編集
                    </button>
                  </div>
                </div>
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
      
      {/* 投稿モーダル - 新規作成または下書き編集 */}
      {isPostModalOpen && (
        <PostModal
          isOpen={isPostModalOpen}
          onClose={handleClosePostModal}
          initialType={selectedDraft?.in_reply_to_post_id ? "reply" : "post"}
          initialContent={selectedDraft?.content || ''}
          replyToPost={selectedDraft?.replyToPost}
          replyToPostId={selectedDraft?.in_reply_to_post_id || null}
          draftId={selectedDraft?.id || null}
          initialMedia={selectedDraft?.media}
        />
      )}
    </PageLayout>
  );
} 