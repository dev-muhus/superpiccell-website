'use client';

import { FaRetweet, FaRegComment, FaHeart, FaRegHeart, FaShareAlt, FaBookmark, FaRegBookmark } from 'react-icons/fa';
import { RefObject } from 'react';

interface PostActionsProps {
  postId: number;
  isLiked: boolean;
  isBookmarked: boolean;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  quoteCount: number;
  bookmarkCount: number;
  likeAnimating: boolean;
  bookmarkAnimating: boolean;
  likeButtonRef: RefObject<HTMLButtonElement>;
  bookmarkButtonRef: RefObject<HTMLButtonElement>;
  onReply: () => void;
  onLike: () => void;
  onRepost: () => void;
  onQuote: () => void;
  onBookmark: () => void;
}

/**
 * 投稿アクションボタン（いいね、リポスト、返信、ブックマーク）コンポーネント
 */
export default function PostActions({
  isLiked,
  isBookmarked,
  replyCount,
  repostCount,
  likeCount,
  quoteCount,
  bookmarkCount,
  likeAnimating,
  bookmarkAnimating,
  likeButtonRef,
  bookmarkButtonRef,
  onReply,
  onLike,
  onRepost,
  onQuote,
  onBookmark
}: PostActionsProps) {
  return (
    <div className="flex justify-between mt-3 text-gray-500 flex-wrap xs:flex-nowrap">
      {/* 返信 */}
      <button 
        onClick={onReply} 
        className="flex items-center hover:text-blue-500 transition-colors group"
        aria-label="コメントする"
      >
        <span className="flex items-center bg-transparent group-hover:bg-blue-50 rounded-full p-1 sm:p-2 transition-colors">
          <FaRegComment className="text-sm sm:text-base" />
          <span className="text-xs ml-1">{replyCount > 0 ? replyCount : ''}</span>
        </span>
      </button>
      
      {/* リポスト */}
      <button 
        onClick={onRepost} 
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
        onClick={onLike} 
        className={`flex items-center ${isLiked ? 'text-red-500' : 'hover:text-red-500'} transition-colors group`}
        aria-label="いいね"
      >
        <span className={`flex items-center ${isLiked ? 'bg-red-50' : 'bg-transparent group-hover:bg-red-50'} rounded-full p-1 sm:p-2 transition-colors`}>
          {isLiked ? (
            <FaHeart className={`text-sm sm:text-base ${likeAnimating ? 'like-animation' : ''}`} />
          ) : (
            <FaRegHeart className="text-sm sm:text-base" />
          )}
          <span className="text-xs ml-1">{likeCount > 0 ? likeCount : ''}</span>
        </span>
      </button>
      
      {/* 引用 */}
      <button 
        onClick={onQuote} 
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
        onClick={onBookmark} 
        className={`flex items-center ${isBookmarked ? 'text-yellow-500' : 'hover:text-yellow-500'} transition-colors group`}
        aria-label="ブックマーク"
      >
        <span className={`flex items-center ${isBookmarked ? 'bg-yellow-50' : 'bg-transparent group-hover:bg-yellow-50'} rounded-full p-1 sm:p-2 transition-colors`}>
          {isBookmarked ? (
            <FaBookmark className={`text-sm sm:text-base ${bookmarkAnimating ? 'bookmark-animation' : ''}`} />
          ) : (
            <FaRegBookmark className="text-sm sm:text-base" />
          )}
          <span className="text-xs ml-1">{bookmarkCount > 0 ? bookmarkCount : ''}</span>
        </span>
      </button>
    </div>
  );
} 