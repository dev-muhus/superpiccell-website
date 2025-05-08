import { db } from '@/db';
import { posts, likes, users } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, count } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// いいねを追加・削除するAPI
export async function POST(
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
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });
    
    if (!dbUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 投稿が存在するか確認
    const post = await db.query.posts.findFirst({
      where: and(
        eq(posts.id, postId),
        eq(posts.is_deleted, false)
      )
    });

    if (!post) {
      return NextResponse.json(
        { error: "投稿が見つかりません" },
        { status: 404 }
      );
    }

    // 既にいいねしているか確認
    const existingLike = await db.query.likes.findFirst({
      where: and(
        eq(likes.user_id, dbUser.id),
        eq(likes.post_id, postId),
        eq(likes.is_deleted, false)
      )
    });

    // いいねが存在する場合は削除（is_deletedをtrueに設定）
    if (existingLike) {
      await db
        .update(likes)
        .set({
          is_deleted: true,
          deleted_at: new Date()
        })
        .where(eq(likes.id, existingLike.id));

      // いいね数を取得
      const likeCount = await db
        .select({ count: count() })
        .from(likes)
        .where(
          and(
            eq(likes.post_id, postId),
            eq(likes.is_deleted, false)
          )
        );

      return NextResponse.json({
        success: true,
        liked: false,
        like_count: likeCount[0].count
      });
    } 
    // いいねが存在しない場合は作成
    else {
      await db.insert(likes).values({
        user_id: dbUser.id,
        post_id: postId,
        created_at: new Date()
      });

      // いいね数を取得
      const likeCount = await db
        .select({ count: count() })
        .from(likes)
        .where(
          and(
            eq(likes.post_id, postId),
            eq(likes.is_deleted, false)
          )
        );

      return NextResponse.json({
        success: true,
        liked: true,
        like_count: likeCount[0].count
      });
    }
  } catch (error) {
    console.error('いいね処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 投稿のいいね状態を取得するAPI
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Clerk認証からユーザー情報を取得
    const { userId } = getAuth(req);
    
    const postId = parseInt(params.id);
    if (isNaN(postId)) {
      return NextResponse.json(
        { error: "無効な投稿IDです" },
        { status: 400 }
      );
    }

    // いいね数を取得
    const likeCount = await db
      .select({ count: count() })
      .from(likes)
      .where(
        and(
          eq(likes.post_id, postId),
          eq(likes.is_deleted, false)
        )
      );

    // ログインしていない場合はいいね数のみ返す
    if (!userId) {
      return NextResponse.json({
        like_count: likeCount[0].count,
        liked: false
      });
    }

    // データベースからユーザー情報を取得
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });
    
    if (!dbUser) {
      return NextResponse.json({
        like_count: likeCount[0].count,
        liked: false
      });
    }

    // ユーザーがいいねしているか確認
    const existingLike = await db.query.likes.findFirst({
      where: and(
        eq(likes.user_id, dbUser.id),
        eq(likes.post_id, postId),
        eq(likes.is_deleted, false)
      )
    });

    return NextResponse.json({
      like_count: likeCount[0].count,
      liked: !!existingLike
    });
  } catch (error) {
    console.error('いいね状態取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 