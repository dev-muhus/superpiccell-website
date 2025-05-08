import { db } from '@/db';
import { users } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    // データベースからユーザー情報を取得
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });
    
    if (!dbUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 公開可能な情報のみを返す
    return NextResponse.json({
      user: {
        id: dbUser.id,
        username: dbUser.username,
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
        profile_image_url: dbUser.profile_image_url,
        bio: dbUser.bio,
        created_at: dbUser.created_at,
        updated_at: dbUser.updated_at,
        role: dbUser.role,
        subscription_type: dbUser.subscription_type
      }
    });
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 