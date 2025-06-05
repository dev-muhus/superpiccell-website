'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  width?: number;
  height?: number;
  duration_sec?: number;
}


// Hook for managing post engagement state
function usePostEngagement(post: any, initialProps: {
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  replyCount: number;
  repostCount?: number;
  isReposted?: boolean;
}) {
  const [isLiked, setIsLiked] = useState(post.is_liked !== undefined ? post.is_liked : initialProps.isLiked);
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked !== undefined ? post.is_bookmarked : initialProps.isBookmarked);
  const [isReposted, setIsReposted] = useState(post.is_reposted !== undefined ? post.is_reposted : (initialProps.isReposted || false)); // リポスト状態
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count !== undefined ? post.like_count : initialProps.likeCount);
  const [localBookmarkCount, setLocalBookmarkCount] = useState(post.bookmark_count !== undefined ? post.bookmark_count : 0);
  const [localReplyCount, setLocalReplyCount] = useState(post.reply_count !== undefined ? post.reply_count : initialProps.replyCount);
  const [localRepostCount, setLocalRepostCount] = useState(post.repost_count !== undefined ? post.repost_count : (initialProps.repostCount || 0));

  // props変更時に状態を更新
  useEffect(() => {
    setIsLiked(post.is_liked !== undefined ? post.is_liked : initialProps.isLiked);
  }, [post.is_liked, initialProps.isLiked]);

  useEffect(() => {
    setIsBookmarked(post.is_bookmarked !== undefined ? post.is_bookmarked : initialProps.isBookmarked);
  }, [post.is_bookmarked, initialProps.isBookmarked]);

  useEffect(() => {
    setLocalLikeCount(post.like_count !== undefined ? post.like_count : initialProps.likeCount);
  }, [post.like_count, initialProps.likeCount]);

  useEffect(() => {
    setLocalReplyCount(post.reply_count !== undefined ? post.reply_count : initialProps.replyCount);
  }, [post.reply_count, initialProps.replyCount]);
  
  useEffect(() => {
    setLocalBookmarkCount(post.bookmark_count !== undefined ? post.bookmark_count : 0);
  }, [post.bookmark_count]);
  
  useEffect(() => {
    setLocalRepostCount(post.repost_count !== undefined ? post.repost_count : (initialProps.repostCount || 0));
  }, [post.repost_count, initialProps.repostCount]);

  useEffect(() => {
    setIsReposted(post.is_reposted !== undefined ? post.is_reposted : (initialProps.isReposted || false));
  }, [post.is_reposted, initialProps.isReposted]);

  return {
    isLiked, setIsLiked,
    isBookmarked, setIsBookmarked,
    isReposted, setIsReposted,
    localLikeCount, setLocalLikeCount,
    localBookmarkCount, setLocalBookmarkCount,
    localReplyCount, setLocalReplyCount,
    localRepostCount, setLocalRepostCount
  };
}

// Hook for managing UI state
function usePostUI() {
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [bookmarkAnimating, setBookmarkAnimating] = useState(false);
  const [showAbsoluteTime, setShowAbsoluteTime] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  const postCardRef = useRef<HTMLDivElement>(null);
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarkButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  return {
    isReplyModalOpen, setIsReplyModalOpen,
    likeAnimating, setLikeAnimating,
    bookmarkAnimating, setBookmarkAnimating,
    showAbsoluteTime, setShowAbsoluteTime,
    showMenu, setShowMenu,
    actionInProgress, setActionInProgress,
    postCardRef, likeButtonRef, bookmarkButtonRef, menuRef
  };
}

