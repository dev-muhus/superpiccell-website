# API テスト仕様書

## 概要
このドキュメントは、Super Piccell WebサイトのNext.js App Router APIのテスト仕様を定義します。各APIエンドポイントのテスト対象機能、テストケース、および特記事項を記載しています。

## テスト原則

1. **実環境に近いテスト** - 実PostgreSQLデータベースを使用し、Drizzle ORMで操作
2. **独立した環境** - テスト用データベース(`test-db`)のみ使用
3. **APIコード保護** - テスト用コードを実装コードに混入させない
4. **Docker環境実行** - すべてのテストはDocker内で実行
5. **型安全性** - Drizzle ORMを優先的に使用し、生SQLは最小限に

## テスト環境

### 実行方法

```bash
# すべてのAPIテストを実行
docker compose run --rm frontend npm run test:api

# 特定のテストファイルのみを実行
docker compose run --rm frontend npm run test:api -- __tests__/api/users/id/block.test.ts

# 詳細出力モードで実行
docker compose run --rm frontend npm run test:api -- --verbose
```

### ディレクトリ構造

```
frontend/                 # Next.js アプリ本体
  __tests__/              # テストディレクトリ
    api/                  # API テスト
      blocks/            
        blocks.test.ts    # ブロックAPI テスト
      posts/
        posts.test.ts     # 投稿API テスト
      users/
        id/
          block.test.ts   # ユーザーブロックAPI テスト
          follow.test.ts  # ユーザーフォローAPI テスト
      webhooks/
        clerk/
          clerk.test.ts   # Clerk Webhook テスト
  src/
    utils/
      test/               # テストユーティリティ
        api-test-helpers.ts  # APIテスト用ヘルパー関数
```

## テスト実装ガイドライン

### 標準テストパターン

各APIのテストは以下のパターンを含めることを推奨します：

1. **正常系**
   - 期待通りのレスポンス形式・ステータスコード
   - データの整合性（DB状態との一致）
   - ページネーション・フィルタリング

2. **異常系**
   - 不正パラメータ
   - 存在しないリソース
   - 認証・権限エラー

3. **エッジケース**
   - 境界値
   - 特殊文字
   - 大量データ

### Drizzle ORMの使用に関する注意点

Drizzle ORMを使用したデータベースアクセスでは、以下の点に注意が必要です：

1. **findFirstメソッドの回避**
   - `db.query.[テーブル].findFirst()`メソッドは不安定な動作を示す場合があり、代わりに直接SQLクエリを使用します
   ```typescript
   // ❌ 避けるべき方法
   const user = await db.query.users.findFirst({
     where: eq(users.id, userId)
   });
   
   // ✅ 推奨される方法
   const [user] = await db.select().from(users)
     .where(eq(users.id, userId))
     .limit(1);
   ```
   
2. **アトミックな更新**
   - トランザクション内でデータを更新し、同じトランザクション内で検証することで一貫性を保証
   - 複数のテーブルを更新する場合は特に注意

3. **テスト間の独立性**
   - 各テストケースは独自のテストデータを使用
   - beforeEach/afterEachでテストデータのクリーンアップを徹底

### コンソール出力抑制

エラー処理をテストする際は、意図的なエラーログが出力されないよう、コンソール出力を抑制します：

```typescript
describe('テストスイート名', () => {
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    // コンソールエラー出力を抑制
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // コンソールエラー出力のモックを元に戻す
    consoleErrorSpy.mockRestore();
  });

  // テストケース...
});
```

## API エンドポイント一覧

