import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import { drafts, users } from '@/db/schema';

// 下書きを更新するAPI
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ユーザー認証
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = parseInt(params.id);
    
    if (isNaN(draftId)) {
      return NextResponse.json({ error: "無効な下書きIDです" }, { status: 400 });
    }

    // リクエストボディの取得
    const requestData = await req.json();
    const { content, in_reply_to_post_id, media_data } = requestData;

    // コンテンツのバリデーション
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Content must be less than 500 characters' },
        { status: 400 }
      );
    }

    // DBユーザーの取得
    const [dbUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 更新対象の下書きを取得して検証
    const [existingDraft] = await db.select()
      .from(drafts)
      .where(and(
        eq(drafts.id, draftId),
        eq(drafts.user_id, dbUser.id),
        eq(drafts.is_deleted, false)
      ))
      .limit(1);

    if (!existingDraft) {
      return NextResponse.json({ error: '下書きが見つからないか、すでに削除されています' }, { status: 404 });
    }

    // 下書きを更新
    const updatedDraft = await db.update(drafts)
      .set({
        content: content.trim(),
        in_reply_to_post_id: in_reply_to_post_id || null,
        media_data: media_data || null,
        updated_at: new Date()
      })
      .where(eq(drafts.id, draftId))
      .returning();

    // レスポンス返却
    return NextResponse.json({
      success: true,
      draft: updatedDraft[0]
    });
  } catch (error) {
    console.error('下書き更新エラー:', error);
    return NextResponse.json(
      { error: '下書きの更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 個別の下書きを取得するAPI
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ユーザー認証
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftId = parseInt(params.id);
    
    if (isNaN(draftId)) {
      return NextResponse.json({ error: "無効な下書きIDです" }, { status: 400 });
    }

    // DBユーザーの取得
    const [dbUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 下書きを取得
    const [draft] = await db.select()
      .from(drafts)
      .where(and(
        eq(drafts.id, draftId),
        eq(drafts.user_id, dbUser.id),
        eq(drafts.is_deleted, false)
      ))
      .limit(1);

    if (!draft) {
      return NextResponse.json({ error: '下書きが見つかりません' }, { status: 404 });
    }

    // レスポンス返却
    return NextResponse.json({
      draft
    });
  } catch (error) {
    console.error('下書き取得エラー:', error);
    return NextResponse.json(
      { error: '下書きの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 