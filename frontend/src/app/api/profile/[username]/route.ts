import { db } from '@/db';
import { users, blocks, follows } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, count } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { userId } = getAuth(req);
    const { username } = params;
    
    if (!username) {
      return NextResponse.json(
        { error: "ユーザー名は必須です" },
        { status: 400 }
      );
    }

    // 指定されたユーザー名のユーザーを取得
    const profileUser = await db.query.users.findFirst({
      where: and(
        eq(users.username, username),
        eq(users.is_deleted, false)
      )
    });

    if (!profileUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // フォロワー数とフォロー数を取得
    const followerCount = await db.select({ count: count() })
      .from(follows)
      .where(and(
        eq(follows.following_id, profileUser.id),
        eq(follows.is_deleted, false)
      ));

    const followingCount = await db.select({ count: count() })
      .from(follows)
      .where(and(
        eq(follows.follower_id, profileUser.id),
        eq(follows.is_deleted, false)
      ));

    // プロフィール情報にフォロー数を追加
    const profileWithCounts = {
      ...profileUser,
      follower_count: followerCount[0].count,
      following_count: followingCount[0].count
    };

    // 認証情報がない場合は公開情報のみ返す
    if (!userId) {
      return NextResponse.json({
        profile: {
          id: profileWithCounts.id,
          username: profileWithCounts.username,
          first_name: profileWithCounts.first_name,
          last_name: profileWithCounts.last_name,
          profile_image_url: profileWithCounts.profile_image_url,
          bio: profileWithCounts.bio,
          created_at: profileWithCounts.created_at,
          updated_at: profileWithCounts.updated_at,
          follower_count: profileWithCounts.follower_count,
          following_count: profileWithCounts.following_count
        },
        isBlocked: false,
        isFollowing: false
      });
    }

    // ログインユーザーの情報を取得
    const currentUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "認証済みユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 自分自身かどうか
    const isOwnProfile = currentUser.id === profileUser.id;

    // ブロック状態を確認
    let isBlocked = false;
    if (!isOwnProfile) {
      const blockRecord = await db.query.blocks.findFirst({
        where: and(
          eq(blocks.blocker_id, currentUser.id),
          eq(blocks.blocked_id, profileUser.id),
          eq(blocks.is_deleted, false)
        )
      });
      isBlocked = !!blockRecord;
    }

    // フォロー状態を確認
    let isFollowing = false;
    if (!isOwnProfile) {
      const followRecord = await db.query.follows.findFirst({
        where: and(
          eq(follows.follower_id, currentUser.id),
          eq(follows.following_id, profileUser.id),
          eq(follows.is_deleted, false)
        )
      });
      isFollowing = !!followRecord;
    }

    // プロフィール情報を返す
    if (isOwnProfile) {
      // 自分自身の場合はすべての情報を返す（パスワードなどの機密情報は除く）
      return NextResponse.json({
        profile: {
          id: profileWithCounts.id,
          username: profileWithCounts.username,
          first_name: profileWithCounts.first_name,
          last_name: profileWithCounts.last_name,
          profile_image_url: profileWithCounts.profile_image_url,
          bio: profileWithCounts.bio,
          created_at: profileWithCounts.created_at,
          updated_at: profileWithCounts.updated_at,
          role: profileWithCounts.role,
          subscription_type: profileWithCounts.subscription_type,
          follower_count: profileWithCounts.follower_count,
          following_count: profileWithCounts.following_count
        },
        isOwnProfile: true,
        isBlocked: false,
        isFollowing: false
      });
    } else {
      // 他ユーザーの場合は公開情報のみ返す
      return NextResponse.json({
        profile: {
          id: profileWithCounts.id,
          username: profileWithCounts.username,
          first_name: profileWithCounts.first_name,
          last_name: profileWithCounts.last_name,
          profile_image_url: profileWithCounts.profile_image_url,
          bio: profileWithCounts.bio,
          created_at: profileWithCounts.created_at,
          updated_at: profileWithCounts.updated_at,
          follower_count: profileWithCounts.follower_count,
          following_count: profileWithCounts.following_count,
          is_banned: profileWithCounts.is_banned
        },
        isOwnProfile: false,
        isBlocked,
        isFollowing
      });
    }
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
} 