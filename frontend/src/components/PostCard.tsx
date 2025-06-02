'use client';

import Link from 'next/link';
import { FaRetweet } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import UserAvatar from './UserAvatar';
import PostModal from './PostModal';
import ContentRenderer from './ContentRenderer';
import PostMedia from './PostMedia';
import PostMenu from './PostMenu';
import PostActions from './PostActions';
import PostQuotePreview from './PostQuotePreview';
import PostReplyInfo from './PostReplyInfo';
import { PostCardProps } from '@/types/post';
import { formatDate } from '@/utils/dateFormatter';
import { toast } from 'sonner';

// Define media type
export interface Media {
  id?: number;
  post_id?: number;
  url: string;
  mediaType: 'image' | 'video';
  width?: number | null;
  height?: number | null;
  duration_sec?: number | null;
}

export default function PostCard({
  post,
  onLikeStateChange,
  onRepostStateChange,
  onBookmarkStateChange,
  onQuote,
  onPostAction,
  onDeletePost,
  showActions = true,
  replyCount: initialReplyCount = 0,
  repostCount = 0,
  likeCount = 0,
  quoteCount = 0,
  isLiked: initialIsLiked = false,
  isBookmarked: initialIsBookmarked = false,
  onReplySuccess,
  hideReplyInfo = false,
  compactMode = false
}: PostCardProps) {
  // ログイン中のユーザー情報を取得
  const { user, isSignedIn } = useUser();
  
  // 自分の投稿かどうかを判定
  const isOwnPost = (() => {
    if (!isSignedIn || !user) return false;
    
    // 複数の方法でチェック
    // 1. ユーザー名で比較（最も信頼性が高い）
    if (user.username && post.user?.username) {
      if (user.username === post.user.username) {
        return true;
      }
    }
    
    // 2. Clerk IDでチェック
    if (post.user?.clerk_id && user.id) {
      if (post.user.clerk_id === user.id) {
        return true;
      }
    }
    
    // 手動チェック（開発時のデバッグ用）
    const forceOwnPostIds: number[] = []; // 自分の投稿のIDリスト
    if (forceOwnPostIds.includes(post.id)) {
      return true;
    }
    
    return false;
  })();
  
  // 状態管理
  const [isLiked, setIsLiked] = useState(post.is_liked !== undefined ? post.is_liked : initialIsLiked);
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked !== undefined ? post.is_bookmarked : initialIsBookmarked);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count !== undefined ? post.like_count : likeCount);
  const [localBookmarkCount, setLocalBookmarkCount] = useState(post.bookmark_count !== undefined ? post.bookmark_count : 0);
  const [localReplyCount, setLocalReplyCount] = useState(post.reply_count !== undefined ? post.reply_count : initialReplyCount);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false);
  const [showAbsoluteTime, setShowAbsoluteTime] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // Refs
  const postCardRef = useRef<HTMLDivElement>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarkButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // props変更時に状態を更新
  useEffect(() => {
    setIsLiked(post.is_liked !== undefined ? post.is_liked : initialIsLiked);
  }, [post.is_liked, initialIsLiked]);

  useEffect(() => {
    setIsBookmarked(post.is_bookmarked !== undefined ? post.is_bookmarked : initialIsBookmarked);
  }, [post.is_bookmarked, initialIsBookmarked]);

  useEffect(() => {
    setLocalLikeCount(post.like_count !== undefined ? post.like_count : likeCount);
  }, [post.like_count, likeCount]);

  useEffect(() => {
    setLocalReplyCount(post.reply_count !== undefined ? post.reply_count : initialReplyCount);
  }, [post.reply_count, initialReplyCount]);
  
  useEffect(() => {
    setLocalBookmarkCount(post.bookmark_count !== undefined ? post.bookmark_count : 0);
  }, [post.bookmark_count]);

  // メニューの外側をクリックした時にメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 日時表示切り替え
  const toggleTimeFormat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAbsoluteTime(!showAbsoluteTime);
  };

  // いいね処理
  const handleLikeAction = async () => {
    // いいねアニメーションを追加
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 450);
    
    // オプティミスティックUI更新
    const previousIsLiked = isLiked;
    const previousLikeCount = localLikeCount;
    setIsLiked(!isLiked);
    setLocalLikeCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
    
    try {
      // APIリクエスト
      const response = await fetch(`/api/posts/${post.id}/likes`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        // APIからの返答でいいね数と状態を更新
        setIsLiked(data.liked);
        setLocalLikeCount(data.like_count);
        
        // 親コンポーネントに通知
        if (onLikeStateChange) {
          onLikeStateChange(post.id, data.liked, data.like_count);
        }
      } else {
        // APIエラー時は元の状態に戻す
        setIsLiked(previousIsLiked);
        setLocalLikeCount(previousLikeCount);
        console.error('いいね処理APIエラー:', await response.text());
      }
    } catch (error) {
      // 例外発生時も元の状態に戻す
      setIsLiked(previousIsLiked);
      setLocalLikeCount(previousLikeCount);
      console.error('いいね処理エラー:', error);
    }
    
    // 古い通知方法 - 互換性のため残す
    if (onPostAction) {
      onPostAction('like', post.id);
    }
  };

  // リポスト処理
  const handleRepostAction = async () => {
    try {
      // 現在は親コンポーネントへの通知のみ
      if (onRepostStateChange) {
        onRepostStateChange(post.id, true);
      }
    } catch (error) {
      console.error('リポスト処理エラー:', error);
    }
    
    // 古い通知方法
    if (onPostAction) {
      onPostAction('repost', post.id);
    }
  };

  // 返信処理
  const handleReplyAction = () => {
    setIsReplyModalOpen(true);
  };

  // 返信モーダルクローズ処理
  const handleReplyModalClose = (postSubmitted = false) => {
    setIsReplyModalOpen(false);
    
    if (postSubmitted) {
      // リプライのアニメーション効果
      if (postCardRef.current) {
        postCardRef.current.classList.add('reply-success-flash');
        setTimeout(() => {
          if (postCardRef.current) {
            postCardRef.current.classList.remove('reply-success-flash');
          }
        }, 1000);
      }
      
      // 返信カウントを増やす
      setLocalReplyCount(prev => prev + 1);
      
      // 返信成功のコールバック
      if (onReplySuccess) {
        onReplySuccess(post.id);
      }
    }
  };

  // 引用処理
  const handleQuoteAction = () => {
    if (onQuote) {
      onQuote(post.id);
    } else if (onPostAction) {
      onPostAction('quote', post.id);
    }
  };

  // ブックマーク処理
  const handleBookmarkAction = async () => {
    try {
      // クリック時のアニメーション
      setBookmarkAnimating(true);
      setTimeout(() => setBookmarkAnimating(false), 300);
      
      const currentIsBookmarked = isBookmarked;
      const currentCount = localBookmarkCount;
      
      // 楽観的UI更新
      setIsBookmarked(!currentIsBookmarked);
      setLocalBookmarkCount(prev => currentIsBookmarked ? Math.max(0, prev - 1) : prev + 1);
      
      // APIリクエスト
      const response = await fetch(`/api/posts/${post.id}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // エラー時は元の状態に戻す
        setIsBookmarked(currentIsBookmarked);
        setLocalBookmarkCount(currentCount);
        throw new Error(`ブックマーク処理に失敗しました (${response.status})`);
      }
      
      const data = await response.json();
      
      // 成功時はサーバからの情報で更新
      setIsBookmarked(data.bookmarked);
      setLocalBookmarkCount(data.bookmark_count);
      
      // 親コンポーネントに通知
      if (onBookmarkStateChange) {
        onBookmarkStateChange(post.id, data.bookmarked, data.bookmark_count);
      }
      
      // その他のアクション通知
      if (onPostAction) {
        onPostAction(data.bookmarked ? 'bookmark' : 'unbookmark', post.id);
      }
    } catch (error) {
      console.error('ブックマーク処理エラー:', error);
    }
  };

  // 削除処理
  const handleDeletePost = async () => {
    if (!window.confirm('この投稿を削除してもよろしいですか？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // 削除成功
        if (onDeletePost) {
          onDeletePost(post.id);
        }
        
        // アクション通知
        if (onPostAction) {
          onPostAction('delete', post.id);
        }
      } else {
        const errorData = await response.json();
        console.error('投稿削除エラー:', errorData);
        
        // エラーメッセージをユーザーに表示
        if (response.status === 403) {
          alert('この投稿を削除する権限がありません');
        } else if (response.status === 404) {
          alert('投稿が見つかりません');
        } else {
          alert(`投稿の削除に失敗しました: ${errorData.error || '不明なエラー'}`);
        }
      }
    } catch (error) {
      console.error('投稿削除エラー:', error);
      alert('投稿の削除に失敗しました: ネットワークエラー');
    }
    
    // メニューを閉じる
    setShowMenu(false);
  };

  // メニュー表示切り替え
  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  // 投稿詳細ページへの遷移
  const navigateToPost = (e: React.MouseEvent) => {
    // ボタンやリンク要素がクリックされた場合は、遷移しない
    const isInteractive = (target: Element) => {
      return (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a')
      );
    };
    
    // インタラクティブ要素のクリックでなければ投稿詳細へ遷移
    if (!isInteractive(e.target as Element)) {
      window.location.href = `/post/${post.id}`;
    }
  };

  // ブロック処理
  const handleBlockUser = async (userId: number, username: string) => {
    // ブロック操作を実行中に操作不可にする
    setActionInProgress(true);
    
    try {
      // Optimistic UI更新
      toast.success(`${username}さんをブロックしました`);
      
      // アニメーション表示
      if (postCardRef.current) {
        postCardRef.current.classList.add('block-animation');
      }
      
      // APIコール
      const response = await fetch(`/api/users/${userId}/block`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('ブロックに失敗しました');
      }
      
      // メニューを閉じる
      setShowMenu(false);
    } catch (error) {
      console.error('ブロック処理エラー:', error);
      toast.error('ブロック処理中にエラーが発生しました');
      
      // エラー時はアニメーションを元に戻す
      if (postCardRef.current) {
        postCardRef.current.classList.remove('block-animation');
      }
    } finally {
      setActionInProgress(false);
    }
  };
  
  // 返信先の投稿データ
  const replyToPostData = post.in_reply_to_post || null;

  return (
    <>
      <div 
        ref={postCardRef}
        className={`border-b border-gray-200 p-4 hover:bg-gray-50 transition-all duration-200 ${compactMode ? 'py-3' : ''} post-card-container`}
        onClick={navigateToPost}
        role="article"
      >
        {/* リポストの場合 */}
        {post.post_type === 'repost' && (
          <div className="flex items-center text-gray-500 text-sm mb-2">
            <FaRetweet className="mr-2 text-green-500" />
            <span>リポストされました</span>
          </div>
        )}

        {/* 返信情報 - hideReplyInfoがfalseの場合のみ表示 */}
        {!hideReplyInfo && post.post_type === 'reply' && (
          <PostReplyInfo 
            replyToPostId={post.in_reply_to_post_id}
            replyToPost={replyToPostData}
          />
        )}

        {/* 引用投稿の場合、引用元のプレビューを追加 */}
        {post.post_type === 'quote' && post.quote_of_post && (
          <PostQuotePreview 
            quotePost={post.quote_of_post}
            quotePostId={post.quote_of_post_id!}
          />
        )}
        
        <div className="flex">
          {/* プロフィール画像 */}
          <div className="mr-3 flex-shrink-0">
            <Link href={`/profile/${post.user?.username}`}>
              <UserAvatar 
                imageUrl={post.user?.profile_image_url} 
                username={post.user?.username || 'ユーザー'} 
                size={compactMode ? 32 : 40} 
              />
            </Link>
          </div>
          
          {/* 投稿の本文 */}
          <div className="flex-1 min-w-0">
            {/* ユーザー情報 - 1行目 */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center flex-wrap">
                <Link href={`/profile/${post.user?.username}`} className="font-bold hover:underline mr-2">
                  {post.user?.username || 'ユーザー'}
                </Link>
                <span className="text-gray-500 text-sm">@{post.user?.username}</span>
                <span className="mx-1 text-gray-500">·</span>
                <button 
                  onClick={toggleTimeFormat} 
                  className="text-gray-500 text-sm hover:underline cursor-pointer bg-transparent border-0 p-0 m-0"
                >
                  {formatDate(post.created_at, showAbsoluteTime)}
                </button>
              </div>

              {/* メニュー */}
              <PostMenu
                isOwnPost={isOwnPost}
                showMenu={showMenu}
                username={post.user?.username || 'ユーザー'}
                userId={post.user_id}
                actionInProgress={actionInProgress}
                menuRef={menuRef}
                onToggleMenu={toggleMenu}
                onDelete={handleDeletePost}
                onBlockUser={handleBlockUser}
              />
            </div>
            
            {/* 投稿内容 */}
            <div className="mb-2 relative post-content-container">
              <ContentRenderer 
                text={post.content} 
                className="relative w-full" 
              />
            </div>
            
            {/* メディア表示部分 */}
            {post.media && post.media.length > 0 && (
              <PostMedia 
                media={post.media}
                postId={post.id}
              />
            )}
            
            {/* アクションボタン */}
            {showActions && (
              <PostActions
                postId={post.id}
                isLiked={isLiked}
                isBookmarked={isBookmarked}
                replyCount={localReplyCount}
                repostCount={repostCount}
                likeCount={localLikeCount}
                quoteCount={quoteCount}
                bookmarkCount={localBookmarkCount}
                likeAnimating={likeAnimating}
                bookmarkAnimating={bookmarkAnimating}
                likeButtonRef={likeButtonRef}
                bookmarkButtonRef={bookmarkButtonRef}
                onReply={handleReplyAction}
                onLike={handleLikeAction}
                onRepost={handleRepostAction}
                onQuote={handleQuoteAction}
                onBookmark={handleBookmarkAction}
              />
            )}
          </div>
        </div>
      </div>

      {/* 返信モーダル */}
      <PostModal
        isOpen={isReplyModalOpen}
        onClose={handleReplyModalClose}
        initialType="reply"
        replyToPost={post.user ? { id: post.id, content: post.content, user: { username: post.user.username } } : { id: post.id, content: post.content }}
      />
      
      {/* アニメーション用スタイル */}
      <style jsx global>{`
        .reply-success-flash {
          animation: reply-flash 1s ease;
        }
        
        @keyframes reply-flash {
          0% { background-color: rgba(59, 130, 246, 0.1); }
          50% { background-color: rgba(59, 130, 246, 0.2); }
          100% { background-color: rgba(255, 255, 255, 0); }
        }
        
        .block-animation {
          animation: block-fade 0.8s ease forwards;
          position: relative;
          overflow: hidden;
        }
        
        .block-animation::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(239, 68, 68, 0.1);
          z-index: 1;
          animation: block-flash 0.8s ease forwards;
        }
        
        @keyframes block-fade {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
          100% { opacity: 0.6; transform: scale(0.95); filter: grayscale(1); }
        }
        
        @keyframes block-flash {
          0% { background-color: rgba(239, 68, 68, 0); }
          30% { background-color: rgba(239, 68, 68, 0.2); }
          100% { background-color: rgba(239, 68, 68, 0.1); }
        }
      `}</style>
    </>
  );
} 