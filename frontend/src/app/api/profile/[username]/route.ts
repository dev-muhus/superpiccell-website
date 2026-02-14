import { db } from '@/db';
import { users, blocks, follows } from '@/db/schema';
import { getAuth } from '@clerk/nextjs/server';
import { eq, and, count } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { userId } = getAuth(req);
    const { username } = await params;
    
    if (!username) {
      return NextResponse.json(
        { error: "ユーザー名は必須です" },
        { status: 400 }
      );
    }

    // 指定されたユーザー名のユーザーを取得
    const [profileUser] = await db.select()
      .from(users)
      .where(and(
        eq(users.username, username),
        eq(users.is_deleted, false)
      ))
      .limit(1);

    if (!profileUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // フォロワー数とフォロー数を取得
    // 削除されていないユーザーのみをカウント
    const followerCount = await db.select({ count: count() })
      .from(follows)
      .innerJoin(users, eq(follows.follower_id, users.id))
      .where(and(
        eq(follows.following_id, profileUser.id),
        eq(follows.is_deleted, false),
        eq(users.is_deleted, false)
      ));

    const followingCount = await db.select({ count: count() })
      .from(follows)
      .innerJoin(users, eq(follows.following_id, users.id))
      .where(and(
        eq(follows.follower_id, profileUser.id),
        eq(follows.is_deleted, false),
        eq(users.is_deleted, false)
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
          cover_image_url: profileWithCounts.cover_image_url,
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
    const [currentUser] = await db.select()
      .from(users)
      .where(eq(users.clerk_id, userId))
      .limit(1);

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
      const [blockRecord] = await db.select()
        .from(blocks)
        .where(and(
          eq(blocks.blocker_id, currentUser.id),
          eq(blocks.blocked_id, profileUser.id),
          eq(blocks.is_deleted, false)
        ))
        .limit(1);
      isBlocked = !!blockRecord;
    }

    // フォロー状態を確認
    let isFollowing = false;
    if (!isOwnProfile) {

      try {
        // 直接SQLを使用して確実にフォロー関係を確認する
        const rawFollows = await db.select().from(follows)
          .where(
            and(
              eq(follows.follower_id, currentUser.id),
              eq(follows.following_id, profileUser.id),
              eq(follows.is_deleted, false)
            )
          );
        
        // フォロー関係が存在するかどうかを判定
        isFollowing = rawFollows.length > 0;

      } catch (error) {
        console.error("Error checking follow relationship:", error);
      }
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
          cover_image_url: profileWithCounts.cover_image_url,
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
          cover_image_url: profileWithCounts.cover_image_url,
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