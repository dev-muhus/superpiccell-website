# Super Piccell SNS機能 技術仕様書

## 概要

Super Piccellウェブサイトは、Next.jsのAppルーターを使用した最新のWeb技術を採用したSNSプラットフォームです。ユーザーは投稿、いいね、コメント、リポスト、ブックマークなどの一般的なSNS機能を利用できます。このドキュメントでは、ログイン後に利用可能なSNS機能の技術仕様と実装状況について説明します。

## 使用技術

- **フロントエンド**: Next.js 14 (Appルーター)
- **認証**: Clerk Authentication
- **データベース**: Neon Database (PostgreSQL)
- **ORM**: Drizzle ORM
- **スタイリング**: Tailwind CSS, shadcn/ui
- **状態管理**: React Hooks
- **API**: Next.js API Routes (Appルーター形式)
- **パフォーマンス最適化**: React Server Components、Suspense、Optimistic UI

## 実装済み機能

### 認証・ユーザー管理
- ✅ Clerk認証連携（サインアップ、ログイン、パスワードリセット）
- ✅ ユーザー情報のデータベース同期（Webhooks）
- ✅ 認証ミドルウェア
- ✅ ユーザープロフィール管理

### コンテンツ作成
- ✅ 投稿機能
  - テキスト投稿
  - コメント（返信）投稿
  - 下書き保存と管理
- ✅ リッチコンテンツ（画像、動画）
  - 画像アップロード（Cloudinaryへの直接アップロード）
  - 動画アップロード（CloudFlare R2への直接アップロード）
  - メディアのみの投稿（テキストなしでメディア添付可能）
  - 画像と動画の混在投稿
  - 最大2つまでのメディア添付

### コンテンツ閲覧
- ✅ タイムライン
- ✅ プロフィールページ
- ✅ ユーザーの投稿一覧
- ✅ 投稿詳細表示
- ✅ エンゲージメント履歴（いいね、コメント）
- ✅ ブックマーク管理

### ユーザー間交流
- ✅ いいね機能
- ✅ コメント機能
- ✅ フォロー機能
- ✅ ブロック機能
- ⏸️ リポスト・引用機能（一時保留中）

## データモデル

### 主要テーブル構造

```typescript
// ユーザーテーブル
interface User {
  id: bigint;
  clerk_id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  bio?: string;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  deleted_at?: Date;
  role: string;
  is_banned: boolean;
  banned_at?: Date;
  ban_reason?: string;
}

// 投稿テーブル
interface Post {
  id: bigint;
  user_id: bigint;
  content: string;
  post_type: 'original' | 'reply' | 'quote' | 'repost';
  in_reply_to_post_id?: bigint;
  quote_of_post_id?: bigint;
  repost_of_post_id?: bigint;
  conversation_id?: bigint;
  community_id?: bigint;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  deleted_at?: Date;
  is_hidden: boolean;
  media_data?: any;
}

// いいねテーブル
interface Like {
  id: bigint;
  user_id: bigint;
  post_id: bigint;
  created_at: Date;
  is_deleted: boolean;
  deleted_at?: Date;
}

// ブックマークテーブル
interface Bookmark {
  id: bigint;
  user_id: bigint;
  post_id: bigint;
  created_at: Date;
  is_deleted: boolean;
  deleted_at?: Date;
}

// フォローテーブル
interface Follow {
  id: bigint;
  follower_id: bigint;
  following_id: bigint;
  created_at: Date;
  is_deleted: boolean;
  deleted_at?: Date;
}

// ブロックテーブル
interface Block {
  id: bigint;
  blocker_id: bigint;
  blocked_id: bigint;
  created_at: Date;
  is_deleted: boolean;
  deleted_at?: Date;
}

// 下書きテーブル
interface Draft {
  id: bigint;
  user_id: bigint;
  content: string;
  post_type: 'original' | 'reply' | 'quote' | 'repost';
  in_reply_to_post_id?: bigint;
  quote_of_post_id?: bigint;
  repost_of_post_id?: bigint;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  deleted_at?: Date;
  media_data?: any;
}
```

