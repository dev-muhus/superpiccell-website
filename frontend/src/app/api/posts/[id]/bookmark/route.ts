import { db } from '@/db';
import { posts, bookmarks, users } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, count } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// ブックマークを追加・削除するAPI
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

    // 既にブックマークしているか確認
    const existingBookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.user_id, dbUser.id),
        eq(bookmarks.post_id, postId),
        eq(bookmarks.is_deleted, false)
      )
    });

    // ブックマークが存在する場合は削除（is_deletedをtrueに設定）
    if (existingBookmark) {
      await db
        .update(bookmarks)
        .set({
          is_deleted: true,
          deleted_at: new Date()
        })
        .where(eq(bookmarks.id, existingBookmark.id));

      // ブックマーク数を取得
      const bookmarkCount = await db
        .select({ count: count() })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.post_id, postId),
            eq(bookmarks.is_deleted, false)
          )
        );

      return NextResponse.json({
        success: true,
        bookmarked: false,
        bookmark_count: bookmarkCount[0].count
      });
    } 
    // ブックマークが存在しない場合は作成
    else {
      await db.insert(bookmarks).values({
        user_id: dbUser.id,
        post_id: postId,
        created_at: new Date()
      });

      // ブックマーク数を取得
      const bookmarkCount = await db
        .select({ count: count() })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.post_id, postId),
            eq(bookmarks.is_deleted, false)
          )
        );

      return NextResponse.json({
        success: true,
        bookmarked: true,
        bookmark_count: bookmarkCount[0].count
      });
    }
  } catch (error) {
    console.error('ブックマーク処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// 投稿のブックマーク状態を取得するAPI
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

    // ブックマーク数を取得
    const bookmarkCount = await db
      .select({ count: count() })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.post_id, postId),
          eq(bookmarks.is_deleted, false)
        )
      );

    // ログインしていない場合はブックマーク数のみ返す
    if (!userId) {
      return NextResponse.json({
        bookmark_count: bookmarkCount[0].count,
        bookmarked: false
      });
    }

    // データベースからユーザー情報を取得
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });
    
    if (!dbUser) {
      return NextResponse.json({
        bookmark_count: bookmarkCount[0].count,
        bookmarked: false
      });
    }

    // ユーザーがブックマークしているか確認
    const existingBookmark = await db.query.bookmarks.findFirst({
      where: and(
        eq(bookmarks.user_id, dbUser.id),
        eq(bookmarks.post_id, postId),
        eq(bookmarks.is_deleted, false)
      )
    });

    return NextResponse.json({
      bookmark_count: bookmarkCount[0].count,
      bookmarked: !!existingBookmark
    });
  } catch (error) {
    console.error('ブックマーク状態取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 