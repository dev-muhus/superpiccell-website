export interface User {
  id: number;
  username: string;
  profile_image_url?: string;
  first_name?: string;
  last_name?: string;
  clerk_id?: string;
}

export interface Media {
  id?: number;
  post_id?: number;
  url: string;
  mediaType: 'image' | 'video';
  width?: number | null;
  height?: number | null;
  duration_sec?: number | null;
}

export interface PostMedia extends Media {
  id?: number;
  url: string;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
  duration_sec?: number;
}

export interface ReplyToPost {
  id: number;
  content: string;
  user: User | null;
  media?: PostMedia[];
}

export interface QuotePost {
  id: number;
  content: string;
  created_at: string;
  media?: PostMedia[];
  user: User | null;
}

export interface RepostPost {
  id: number;
  content: string;
  created_at: string;
  post_type: 'original' | 'reply' | 'quote' | 'repost';
  user_id: number;
  user: User | null;
  media?: PostMedia[];
  in_reply_to_post_id?: number;
  quote_of_post_id?: number;
  repost_of_post_id?: number;
  in_reply_to_post?: ReplyToPost | null;
  quote_of_post?: QuotePost | null;
  repost_of_post?: RepostPost | null;
  reply_count?: number;
  like_count?: number;
  is_liked?: boolean;
  repost_count?: number;
  is_reposted?: boolean;
  bookmark_count?: number;
  is_bookmarked?: boolean;
}

export interface Post {
  id: number;
  content: string;
  created_at: string;
  post_type: 'original' | 'reply' | 'quote' | 'repost';
  media?: PostMedia[];
  user_id: number;
  in_reply_to_post_id?: number;
  quote_of_post_id?: number;
  repost_of_post_id?: number;
  user: User | null;
  in_reply_to_post?: ReplyToPost | null;
  quote_of_post?: QuotePost | null;
  repost_of_post?: RepostPost | null;
  reply_count?: number;
  like_count?: number;
  is_liked?: boolean;
  repost_count?: number;
  is_reposted?: boolean;
  bookmark_count?: number;
  is_bookmarked?: boolean;
}

export interface PostCardProps {
  post: Post;
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