## 主要API仕様

本プロジェクトでは、Next.jsのAppルーターAPIルートを使用しています。すべてのAPIは`/api`パスの下に配置されています。

### 主要エンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|--------|-----|
| `/api/posts` | GET | タイムライン投稿取得 |
| `/api/posts` | POST | 新規投稿作成 |
| `/api/posts/:id` | GET | 投稿詳細取得 |
| `/api/posts/:id/replies` | GET | 特定投稿への返信一覧取得 |
| `/api/posts/:id/like` | POST | いいね追加（トグル） |
| `/api/posts/:id/bookmark` | POST | ブックマーク追加（トグル） |
| `/api/posts/:id/repost` | POST | リポスト追加/削除（トグル） |
| `/api/users/:id/follow` | POST | フォロー追加（トグル） |
| `/api/users/:id/block` | POST | ブロック追加（トグル） |
| `/api/profile` | GET | ログインユーザーのプロフィール取得 |
| `/api/profile/:username` | GET | 特定ユーザーのプロフィール取得 |
| `/api/profile` | PUT | プロフィール更新 |
| `/api/engagement` | GET | エンゲージメント履歴取得 |
| `/api/bookmarks` | GET | ブックマーク一覧取得 |
| `/api/drafts` | GET | 下書き一覧取得 |
| `/api/drafts` | POST | 下書き作成 |
| `/api/drafts/:id` | PUT | 下書き更新 |
| `/api/drafts/:id` | DELETE | 下書き削除 |
| `/api/connections` | GET | フォロー/フォロワー一覧取得 |
| `/api/blocks` | GET | ブロックユーザー一覧取得 |

## 実装方針と設計原則

### 1. データの一元管理

- 投稿タイプを`post_type`フィールドで区別し、単一の`posts`テーブルで管理
- 論理削除を基本とし、物理削除はしない（`is_deleted`フラグ、`deleted_at`タイムスタンプ）
- 適切なインデックス設定によるパフォーマンス最適化

### 2. ページネーション設計

- カーソルベースのページネーションを採用
- 投稿IDをカーソル値として使用
- `limit + 1`件取得し、次ページの有無を判定

```typescript
// カーソルベースページネーションの例
const query = db.select({...})
  .from(posts)
  .where(and(...conditions))
  .orderBy(desc(posts.id))
  .limit(limit + 1);

const results = await query;
const hasNextPage = results.length > limit;
const finalPosts = hasNextPage ? results.slice(0, limit) : results;
const nextCursor = hasNextPage ? finalPosts[finalPosts.length - 1].id.toString() : null;
```

### 3. Drizzle ORMの使用と制限

- `findFirst`メソッドの代わりに`select().from().where().limit(1)`を使用
  ```typescript
  // ❌ findFirstメソッドの使用は避ける（バグの可能性あり）
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  // ✅ 代わりにこの方法を使用
  const users = await db.select().from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = users[0];
  ```
