import { db } from '@/db';
import { game_scores, users, blocks } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, desc, lt, inArray, not, or, sql } from 'drizzle-orm';
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

    // ランキングデータを取得（ユーザーごとの最高得点のみ）
    // CTEを使用してユーザーごとの最高スコアを取得
    const rankedScoresQuery = db
      .select({
        id: game_scores.id,
        user_id: game_scores.user_id,
        score: game_scores.score,
        game_time: game_scores.game_time,
        items_collected: game_scores.items_collected,
        difficulty: game_scores.difficulty,
        stage_id: game_scores.stage_id,
        created_at: game_scores.created_at,
        row_number: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${game_scores.user_id} ORDER BY ${game_scores.score} DESC, ${game_scores.created_at} ASC)`.as('row_number')
      })
      .from(game_scores)
      .where(and(...conditions))
      .as('ranked_scores');

    // ランキング条件にカーソルがある場合の処理
    let finalQuery;
    if (validatedParams.cursor) {
      // カーソルベースのページネーション用のサブクエリ
      const topScoresQuery = db
        .select({
          id: rankedScoresQuery.id,
          user_id: rankedScoresQuery.user_id,
          score: rankedScoresQuery.score,
          game_time: rankedScoresQuery.game_time,
          items_collected: rankedScoresQuery.items_collected,
          difficulty: rankedScoresQuery.difficulty,
          stage_id: rankedScoresQuery.stage_id,
          created_at: rankedScoresQuery.created_at
        })
        .from(rankedScoresQuery)
        .where(eq(rankedScoresQuery.row_number, 1))
        .as('top_scores');

      finalQuery = db
        .select({
          id: topScoresQuery.id,
          score: topScoresQuery.score,
          game_time: topScoresQuery.game_time,
          items_collected: topScoresQuery.items_collected,
          difficulty: topScoresQuery.difficulty,
          stage_id: topScoresQuery.stage_id,
          created_at: topScoresQuery.created_at,
          user: {
            id: users.id,
            username: users.username,
            profile_image_url: users.profile_image_url,
            first_name: users.first_name,
            last_name: users.last_name
          }
        })
        .from(topScoresQuery)
        .innerJoin(users, eq(topScoresQuery.user_id, users.id))
        .where(and(...userExcludeConditions, lt(topScoresQuery.id, validatedParams.cursor)))
        .orderBy(desc(topScoresQuery.score), desc(topScoresQuery.created_at))
        .limit(validatedParams.limit + 1);
    } else {
      // 通常のクエリ（カーソルなし）
      finalQuery = db
        .select({
          id: rankedScoresQuery.id,
          score: rankedScoresQuery.score,
          game_time: rankedScoresQuery.game_time,
          items_collected: rankedScoresQuery.items_collected,
          difficulty: rankedScoresQuery.difficulty,
          stage_id: rankedScoresQuery.stage_id,
          created_at: rankedScoresQuery.created_at,
          user: {
            id: users.id,
            username: users.username,
            profile_image_url: users.profile_image_url,
            first_name: users.first_name,
            last_name: users.last_name
          }
        })
        .from(rankedScoresQuery)
        .innerJoin(users, eq(rankedScoresQuery.user_id, users.id))
        .where(and(...userExcludeConditions, eq(rankedScoresQuery.row_number, 1)))
        .orderBy(desc(rankedScoresQuery.score), desc(rankedScoresQuery.created_at))
        .limit(validatedParams.limit + 1);
    }

    const scores = await finalQuery;

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

    // 総件数を取得（ユーザーごとの最高得点のみをカウント）
    // ユニークユーザー数を取得
    const totalCountConditions = [
      eq(game_scores.game_id, validatedParams.game_id),
      eq(game_scores.is_deleted, false)
    ];

    if (validatedParams.stage_id) {
      totalCountConditions.push(eq(game_scores.stage_id, validatedParams.stage_id));
    }

    const uniqueUserCountQuery = db
      .select({
        user_id: game_scores.user_id
      })
      .from(game_scores)
      .innerJoin(users, eq(game_scores.user_id, users.id))
      .where(and(...totalCountConditions, ...userExcludeConditions))
      .groupBy(game_scores.user_id);

    const uniqueUsers = await uniqueUserCountQuery;
    const totalCount = uniqueUsers.length;

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        hasMore,
        nextCursor,
        totalCount
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