// PostHeader component for reusability
function PostHeader({ 
  user, 
  createdAt, 
  showAbsoluteTime, 
  toggleTimeFormat, 
  isOwnPost, 
  showMenu, 
  menuRef, 
  toggleMenu, 
  onDelete, 
  onBlockUser, 
  actionInProgress,
  userId 
}: {
  user: {
    username?: string;
  };
  createdAt: string;
  showAbsoluteTime: boolean;
  toggleTimeFormat: () => void;
  isOwnPost: boolean;
  showMenu: boolean;
  menuRef: React.RefObject<HTMLDivElement>;
  toggleMenu: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onBlockUser: (userId: number, username: string) => void;
  actionInProgress: boolean;
  userId: number;
}) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center flex-wrap">
        <Link href={`/profile/${user?.username}`} className="font-bold hover:underline mr-2">
          {user?.username || 'ユーザー'}
        </Link>
        <span className="text-gray-500 text-sm">@{user?.username}</span>
        <span className="mx-1 text-gray-500">·</span>
        <button 
          onClick={toggleTimeFormat} 
          className="text-gray-500 text-sm hover:underline cursor-pointer bg-transparent border-0 p-0 m-0"
        >
          {formatDate(createdAt, showAbsoluteTime)}
        </button>
      </div>

      <PostMenu
        isOwnPost={isOwnPost}
        showMenu={showMenu}
        username={user?.username || 'ユーザー'}
        userId={userId}
        actionInProgress={actionInProgress}
        menuRef={menuRef}
        onToggleMenu={toggleMenu}
        onDelete={onDelete}
        onBlockUser={onBlockUser}
      />
    </div>
  );
}

// RepostHeader component for repost posts
function RepostHeader({ 
  reposter, 
  currentUser,
  isCompact = false 
}: {
  reposter: {
    username?: string;
    clerk_id?: string;
  };
  currentUser: {
    username?: string;
    id?: string;
  };
  isCompact?: boolean;
}) {
  const isOwnRepost = currentUser && reposter && (
    (currentUser.username && reposter.username && currentUser.username === reposter.username) ||
    (currentUser.id && reposter.clerk_id && currentUser.id === reposter.clerk_id)
  );

  return (
    <div className={`flex items-center text-gray-500 text-sm ${isCompact ? 'mb-1' : 'mb-2'}`}>
      <FaRetweet className="mr-2 text-green-500" />
      <span>
        {isOwnRepost ? 'あなた' : reposter?.username || 'ユーザー'}がリポストしました
      </span>
    </div>
  );
}

