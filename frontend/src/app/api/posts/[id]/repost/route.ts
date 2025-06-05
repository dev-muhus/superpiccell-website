import { db } from '@/db';
import { posts, users, blocks } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// リポスト作成
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

    // リポスト元の投稿を取得
    const [originalPost] = await db.select()
      .from(posts)
      .where(and(
        eq(posts.id, postId),
        eq(posts.is_deleted, false),
        eq(posts.is_hidden, false)
      ))
      .limit(1);

    if (!originalPost) {
      return NextResponse.json(
        { error: "投稿が見つかりません" },
        { status: 404 }
      );
    }

    // ブロック関係をチェック
    const [blockExists] = await db.select()
      .from(blocks)
      .where(and(
        or(
          and(
            eq(blocks.blocker_id, dbUser.id),
            eq(blocks.blocked_id, originalPost.user_id)
          ),
          and(
            eq(blocks.blocker_id, originalPost.user_id),
            eq(blocks.blocked_id, dbUser.id)
          )
        ),
        eq(blocks.is_deleted, false)
      ))
      .limit(1);

    if (blockExists) {
      return NextResponse.json(
        { error: "この投稿をリポストすることはできません" },
        { status: 403 }
      );
    }

    // 既に同じ投稿をリポストしていないかチェック
    const [existingRepost] = await db.select()
      .from(posts)
      .where(and(
        eq(posts.user_id, dbUser.id),
        eq(posts.post_type, 'repost'),
        eq(posts.repost_of_post_id, postId),
        eq(posts.is_deleted, false)
      ))
      .limit(1);

    if (existingRepost) {
      return NextResponse.json(
        { error: "既にこの投稿をリポストしています" },
        { status: 400 }
      );
    }

    // リポストを作成（コンテンツなし）
    const [newRepost] = await db.insert(posts).values({
      user_id: dbUser.id,
      content: null,
      post_type: 'repost',
      repost_of_post_id: postId,
      media_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    return NextResponse.json({
      success: true,
      post: newRepost
    }, { status: 201 });

  } catch (error) {
    console.error('リポスト作成中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// リポスト削除（アンリポスト）
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

    // 既存のリポストを検索
    const [existingRepost] = await db.select()
      .from(posts)
      .where(and(
        eq(posts.user_id, dbUser.id),
        eq(posts.post_type, 'repost'),
        eq(posts.repost_of_post_id, postId),
        eq(posts.is_deleted, false)
      ))
      .limit(1);

    if (!existingRepost) {
      return NextResponse.json(
        { error: "リポストが見つかりません" },
        { status: 404 }
      );
    }

    // リポストを削除（ソフトデリート）
    await db.update(posts)
      .set({
        is_deleted: true,
        updated_at: new Date()
      })
      .where(eq(posts.id, existingRepost.id));

    return NextResponse.json({
      success: true,
      message: "リポストを解除しました"
    }, { status: 200 });

  } catch (error) {
    console.error('リポスト削除中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}