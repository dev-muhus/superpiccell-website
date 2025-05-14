'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaRetweet, FaRegComment, FaHeart, FaRegHeart, FaShareAlt, FaBookmark, FaRegBookmark, FaReply, FaEllipsisH, FaTrash, FaEdit, FaBellSlash, FaBan } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import UserAvatar from './UserAvatar';
import PostModal from './PostModal';
import ContentRenderer from './ContentRenderer';
import { toast } from 'sonner';

interface User {
  id: number;
  username: string;
  profile_image_url?: string;
  first_name?: string;
  last_name?: string;
  clerk_id?: string;
}

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

export interface PostCardProps {
  post: {
    id: number;
    content: string;
    created_at: string;
    post_type: 'original' | 'reply' | 'quote' | 'repost';
    media?: Array<{
      id?: number;
      url: string;
      mediaType: 'image' | 'video';
      width?: number;
      height?: number;
      duration_sec?: number;
    }>;
    user_id: number;
    in_reply_to_post_id?: number;
    quote_of_post_id?: number;
    repost_of_post_id?: number;
    user: User | null;
    in_reply_to_post?: {
      id: number;
      content: string;
      user: User | null;
      media?: Array<{
        id?: number;
        url: string;
        mediaType: 'image' | 'video';
        width?: number;
        height?: number;
        duration_sec?: number;
      }>;
    } | null;
    quote_of_post?: {
      id: number;
      content: string;
      created_at: string;
      media?: Array<{
        id?: number;
        url: string;
        mediaType: 'image' | 'video';
        width?: number;
        height?: number;
        duration_sec?: number;
      }>;
      user: User | null;
    } | null;
    repost_of_post?: {
      id: number;
      content: string;
      user: User | null;
    } | null;
    reply_count?: number;
    like_count?: number;
    is_liked?: boolean;
    bookmark_count?: number;
    is_bookmarked?: boolean;
  };
  onLikeStateChange?: (postId: number, isLiked: boolean, likeCount: number) => void;
  onRepostStateChange?: (postId: number, isReposted: boolean) => void;
  onBookmarkStateChange?: (postId: number, isBookmarked: boolean, bookmarkCount: number) => void;
  onQuote?: (postId: number) => void;
  onPostAction?: (action: string, postId: number) => void;
  onDeletePost?: (postId: number) => void;
  showActions?: boolean;
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  quoteCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onReplySuccess?: (postId: number) => void;
  hideReplyInfo?: boolean;
  compactMode?: boolean;
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
    // 自分の投稿の場合は強制的にtrueにする例
    const forceOwnPostIds: number[] = []; // 自分の投稿のIDリスト
    if (forceOwnPostIds.includes(post.id)) {
      return true;
    }
    
