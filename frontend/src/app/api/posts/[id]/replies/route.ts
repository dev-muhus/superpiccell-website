import { db } from '@/db';
import { posts, users, likes, bookmarks, post_media } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, desc, lt, count, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

// 特定の投稿への返信一覧を取得するAPI
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Clerk認証からユーザーIDを取得
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const postId = parseInt(id);
    
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: "無効な投稿IDです" },
        { status: 400 }
      );
    }
    
    // データベースからユーザー情報を取得
    const [dbUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);
    
    if (!dbUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }
    
    // URLパラメータを取得
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || ITEMS_PER_PAGE.toString());
    const cursor = searchParams.get('cursor');
    
    // SQL文の条件を構築
    const whereConditions = [
      eq(posts.in_reply_to_post_id, postId),
      eq(posts.post_type, 'reply'),
      eq(posts.is_deleted, false),
      eq(posts.is_hidden, false)
    ];
    
    // カーソルベースのページネーション条件
    if (cursor) {
      try {
        const cursorId = parseInt(cursor);
        if (!isNaN(cursorId)) {
          whereConditions.push(lt(posts.id, cursorId));
        }
      } catch (e) {
        console.error('カーソル変換エラー:', e);
      }
    }
    
    // 返信の取得
    const results = await db.select({
      id: posts.id,
      content: posts.content,
      post_type: posts.post_type,
      user_id: posts.user_id,
      created_at: posts.created_at,
      in_reply_to_post_id: posts.in_reply_to_post_id,
      quote_of_post_id: posts.quote_of_post_id,
      repost_of_post_id: posts.repost_of_post_id
    })
    .from(posts)
    .where(and(...whereConditions))
    .orderBy(desc(posts.id))  // 新しい投稿順
    .limit(limit + 1);
    
    // 次のページがあるかチェック
    const hasNextPage = results.length > limit;
    const replies = hasNextPage ? results.slice(0, limit) : results;
    
    // 次のカーソルを設定
    const nextCursor = hasNextPage && replies.length > 0 
      ? String(replies[replies.length - 1].id)
      : null;
    
    // 返信を取得したら、返信先の投稿のIDリストも取得
    const replyToPostIds = replies
      .filter(reply => reply.in_reply_to_post_id !== null && reply.post_type === 'reply')
      .map(reply => reply.in_reply_to_post_id);
    
    // 返信先の投稿情報を取得（存在する場合）
    const replyToPostsData = replyToPostIds.length > 0 
      ? await db.select()
        .from(posts)
        .where(and(
          inArray(posts.id, replyToPostIds as number[]),
          eq(posts.is_deleted, false)
        ))
      : [];
    
    // 返信先の投稿ユーザー情報を取得
    const replyToPostUserIds = replyToPostsData.map(post => post.user_id);
    const replyToPostUsers = replyToPostUserIds.length > 0
      ? await db.select({
          id: users.id,
          username: users.username,
          profile_image_url: users.profile_image_url,
          first_name: users.first_name,
          last_name: users.last_name
        })
        .from(users)
        .where(inArray(users.id, replyToPostUserIds))
      : [];
    
    // 返信先投稿のメディア情報を取得
    const replyToPostMediaData = replyToPostIds.length > 0
      ? await db.select()
        .from(post_media)
        .where(and(
          inArray(post_media.post_id, replyToPostIds as number[]),
          eq(post_media.is_deleted, false)
        ))
      : [];
    
    // 返信先の投稿をマップに変換
    const replyToPostMap = new Map();
    replyToPostsData.forEach(post => {
      // 投稿ユーザーを検索
      const user = replyToPostUsers.find(user => user.id === post.user_id);
      
      // 投稿メディアを検索
      const mediaItems = replyToPostMediaData.filter(media => media.post_id === post.id);
      const media = mediaItems.map(item => ({
        ...item,
        mediaType: determineMediaTypeFromUrl(item.url, item.media_type)
      }));
      
      replyToPostMap.set(post.id, {
        ...post,
        user,
        media: media.length > 0 ? media : undefined
      });
    });
    
    // ユーザー情報を取得
    const userIds = [...new Set(replies.map(reply => reply.user_id))];
    
    if (userIds.length === 0) {
      return NextResponse.json({
        replies: [],
        pagination: {
          hasNextPage: false,
          nextCursor: null
        }
      });
    }
    
    const usersData = await db.query.users.findMany({
      where: inArray(users.id, userIds),
      columns: {
        id: true,
        username: true,
        profile_image_url: true,
        first_name: true,
        last_name: true
      }
    });
    
    // ユーザー情報をマップ
    const userMap = new Map();
    usersData.forEach(user => {
      userMap.set(user.id, user);
    });
    
    // 投稿IDのリストを取得
    const replyIds = replies.map(reply => reply.id);
    
    // 返信のメディア情報を取得
    const mediaData = await db.select()
      .from(post_media)
      .where(and(
        inArray(post_media.post_id, replyIds),
        eq(post_media.is_deleted, false)
      ));
    
    // 投稿IDごとのメディアデータをマップに変換
    const mediaMap = new Map();
    mediaData.forEach(media => {
      if (!mediaMap.has(media.post_id)) {
        mediaMap.set(media.post_id, []);
      }
      mediaMap.get(media.post_id).push(media);
    });
    
    // 各返信に対する返信数を取得（入れ子コメント）
    const nestedReplyCounts = await db.select({
      post_id: posts.in_reply_to_post_id,
      count: count()
    })
    .from(posts)
    .where(and(
      inArray(posts.in_reply_to_post_id, replyIds),
      eq(posts.is_deleted, false),
      eq(posts.post_type, 'reply')
    ))
    .groupBy(posts.in_reply_to_post_id);
    
    // 返信数をマップに変換
    const replyCountMap = new Map();
    nestedReplyCounts.forEach(item => {
      if (item.post_id !== null) {
        replyCountMap.set(item.post_id, item.count);
      }
    });
    
    // いいね数を取得
    const likeCounts = await db.select({
      post_id: likes.post_id,
      count: count()
    })
    .from(likes)
    .where(and(
      inArray(likes.post_id, replyIds),
      eq(likes.is_deleted, false)
    ))
    .groupBy(likes.post_id);
    
    // いいね数をマップに変換
    const likeCountMap = new Map();
    likeCounts.forEach(item => {
      likeCountMap.set(item.post_id, item.count);
    });
    
    // ユーザーのいいね状態を取得
    const userLikes = await db.select({
      post_id: likes.post_id
    })
    .from(likes)
    .where(and(
      eq(likes.user_id, dbUser.id),
      inArray(likes.post_id, replyIds),
      eq(likes.is_deleted, false)
    ));
    
    // ユーザーのいいねをセットに変換
    const userLikedPostIds = new Set(userLikes.map(like => like.post_id));
    
    // ブックマーク数を取得
    const bookmarkCounts = await db.select({
      post_id: bookmarks.post_id,
      count: count()
    })
    .from(bookmarks)
    .where(and(
      inArray(bookmarks.post_id, replyIds),
      eq(bookmarks.is_deleted, false)
    ))
    .groupBy(bookmarks.post_id);
    
    // ブックマーク数をマップに変換
    const bookmarkCountMap = new Map();
    bookmarkCounts.forEach(item => {
      bookmarkCountMap.set(item.post_id, item.count);
    });
    
    // ユーザーのブックマーク状態を取得
    const userBookmarks = await db.select({
      post_id: bookmarks.post_id
    })
    .from(bookmarks)
    .where(and(
      eq(bookmarks.user_id, dbUser.id),
      inArray(bookmarks.post_id, replyIds),
      eq(bookmarks.is_deleted, false)
    ));
    
    // ユーザーのブックマークをセットに変換
    const userBookmarkedPostIds = new Set(userBookmarks.map(bookmark => bookmark.post_id));
    
    // レスポンス形式に整形
    const repliesWithUser = replies.map(reply => {
      const user = userMap.get(reply.user_id) || {
        id: reply.user_id,
        username: 'ユーザー',
        profile_image_url: null,
        first_name: null,
        last_name: null
      };
      
      // 返信先の投稿情報を取得
      const replyToPost = reply.in_reply_to_post_id 
        ? replyToPostMap.get(reply.in_reply_to_post_id) 
        : null;
      
      // 投稿のメディアデータを処理
      interface MediaItem {
        url: string;
        mediaType: 'image' | 'video';
        width?: number;
        height?: number;
        duration_sec?: number;
      }

      interface PostMedia {
        id: number;
        post_id: number;
        url: string;
        media_type: string;
        width?: number | null;
        height?: number | null;
        duration_sec?: number | null;
        is_deleted: boolean;
        created_at: Date;
        updated_at: Date;
      }

      // post_mediaテーブルからメディアを取得
      const mediaItems: MediaItem[] = (mediaMap.get(reply.id) || []).map((media: PostMedia) => ({
        url: media.url,
        mediaType: determineMediaTypeFromUrl(media.url, media.media_type),
        width: media.width || undefined,
        height: media.height || undefined,
        duration_sec: media.duration_sec || undefined
      }));
      
      return {
        ...reply,
        user,
        in_reply_to_post: replyToPost,
        reply_count: replyCountMap.get(reply.id) || 0,
        like_count: likeCountMap.get(reply.id) || 0,
        is_liked: userLikedPostIds.has(reply.id),
        bookmark_count: bookmarkCountMap.get(reply.id) || 0,
        is_bookmarked: userBookmarkedPostIds.has(reply.id),
        media: mediaItems
      };
    });
    
    return NextResponse.json({
      replies: repliesWithUser,
      pagination: {
        hasNextPage,
        nextCursor
      }
    });
    
  } catch (error) {
    console.error('返信一覧取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// URLからメディアタイプを判定するヘルパー関数
function determineMediaTypeFromUrl(url: string, defaultType: string): 'image' | 'video' {
  // URLに基づいてメディアタイプを判定
  if (url.match(/\.(jpe?g|png|gif|webp)$/i) || url.includes('/image/')) {
    return 'image';
  } else if (url.match(/\.(mp4|webm|mov)$/i) || url.includes('/videos/')) {
    return 'video';
  }
  
  // デフォルトのmedia_typeが'image'または'video'の場合はそれを使用
  if (defaultType === 'image' || defaultType === 'video') {
    return defaultType as 'image' | 'video';
  }
  
  // どちらでもない場合はURLの構造から判定
  return url.includes('cloudinary') && !url.includes('/video/') ? 'image' : 'video';
} 