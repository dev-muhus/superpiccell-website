import { db } from '@/db';
import { posts, users, likes, blocks, bookmarks, post_media } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, desc, count, inArray, or, not, lt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    // Clerk認証からユーザー情報を取得
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }
    
    // URLパラメータを取得
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'likes'; // デフォルトはいいね ('likes' または 'comments')
    const limit = parseInt(searchParams.get('limit') || ITEMS_PER_PAGE.toString());
    const cursor = searchParams.get('cursor');
    
    // データベースからログインユーザー情報を取得
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
    
    // ブロックしているユーザーとブロックされているユーザーの投稿を除外
    const blockedUsers = await db.query.blocks.findMany({
      where: and(
        or(
          eq(blocks.blocker_id, dbUser.id),
          eq(blocks.blocked_id, dbUser.id)
        ),
        eq(blocks.is_deleted, false)
      ),
      columns: {
        blocker_id: true,
        blocked_id: true
      }
    });
    
    const blockedUserIds = blockedUsers.map(block => 
      block.blocker_id === dbUser.id ? block.blocked_id : block.blocker_id
    );
    
    // BANされたユーザーのIDを取得
    const bannedUsers = await db.query.users.findMany({
      where: eq(users.is_banned, true),
      columns: {
        id: true
      }
    });
    
    const bannedUserIds = bannedUsers.map(user => user.id);
    
    // 除外するユーザーIDs（ブロック+BAN）
    const excludedUserIds = [...new Set([...blockedUserIds, ...bannedUserIds])];
    
    // エンゲージメントの種類に応じた投稿IDを取得
    let postIds: number[] = [];
    
    if (type === 'likes') {
      // いいねした投稿のIDを取得
      const likedPosts = await db.select({
        post_id: likes.post_id
      })
      .from(likes)
      .where(and(
        eq(likes.user_id, dbUser.id),
        eq(likes.is_deleted, false)
      ))
      .orderBy(desc(likes.created_at));
      
      postIds = likedPosts.map(like => like.post_id);
    } else if (type === 'comments') {
      // コメント（返信）した投稿のIDを取得
      const commentedPosts = await db.select({
        id: posts.id
      })
      .from(posts)
      .where(and(
        eq(posts.user_id, dbUser.id),
        eq(posts.post_type, 'reply'),
        eq(posts.is_deleted, false)
      ))
      .orderBy(desc(posts.created_at));
      
      postIds = commentedPosts.map(post => post.id);
    }
    
    // postIdsが空の場合、早期リターン
    if (postIds.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: {
          hasNextPage: false,
          nextCursor: null
        }
      });
    }
    
    // カーソルベースのページネーション条件
    const conditions = [
      eq(posts.is_deleted, false),
      eq(posts.is_hidden, false),
      inArray(posts.id, postIds)
    ];
    
    // 除外するユーザー（ブロックユーザー+BANユーザー）の投稿を除外
    if (excludedUserIds.length > 0) {
      conditions.push(not(inArray(posts.user_id, excludedUserIds)));
    }
    
    // カーソル以降のデータを取得
    if (cursor) {
      const cursorId = parseInt(cursor);
      if (!isNaN(cursorId)) {
        conditions.push(lt(posts.id, cursorId));
      }
    }
    
    // 投稿を取得
    const query = db.select({
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
    .where(and(...conditions))
    .orderBy(desc(posts.id))
    .limit(limit + 1);
    
    const results = await query;
    
    // 次のページがあるかチェック
    const hasNextPage = results.length > limit;
    const finalPosts = hasNextPage ? results.slice(0, limit) : results;
    
    // 次のカーソルを設定
    const nextCursor = hasNextPage && finalPosts.length > 0 
      ? finalPosts[finalPosts.length - 1].id.toString() 
      : null;
    
    // 投稿が0件の場合は早期リターン
    if (finalPosts.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: {
          hasNextPage: false,
          nextCursor: null
        }
      });
    }
    
    // 投稿IDのリストを取得（メディアデータ用）
    const mediaPostIds = finalPosts.map(post => post.id);
    
    // post_mediaテーブルからメディアデータを取得
    const mediaData = await db.select()
      .from(post_media)
      .where(and(
        inArray(post_media.post_id, mediaPostIds),
        eq(post_media.is_deleted, false)
      ));
    
    // 投稿IDごとのメディアデータをマップに変換
    const mediaMap = new Map();
    mediaData.forEach(media => {
      if (!mediaMap.has(media.post_id)) {
        mediaMap.set(media.post_id, []);
      }
      
      // メディアの正規化処理
      const normalizedMedia = {
        id: media.id,
        url: media.url,
        mediaType: media.media_type as 'image' | 'video',
        width: media.width,
        height: media.height,
        duration_sec: media.duration_sec
      };
      
      mediaMap.get(media.post_id).push(normalizedMedia);
    });
    
    // ユーザー情報を取得（削除済みユーザーも除外）
    const userIds = [...new Set(finalPosts.map(post => post.user_id))];
    const postUsers = await db.query.users.findMany({
      where: and(
        inArray(users.id, userIds),
        eq(users.is_deleted, false)
      ),
      columns: {
        id: true,
        username: true,
        profile_image_url: true,
        first_name: true,
        last_name: true
      }
    });
    
    // 投稿にユーザー情報を紐付け（存在しないユーザーは除外）
    const validUserIds = postUsers.map(user => user.id);
    const postsWithUsers = finalPosts
      .filter(post => validUserIds.includes(post.user_id))
      .map(post => {
        const postUser = postUsers.find(user => user.id === post.user_id) || null;
        return { ...post, user: postUser };
      });
    
    // いいね状態の確認
    const userLikes = await db.query.likes.findMany({
      where: and(
        eq(likes.user_id, dbUser.id),
        inArray(likes.post_id, postsWithUsers.map(post => post.id)),
        eq(likes.is_deleted, false)
      )
    });
    
    const likedPostIds = userLikes.map(like => like.post_id);
    
    // いいね数の取得
    const likeCounts = await db.select({
      post_id: likes.post_id,
      count: count()
    })
    .from(likes)
    .where(and(
      inArray(likes.post_id, postsWithUsers.map(post => post.id)),
      eq(likes.is_deleted, false)
    ))
    .groupBy(likes.post_id);
    
    // ブックマーク状態の確認
    const userBookmarks = await db.query.bookmarks.findMany({
      where: and(
        eq(bookmarks.user_id, dbUser.id),
        inArray(bookmarks.post_id, postsWithUsers.map(post => post.id)),
        eq(bookmarks.is_deleted, false)
      )
    });
    
    const bookmarkedPostIds = userBookmarks.map(bookmark => bookmark.post_id);
    
    // ブックマーク数の取得
    const bookmarkCounts = await db.select({
      post_id: bookmarks.post_id,
      count: count()
    })
    .from(bookmarks)
    .where(and(
      inArray(bookmarks.post_id, postsWithUsers.map(post => post.id)),
      eq(bookmarks.is_deleted, false)
    ))
    .groupBy(bookmarks.post_id);
    
    // 返信数の取得
    const replyCounts = await db.select({
      in_reply_to_post_id: posts.in_reply_to_post_id,
      count: count()
    })
    .from(posts)
    .where(and(
      inArray(posts.in_reply_to_post_id, postsWithUsers.map(post => post.id)),
      eq(posts.post_type, 'reply'),
      eq(posts.is_deleted, false)
    ))
    .groupBy(posts.in_reply_to_post_id);
    
    // 投稿にいいね状態といいね数、返信数を追加
    const enrichedPosts = postsWithUsers.map(post => {
      const likeCount = likeCounts.find(count => count.post_id === post.id)?.count || 0;
      const replyCount = replyCounts.find(count => count.in_reply_to_post_id === post.id)?.count || 0;
      const bookmarkCount = bookmarkCounts.find(count => count.post_id === post.id)?.count || 0;
      
      return {
        ...post,
        like_count: likeCount,
        is_liked: likedPostIds.includes(post.id),
        reply_count: replyCount,
        bookmark_count: bookmarkCount,
        is_bookmarked: bookmarkedPostIds.includes(post.id),
        media: mediaMap.get(post.id) || [] // post_mediaテーブルから取得したメディアデータ
      };
    });
    
    return NextResponse.json({
      posts: enrichedPosts,
      pagination: {
        hasNextPage,
        nextCursor
      }
    });
    
  } catch (error) {
    console.error('エンゲージメント取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 