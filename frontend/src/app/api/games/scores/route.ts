import { db } from '@/db';
import { game_scores, users, blocks } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, desc, count, lt, inArray, not, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// スコア保存用のバリデーションスキーマ
const saveScoreSchema = z.object({
  game_id: z.string().min(1, 'ゲームIDは必須です'),
  stage_id: z.string().min(1, 'ステージIDは必須です'),
  score: z.number().int().min(0, 'スコアは0以上の整数である必要があります'),
  game_time: z.number().int().min(1, 'ゲーム時間は1秒以上である必要があります'),
  items_collected: z.number().int().min(0, '収集アイテム数は0以上の整数である必要があります').optional(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional()
});

// ランキング取得用のバリデーションスキーマ
const getRankingSchema = z.object({
  game_id: z.string().min(1, 'ゲームIDは必須です'),
  stage_id: z.string().optional().nullable(),
  limit: z.string().optional().nullable().transform(val => val ? parseInt(val) : ITEMS_PER_PAGE),
  cursor: z.string().optional().nullable().transform(val => val ? parseInt(val) : undefined)
});

// スコア保存API
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    // リクエストボディの解析
    const body = await request.json();
    const validatedData = saveScoreSchema.parse(body);

    // ユーザー情報を取得
    const user = await db
      .select()
      .from(users)
      .where(and(
        eq(users.clerk_id, userId),
        eq(users.is_deleted, false)
      ))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // スコアを保存
    const newScore = await db
      .insert(game_scores)
      .values({
        user_id: user[0].id,
        game_id: validatedData.game_id,
        stage_id: validatedData.stage_id,
        score: validatedData.score,
        game_time: validatedData.game_time,
        items_collected: validatedData.items_collected || 0,
        difficulty: validatedData.difficulty || 'normal'
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newScore[0]
    });

  } catch (error) {
    console.error('スコア保存エラー:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'リクエストデータが無効です', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'スコアの保存に失敗しました' },
      { status: 500 }
    );
  }
}

// ランキング取得API
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    // クエリパラメータの解析
    const { searchParams } = new URL(request.url);
    const validatedParams = getRankingSchema.parse({
      game_id: searchParams.get('game_id'),
      stage_id: searchParams.get('stage_id'),
      limit: searchParams.get('limit'),
      cursor: searchParams.get('cursor')
    });

    // 現在のユーザー情報を取得
    const currentUser = await db
      .select()
      .from(users)
      .where(and(
        eq(users.clerk_id, userId),
        eq(users.is_deleted, false)
      ))
      .limit(1);

    if (currentUser.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // ブロック関係を取得
    const blockedUsers = await db
      .select({ blocked_id: blocks.blocked_id, blocker_id: blocks.blocker_id })
      .from(blocks)
      .where(and(
        or(
          eq(blocks.blocker_id, currentUser[0].id),
          eq(blocks.blocked_id, currentUser[0].id)
        ),
        eq(blocks.is_deleted, false)
      ));

    const blockedUserIds = blockedUsers.map(block => 
      block.blocker_id === currentUser[0].id ? block.blocked_id : block.blocker_id
    );

    // ランキング条件を構築
    const conditions = [
      eq(game_scores.game_id, validatedParams.game_id),
      eq(game_scores.is_deleted, false)
    ];

    if (validatedParams.stage_id) {
      conditions.push(eq(game_scores.stage_id, validatedParams.stage_id));
    }

    if (validatedParams.cursor) {
      conditions.push(lt(game_scores.id, validatedParams.cursor));
    }

    // ブロックされたユーザーと削除されたユーザーを除外
    const userExcludeConditions = [
      eq(users.is_deleted, false),
      eq(users.is_banned, false)
    ];

    if (blockedUserIds.length > 0) {
      userExcludeConditions.push(not(inArray(users.id, blockedUserIds)));
    }

    // ランキングデータを取得
    const scores = await db
      .select({
        id: game_scores.id,
        score: game_scores.score,
        game_time: game_scores.game_time,
        items_collected: game_scores.items_collected,
        difficulty: game_scores.difficulty,
        stage_id: game_scores.stage_id,
        created_at: game_scores.created_at,
        user: {
          id: users.id,
          username: users.username,
          profile_image_url: users.profile_image_url,
          first_name: users.first_name,
          last_name: users.last_name
        }
      })
      .from(game_scores)
      .innerJoin(users, eq(game_scores.user_id, users.id))
      .where(and(...conditions, ...userExcludeConditions))
      .orderBy(desc(game_scores.score), desc(game_scores.created_at))
      .limit(validatedParams.limit + 1);

    // 現在のユーザーかどうかのフラグを追加
    const scoresWithCurrentUserFlag = scores.map(score => ({
      ...score,
      user: {
        ...score.user,
        is_current_user: score.user.id === currentUser[0].id
      }
    }));

    // ページネーション情報を計算
    const hasMore = scoresWithCurrentUserFlag.length > validatedParams.limit;
    const items = hasMore ? scoresWithCurrentUserFlag.slice(0, -1) : scoresWithCurrentUserFlag;
    const nextCursor = hasMore ? scoresWithCurrentUserFlag[scoresWithCurrentUserFlag.length - 2].id : null;

    // 総件数を取得
    const totalCountConditions = [
      eq(game_scores.game_id, validatedParams.game_id),
      eq(game_scores.is_deleted, false),
      ...userExcludeConditions
    ];

    if (validatedParams.stage_id) {
      totalCountConditions.push(eq(game_scores.stage_id, validatedParams.stage_id));
    }

    const totalCountResult = await db
      .select({ count: count() })
      .from(game_scores)
      .innerJoin(users, eq(game_scores.user_id, users.id))
      .where(and(...totalCountConditions));

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        hasMore,
        nextCursor,
        totalCount: totalCountResult[0].count
      }
    });

  } catch (error) {
    console.error('ランキング取得エラー:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'リクエストパラメータが無効です', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'ランキングの取得に失敗しました' },
      { status: 500 }
    );
  }
} 