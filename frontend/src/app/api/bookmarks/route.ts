import { db } from '@/db';
import { blocks, community_posts, users } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

export const dynamic = 'force-dynamic';

// 投稿データの型定義
interface PostWithUser {
  id: number;
  content: string;
  post_type: string;
  user_id: number;
  created_at: string;
  in_reply_to_post_id?: number;
  quote_of_post_id?: number;
  repost_of_post_id?: number;
  media_data?: unknown;
  username: string;
  profile_image_url?: string;
  first_name?: string;
  last_name?: string;
}

interface RelatedPost {
  id: number;
  content: string;
  post_type: string;
  created_at: string;
  media_data?: unknown;
  user: {
    id: number;
    username: string;
    profile_image_url?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface FormattedPost {
  id: number;
  content: string;
  post_type: string;
  user_id: number;
  created_at: string;
  in_reply_to_post_id?: number;
  quote_of_post_id?: number;
  repost_of_post_id?: number;
  media_data?: unknown;
  like_count: number;
  is_liked: boolean;
  bookmark_count: number;
  is_bookmarked: boolean;
  reply_count: number;
  user: {
    id: number;
    username: string;
    profile_image_url?: string;
    first_name?: string;
    last_name?: string;
  };
  in_reply_to_post?: RelatedPost;
  quote_of_post?: RelatedPost;
  repost_of_post?: RelatedPost;
}

// ブックマークした投稿一覧を取得するAPI
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
    const limit = parseInt(searchParams.get('limit') || ITEMS_PER_PAGE.toString());
    const cursor = searchParams.get('cursor');
    const includeRelated = searchParams.get('include_related') === 'true';

    // データベースからユーザー情報を取得
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });
    
    if (!dbUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // ブロックしているユーザーとブロックされているユーザーの投稿を除外
    const blockedUsers = await db.query.blocks.findMany({
      where: and(
        eq(blocks.blocker_id, dbUser.id),
        eq(blocks.is_deleted, false)
      ),
      columns: {
        blocked_id: true
      }
    });

    // ブロックされているユーザーの投稿を除外
    const blockedByUsers = await db.query.blocks.findMany({
      where: and(
        eq(blocks.blocked_id, dbUser.id),
        eq(blocks.is_deleted, false)
      ),
      columns: {
        blocker_id: true
      }
    });

    // ブロックユーザーIDのリストを作成
    const blockedUserIds = [
      ...blockedUsers.map(b => b.blocked_id),
      ...blockedByUsers.map(b => b.blocker_id)
    ];

    // BANされたユーザーの投稿を除外
    const bannedUsers = await db.query.users.findMany({
      where: eq(users.is_banned, true),
      columns: {
        id: true
      }
    });

    // ブロックユーザーIDとBANユーザーIDを結合
    const excludedUserIds = [
      ...blockedUserIds,
      ...bannedUsers.map(u => u.id)
    ];

    // 除外対象ユーザーIDが存在する場合のSQLの一部
    let excludedUserFilter = '';
    if (excludedUserIds.length > 0) {
      excludedUserFilter = `AND p.user_id NOT IN (${excludedUserIds.join(',')})`;
    }

    // コミュニティに所属する投稿のIDを取得して除外
    const communityPostIds = await db
      .select({ post_id: community_posts.post_id })
      .from(community_posts)
      .where(eq(community_posts.is_deleted, false));
    
    // コミュニティ投稿IDのリストを作成
    const communityPostIdList = communityPostIds.map(cp => cp.post_id);

    // コミュニティ投稿IDが存在する場合のSQLの一部
    let communityPostFilter = '';
    if (communityPostIdList.length > 0) {
      communityPostFilter = `AND p.id NOT IN (${communityPostIdList.join(',')})`;
    }

    // カーソルが存在する場合のSQLの一部
    let cursorFilter = '';
    if (cursor) {
      const cursorId = parseInt(cursor);
      if (!isNaN(cursorId)) {
        cursorFilter = `AND p.id < ${cursorId}`;
      }
    }

    // 直接SQLクエリを使用してブックマーク済み投稿を取得
    const query = `
      SELECT p.*, u.username, u.profile_image_url, u.first_name, u.last_name
      FROM bookmarks b
      JOIN posts p ON b.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE b.user_id = ${dbUser.id}
        AND b.is_deleted = false
        AND p.is_deleted = false
        AND p.is_hidden = false
        ${excludedUserFilter}
        ${communityPostFilter}
        ${cursorFilter}
      ORDER BY p.id DESC
      LIMIT ${limit + 1}
    `;

    const result = await db.execute(sql.raw(query));
    
    // 結果がない場合
    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({
        posts: [],
        nextCursor: null
      });
    }
    
    // 型付けされた行データとして扱う
    const typedRows = result.rows as unknown as PostWithUser[];
    
    // ページネーション用に次のカーソルを設定
    const hasNextPage = typedRows.length > limit;
    const postsToShow = hasNextPage ? typedRows.slice(0, limit) : typedRows;
    const nextCursor = hasNextPage && postsToShow.length > 0 
      ? postsToShow[postsToShow.length - 1].id.toString() 
      : null;

    // 投稿IDのリスト
    const postIds = postsToShow.map(row => row.id);
    
    // 文字列化されたID配列を作成（SQLクエリ用）
    const postIdsForQuery = postIds.map(id => `${id}`).join(',');

    // 関連データ（いいね、ブックマーク、返信数）を取得
    const likeCountsMap = new Map<number, number>();
    const userLikedPostIds = new Set<number>();
    const bookmarkCountsMap = new Map<number, number>();
    const replyCountsMap = new Map<number, number>();

    // いいね数と状態を取得
    if (postIds.length > 0) {
      const likesQuery = `
        SELECT post_id, COUNT(*) as count
        FROM likes
        WHERE post_id IN (${postIdsForQuery})
          AND is_deleted = false
        GROUP BY post_id
      `;
      
      const likeCounts = await db.execute(sql.raw(likesQuery));
      
      if (likeCounts.rows) {
        likeCounts.rows.forEach((row: Record<string, unknown>) => {
          likeCountsMap.set(Number(row.post_id), Number(row.count));
        });
      }

      // ユーザーのいいね状態を取得
      const userLikesQuery = `
        SELECT post_id
        FROM likes
        WHERE user_id = ${dbUser.id}
          AND post_id IN (${postIdsForQuery})
          AND is_deleted = false
      `;
      
      const userLikes = await db.execute(sql.raw(userLikesQuery));
      
      if (userLikes.rows) {
        userLikes.rows.forEach((row: Record<string, unknown>) => {
          userLikedPostIds.add(Number(row.post_id));
        });
      }

      // ブックマーク数を取得
      const bookmarksQuery = `
        SELECT post_id, COUNT(*) as count
        FROM bookmarks
        WHERE post_id IN (${postIdsForQuery})
          AND is_deleted = false
        GROUP BY post_id
      `;
      
      const bookmarkCounts = await db.execute(sql.raw(bookmarksQuery));
      
      if (bookmarkCounts.rows) {
        bookmarkCounts.rows.forEach((row: Record<string, unknown>) => {
          bookmarkCountsMap.set(Number(row.post_id), Number(row.count));
        });
      }

      // 返信数を取得
      const repliesQuery = `
        SELECT in_reply_to_post_id as post_id, COUNT(*) as count
        FROM posts
        WHERE in_reply_to_post_id IN (${postIdsForQuery})
          AND post_type = 'reply'
          AND is_deleted = false
        GROUP BY in_reply_to_post_id
      `;
      
      const replyCounts = await db.execute(sql.raw(repliesQuery));
      
      if (replyCounts.rows) {
        replyCounts.rows.forEach((row: Record<string, unknown>) => {
          replyCountsMap.set(Number(row.post_id), Number(row.count));
        });
      }
    }

    // 関連投稿データ（返信先、引用元、リポスト元）を取得
    const relatedPostsMap = new Map<number, RelatedPost>();

    if (includeRelated) {
      // 返信先、引用元、リポスト元の投稿IDを収集
      const relatedPostIds = new Set<number>();
      postsToShow.forEach(row => {
        if (row.in_reply_to_post_id) relatedPostIds.add(row.in_reply_to_post_id);
        if (row.quote_of_post_id) relatedPostIds.add(row.quote_of_post_id);
        if (row.repost_of_post_id) relatedPostIds.add(row.repost_of_post_id);
      });

      // 関連投稿がある場合
      if (relatedPostIds.size > 0) {
        const relatedPostIdsArray = Array.from(relatedPostIds);
        const relatedPostIdsForQuery = relatedPostIdsArray.map(id => `${id}`).join(',');
        
        // 関連投稿データを取得
        if (relatedPostIdsArray.length > 0) {
          const relatedPostsQuery = `
            SELECT p.*, u.id as user_id, u.username, u.profile_image_url, u.first_name, u.last_name
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id IN (${relatedPostIdsForQuery})
              AND p.is_deleted = false
          `;
          
          const relatedPosts = await db.execute(sql.raw(relatedPostsQuery));

          if (relatedPosts.rows) {
            relatedPosts.rows.forEach((row: Record<string, unknown>) => {
              // 関連投稿マップに追加
              relatedPostsMap.set(Number(row.id), {
                id: Number(row.id),
                content: row.content as string,
                post_type: row.post_type as string,
                created_at: row.created_at as string,
                media_data: row.media_data,
                user: {
                  id: Number(row.user_id),
                  username: row.username as string,
                  profile_image_url: row.profile_image_url as string | undefined,
                  first_name: row.first_name as string | undefined,
                  last_name: row.last_name as string | undefined
                }
              });
            });
          }
        }
      }
    }

    // 結果を整形する
    const formattedPosts: FormattedPost[] = postsToShow.map(row => {
      const post: FormattedPost = {
        id: row.id,
        content: row.content,
        post_type: row.post_type,
        user_id: row.user_id,
        created_at: row.created_at,
        in_reply_to_post_id: row.in_reply_to_post_id,
        quote_of_post_id: row.quote_of_post_id,
        repost_of_post_id: row.repost_of_post_id,
        media_data: row.media_data,
        like_count: likeCountsMap.get(row.id) || 0,
        is_liked: userLikedPostIds.has(row.id),
        bookmark_count: bookmarkCountsMap.get(row.id) || 0,
        is_bookmarked: true, // ブックマークページなので必ずtrue
        reply_count: replyCountsMap.get(row.id) || 0,
        user: {
          id: row.user_id,
          username: row.username,
          profile_image_url: row.profile_image_url,
          first_name: row.first_name,
          last_name: row.last_name
        }
      };

      // 関連データを追加
      if (includeRelated) {
        if (row.in_reply_to_post_id && relatedPostsMap.has(row.in_reply_to_post_id)) {
          post.in_reply_to_post = relatedPostsMap.get(row.in_reply_to_post_id);
        }
        
        if (row.quote_of_post_id && relatedPostsMap.has(row.quote_of_post_id)) {
          post.quote_of_post = relatedPostsMap.get(row.quote_of_post_id);
        }
        
        if (row.repost_of_post_id && relatedPostsMap.has(row.repost_of_post_id)) {
          post.repost_of_post = relatedPostsMap.get(row.repost_of_post_id);
        }
      }

      return post;
    });

    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        hasNextPage,
        nextCursor
      }
    });
  } catch (error) {
    console.error('ブックマーク投稿取得中にエラーが発生しました:', error);
    console.error('エラーの詳細:', error instanceof Error ? error.message : String(error));
    console.error('エラータイプ:', Object.prototype.toString.call(error));
    
    if (error instanceof Error && error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: "サーバーエラーが発生しました", 
        details: error instanceof Error ? error.message : String(error),
        type: Object.prototype.toString.call(error)
      },
      { status: 500 }
    );
  }
} 