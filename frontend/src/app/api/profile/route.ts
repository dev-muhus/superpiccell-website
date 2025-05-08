import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId),
      columns: {
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        profile_image_url: true,
        bio: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { username, first_name, last_name, bio } = body;

    // 更新前にユーザーが存在するか確認
    const currentUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // ユーザー情報を更新
    await db.update(users)
      .set({
        username,
        first_name,
        last_name,
        bio,
        updated_at: new Date()
      })
      .where(eq(users.clerk_id, userId));

    // 更新後のユーザー情報を取得
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId),
      columns: {
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        profile_image_url: true,
        bio: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 