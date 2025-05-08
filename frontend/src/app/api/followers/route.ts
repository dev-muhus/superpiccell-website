import { db } from '@/db';
import { follows, users } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, asc, desc, count, gt, lt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

export const dynamic = 'force-dynamic';

// フォロワー一覧を取得するAPI
export async function GET(req: NextRequest) {
  try {
    // Clerk認証からユーザー情報を取得
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    // クエリパラメータを取得
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE));
    const cursor = searchParams.get('cursor');
    const sortDirection = (searchParams.get('sort') || 'desc') === 'asc' ? asc : desc;

    // データベースからログインユーザー情報を取得
    const currentUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 基本的なクエリの条件
    let conditions = and(
      eq(follows.following_id, currentUser.id),
      eq(follows.is_deleted, false)
    );

    // カーソルページネーション
    if (cursor) {
      const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      const cursorDate = new Date(decodedCursor.created_at);
      
      if (sortDirection === asc) {
        conditions = and(
          conditions,
          gt(follows.created_at, cursorDate)
        );
      } else {
        conditions = and(
          conditions,
          lt(follows.created_at, cursorDate)
        );
      }
    }

    // フォロワー一覧を取得するクエリを構築
    const results = await db.select({
      id: follows.id,
      follower_id: follows.follower_id,
      following_id: follows.following_id,
      created_at: follows.created_at,
      follower_user: {
        id: users.id,
        username: users.username,
        first_name: users.first_name,
        last_name: users.last_name,
        profile_image_url: users.profile_image_url,
        bio: users.bio
      }
    })
    .from(follows)
    .innerJoin(users, eq(follows.follower_id, users.id))
    .where(conditions)
    .orderBy(sortDirection(follows.created_at))
    .limit(limit + 1); // 次ページがあるかを判断するため、limit+1件取得

    // 次ページの有無を判定
    const hasNextPage = results.length > limit;
    const followers_list = hasNextPage ? results.slice(0, limit) : results;

    // 次ページのカーソルを生成
    let nextCursor = null;
    if (hasNextPage && followers_list.length > 0) {
      const lastItem = followers_list[followers_list.length - 1];
      const cursorData = {
        created_at: lastItem.created_at.toISOString()
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    // 総フォロワー数を取得
    const totalCount = await db
      .select({ count: count() })
      .from(follows)
      .where(
        and(
          eq(follows.following_id, currentUser.id),
          eq(follows.is_deleted, false)
        )
      );

    return NextResponse.json({
      followers: followers_list,
      pagination: {
        hasNextPage,
        nextCursor,
        total: totalCount[0].count
      }
    });
  } catch (error) {
    console.error('フォロワー一覧取得中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 