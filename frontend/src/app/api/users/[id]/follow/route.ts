import { db } from '@/db';
import { follows, users } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// ユーザーをフォロー/アンフォローするAPI
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

    const targetUserId = parseInt(params.id);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { error: "無効なユーザーIDです" },
        { status: 400 }
      );
    }

    // データベースからログインユーザー情報を取得
    const [currentUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // フォロー対象のユーザーが存在するか確認
    const [targetUser] = await db.select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { error: "フォロー対象のユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 自分自身をフォローしようとしていないか確認
    if (currentUser.id === targetUserId) {
      return NextResponse.json(
        { error: "自分自身をフォローすることはできません" },
        { status: 400 }
      );
    }

    // 既にフォローしているか確認
    const [existingFollow] = await db.select()
      .from(follows)
      .where(and(
        eq(follows.follower_id, currentUser.id),
        eq(follows.following_id, targetUserId),
        eq(follows.is_deleted, false)
      ))
      .limit(1);

    // フォローが存在する場合は何もせず、成功レスポンスを返す
    if (existingFollow) {
      return NextResponse.json({
        success: true,
        following: true
      });
    } 
    // フォローが存在しない場合は新規作成
    else {
      await db.insert(follows).values({
        follower_id: currentUser.id,
        following_id: targetUserId,
        created_at: new Date()
      });

      return NextResponse.json({
        success: true,
        following: true
      });
    }
  } catch (error) {
    console.error('フォロー処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// フォロー解除のAPI
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

    const targetUserId = parseInt(params.id);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { error: "無効なユーザーIDです" },
        { status: 400 }
      );
    }

    // データベースからログインユーザー情報を取得
    const [currentUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 既存のフォローを検索
    const [existingFollow] = await db.select()
      .from(follows)
      .where(and(
        eq(follows.follower_id, currentUser.id),
        eq(follows.following_id, targetUserId),
        eq(follows.is_deleted, false)
      ))
      .limit(1);

    // フォローが存在する場合は論理削除
    if (existingFollow) {
      await db
        .update(follows)
        .set({
          is_deleted: true,
          deleted_at: new Date()
        })
        .where(eq(follows.id, existingFollow.id));

      return NextResponse.json({
        success: true,
        following: false
      });
    } 
    // フォローが存在しない場合は何もしない
    else {
      return NextResponse.json({
        success: true,
        following: false
      });
    }
  } catch (error) {
    console.error('フォロー解除処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// フォロー状態を確認するAPI
export async function GET(
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

    const targetUserId = parseInt(params.id);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { error: "無効なユーザーIDです" },
        { status: 400 }
      );
    }

    // データベースからログインユーザー情報を取得
    const [currentUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // フォロー状態を確認
    const [existingFollow] = await db.select()
      .from(follows)
      .where(and(
        eq(follows.follower_id, currentUser.id),
        eq(follows.following_id, targetUserId),
        eq(follows.is_deleted, false)
      ))
      .limit(1);

    return NextResponse.json({
      following: !!existingFollow
    });
  } catch (error) {
    console.error('フォロー状態確認中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 