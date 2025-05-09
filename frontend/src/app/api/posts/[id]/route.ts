import { db } from '@/db';
import { posts, users, likes, bookmarks } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, count } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// 特定の投稿を取得するAPI
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    
    const postId = parseInt(params.id);
    
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
    
    // 投稿データを取得
    const [post] = await db.select()
      .from(posts)
      .where(and(
        eq(posts.id, postId),
        eq(posts.is_deleted, false)
      ))
      .limit(1);
    
    if (!post) {
      return NextResponse.json(
        { error: "投稿が見つかりません" },
        { status: 404 }
      );
    }
    
    // 投稿者の情報を取得
    const [postUser] = await db.select({
      id: users.id,
      username: users.username,
      profile_image_url: users.profile_image_url,
      first_name: users.first_name,
      last_name: users.last_name
    })
    .from(users)
    .where(eq(users.id, post.user_id))
    .limit(1);
    
    // 返信先の投稿情報を取得（もし返信の場合）
    let replyToPost = null;
    if (post.post_type === 'reply' && post.in_reply_to_post_id) {
      const [replyToPostData] = await db.select()
        .from(posts)
        .where(and(
          eq(posts.id, post.in_reply_to_post_id),
          eq(posts.is_deleted, false)
        ))
        .limit(1);
      
      if (replyToPostData) {
        const [replyToPostUser] = await db.select({
          id: users.id,
          username: users.username,
          profile_image_url: users.profile_image_url,
          first_name: users.first_name,
          last_name: users.last_name
        })
        .from(users)
        .where(eq(users.id, replyToPostData.user_id))
        .limit(1);
        
        replyToPost = {
          ...replyToPostData,
          user: replyToPostUser
        };
      }
    }
    
    // 引用元の投稿情報を取得（もし引用投稿の場合）
    let quotePost = null;
    if (post.post_type === 'quote' && post.quote_of_post_id) {
      const [quotePostData] = await db.select()
        .from(posts)
        .where(and(
          eq(posts.id, post.quote_of_post_id),
          eq(posts.is_deleted, false)
        ))
        .limit(1);
      
      if (quotePostData) {
        const [quotePostUser] = await db.select({
          id: users.id,
          username: users.username,
          profile_image_url: users.profile_image_url,
          first_name: users.first_name,
          last_name: users.last_name
        })
        .from(users)
        .where(eq(users.id, quotePostData.user_id))
        .limit(1);
        
        quotePost = {
          ...quotePostData,
          user: quotePostUser
        };
      }
    }
    
    // リポスト元の投稿情報を取得（もしリポストの場合）
    let repostOfPost = null;
    if (post.post_type === 'repost' && post.repost_of_post_id) {
      const [repostOfPostData] = await db.select()
        .from(posts)
        .where(and(
          eq(posts.id, post.repost_of_post_id),
          eq(posts.is_deleted, false)
        ))
        .limit(1);
      
      if (repostOfPostData) {
        const [repostOfPostUser] = await db.select({
          id: users.id,
          username: users.username,
          profile_image_url: users.profile_image_url,
          first_name: users.first_name,
          last_name: users.last_name
        })
        .from(users)
        .where(eq(users.id, repostOfPostData.user_id))
        .limit(1);
        
        repostOfPost = {
          ...repostOfPostData,
          user: repostOfPostUser
        };
      }
    }
    
    // 返信数を取得
    const repliesCount = await db.select({
      count: count()
    })
    .from(posts)
    .where(and(
      eq(posts.in_reply_to_post_id, post.id),
      eq(posts.post_type, 'reply'),
      eq(posts.is_deleted, false)
    ));
    
    const reply_count = repliesCount[0]?.count || 0;
    
    // いいね数を取得
    const likesCount = await db.select({
      count: count()
    })
    .from(likes)
    .where(and(
      eq(likes.post_id, post.id),
      eq(likes.is_deleted, false)
    ));
    
    const like_count = likesCount[0]?.count || 0;
    
    // ユーザーのいいね状態を取得
    const [userLike] = await db.select()
      .from(likes)
      .where(and(
        eq(likes.user_id, dbUser.id),
        eq(likes.post_id, post.id),
        eq(likes.is_deleted, false)
      ))
      .limit(1);
    
    // ブックマーク数を取得
    const bookmarksCount = await db.select({
      count: count()
    })
    .from(bookmarks)
    .where(and(
      eq(bookmarks.post_id, post.id),
      eq(bookmarks.is_deleted, false)
    ));
    
    const bookmark_count = bookmarksCount[0]?.count || 0;
    
    // ユーザーのブックマーク状態を取得
    const [userBookmark] = await db.select()
      .from(bookmarks)
      .where(and(
        eq(bookmarks.user_id, dbUser.id),
        eq(bookmarks.post_id, post.id),
        eq(bookmarks.is_deleted, false)
      ))
      .limit(1);
    
    // レスポンスデータを構築
    const postWithDetails = {
      ...post,
      user: postUser,
      in_reply_to_post: replyToPost,
      quote_of_post: quotePost,
      repost_of_post: repostOfPost,
      reply_count: reply_count,
      like_count: like_count,
      is_liked: !!userLike,
      bookmark_count: bookmark_count,
      is_bookmarked: !!userBookmark
    };
    
    return NextResponse.json({
      post: postWithDetails
    });
    
  } catch (error) {
    console.error('投稿詳細取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 投稿を削除するAPI（is_deletedフラグを使用した論理削除）
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Clerk認証からユーザー情報を取得
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }
    
    const postId = parseInt(params.id);
    
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
    
    // 投稿を取得して所有者か確認
    const [post] = await db.select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    
    if (!post) {
      return NextResponse.json(
        { error: "投稿が見つかりません" },
        { status: 404 }
      );
    }
    
    // 投稿が既に削除済みかどうかを確認
    if (post.is_deleted) {
      return NextResponse.json(
        { error: "投稿は既に削除されています" },
        { status: 404 }
      );
    }
    
    // 投稿の所有者でない場合はエラー
    if (post.user_id !== dbUser.id) {
      return NextResponse.json(
        { error: "この投稿を削除する権限がありません" },
        { status: 403 }
      );
    }
    
    // 投稿の論理削除
    await db.update(posts)
      .set({ 
        is_deleted: true,
        deleted_at: new Date()
      })
      .where(eq(posts.id, postId));
    
    return NextResponse.json({
      success: true,
      message: "投稿が削除されました"
    });
    
  } catch (error) {
    console.error('投稿削除中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 