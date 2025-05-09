import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    const [user] = await db.select({
      username: users.username,
      email: users.email,
      first_name: users.first_name,
      last_name: users.last_name,
      profile_image_url: users.profile_image_url,
      bio: users.bio
    })
    .from(users)
    .where(eq(users.clerk_id, userId))
    .limit(1);

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

    await db.update(users)
      .set({
        username,
        first_name,
        last_name,
        bio,
        updated_at: new Date()
      })
      .where(eq(users.clerk_id, userId));

    const [updatedUser] = await db.select({
      username: users.username,
      email: users.email,
      first_name: users.first_name,
      last_name: users.last_name,
      profile_image_url: users.profile_image_url,
      bio: users.bio
    })
    .from(users)
    .where(eq(users.clerk_id, userId))
    .limit(1);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 