// PostContent component for reusability
function PostContent({ 
  content, 
  media, 
  postId, 
  showActions, 
  actionProps
}: {
  content: string;
  media: Media[];
  postId: number;
  showActions: boolean;
  actionProps: {
    postId: number;
    isLiked: boolean;
    isBookmarked: boolean;
    isReposted: boolean;
    replyCount: number;
    repostCount: number;
    likeCount: number;
    quoteCount: number;
    bookmarkCount: number;
    likeAnimating: boolean;
    bookmarkAnimating: boolean;
    repostAnimating: boolean;
    likeButtonRef: React.RefObject<HTMLButtonElement>;
    bookmarkButtonRef: React.RefObject<HTMLButtonElement>;
    onReply: () => void;
    onLike: () => void;
    onRepost: () => void;
    onQuote: () => void;
    onBookmark: () => void;
  };
}) {
  return (
    <>
      {/* 投稿内容 */}
      {content && (
        <div className="mb-2 relative post-content-container">
          <ContentRenderer 
            text={content} 
            className="relative w-full" 
          />
        </div>
      )}
      
      {/* メディア表示 */}
      {media && media.length > 0 && (
        <PostMedia 
          media={media}
          postId={postId}
        />
      )}
      
      {/* アクションボタン */}
      {showActions && (
        <PostActions {...actionProps} />
      )}
    </>
  );
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
  likeCount = 0,
  quoteCount = 0,
  isLiked: initialIsLiked = false,
  isBookmarked: initialIsBookmarked = false,
  onReplySuccess,
  hideReplyInfo = false,
  compactMode = false
}: PostCardProps) {
  const { user } = useUser();
  
  // リポスト表示ロジック（タイムライン vs 詳細ページで異なる）
  const isRepost = post.post_type === 'repost';
  const hasRepostData = !!(isRepost && post.repost_of_post);
  const hasRepostedBy = !!(post as any).reposted_by;
  
  // 表示するコンテンツを決定
  // タイムラインでのリポスト投稿: 元投稿のコンテンツを表示
  // 詳細ページでreposted_by情報がある: 投稿自体を表示
  const displayPost = hasRepostData ? (post.repost_of_post || post) : post;
  
  // リポストヘッダー表示用のメタデータ
  let repostMetadata = null;
  
  if (hasRepostData) {
    // タイムラインでのリポスト投稿の場合
    repostMetadata = {
      reposter: post.user,
      repostDate: post.created_at
    };
  } else if (hasRepostedBy) {
    // 詳細ページでreposted_by情報がある場合
    repostMetadata = {
      reposter: {
        username: (post as any).reposted_by.username,
        profile_image_url: (post as any).reposted_by.profile_image_url,
        clerk_id: null
      },
      repostDate: (post as any).reposted_by.created_at
    };
  }

  // デバッグ情報（開発環境でのみ）
  if (process.env.NODE_ENV === 'development') {
    if (isRepost || hasRepostedBy) {
      console.log(`🔄 [PostCard ${post.id}] REPOST ANALYSIS:`, {
        postType: post.post_type,
        isRepost,
        hasRepostData,
        hasRepostedBy,
        willShowRepostHeader: !!repostMetadata,
        displayingPostId: displayPost?.id,
        scenario: hasRepostData ? 'timeline-repost' : hasRepostedBy ? 'detail-reposted' : 'unknown'
      });
      
      if (repostMetadata) {
        console.log(`✅ [PostCard ${post.id}] Repost header should be visible`);
      }
    }
  }


  // エンゲージメント情報の設定
  // タイムラインでのリポスト投稿の場合は元投稿のエンゲージメント情報を使用
  const engagementData = hasRepostData ? {
    isLiked: post.repost_of_post?.is_liked !== undefined ? post.repost_of_post.is_liked : false,
    isBookmarked: post.repost_of_post?.is_bookmarked !== undefined ? post.repost_of_post.is_bookmarked : false,
    likeCount: post.repost_of_post?.like_count || 0,
    replyCount: post.repost_of_post?.reply_count || 0,
    repostCount: post.repost_of_post?.repost_count || 0,
    isReposted: post.repost_of_post?.is_reposted || false
  } : {
    isLiked: displayPost?.is_liked !== undefined ? displayPost.is_liked : initialIsLiked,
    isBookmarked: displayPost?.is_bookmarked !== undefined ? displayPost.is_bookmarked : initialIsBookmarked,
    likeCount: displayPost?.like_count !== undefined ? displayPost.like_count : likeCount,
    replyCount: displayPost?.reply_count !== undefined ? displayPost.reply_count : initialReplyCount,
    repostCount: displayPost?.repost_count !== undefined ? displayPost.repost_count : 0,
    isReposted: displayPost?.is_reposted !== undefined ? displayPost.is_reposted : false
  };

  const engagement = usePostEngagement(displayPost || post, {
    ...engagementData,
    // リポスト投稿の場合 OR reposted_by情報がある場合、既にリポストされた状態として初期化
    isReposted: hasRepostData || hasRepostedBy || engagementData.isReposted
  });

  // デバッグ情報（開発環境でのみ）
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 [PostCard ${post.id}] ENGAGEMENT DEBUG:`, {
      postId: post.id,
      postType: post.post_type,
      hasRepostData,
      hasRepostedBy,
      displayPostId: displayPost?.id,
      
      // 元投稿のエンゲージメント情報
      displayPost_likeCount: displayPost?.like_count,
      displayPost_repostCount: displayPost?.repost_count,
      displayPost_isReposted: displayPost?.is_reposted,
      displayPost_bookmarkCount: displayPost?.bookmark_count,
      displayPost_isBookmarked: displayPost?.is_bookmarked,
      
      // リポスト元投稿のエンゲージメント情報（もしある場合）
      repostOfPost_likeCount: post.repost_of_post?.like_count,
      repostOfPost_repostCount: post.repost_of_post?.repost_count,
      repostOfPost_isReposted: post.repost_of_post?.is_reposted,
      repostOfPost_bookmarkCount: post.repost_of_post?.bookmark_count,
      repostOfPost_isBookmarked: post.repost_of_post?.is_bookmarked,
      
      // 実際に使用されるエンゲージメントデータ
      engagementData,
      
      // usePostEngagementの結果
      engagementLocalCounts: {
        localLikeCount: engagement.localLikeCount,
        localRepostCount: engagement.localRepostCount,
        localBookmarkCount: engagement.localBookmarkCount,
        isLiked: engagement.isLiked,
        isReposted: engagement.isReposted,
        isBookmarked: engagement.isBookmarked
      }
    });
  }

  const ui = usePostUI();

  // メニューの外側をクリックした時にメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ui.menuRef.current && !ui.menuRef.current.contains(event.target as Node)) {
        ui.setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ui]);

  // 日時表示切り替え
  const toggleTimeFormat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ui.setShowAbsoluteTime(!ui.showAbsoluteTime);
  };

  // いいね処理
  const handleLikeAction = async () => {
    ui.setLikeAnimating(true);
    setTimeout(() => ui.setLikeAnimating(false), 450);
    
    const targetPostId = displayPost?.id || post.id;
    const previousIsLiked = engagement.isLiked;
    const previousLikeCount = engagement.localLikeCount;
    engagement.setIsLiked(!engagement.isLiked);
    engagement.setLocalLikeCount((prev: number) => engagement.isLiked ? Math.max(0, prev - 1) : prev + 1);
    
    try {
      const response = await fetch(`/api/posts/${targetPostId}/likes`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        engagement.setIsLiked(data.liked);
        engagement.setLocalLikeCount(data.like_count);
        
        if (onLikeStateChange) {
          onLikeStateChange(targetPostId, data.liked, data.like_count);
        }
      } else {
        engagement.setIsLiked(previousIsLiked);
        engagement.setLocalLikeCount(previousLikeCount);
        console.error('いいね処理APIエラー:', await response.text());
      }
    } catch (error) {
      engagement.setIsLiked(previousIsLiked);
      engagement.setLocalLikeCount(previousLikeCount);
      console.error('いいね処理エラー:', error);
    }
    
    if (onPostAction) {
      onPostAction('like', targetPostId);
    }
  };

  // リポスト処理
  const handleRepostAction = async () => {
    try {
      const targetPostId = displayPost?.id || post.id;
      const currentIsReposted = engagement.isReposted;
      
      // 現在の状態に基づいてリクエストメソッドを決定
      const method = currentIsReposted ? 'DELETE' : 'POST';
      
      // Optimistic UI Update
      engagement.setIsReposted(!currentIsReposted);
      engagement.setLocalRepostCount((prev: number) => 
        currentIsReposted ? Math.max(0, prev - 1) : prev + 1
      );
      
      const response = await fetch(`/api/posts/${targetPostId}/repost`, {
        method: method,
      });
      
      if (response.ok) {
        const message = currentIsReposted ? 'リポストを解除しました' : 'リポストしました';
        toast.success(message);
        
        if (onRepostStateChange) {
          onRepostStateChange(targetPostId, !currentIsReposted);
        }
        
        if (onPostAction) {
          onPostAction(currentIsReposted ? 'unrepost' : 'repost', targetPostId);
        }
      } else {
        // エラーが発生した場合、状態を元に戻す
        engagement.setIsReposted(currentIsReposted);
        engagement.setLocalRepostCount((prev: number) => 
          currentIsReposted ? prev + 1 : Math.max(0, prev - 1)
        );
        
        const errorData = await response.json();
        toast.error(errorData.error || 'リポスト処理に失敗しました');
      }
    } catch (error) {
      // ネットワークエラー等の場合も状態を元に戻す
      const currentIsReposted = engagement.isReposted;
      engagement.setIsReposted(!currentIsReposted);
      engagement.setLocalRepostCount((prev: number) => 
        !currentIsReposted ? prev + 1 : Math.max(0, prev - 1)
      );
      
      console.error('リポスト処理エラー:', error);
      toast.error('リポスト処理中にエラーが発生しました');
    }
  };

  // 返信処理
  const handleReplyAction = () => {
    ui.setIsReplyModalOpen(true);
  };

  // 返信モーダルクローズ処理
  const handleReplyModalClose = (postSubmitted = false) => {
    ui.setIsReplyModalOpen(false);
    
    if (postSubmitted) {
      if (ui.postCardRef.current) {
        ui.postCardRef.current.classList.add('reply-success-flash');
        setTimeout(() => {
          if (ui.postCardRef.current) {
            ui.postCardRef.current.classList.remove('reply-success-flash');
          }
        }, 1000);
      }
      
      engagement.setLocalReplyCount((prev: number) => prev + 1);
      
      if (onReplySuccess) {
        onReplySuccess(displayPost?.id || post.id);
      }
    }
  };

  // 引用処理
  const handleQuoteAction = () => {
    const targetPostId = displayPost?.id || post.id;
    if (onQuote) {
      onQuote(targetPostId);
    } else if (onPostAction) {
      onPostAction('quote', targetPostId);
    }
  };

  // ブックマーク処理
  const handleBookmarkAction = async () => {
    try {
      ui.setBookmarkAnimating(true);
      setTimeout(() => ui.setBookmarkAnimating(false), 300);
      
      const currentIsBookmarked = engagement.isBookmarked;
      const currentCount = engagement.localBookmarkCount;
      
      engagement.setIsBookmarked(!currentIsBookmarked);
      engagement.setLocalBookmarkCount((prev: number) => currentIsBookmarked ? Math.max(0, prev - 1) : prev + 1);
      
      const targetPostId = displayPost?.id || post.id;
      const response = await fetch(`/api/posts/${targetPostId}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        engagement.setIsBookmarked(currentIsBookmarked);
        engagement.setLocalBookmarkCount(currentCount);
        throw new Error(`ブックマーク処理に失敗しました (${response.status})`);
      }
      
      const data = await response.json();
      
      engagement.setIsBookmarked(data.bookmarked);
      engagement.setLocalBookmarkCount(data.bookmark_count);
      
      if (onBookmarkStateChange) {
        onBookmarkStateChange(targetPostId, data.bookmarked, data.bookmark_count);
      }
      
      if (onPostAction) {
        onPostAction(data.bookmarked ? 'bookmark' : 'unbookmark', targetPostId);
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
        if (onDeletePost) {
          onDeletePost(post.id);
        }
        
        if (onPostAction) {
          onPostAction('delete', post.id);
        }
      } else {
        const errorData = await response.json();
        console.error('投稿削除エラー:', errorData);
        
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
    
    ui.setShowMenu(false);
  };

  // メニュー表示切り替え
  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ui.setShowMenu(!ui.showMenu);
  };

  // 投稿詳細ページへの遷移
  const navigateToPost = (e: React.MouseEvent) => {
    const isInteractive = (target: Element) => {
      return (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a')
      );
    };
    
    if (!isInteractive(e.target as Element)) {
      // リポスト投稿の場合は元記事の詳細ページに遷移
      // 元記事詳細ページでリポスト情報を表示する
      const targetPostId = displayPost?.id || post.id;
      
      // デバッグ情報（開発環境でのみ）
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 [PostCard Navigation] Post ID: ${post.id}`, {
          postType: post.post_type,
          navigatingToPostId: targetPostId,
          hasRepostedBy,
          navigationStrategy: 'direct'
        });
      }
      
      window.location.href = `/post/${targetPostId}`;
    }
  };

  // ブロック処理
  const handleBlockUser = async (userId: number, username: string) => {
    ui.setActionInProgress(true);
    
    try {
      toast.success(`${username}さんをブロックしました`);
      
      if (ui.postCardRef.current) {
        ui.postCardRef.current.classList.add('block-animation');
      }
      
      const response = await fetch(`/api/users/${userId}/block`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('ブロックに失敗しました');
      }
      
      ui.setShowMenu(false);
    } catch (error) {
      console.error('ブロック処理エラー:', error);
      toast.error('ブロック処理中にエラーが発生しました');
      
      if (ui.postCardRef.current) {
        ui.postCardRef.current.classList.remove('block-animation');
      }
    } finally {
      ui.setActionInProgress(false);
    }
  };
  
  // 返信先の投稿データ
  const replyToPostData = displayPost?.in_reply_to_post || null;

  // アクションボタンのプロパティ
  const actionProps = {
    postId: displayPost?.id || post.id,
    isLiked: engagement.isLiked,
    isBookmarked: engagement.isBookmarked,
    isReposted: engagement.isReposted,
    replyCount: engagement.localReplyCount,
    repostCount: engagement.localRepostCount,
    likeCount: engagement.localLikeCount,
    quoteCount: quoteCount,
    bookmarkCount: engagement.localBookmarkCount,
    likeAnimating: ui.likeAnimating,
    bookmarkAnimating: ui.bookmarkAnimating,
    repostAnimating: false, // TODO: アニメーション実装時に追加
    likeButtonRef: ui.likeButtonRef,
    bookmarkButtonRef: ui.bookmarkButtonRef,
    onReply: handleReplyAction,
    onLike: handleLikeAction,
    onRepost: handleRepostAction,
    onQuote: handleQuoteAction,
    onBookmark: handleBookmarkAction,
  };

  return (
    <>
      <div 
        ref={ui.postCardRef}
        className={`border-b border-gray-200 p-4 hover:bg-gray-50 transition-all duration-200 ${compactMode ? 'py-3' : ''} post-card-container`}
        onClick={navigateToPost}
        role="article"
      >
        {/* リポストヘッダー - リポスト投稿の場合のみ表示 */}
        {repostMetadata && (
          <RepostHeader 
            reposter={repostMetadata.reposter as any}
            currentUser={user as any}
            isCompact={compactMode}
          />
        )}

        {/* 返信情報 - 表示対象の投稿が返信の場合 */}
        {!hideReplyInfo && displayPost?.post_type === 'reply' && (
          <PostReplyInfo 
            replyToPostId={displayPost.in_reply_to_post_id}
            replyToPost={replyToPostData}
          />
        )}

        {/* 引用投稿プレビュー - 表示対象の投稿が引用の場合 */}
        {displayPost?.post_type === 'quote' && displayPost.quote_of_post && (
          <PostQuotePreview 
            quotePost={displayPost.quote_of_post}
            quotePostId={displayPost.quote_of_post_id!}
          />
        )}
        
        {/* メイン投稿コンテンツ */}
        <div className="flex">
          {/* プロフィール画像 - 表示対象の投稿者のアバター */}
          <div className="mr-3 flex-shrink-0">
            <Link href={`/profile/${displayPost?.user?.username || 'unknown'}`}>
              <UserAvatar 
                imageUrl={displayPost?.user?.profile_image_url} 
                username={displayPost?.user?.username || 'ユーザー'} 
                size={compactMode ? 32 : 40} 
              />
            </Link>
          </div>
          
          {/* 投稿本文 */}
          <div className="flex-1 min-w-0">
            <PostHeader
              user={(displayPost?.user || post.user) as any}
              createdAt={displayPost?.created_at || post.created_at}
              showAbsoluteTime={ui.showAbsoluteTime}
              toggleTimeFormat={toggleTimeFormat as any}
              isOwnPost={displayPost?.user?.clerk_id === user?.id || post.user?.clerk_id === user?.id}
              showMenu={ui.showMenu}
              menuRef={ui.menuRef}
              toggleMenu={toggleMenu}
              onDelete={handleDeletePost}
              onBlockUser={handleBlockUser}
              actionInProgress={ui.actionInProgress}
              userId={displayPost?.user_id || post.user_id}
            />
            
            <PostContent
              content={displayPost?.content || ''}
              media={displayPost?.media || []}
              postId={displayPost?.id || post.id}
              showActions={showActions}
              actionProps={actionProps}
            />
          </div>
        </div>
      </div>

      {/* 返信モーダル */}
      <PostModal
        isOpen={ui.isReplyModalOpen}
        onClose={handleReplyModalClose}
        initialType="reply"
        replyToPost={displayPost?.user ? { 
          id: displayPost.id, 
          content: displayPost.content, 
          user: { username: displayPost.user.username } 
        } : displayPost ? { 
          id: displayPost.id, 
          content: displayPost.content 
        } : {
          id: post.id,
          content: post.content
        }}
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
        
        .like-animation {
          animation: like-pulse 0.45s ease;
        }
        
        @keyframes like-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        .bookmark-animation {
          animation: bookmark-bounce 0.3s ease;
        }
        
        @keyframes bookmark-bounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .repost-animation {
          animation: repost-spin 0.4s ease;
        }
        
        @keyframes repost-spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
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