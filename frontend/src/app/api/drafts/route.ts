import { db } from '@/db';
import { drafts, users, posts } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { desc, eq, and, isNull, lt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// 下書き一覧取得API
export async function GET(req: NextRequest) {
  try {
    // ユーザー認証
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // クエリパラメータの取得
    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor');
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : ITEMS_PER_PAGE;

    // DBユーザーの取得
    const [dbUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ページネーション処理のためのID取得
    let cursorId: number | undefined;
    if (cursor) {
      cursorId = parseInt(cursor, 10);
    }

    // 基本クエリ条件
    const baseConditions = and(
      eq(drafts.user_id, dbUser.id),
      eq(drafts.is_deleted, false),
      isNull(drafts.deleted_at)
    );
    
    // カーソルに基づいた追加条件
    const conditions = cursorId 
      ? and(baseConditions, lt(drafts.id, cursorId)) 
      : baseConditions;

    // 下書き一覧を取得するクエリ
    const draftItems = await db.select({
      id: drafts.id,
      user_id: drafts.user_id,
      content: drafts.content,
      in_reply_to_post_id: drafts.in_reply_to_post_id,
      media_data: drafts.media_data,
      created_at: drafts.created_at,
      updated_at: drafts.updated_at,
    })
    .from(drafts)
    .where(conditions)
    .orderBy(desc(drafts.updated_at))
    .limit(limit + 1);

    // 返信先の投稿情報を取得
    const draftsWithReplyInfo = await Promise.all(draftItems.map(async (draft) => {
      // 返信下書きの場合のみ返信先投稿情報を取得
      if (draft.in_reply_to_post_id) {
        try {
          const [replyToPost] = await db.select()
            .from(posts)
            .where(and(
              eq(posts.id, draft.in_reply_to_post_id),
              eq(posts.is_deleted, false)
            ))
            .limit(1);
          
          if (replyToPost) {
            // 投稿者の情報を取得
            const [replyToUser] = await db.select({
              id: users.id,
              username: users.username,
              profile_image_url: users.profile_image_url,
              first_name: users.first_name,
              last_name: users.last_name
            })
            .from(users)
            .where(eq(users.id, replyToPost.user_id))
            .limit(1);
            
            // 返信先情報を追加
            return {
              ...draft,
              replyToPost: {
                ...replyToPost,
                user: replyToUser
              }
            };
          }
        } catch (err) {
          console.error('返信先投稿取得エラー:', err);
        }
      }
      
      // 返信でない場合はそのまま返す
      return draft;
    }));

    // ページネーション情報の構築
    const hasNextPage = draftsWithReplyInfo.length > limit;
    if (hasNextPage) {
      draftsWithReplyInfo.pop(); // 余分に取得した要素を削除
    }

    const nextCursor = hasNextPage ? draftsWithReplyInfo[draftsWithReplyInfo.length - 1]?.id.toString() : null;

    // レスポンス返却
    return NextResponse.json({
      drafts: draftsWithReplyInfo,
      pagination: {
        hasNextPage,
        nextCursor
      }
    });
  } catch (error) {
    console.error('下書き一覧取得エラー:', error);
    return NextResponse.json(
      { error: '下書き一覧の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 下書き保存API
export async function POST(req: NextRequest) {
  try {
    // ユーザー認証
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // 下書きの保存
    const draft = await db.insert(drafts).values({
      user_id: dbUser.id,
      content: content.trim(),
      in_reply_to_post_id: in_reply_to_post_id || null,
      media_data: media_data || null,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false
    }).returning();

    // レスポンス返却
    return NextResponse.json({
      success: true,
      draft: draft[0]
    });
  } catch (error) {
    console.error('下書き保存エラー:', error);
    return NextResponse.json(
      { error: '下書きの保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 下書き削除API
export async function DELETE(req: NextRequest) {
  try {
    // ユーザー認証
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URLからdraft_idを取得
    const url = new URL(req.url);
    const draftId = url.searchParams.get('id');

    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    // DBユーザーの取得
    const [dbUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ユーザーの下書きであることを確認
    const [draftToDelete] = await db.select()
      .from(drafts)
      .where(and(
        eq(drafts.id, parseInt(draftId)),
        eq(drafts.user_id, dbUser.id),
        eq(drafts.is_deleted, false)
      ))
      .limit(1);

    if (!draftToDelete) {
      return NextResponse.json({ error: 'Draft not found or already deleted' }, { status: 404 });
    }

    // 論理削除
    await db.update(drafts)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
      })
      .where(eq(drafts.id, parseInt(draftId)));

    // レスポンス返却
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('下書き削除エラー:', error);
    return NextResponse.json(
      { error: '下書きの削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 