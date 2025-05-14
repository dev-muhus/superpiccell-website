import { db } from '@/db';
import { drafts, users, posts, draft_media } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { desc, eq, and, isNull, lt, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ITEMS_PER_PAGE } from '@/constants/pagination';
import { z } from 'zod';
import { baseContentSchema, MediaItem } from '@/schemas/media';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// 下書き作成のバリデーションスキーマ（共通のbaseContentSchemaを拡張）
const createDraftSchema = baseContentSchema.extend({
  in_reply_to_post_id: z.number().optional(),
}).refine(
  // contentかmediaのどちらかは必須
  (data) => {
    return (!!data.content && data.content.trim().length > 0) || 
           (!!data.media && data.media.length > 0);
  },
  {
    message: "投稿内容またはメディアのいずれかは入力必須です",
    path: ["content"]
  }
);

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
      media_count: drafts.media_count,
      created_at: drafts.created_at,
      updated_at: drafts.updated_at,
    })
    .from(drafts)
    .where(conditions)
    .orderBy(desc(drafts.updated_at))
    .limit(limit + 1);

    // 下書きIDのリストを取得
    const draftIds = draftItems.map(draft => draft.id);

    // メディアデータを取得
    const mediaData = await db.select()
      .from(draft_media)
      .where(and(
        inArray(draft_media.draft_id, draftIds),
        eq(draft_media.is_deleted, false)
      ));

    // 下書きIDごとのメディアデータをマップに変換
    const mediaMap = new Map();
    mediaData.forEach(media => {
      if (!mediaMap.has(media.draft_id)) {
        mediaMap.set(media.draft_id, []);
      }
      mediaMap.get(media.draft_id).push(media);
    });

    // 返信先の投稿情報を取得
    const draftsWithReplyInfo = await Promise.all(draftItems.map(async (draft) => {
      // メディア情報を追加
      const media = mediaMap.get(draft.id) || [];
      
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
              media,
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
      
      // 返信でない場合はそのまま返す（メディア情報は追加）
      return {
        ...draft,
        media
      };
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
    
    // バリデーション
    const validationResult = createDraftSchema.safeParse(requestData);
    if (!validationResult.success) {
      console.error('下書き保存API: バリデーションエラー:', {
        error: validationResult.error.format()
      });
      return NextResponse.json(
        { error: '入力内容が無効です', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { content, in_reply_to_post_id, media } = validationResult.data;

    // DBユーザーの取得
    const [dbUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    try {
      
      // 1. draftsテーブルにレコードを挿入
      const draft = await db.insert(drafts).values({
        user_id: dbUser.id,
        content: content?.trim() || '',
        in_reply_to_post_id: in_reply_to_post_id || null,
        media_count: media ? media.length : 0,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false
      }).returning();

      const createdDraft = draft[0];

      // 2. メディアがある場合、draft_mediaテーブルに保存
      if (media && media.length > 0 && createdDraft) {
        // 各メディアをdraft_mediaテーブルに保存
        const mediaValues = media.map((m: MediaItem) => ({
          draft_id: createdDraft.id,
          media_type: m.mediaType,
          url: m.url,
          width: m.width || null,
          height: m.height || null,
          duration_sec: m.mediaType === 'video' ? m.duration_sec || null : null,
          created_at: new Date(),
          is_deleted: false
        }));
        
        try {
          await db.insert(draft_media).values(mediaValues);
        } catch (error) {
          console.error('draft_mediaテーブル挿入エラー:', error);
          // メディア情報の保存に失敗しても下書き自体は成功させる
        }
      }
      
      console.log('下書き保存API: データベース操作成功', { draftId: createdDraft.id });

      // draft_mediaを取得
      const draftMediaItems = await db.select()
        .from(draft_media)
        .where(and(
          eq(draft_media.draft_id, createdDraft.id),
          eq(draft_media.is_deleted, false)
        ));

      // レスポンス返却
      return NextResponse.json({
        success: true,
        draft: {
          ...createdDraft,
          media: draftMediaItems
        }
      });
    } catch (dbError) {
      console.error('下書き保存API: データベース操作エラー:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('下書き保存エラー:', error);
    return NextResponse.json(
      { error: '下書きの保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 