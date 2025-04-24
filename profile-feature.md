# プロフィール機能設計

## 最重要事項
- 場当たり的な修正はせず、根本解決を目指すこと
- Google推奨、国際標準、定石、UI/UXの観点でその対応がベストプラクティスかを意識すること
- データの整合性と安全性を常に優先すること
- パフォーマンスとユーザー体験を両立させること

## 設計方針
- 投稿機能は単一の`posts`テーブルで通常投稿、コメント、引用、リポストなどを一元管理
- `post_type`フィールドを使って投稿タイプを区別（original, reply, quote, repost等）
- 将来的な課金プランに対応するため、`subscription_plans`と`user_subscriptions`テーブルを準備
- Clerk認証とneonDBの連携により、信頼性の高いユーザー認証と柔軟なデータ管理を実現

## URL構造
- `/profile` - ログインユーザーのプロフィールページ
- `/profile/edit` - プロフィール編集ページ
- `/profile/:username` - 特定ユーザーのプロフィールページ
- `/profile/posts` - ログインユーザーの投稿一覧
- `/profile/likes` - ログインユーザーのいいね一覧
- `/profile/bookmarks` - ログインユーザーのブックマーク一覧
- `/profile/drafts` - ログインユーザーの下書き一覧
- `/profile/connections` - フォロー・フォロワー管理
- `/profile/communities` - 参加中のコミュニティ一覧
- `/profile/blocks` - ブロック管理

## セキュリティ
- すべての `/profile/` パスはログイン済みユーザーのみアクセス可能
- ミドルウェアで認証チェック
- APIはClerk認証トークンが必要
- リファラーチェックの実装
- レート制限の実装（IP単位、ユーザー単位）

## 機能一覧

### 基本プロフィール
- プロフィール表示（アバター、ユーザー名、メール）
- プロフィール編集
- ホームへ戻るボタン

### コンテンツ作成
- スタートポスト（新規投稿）
- 下書き保存と管理

### コンテンツ閲覧
- タイムライン（フォローユーザーの投稿表示）
- エンゲージメント（いいね、コメント、リポスト履歴）
- ブックマーク（保存した投稿表示）
- 自分の投稿一覧

### ユーザー間交流
- コネクション（フォロー、フォロワー管理）
- コミュニティ（参加中のコミュニティ表示）
- ブロック管理（ブロックしたユーザー管理）

## API設計

### 認証ミドルウェア
```typescript
// src/middleware.ts
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/'],
  ignoredRoutes: ['/api/public/*'],
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

### プロフィール関連API

#### プロフィール取得
- エンドポイント: `GET /api/profile`
- 認証: 必須
- レスポンス: ユーザープロフィール情報

#### プロフィール更新
- エンドポイント: `PUT /api/profile`
- 認証: 必須
- ボディ: 更新するプロフィール情報
- レスポンス: 更新後のプロフィール

#### 特定ユーザープロフィール取得
- エンドポイント: `GET /api/profile/:username`
- 認証: 必須
- レスポンス: 特定ユーザーの公開プロフィール

### 投稿関連API

#### ユーザー投稿取得
- エンドポイント: `GET /api/profile/posts`
- 認証: 必須
- クエリ: `limit`, `offset`
- レスポンス: 投稿リスト

#### いいね一覧取得
- エンドポイント: `GET /api/profile/likes`
- 認証: 必須
- クエリ: `limit`, `offset`
- レスポンス: いいねした投稿リスト

#### ブックマーク一覧取得
- エンドポイント: `GET /api/profile/bookmarks`
- 認証: 必須
- クエリ: `limit`, `offset`
- レスポンス: ブックマークした投稿リスト

#### 下書き一覧取得
- エンドポイント: `GET /api/profile/drafts`
- 認証: 必須
- クエリ: `limit`, `offset`
- レスポンス: 下書きリスト

### コネクション関連API

#### フォロー一覧取得
- エンドポイント: `GET /api/profile/following`
- 認証: 必須
- クエリ: `limit`, `offset`
- レスポンス: フォロー中のユーザーリスト

#### フォロワー一覧取得
- エンドポイント: `GET /api/profile/followers`
- 認証: 必須
- クエリ: `limit`, `offset`
- レスポンス: フォロワーのユーザーリスト

#### ユーザーフォロー
- エンドポイント: `POST /api/profile/follow`
- 認証: 必須
- ボディ: `{ targetUserId: string }`
- レスポンス: フォロー結果

#### ユーザーアンフォロー
- エンドポイント: `DELETE /api/profile/follow/:targetUserId`
- 認証: 必須
- レスポンス: アンフォロー結果

### コミュニティ関連API

#### 参加コミュニティ一覧
- エンドポイント: `GET /api/profile/communities`
- 認証: 必須
- クエリ: `limit`, `offset`
- レスポンス: 参加中のコミュニティリスト

### ブロック関連API

#### ブロックユーザー一覧
- エンドポイント: `GET /api/profile/blocks`
- 認証: 必須
- クエリ: `limit`, `offset`
- レスポンス: ブロック中のユーザーリスト

#### ユーザーブロック
- エンドポイント: `POST /api/profile/block`
- 認証: 必須
- ボディ: `{ targetUserId: string }`
- レスポンス: ブロック結果

#### ユーザーブロック解除
- エンドポイント: `DELETE /api/profile/block/:targetUserId`
- 認証: 必須
- レスポンス: ブロック解除結果

## データベースモデル関連

主要なテーブルと関連フィールド:

### users
- id: ユーザーID (PK)
- clerk_id: Clerk認証ID
- username: ユーザー名
- email: メールアドレス
- first_name, last_name: 氏名
- profile_image_url: プロフィール画像URL
- bio: 自己紹介
- created_at, updated_at: タイムスタンプ
- is_deleted, deleted_at: 削除フラグと日時
- role: ユーザー権限
- subscription_type: サブスクリプションタイプ
- is_banned, banned_at, ban_reason: 禁止状態

### posts
- id: 投稿ID (PK)
- user_id: 投稿者ID (FK -> users.id)
- content: 投稿内容
- media_data: メディア情報 (JSON)
- post_type: 投稿タイプ
- created_at, updated_at: タイムスタンプ
- is_deleted, deleted_at: 削除フラグと日時
- is_hidden, hidden_at, hidden_reason: 非表示状態
- in_reply_to_post_id: 返信先投稿ID (FK -> posts.id)
- quote_of_post_id: 引用元投稿ID (FK -> posts.id)
- repost_of_post_id: リポスト元ID (FK -> posts.id)
- conversation_id: 会話ID
- report_count: 報告数

### follows
- id: フォローID (PK)
- follower_id: フォロワーID (FK -> users.id)
- following_id: フォロー先ID (FK -> users.id)
- created_at: 作成日時
- is_deleted, deleted_at: 削除フラグと日時

### likes
- id: いいねID (PK)
- user_id: ユーザーID (FK -> users.id)
- post_id: 投稿ID (FK -> posts.id)
- created_at: 作成日時
- is_deleted, deleted_at: 削除フラグと日時

### bookmarks
- id: ブックマークID (PK)
- user_id: ユーザーID (FK -> users.id)
- post_id: 投稿ID (FK -> posts.id)
- created_at: 作成日時
- is_deleted, deleted_at: 削除フラグと日時

### blocks
- id: ブロックID (PK)
- blocker_id: ブロックしたユーザーID (FK -> users.id)
- blocked_id: ブロックされたユーザーID (FK -> users.id)
- created_at: 作成日時
- is_deleted, deleted_at: 削除フラグと日時

### drafts
- id: 下書きID (PK)
- user_id: ユーザーID (FK -> users.id)
- content: 投稿内容
- media_data: メディア情報 (JSON)
- created_at, updated_at: タイムスタンプ
- is_deleted, deleted_at: 削除フラグと日時

### communities
- id: コミュニティID (PK)
- creator_id: 作成者ID (FK -> users.id)
- name: コミュニティ名
- description: 説明
- is_private: 非公開フラグ
- member_count: メンバー数
- created_at, updated_at: タイムスタンプ
- is_deleted, deleted_at: 削除フラグと日時

### community_members
- id: メンバーシップID (PK)
- community_id: コミュニティID (FK -> communities.id)
- user_id: ユーザーID (FK -> users.id)
- role: 役割
- created_at, updated_at: タイムスタンプ
- is_deleted, deleted_at: 削除フラグと日時

## セキュリティ実装詳細

### レート制限
```typescript
// src/middleware/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// IPベースのレート制限
export const ipRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1m"), // 1分間に10リクエストまで
  analytics: true,
});

