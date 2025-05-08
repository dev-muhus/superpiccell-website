import { db } from '@/db';
import { users } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// プロフィール編集のバリデーションスキーマ
const editProfileSchema = z.object({
  first_name: z.string().max(50).nullable(),
  last_name: z.string().max(50).nullable(),
  bio: z.string().max(200).nullable(),
});

export async function POST(req: NextRequest) {
  try {
    // Clerk認証からユーザー情報を取得
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await req.json();
    
    // バリデーション
    const validationResult = editProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "無効なリクエストです", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { first_name, last_name, bio } = validationResult.data;
    
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
    
    // プロフィール情報を更新
    const updatedUser = await db
      .update(users)
      .set({
        first_name,
        last_name,
        bio,
        updated_at: new Date()
      })
      .where(eq(users.id, dbUser.id))
      .returning();
    
    // 更新されたユーザー情報を加工して返す
    const userData = updatedUser[0] ? {
      id: updatedUser[0].id,
      username: updatedUser[0].username,
      first_name: updatedUser[0].first_name,
      last_name: updatedUser[0].last_name,
      profile_image_url: updatedUser[0].profile_image_url,
      bio: updatedUser[0].bio,
      updated_at: updatedUser[0].updated_at
    } : null;
    
    // 更新されたユーザー情報を返す
    return NextResponse.json(
      { 
        success: true, 
        user: userData
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('プロフィール更新中にエラーが発生しました:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 