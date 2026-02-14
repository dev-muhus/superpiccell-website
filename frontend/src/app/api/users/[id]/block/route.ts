import { db } from '@/db';
import { blocks, users } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// ユーザーをブロック/ブロック解除するAPI
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const targetUserId = parseInt(id);
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

    // ブロック対象のユーザーが存在するか確認
    const [targetUser] = await db.select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { error: "ブロック対象のユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // ターゲットユーザーがBANされているか確認
    if (targetUser.is_banned) {
      return NextResponse.json(
        { error: "BANされているユーザーはブロックできません" },
        { status: 400 }
      );
    }

    // 自分自身をブロックしようとしていないか確認
    if (currentUser.id === targetUserId) {
      return NextResponse.json(
        { error: "自分自身をブロックすることはできません" },
        { status: 400 }
      );
    }

    // 既にブロックしているか確認
    const [existingBlock] = await db.select()
      .from(blocks)
      .where(and(
        eq(blocks.blocker_id, currentUser.id),
        eq(blocks.blocked_id, targetUserId),
        eq(blocks.is_deleted, false)
      ))
      .limit(1);

    // ブロックが存在する場合は何もせず、成功レスポンスを返す
    if (existingBlock) {
      return NextResponse.json({
        success: true,
        blocked: true
      });
    } 
    // ブロックが存在しない場合は新規作成
    else {
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: targetUserId,
        created_at: new Date()
      });

      return NextResponse.json({
        success: true,
        blocked: true
      });
    }
  } catch (error) {
    console.error('ブロック処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ブロック解除のAPI
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const targetUserId = parseInt(id);
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

    // 既存のブロックを検索
    const [existingBlock] = await db.select()
      .from(blocks)
      .where(and(
        eq(blocks.blocker_id, currentUser.id),
        eq(blocks.blocked_id, targetUserId),
        eq(blocks.is_deleted, false)
      ))
      .limit(1);

    // ブロックが存在する場合は論理削除
    if (existingBlock) {
      await db
        .update(blocks)
        .set({
          is_deleted: true,
          deleted_at: new Date()
        })
        .where(eq(blocks.id, existingBlock.id));

      return NextResponse.json({
        success: true,
        blocked: false
      });
    } 
    // ブロックが存在しない場合は何もしない
    else {
      return NextResponse.json({
        success: true,
        blocked: false
      });
    }
  } catch (error) {
    console.error('ブロック解除処理中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ブロック状態を確認するAPI
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const targetUserId = parseInt(id);
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

    // ブロック状態を確認
    const [existingBlock] = await db.select()
      .from(blocks)
      .where(and(
        eq(blocks.blocker_id, currentUser.id),
        eq(blocks.blocked_id, targetUserId),
        eq(blocks.is_deleted, false)
      ))
      .limit(1);

    return NextResponse.json({
      blocked: !!existingBlock
    });
  } catch (error) {
    console.error('ブロック状態確認中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 