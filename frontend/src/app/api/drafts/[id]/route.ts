import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import { drafts, users, draft_media } from '@/db/schema';
import { deleteMedia } from '@/utils/media-utils';
import { MediaItem, mediaSchema } from '@/schemas/media';

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
    const { content, in_reply_to_post_id, media } = requestData;

    // コンテンツまたはメディアのいずれかが必要
    const hasContent = content && typeof content === 'string' && content.trim() !== '';
    const hasMedia = media && Array.isArray(media) && media.length > 0;

    if (!hasContent && !hasMedia) {
      return NextResponse.json({ error: 'Content or media is required' }, { status: 400 });
    }

    // コンテンツの文字数制限
    if (hasContent && content.length > 500) {
      return NextResponse.json(
        { error: 'Content must be less than 500 characters' },
        { status: 400 }
      );
    }

    // メディアバリデーション
    if (media) {
      const mediaValidation = mediaSchema.safeParse(media);
      if (!mediaValidation.success) {
        console.error('メディアバリデーションエラー:', {
          media: media,
          error: mediaValidation.error.format()
        });
        return NextResponse.json(
          { error: 'Invalid media data', details: mediaValidation.error.format() },
          { status: 400 }
        );
      }

      // 空の配列の場合は処理を続行
      if (Array.isArray(media) && media.length === 0) {
        console.log('メディアは空の配列ですが、処理を続行します');
      }
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

    try {
      console.log('下書き更新API: データベース操作開始');
      
      // 1. 下書きの更新
      console.log('下書き更新API: draftsテーブルの更新開始');
      const updatedDraft = await db.update(drafts)
        .set({
          content: content.trim(),
          in_reply_to_post_id: in_reply_to_post_id || null,
          media_count: media ? media.length : 0,
          updated_at: new Date()
        })
        .where(eq(drafts.id, draftId))
        .returning();

      console.log('下書き更新API: draftsテーブル更新完了', { draftId });

      // 2. 既存のメディアを取得して、削除すべきメディアを特定
      const existingMedia = await db.select()
        .from(draft_media)
        .where(and(
          eq(draft_media.draft_id, draftId),
          eq(draft_media.is_deleted, false)
        ));

      console.log('下書き更新API: 既存メディア取得', { count: existingMedia.length });

      // 新しいメディアURLのリスト
      const newMediaUrls = media?.map((m: MediaItem) => m.url) || [];
      
      // 削除すべきメディア（新しいメディアリストに含まれていないもの）
      const mediaToDelete = existingMedia.filter(m => !newMediaUrls.includes(m.url));
      console.log('下書き更新API: 削除対象メディア', { count: mediaToDelete.length });

      // 各メディアを削除
      for (const item of mediaToDelete) {
        try {
          // ファイルサーバーから削除
          const deleted = await deleteMedia(item.url, item.media_type as 'image' | 'video');
          console.log(`メディア削除 ${item.url}: ${deleted ? '成功' : '失敗'}`);

          // DBから論理削除
          await db.update(draft_media)
            .set({
              is_deleted: true,
              deleted_at: new Date()
            })
            .where(eq(draft_media.id, item.id));
        } catch (err) {
          console.error(`メディア削除エラー ${item.url}:`, err);
          // エラーが発生しても処理は続行
        }
      }

      // 3. 残りの既存メディアを論理削除（残すべきメディアは後で再作成）
      const remainingMedia = existingMedia.filter(m => newMediaUrls.includes(m.url));
      if (remainingMedia.length > 0) {
        await db.update(draft_media)
          .set({
            is_deleted: true,
            deleted_at: new Date()
          })
          .where(and(
            eq(draft_media.draft_id, draftId),
            eq(draft_media.is_deleted, false)
          ));
      }

      // 4. 新しいメディアがある場合は挿入
      if (media && media.length > 0) {
        console.log('下書き更新API: 新しいメディア情報の保存開始', {
          mediaCount: media.length,
          firstMediaType: media[0].mediaType
        });
        
        const mediaValues = media.map((m: MediaItem) => ({
          draft_id: draftId,
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
          console.log('下書き更新API: draft_mediaテーブル挿入完了');
        } catch (error) {
          console.error('draft_mediaテーブル挿入エラー:', error);
          // メディア情報の保存に失敗しても下書き自体は成功させる
        }
      }

      console.log('下書き更新API: データベース操作成功', { draftId });

      // 更新後のメディアを取得
      const mediaItems = await db.select()
        .from(draft_media)
        .where(and(
          eq(draft_media.draft_id, draftId),
          eq(draft_media.is_deleted, false)
        ));

      // レスポンス返却
      return NextResponse.json({
        success: true,
        draft: {
          ...updatedDraft[0],
          media: mediaItems
        }
      });
    } catch (dbError) {
      console.error('下書き更新API: データベース操作エラー:', dbError);
      throw dbError;
    }
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

    // メディア情報を取得
    const mediaItems = await db.select()
      .from(draft_media)
      .where(and(
        eq(draft_media.draft_id, draftId),
        eq(draft_media.is_deleted, false)
      ));

    // レスポンス返却
    return NextResponse.json({
      draft: {
        ...draft,
        media: mediaItems
      }
    });
  } catch (error) {
    console.error('下書き取得エラー:', error);
    return NextResponse.json(
      { error: '下書きの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 下書き削除API
export async function DELETE(
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

    // クエリパラメータから投稿への変換かどうかを取得
    const url = new URL(req.url);
    const convertToPost = url.searchParams.get('convertToPost') === 'true';

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
        eq(drafts.id, draftId),
        eq(drafts.user_id, dbUser.id),
        eq(drafts.is_deleted, false)
      ))
      .limit(1);

    if (!draftToDelete) {
      return NextResponse.json({ error: 'Draft not found or already deleted' }, { status: 404 });
    }

    // 削除する下書きに紐づくメディアを取得
    const mediaToDelete = await db.select()
      .from(draft_media)
      .where(and(
        eq(draft_media.draft_id, draftId),
        eq(draft_media.is_deleted, false)
      ));

    try {
      // 1. 下書きを論理削除
      await db.update(drafts)
        .set({
          is_deleted: true,
          deleted_at: new Date(),
        })
        .where(eq(drafts.id, draftId));

      // 2. 関連するメディアも論理削除
      await db.update(draft_media)
        .set({
          is_deleted: true,
          deleted_at: new Date()
        })
        .where(eq(draft_media.draft_id, draftId));
        
    } catch (dbError) {
      console.error('下書き削除API: データベース操作エラー:', dbError);
      throw dbError;
    }

    // ストレージからメディアファイルを削除
    // 投稿への変換の場合はファイル削除をスキップ（ファイルは投稿でも使用されるため）
    if (mediaToDelete.length > 0 && !convertToPost) {
      const deletePromises = mediaToDelete.map(media => 
        deleteMedia(media.url, media.media_type as 'image' | 'video')
      );
      await Promise.allSettled(deletePromises);
    } else if (convertToPost) {
      console.log('下書き削除API: 投稿への変換のため実ファイルの削除をスキップ', { mediaCount: mediaToDelete.length });
    }

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