    return false;
  })();
  
  // 状態管理はpropsから初期化し、内部的な状態変更のみに使用
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
  
  // ポストカードの参照
  const postCardRef = useRef<HTMLDivElement>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarkButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 操作進行中状態管理用
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // propsが変更された場合に状態を更新
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

  const formatDate = (dateString: string, forceAbsolute = false) => {
    try {
      const date = new Date(dateString);
      
      // 絶対時間表示が強制されているか、状態で絶対時間表示が選択されている場合
      if (forceAbsolute || showAbsoluteTime) {
        return date.toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(/\//g, '-');
      }
      
      // 相対時間表示
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      // 24時間以内
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        if (hours < 1) {
          const minutes = Math.floor(diff / (60 * 1000));
          return minutes <= 0 ? 'たった今' : `${minutes}分前`;
        }
        return `${hours}時間前`;
      }
      
      // 日付表示
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    } catch (e) {
      console.error('日付のフォーマットエラー:', e);
      return dateString;
    }
  };

  // 日時表示切り替え
  const toggleTimeFormat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAbsoluteTime(!showAbsoluteTime);
  };

  const handleLikeAction = async () => {
    // いいねアニメーションを追加
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 450); // アニメーション時間と合わせる
    
    // オプティミスティックUI更新（即時反映）
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
        
        // 親コンポーネントに通知（必要な場合のみ）
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

  const handleRepostAction = async () => {
    // リポスト処理はまだ無効化されているので、将来的に実装する場合のテンプレート
    try {
      // 現在は親コンポーネントへの通知のみ
      if (onRepostStateChange) {
        onRepostStateChange(post.id, true);
      }
    } catch (error) {
      console.error('リポスト処理エラー:', error);
    }
    
    // 古い通知方法 - 互換性のため残す
    if (onPostAction) {
      onPostAction('repost', post.id);
    }
  };

  const handleReplyAction = () => {
    // 返信モーダルを開く
    setIsReplyModalOpen(true);
    
    // アナリティクスイベントの記録（実装例）
    try {
      // console.log('返信アクション開始:', post.id);
      // TODO: アナリティクスコード実装
    } catch (error) {
      console.error('アナリティクスエラー:', error);
    }
  };

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
      
      // 返信成功のコールバックがあれば呼び出す
      if (onReplySuccess) {
        onReplySuccess(post.id);
      }
    }
  };

  const handleQuoteAction = () => {
    if (onQuote) {
      onQuote(post.id);
    } else if (onPostAction) {
      onPostAction('quote', post.id);
    }
  };

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

  // 削除処理を実行
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
        
        // アクション通知（互換性のため）
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

  // 返信先の投稿データ
  const replyToPostData = post.in_reply_to_post || null;

  // 投稿詳細ページへの遷移関数
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

  // 他人の投稿の場合の操作
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
      
      // APIコールは並行して行う
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

        {/* 返信の場合 - hideReplyInfoがfalseの場合のみ表示 */}
        {!hideReplyInfo && post.post_type === 'reply' && post.in_reply_to_post_id && (
          <div className="flex items-center text-gray-500 text-sm mb-3">
            <FaReply className="mr-2 text-blue-500" />
            <span>
              {replyToPostData ? (
                <>
                  <Link 
                    href={`/profile/${replyToPostData.user?.username}`} 
                    className="hover:underline text-blue-600 font-medium"
                  >
                    @{replyToPostData.user?.username || 'ユーザー'}
                  </Link>
                  <span className="mx-1">さんの</span>
                  <Link 
                    href={`/post/${post.in_reply_to_post_id}`}
                    className="hover:underline text-blue-600 font-medium"
                  >
                    投稿
                  </Link>
                  <span>への返信</span>
                </>
              ) : (
                <span>投稿への返信</span>
              )}
            </span>
          </div>
        )}

        {/* 返信の場合、返信先のプレビューを表示 - hideReplyInfoがfalseの場合のみ表示 */}
        {!hideReplyInfo && post.post_type === 'reply' && replyToPostData && (
          <div className="mb-3 border-l-2 border-gray-200 pl-3 text-sm text-gray-600">
            <div className="flex items-center">
              <UserAvatar 
                imageUrl={replyToPostData.user?.profile_image_url} 
                username={replyToPostData.user?.username || 'ユーザー'} 
                size={16} 
              />
              <span className="ml-1 font-medium">{replyToPostData.user?.username || 'ユーザー'}</span>
            </div>
            <p className="line-clamp-2 mt-1">{replyToPostData.content}</p>
            
            {/* 返信先投稿のメディアを表示 */}
            {replyToPostData.media && replyToPostData.media.length > 0 && (
              <div className="mt-2 rounded-lg overflow-hidden relative">
                <div className="h-24 w-32 relative rounded-lg overflow-hidden">
                  {(() => {
                    // メディアの判定ロジックを強化
                    const media = replyToPostData.media[0];
                    const url = media.url;
                    const mediaType = media.mediaType || 'image';
                    
                    // URLのパターンも確認して画像か動画かを判定
                    const isImage = 
                      mediaType === 'image' || 
                      url.match(/\.(jpe?g|png|gif|webp)$/i) || 
                      url.includes('/image/');
                      
                    if (isImage) {
                      return (
                        <Image
                          src={url}
                          alt="返信先の画像"
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      );
                    } else {
                      return (
                        <video
                          src={url}
                          className="w-full h-full object-cover"
                          controls
                        >
                          お使いのブラウザは動画再生をサポートしていません。
                        </video>
                      );
                    }
                  })()}
                </div>
                
                {replyToPostData.media.length > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                    +{replyToPostData.media.length - 1}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 引用投稿の場合、引用元のプレビューを追加 */}
        {post.post_type === 'quote' && post.quote_of_post && (
          <div className="mb-3 border rounded-lg border-gray-200 p-3 bg-gray-50">
            <div className="text-sm">
              <Link href={`/post/${post.quote_of_post_id}`} className="hover:underline">
                <div className="flex items-center mb-1">
                  <UserAvatar 
                    imageUrl={post.quote_of_post.user?.profile_image_url} 
                    username={post.quote_of_post.user?.username || 'ユーザー'} 
                    size={20} 
                  />
                  <span className="ml-1 font-medium">{post.quote_of_post.user?.username || 'ユーザー'}</span>
                  <span className="mx-1 text-gray-500">·</span>
                  <span className="text-gray-500 text-xs">{formatDate(post.quote_of_post.created_at)}</span>
                </div>
                <p className="line-clamp-3 mt-1">{post.quote_of_post.content}</p>
                {post.quote_of_post.media && post.quote_of_post.media.length > 0 && (
                  <div className="mt-2 rounded-lg overflow-hidden h-20 w-20 bg-gray-100">
                    <Image
                      src={post.quote_of_post.media[0].url}
                      alt="引用元画像"
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
              </Link>
            </div>
          </div>
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
                  {formatDate(post.created_at)}
                </button>
              </div>

              {/* 3点リーダーメニュー - 常に表示する */}
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={toggleMenu}
                  className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                  aria-label="投稿メニュー"
                >
                  <FaEllipsisH />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white shadow-lg rounded-md overflow-hidden z-10 border border-gray-200">
                    {/* 自分の投稿の場合の操作 */}
                    {isOwnPost ? (
                      <>
                        {/* 削除ボタン */}
                        <button 
                          onClick={handleDeletePost}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-red-500"
                        >
                          <FaTrash className="mr-2" />
                          <span>削除</span>
                        </button>
                        
                        {/* 編集ボタン - 常に非活性 */}
                        <button 
                          disabled
                          className="w-full text-left px-4 py-2 flex items-center text-gray-300 cursor-not-allowed bg-gray-50"
                        >
                          <FaEdit className="mr-2" />
                          <span>編集</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* 他人の投稿の場合の操作 */}
                        {/* ミュート機能 - 非活性 */}
                        <button 
                          disabled
                          className="w-full text-left px-4 py-2 flex items-center text-gray-300 cursor-not-allowed bg-gray-50"
                        >
                          <FaBellSlash className="mr-2" />
                          <span>{post.user?.username || 'ユーザー'}さんをミュート</span>
                        </button>
                        
                        {/* ブロック機能 - 有効化 */}
                        <button 
                          onClick={() => handleBlockUser(post.user_id, post.user?.username || 'ユーザー')}
                          disabled={actionInProgress}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-red-500"
                        >
                          <FaBan className="mr-2" />
                          <span>{post.user?.username || 'ユーザー'}さんをブロック</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* 投稿内容 */}
            <div className="mb-2 relative post-content-container">
              <ContentRenderer 
                text={post.content} 
                className="relative w-full" 
              />
            </div>
            
            {/* メディア表示部分 */}
            {post.media && post.media.length > 0 ? (
              <div className={`rounded-lg overflow-hidden mb-3 relative ${post.media.length > 1 ? 'grid grid-cols-2 gap-1' : ''}`}>
                {post.media.map((media, index) => (
                  <div key={`media-${post.id}-${index}`} className={`${post.media && post.media.length > 1 ? (index === 0 && post.media.length === 3 ? 'col-span-2' : '') : ''} overflow-hidden rounded-lg`}>
                    {media.mediaType === 'image' || media.url.match(/\.(jpe?g|png|gif|webp)$/i) ? (
                      <div className="relative aspect-video">
                        <Image
                          src={media.url}
                          alt={`投稿画像 ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          onError={() => console.log(`投稿画像 ${index + 1} の読み込みに失敗しました`)}
                        />
                      </div>
                    ) : media.mediaType === 'video' || media.url.match(/\.(mp4|webm|mov)$/i) ? (
                      <div className="relative aspect-video">
                        <video
                          src={media.url}
                          controls
                          className="w-full h-full"
                          onError={() => console.log(`投稿動画 ${index + 1} の読み込みに失敗しました`)}
                        >
                          お使いのブラウザは動画再生をサポートしていません。
                        </video>
                      </div>
                    ) : (
                      // mediaTypeが不明な場合、ファイル拡張子から判定
                      <div className="relative aspect-video">
                        {media.url.includes('/image/') ? (
                          <Image
                            src={media.url}
                            alt={`投稿画像 ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            onError={() => console.log(`投稿画像 ${index + 1} の読み込みに失敗しました`)}
                          />
                        ) : (
                          <video
                            src={media.url}
                            controls
                            className="w-full h-full"
                            onError={() => console.log(`投稿動画 ${index + 1} の読み込みに失敗しました`)}
                          >
                            お使いのブラウザは動画再生をサポートしていません。
                          </video>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            
            {/* アクションボタン */}
            {showActions && (
              <div className="flex justify-between mt-3 text-gray-500 flex-wrap xs:flex-nowrap">
                {/* 返信 */}
                <button 
                  onClick={handleReplyAction} 
                  className="flex items-center hover:text-blue-500 transition-colors group"
                  aria-label="コメントする"
                >
                  <span className="flex items-center bg-transparent group-hover:bg-blue-50 rounded-full p-1 sm:p-2 transition-colors">
                    <FaRegComment className="text-sm sm:text-base" />
                    <span className="text-xs ml-1">{localReplyCount > 0 ? localReplyCount : ''}</span>
                  </span>
                </button>
                
                {/* リポスト */}
                <button 
                  onClick={handleRepostAction} 
                  className="flex items-center text-gray-300 group cursor-not-allowed"
                  aria-label="リポストする（現在利用できません）"
                  disabled
                >
                  <span className="flex items-center bg-transparent rounded-full p-1 sm:p-2 transition-colors">
                    <FaRetweet className="text-sm sm:text-base" />
                    <span className="text-xs ml-1">{repostCount > 0 ? repostCount : ''}</span>
                  </span>
                </button>
                
                {/* いいね */}
                <button 
                  ref={likeButtonRef}
                  onClick={handleLikeAction} 
                  className={`flex items-center ${isLiked ? 'text-red-500' : 'hover:text-red-500'} transition-colors group`}
                  aria-label="いいね"
                >
                  <span className={`flex items-center ${isLiked ? 'bg-red-50' : 'bg-transparent group-hover:bg-red-50'} rounded-full p-1 sm:p-2 transition-colors`}>
                    {isLiked ? (
                      <FaHeart className={`text-sm sm:text-base ${likeAnimating ? 'like-animation' : ''}`} />
                    ) : (
                      <FaRegHeart className="text-sm sm:text-base" />
                    )}
                    <span className="text-xs ml-1">{localLikeCount > 0 ? localLikeCount : ''}</span>
                  </span>
                </button>
                
                {/* 引用 */}
                <button 
                  onClick={handleQuoteAction} 
                  className="flex items-center text-gray-300 group cursor-not-allowed"
                  aria-label="引用する（現在利用できません）"
                  disabled
                >
                  <span className="flex items-center bg-transparent rounded-full p-1 sm:p-2 transition-colors">
                    <FaShareAlt className="text-sm sm:text-base" />
                    <span className="text-xs ml-1">{quoteCount > 0 ? quoteCount : ''}</span>
                  </span>
                </button>

                {/* ブックマーク */}
                <button 
                  ref={bookmarkButtonRef}
                  onClick={handleBookmarkAction} 
                  className={`flex items-center ${isBookmarked ? 'text-yellow-500' : 'hover:text-yellow-500'} transition-colors group`}
                  aria-label="ブックマーク"
                >
                  <span className={`flex items-center ${isBookmarked ? 'bg-yellow-50' : 'bg-transparent group-hover:bg-yellow-50'} rounded-full p-1 sm:p-2 transition-colors`}>
                    {isBookmarked ? (
                      <FaBookmark className={`text-sm sm:text-base ${bookmarkAnimating ? 'bookmark-animation' : ''}`} />
                    ) : (
                      <FaRegBookmark className="text-sm sm:text-base" />
                    )}
                    <span className="text-xs ml-1">{localBookmarkCount > 0 ? localBookmarkCount : ''}</span>
                  </span>
                </button>
              </div>
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
      
      {/* リプライ成功時のアニメーションのためのスタイル */}
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