import { db } from '@/db';
import { posts, users, likes, bookmarks, blocks, community_posts } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, desc, asc, lt, gt, count, inArray, not, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

export const dynamic = 'force-dynamic';

// 投稿作成のバリデーションスキーマ
const createPostSchema = z.object({
  content: z.string().min(1).max(500),
  post_type: z.enum(['original', 'reply', 'quote', 'repost']).default('original'),
  in_reply_to_post_id: z.number().optional(),
  quote_of_post_id: z.number().optional(),
  repost_of_post_id: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Clerk認証からユーザー情報を取得
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await req.json();
    
    // バリデーション
    const validationResult = createPostSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "無効なリクエストです", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { content, post_type, in_reply_to_post_id, quote_of_post_id, repost_of_post_id } = validationResult.data;
    
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
    
    // replyの場合、返信先の投稿が存在するか確認
    if (post_type === 'reply' && in_reply_to_post_id) {
      const replyToPost = await db.query.posts.findFirst({
        where: and(
          eq(posts.id, in_reply_to_post_id),
          eq(posts.is_deleted, false)
        )
      });
      
      if (!replyToPost) {
        return NextResponse.json(
          { error: "返信先の投稿が見つかりません" },
          { status: 404 }
        );
      }
    }
    
    // quoteの場合、引用元の投稿が存在するか確認
    if (post_type === 'quote' && quote_of_post_id) {
      const quotePost = await db.query.posts.findFirst({
        where: and(
          eq(posts.id, quote_of_post_id),
          eq(posts.is_deleted, false)
        )
      });
      
      if (!quotePost) {
        return NextResponse.json(
          { error: "引用元の投稿が見つかりません" },
          { status: 404 }
        );
      }
    }
    
    // repostの場合、リポスト元の投稿が存在するか確認
    if (post_type === 'repost' && repost_of_post_id) {
      const repostOfPost = await db.query.posts.findFirst({
        where: and(
          eq(posts.id, repost_of_post_id),
          eq(posts.is_deleted, false)
        )
      });
      
      if (!repostOfPost) {
        return NextResponse.json(
          { error: "リポスト元の投稿が見つかりません" },
          { status: 404 }
        );
      }
    }
    
    // 投稿を作成
    const newPost = await db.insert(posts).values({
      user_id: dbUser.id,
      content,
      post_type,
      in_reply_to_post_id: in_reply_to_post_id || null,
      quote_of_post_id: quote_of_post_id || null,
      repost_of_post_id: repost_of_post_id || null,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    // 戻り値の型をより安全に処理
    const createdPost = Array.isArray(newPost) && newPost.length > 0 ? newPost[0] : null;
    
    return NextResponse.json(
      { success: true, post: createdPost },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('投稿作成中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 投稿一覧取得（ユーザーの投稿またはタイムライン）
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
    const sortOrder = searchParams.get('sort') || 'desc'; // デフォルトは降順（最新順）
    const includeRelated = searchParams.get('include_related') === 'true'; // 関連データを含めるかどうか
    
    // userIdパラメータを取得（指定されたユーザーの投稿を表示する場合）
    const targetUserId = searchParams.get('userId') ? parseInt(searchParams.get('userId') || '0') : null;
    
    // データベースからログインユーザー情報を取得
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });
    
    if (!dbUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }
    
    // 表示する投稿の条件を設定
    const conditions = [];
    
    // 削除・非表示の投稿は除外（共通）
    conditions.push(eq(posts.is_deleted, false));
    conditions.push(eq(posts.is_hidden, false));
    
    // ブロックしているユーザーとブロックされているユーザーの投稿を除外（共通）
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
    
    // ブロックリストを作成
    const blockedUserIds = new Set<number>();
    blockedUsers.forEach(block => {
      blockedUserIds.add(block.blocker_id);
      blockedUserIds.add(block.blocked_id);
    });
    // 自分のIDは除外
    blockedUserIds.delete(dbUser.id);
    
    // ブロックユーザーの投稿は除外（存在する場合のみ）（共通）
    if (blockedUserIds.size > 0) {
      conditions.push(not(inArray(posts.user_id, Array.from(blockedUserIds))));
    }
    
    // BANされたユーザーの投稿を除外
    const bannedUsers = await db.query.users.findMany({
      where: eq(users.is_banned, true),
      columns: {
        id: true
      }
    });
    
    const bannedUserIds = bannedUsers.map(user => user.id);
    
    // BANされたユーザーの投稿を除外（存在する場合のみ）
    if (bannedUserIds.length > 0) {
      conditions.push(not(inArray(posts.user_id, bannedUserIds)));
    }
    
    // コミュニティに所属する投稿のIDを取得して除外（共通）
    const communityPostIds = await db.select({
      post_id: community_posts.post_id
    })
    .from(community_posts)
    .where(eq(community_posts.is_deleted, false));
    
    const communityPostIdSet = new Set(communityPostIds.map(cp => cp.post_id));
    
    // コミュニティ投稿を除外（存在する場合のみ）（共通）
    if (communityPostIdSet.size > 0) {
      conditions.push(not(inArray(posts.id, Array.from(communityPostIdSet))));
    }
    
    // 特定のユーザーの投稿のみを表示する場合
    if (targetUserId) {
      // 指定されたユーザーIDの投稿のみを表示
      conditions.push(eq(posts.user_id, targetUserId));
    } else {
      // タイムライン表示の場合は条件なし（全ユーザーの投稿が対象）
      // 将来的にはここにフォローしているユーザーの投稿のみを表示する条件を追加することも可能
    }
    
    // カーソルベースのページネーション
    if (cursor) {
      const cursorId = parseInt(cursor);
      if (!isNaN(cursorId)) {
        // カーソル以降のデータを取得（IDの降順の場合は未満、昇順の場合は以上）
        if (sortOrder === 'desc') {
          conditions.push(lt(posts.id, cursorId));
        } else {
          conditions.push(gt(posts.id, cursorId));
        }
      }
    }
    
    // 投稿を取得するクエリを構築
    const query = db.select({
      id: posts.id,
      content: posts.content,
      post_type: posts.post_type,
      user_id: posts.user_id,
      created_at: posts.created_at,
      in_reply_to_post_id: posts.in_reply_to_post_id,
      quote_of_post_id: posts.quote_of_post_id,
      repost_of_post_id: posts.repost_of_post_id,
      media_data: posts.media_data
    })
    .from(posts)
    .where(and(...conditions));
    
    // ソート順を適用
    if (sortOrder === 'asc') {
      query.orderBy(asc(posts.id));
    } else {
      query.orderBy(desc(posts.id));
    }
    
    // 制限を適用 (limit + 1 で次ページがあるかを判定)
    query.limit(limit + 1);
    
    const results = await query;
    
    // 次のページがあるかチェック
    const hasNextPage = results.length > limit;
    const posts_list = hasNextPage ? results.slice(0, limit) : results;
    
    // 次のカーソルを設定
    const nextCursor = hasNextPage && posts_list.length > 0 
      ? posts_list[posts_list.length - 1].id.toString() 
      : null;
    
    // 投稿IDのリストを取得
    const postIds = posts_list.map(post => post.id);
    
    // 投稿が0件の場合は早期リターン
    if (postIds.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: {
          hasNextPage: false,
          nextCursor: null
        }
      });
    }
    
    // ユーザー情報を取得（自分の投稿だけではなく、全ての投稿のユーザー情報）
    const userIds = [...new Set(posts_list.map(post => post.user_id))];
    
    // ユーザー情報を取得
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
    
    // ユーザー情報をマップ化
    const userMap = new Map();
    usersData.forEach(user => {
      userMap.set(user.id, user);
    });
    
    // 各投稿に対する返信数を取得
    const replyCounts = await db.select({
      post_id: posts.in_reply_to_post_id,
      count: count()
    })
    .from(posts)
    .where(and(
      inArray(posts.in_reply_to_post_id, postIds),
      eq(posts.is_deleted, false),
      eq(posts.post_type, 'reply')
    ))
    .groupBy(posts.in_reply_to_post_id);
    
    // 返信数をマップに変換
    const replyCountMap = new Map();
    replyCounts.forEach(item => {
      if (item.post_id !== null) {
        replyCountMap.set(item.post_id, item.count);
      }
    });
    
    // 各投稿に対するいいね数を取得
    const likeCounts = await db.select({
      post_id: likes.post_id,
      count: count()
    })
    .from(likes)
    .where(and(
      inArray(likes.post_id, postIds),
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
      inArray(likes.post_id, postIds),
      eq(likes.is_deleted, false)
    ));
    
    // ユーザーのいいねをセットに変換
    const userLikedPostIds = new Set(userLikes.map(like => like.post_id));
    
    // 各投稿に対するブックマーク数を取得
    const bookmarkCounts = await db.select({
      post_id: bookmarks.post_id,
      count: count()
    })
    .from(bookmarks)
    .where(and(
      inArray(bookmarks.post_id, postIds),
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
      inArray(bookmarks.post_id, postIds),
      eq(bookmarks.is_deleted, false)
    ));
    
    // ユーザーのブックマークをセットに変換
    const userBookmarkedPostIds = new Set(userBookmarks.map(bookmark => bookmark.post_id));
    
    // 返信先の投稿IDを抽出
    const replyToPostIds = posts_list
      .filter(post => post.post_type === 'reply' && post.in_reply_to_post_id !== null)
      .map(post => post.in_reply_to_post_id)
      .filter(id => id !== null) as number[];
    
    // 返信先の投稿データと関連ユーザー情報を取得
    const replyToPostsMap = new Map();
    const replyToUserIds = new Set<number>();
    
    if (includeRelated && replyToPostIds.length > 0) {
      const replyToPosts = await db.select({
        id: posts.id,
        content: posts.content,
        user_id: posts.user_id
      })
      .from(posts)
      .where(and(
        inArray(posts.id, replyToPostIds),
        eq(posts.is_deleted, false)
      ));
      
      // 返信先投稿のユーザーIDを集める
      replyToPosts.forEach(post => {
        replyToUserIds.add(post.user_id);
        replyToPostsMap.set(post.id, post);
      });
      
      // 返信先投稿のユーザー情報を取得
      if (replyToUserIds.size > 0) {
        const replyToUsers = await db.query.users.findMany({
          where: inArray(users.id, Array.from(replyToUserIds)),
          columns: {
            id: true,
            username: true,
            profile_image_url: true,
            first_name: true,
            last_name: true
          }
        });
        
        // ユーザー情報をマップに追加
        replyToUsers.forEach(user => {
          userMap.set(user.id, user);
        });
      }
    }
    
    // ユーザー情報、いいね情報、ブックマーク情報を投稿に追加
    const postsWithDetails = posts_list.map(post => {
      const user = userMap.get(post.user_id) || {
        id: post.user_id,
        username: 'ユーザー',
        profile_image_url: null,
        first_name: null,
        last_name: null
      };
      
      // 返信先の投稿データを追加
      let in_reply_to_post = null;
      if (includeRelated && post.post_type === 'reply' && post.in_reply_to_post_id && replyToPostsMap.has(post.in_reply_to_post_id)) {
        const replyToPost = replyToPostsMap.get(post.in_reply_to_post_id);
        in_reply_to_post = {
          id: replyToPost.id,
          content: replyToPost.content,
          user: userMap.get(replyToPost.user_id) || null
        };
      }
      
      return {
        ...post,
        user,
        in_reply_to_post,
        reply_count: replyCountMap.get(post.id) || 0,
        like_count: likeCountMap.get(post.id) || 0,
        is_liked: userLikedPostIds.has(post.id),
        bookmark_count: bookmarkCountMap.get(post.id) || 0,
        is_bookmarked: userBookmarkedPostIds.has(post.id)
      };
    });
    
    return NextResponse.json({
      posts: postsWithDetails,
      pagination: {
        hasNextPage,
        nextCursor
      }
    });
    
  } catch (error) {
    console.error('投稿取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 