// ユーザーIDベースのレート制限
export const userRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(50, "1m"), // 1分間に50リクエストまで
  analytics: true,
});
```

### リファラーチェック
```typescript
// src/middleware/refererCheck.ts
import { NextRequest, NextResponse } from "next/server";

export function refererCheck(req: NextRequest) {
  const referer = req.headers.get("referer");
  
  // 許可されたオリジンのリスト
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    "https://superpiccell.com",
    "http://localhost:3000"
  ];
  
  // リファラーが存在しない場合やallowedOriginsに含まれない場合は拒否
  if (!referer || !allowedOrigins.some(origin => referer.startsWith(origin))) {
    return NextResponse.json(
      { error: "Invalid referer" },
      { status: 403 }
    );
  }
  
  return null; // チェック通過
}
```

## クライアント側実装例

### プロフィールページのフェッチ
```typescript
// src/pages/profile/index.tsx
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

// プロフィール取得フック
const useProfile = () => {
  const { getToken } = useAuth();
  
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch profile");
      }
      
      return res.json();
    }
  });
};
```

## Clerk認証とneonDB連携の整合性管理

### 認証フロー
1. ユーザーはClerkを通じて認証（サインアップ/ログイン）
2. 初回ログイン時にClerkのWebhookを使用してneonDBにユーザーレコードを作成
3. その後のログイン時にはClerkから得たユーザー識別子（clerk_id）を使ってneonDBのユーザーと紐付け

### プロフィール更新の整合性確保
```typescript
// src/pages/api/profile/update.ts
import { clerkClient } from "@clerk/nextjs";
import { getAuth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export default async function handler(req, res) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, bio, ...otherData } = req.body;

  try {
    // トランザクションを開始
    const transaction = await db.transaction(async (tx) => {
      // neonDBのユーザー情報を更新
      await tx
        .update(users)
        .set({ 
          username, 
          bio,
          updated_at: new Date()
        })
        .where(eq(users.clerk_id, userId));

      // Clerkのユーザー情報も更新（ユーザー名など）
      await clerkClient.users.updateUser(userId, {
        username,
        // Clerkで管理する他のプロフィール情報も必要に応じて更新
      });
    });

    // 更新後のユーザー情報を取得
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.clerk_id, userId)
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("プロフィール更新エラー:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}
```

### 整合性確保のポイント
- 重要なユーザー情報（ユーザー名、メールアドレスなど）の更新は両方のシステムで同期
- トランザクションを使用して、一方が失敗した場合にロールバック
- Webhookを活用して、Clerk側の変更を自動的にneonDBに反映
- neonDB側でプロフィール画像URLなど、アプリ固有の情報を管理
- セッション検証とデータアクセス制御を厳格に実装 