- 同一条件でも`findFirst`と直接SQLでは異なる結果が返される可能性あり（[Drizzle ORMのIssue #2068](https://github.com/drizzle-team/drizzle-orm/issues/2068)参照）
- セキュリティとパフォーマンスのためにクエリのWHERE句を最適化

### 4. 無限スクロール実装

- Intersection Observer APIを使用した効率的な実装
- 共通InfiniteScrollコンポーネントを使用
- 適切なthresholdとrootMargin設定による事前読み込み最適化

### 5. エンゲージメント実装

- トグル式のエンゲージメント操作（いいね、ブックマーク、フォロー、ブロック）
- Optimistic UIパターンによる即時UI反映
- カウント表示の自動更新

### 6. セキュリティ対策

- すべてのAPIで認証チェック（Clerk Middleware）
- ブロックユーザー、BANユーザー、削除済みユーザーの投稿のフィルタリング
- 入力値のバリデーション
- SQLインジェクション対策（パラメータ化クエリの使用）

## エンゲージメントページ実装詳細

エンゲージメントページ（`/engagement`）は、ユーザーがいいねやコメントした投稿を確認できる機能です。

### 機能概要

- タブ切り替えによるいいね履歴とコメント履歴の表示
- 無限スクロールによるページネーション
- 投稿へのインタラクション（いいね、コメント、ブックマーク）
- フィルタリング（ブロックユーザー、BANユーザー、削除済みユーザーの投稿を除外）

### 実装コンポーネント

- `frontend/src/app/engagement/page.tsx` - メインページコンポーネント
- `frontend/src/app/api/engagement/route.ts` - APIエンドポイント

### フィルタリングロジック

```typescript
// ブロックユーザー、BANユーザー、削除済みユーザーの投稿をフィルタリング
const blockedUsers = await db.query.blocks.findMany({...});
const blockedUserIds = blockedUsers.map(block => 
  block.blocker_id === dbUser.id ? block.blocked_id : block.blocker_id
);

const bannedUsers = await db.query.users.findMany({
  where: eq(users.is_banned, true),
  columns: { id: true }
});

const bannedUserIds = bannedUsers.map(user => user.id);
const excludedUserIds = [...new Set([...blockedUserIds, ...bannedUserIds])];

// 除外条件の適用
if (excludedUserIds.length > 0) {
  conditions.push(not(inArray(posts.user_id, excludedUserIds)));
}

// 削除済みユーザーの除外
const postUsers = await db.query.users.findMany({
  where: and(
    inArray(users.id, userIds),
    eq(users.is_deleted, false)
  ),
  ...
});

// 有効なユーザーIDの投稿のみ表示
const validUserIds = postUsers.map(user => user.id);
const postsWithUsers = finalPosts
  .filter(post => validUserIds.includes(post.user_id))
  .map(post => {...});
```

## パフォーマンス最適化

- React Server Componentsを使用
- カーソルベースのページネーションによるクエリ最適化
- 必要なデータのみを取得するカラム選択
- インデックス設定による検索高速化
- 適切なタイミングでの無限スクロールトリガー
- Optimistic UIによる即時反映

## デバッグと開発サポート

- コンソールログによるページネーション状態追跡
- Intersection Observer発火時のデバッグ情報
- エラーハンドリングと適切なフィードバック

## 残タスクと今後の開発方針

1. **リポスト・引用機能の完全実装**
   - バックエンドAPIの完成
   - フロントエンドUI実装
   - リポスト数の正確な集計

2. **リッチコンテンツ対応**
   - ✅ 画像アップロード機能
   - ✅ 動画埋め込み
   - ✅ メディアのみの投稿（テキストなしでメディア添付可能）
   - ✅ 画像と動画の混在投稿
   - メディア最適化

3. **パフォーマンス最適化**
   - Web Vitals指標向上
   - データ取得の最適化
   - キャッシュ戦略の検討

4. **アクセシビリティ向上**
   - WAI-ARIA対応強化
   - キーボードナビゲーション改善
   - スクリーンリーダー対応

5. **コミュニティ機能実装**
   - コミュニティ作成・参加
   - コミュニティ投稿
   - モデレーション機能

## ベストプラクティスと開発ガイドライン

1. **コード構造**
   - 共通コンポーネントの積極的な再利用
   - 適切なディレクトリ構造の維持
   - TypeScriptの型定義徹底

2. **状態管理**
   - React Hooksの適切な使用
   - グローバル状態の最小化
   - 適切なコンポーネント分割

3. **エラーハンドリング**
   - 一貫したエラーメッセージ
   - フォールバックUI
   - エッジケース考慮

4. **セキュリティ**
   - 入力値の検証
   - CSRF対策
   - 認証・認可の徹底

## 参考ドキュメント

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Clerk ドキュメント](https://clerk.com/docs)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/docs/overview)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs) 