| # | ルート | 機能 | テストファイル |
|---|--------|------|--------------|
| 1 | `/api/blocks` | ブロック管理 | `__tests__/api/blocks/blocks.test.ts` |
| 2 | `/api/bookmarks` | ブックマーク管理 | `__tests__/api/bookmarks/bookmarks.test.ts` |
| 3 | `/api/drafts` | 下書き管理 | `__tests__/api/drafts/drafts.test.ts` |
| 4 | `/api/drafts/[id]` | 特定の下書き操作 | `__tests__/api/drafts/id/drafts-id.test.ts` |
| 5 | `/api/engagement` | いいね・エンゲージメント | `__tests__/api/engagement/engagement.test.ts` |
| 6 | `/api/followers` | フォロワー管理 | `__tests__/api/followers/followers.test.ts` |
| 7 | `/api/follows` | フォロー関係 | `__tests__/api/follows/follows.test.ts` |
| 8 | `/api/me` | 自分の情報 | `__tests__/api/me/me.test.ts` |
| 9 | `/api/posts` | 投稿管理 | `__tests__/api/posts/posts.test.ts` |
| 10 | `/api/posts/[id]` | 特定の投稿操作 | `__tests__/api/posts/id/posts-id.test.ts` |
| 11 | `/api/posts/[id]/bookmark` | 投稿ブックマーク | `__tests__/api/posts/id/bookmark/bookmark.test.ts` |
| 12 | `/api/posts/[id]/likes` | 投稿いいね | `__tests__/api/posts/id/likes/likes.test.ts` |
| 13 | `/api/posts/[id]/replies` | 投稿返信 | `__tests__/api/posts/id/replies/replies.test.ts` |
| 14 | `/api/profile` | プロフィール | `__tests__/api/profile/profile.test.ts` |
| 15 | `/api/profile/[username]` | ユーザープロフィール | `__tests__/api/profile/username/profile-username.test.ts` |
| 16 | `/api/profile/edit` | プロフィール編集 | `__tests__/api/profile/edit/profile-edit.test.ts` |
| 17 | `/api/users/[id]/block` | ユーザーブロック | `__tests__/api/users/id/block.test.ts` |
| 18 | `/api/users/[id]/follow` | ユーザーフォロー | `__tests__/api/users/id/follow.test.ts` |
| 19 | `/api/webhooks/clerk` | Clerkウェブフック | `__tests__/api/webhooks/clerk/clerk.test.ts` |

## エンドポイント別テスト内容

### `/api/blocks`

**テスト内容**:
- ブロック一覧取得と空リスト確認
- ユーザーブロック/アンブロック操作
- ページネーション（カーソル、limit）
- ソート機能（昇順/降順）
- エラー処理（不正パラメータ、認証エラー）
- エッジケース（自分自身のブロック防止など）

### `/api/bookmarks`

**テスト内容**:
- ブックマーク一覧取得と空リスト確認
- ブックマーク追加/削除操作
- ブックマーク状態確認
- ページネーション機能
- エラー処理
- 重複ブックマーク防止

### `/api/drafts` および `/api/drafts/[id]`

**テスト内容**:
- 下書き一覧取得と保存
- 下書き更新と削除
- 返信下書きの処理
- バリデーション（文字数制限など）
- 認証とアクセス制御
- 特殊文字やメディアデータの処理

### `/api/engagement`

**テスト内容**:
- いいね・コメント投稿のリスト取得
- ユーザー状態によるフィルタリング
- エンゲージメント情報の取得
- ページネーション機能
- エラー処理

### `/api/followers` および `/api/follows`

**テスト内容**:
- フォロワー/フォロー一覧取得
- ソート機能（新しい順/古い順）
- ページネーション機能
- 論理削除レコードの除外確認
- エラー処理

### `/api/me`

**テスト内容**:
- 自分のプロフィール情報取得
- 機密情報の非公開確認
- プロフィール更新反映確認
- エラー処理
- エッジケース（BANユーザーなど）

### `/api/posts` および 関連エンドポイント

**テスト内容**:
- 投稿一覧取得と作成
- 投稿タイプ（通常/返信/引用/リポスト）
- 投稿詳細と削除
- いいね/ブックマーク/返信機能
- バリデーション（文字数制限など）
- フィルタリングとソート
- ページネーション
- エラー処理
- アクセス制御

### `/api/profile` 関連

**テスト内容**:
- プロフィール情報取得
- プロフィール編集
- ユーザー名によるプロフィール検索
- エラー処理
- バリデーション

### `/api/users/[id]/block` および `/api/users/[id]/follow`

**テスト内容**:
- ブロック/フォロー状態確認
- ブロック/フォロー操作
- ブロック解除/フォロー解除
- エラー処理（自分自身、存在しないユーザー）
- エッジケース（削除後の再操作など）

### `/api/webhooks/clerk`

**テスト内容**:
- ユーザー作成/更新イベント処理
- Webhook署名検証
- 必須ヘッダー確認
- エラー処理
- エッジケース（欠損データの処理）

## テスト実装の推奨事項

1. **テストデータの分離**: 各テストケースで独自のテストデータを作成
2. **DB操作の確認**: API応答だけでなくDB状態も検証
3. **非同期処理**: テスト内の非同期処理は`async/await`で扱う
4. **テストケースの独立性**: テスト間の依存関係を作らない
5. **エラーログ抑制**: 意図的なエラーテストのログは抑制
6. **型安全性**: `any`型の使用を最小限に抑える 