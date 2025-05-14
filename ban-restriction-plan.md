# BANユーザー・削除ユーザーアクセス制限実装計画書

## 1. 概要

本ドキュメントは、Super Piccell SNSプラットフォームにおいて、BANされたユーザー（`users.is_banned=true`）および削除されたユーザー（`users.is_deleted=true`）に対するアクセス制限機能の実装計画と技術仕様を記述したものです。これらのユーザーがログインやAPIアクセスを行えないようにし、保護されたページへのアクセス時にはトップページにリダイレクトする機能を実装します。

## 2. 要件定義

### 2.1 機能要件

1. **ログイン制限**
   - BANされたユーザーはログインできないようにする
   - 削除されたユーザーはログインできないようにする

2. **API制限**
   - BANされたユーザーはAPIにアクセスできないようにする
   - 削除されたユーザーはAPIにアクセスできないようにする

3. **リダイレクト機能**
   - 上記のユーザーが認証が必要なページにアクセスした場合、トップページにリダイレクトする
   - 適切なエラーメッセージを表示する

### 2.2 非機能要件

1. **セキュリティ**
   - すべてのルートで一貫して制限が適用されること
   - 制限を回避する方法がないこと
   - セキュリティ上の理由からBANされたユーザーに対して具体的なBANステータスを表示しないこと

2. **パフォーマンス**
   - ユーザーステータスの確認による顕著なパフォーマンス低下がないこと
   - データベースクエリの最適化

3. **ユーザビリティ**
   - ユーザーに対して適切なフィードバックを提供すること
   - 情報セキュリティとユーザビリティのバランスを取ること
   - 国際標準とベストプラクティスに準拠したUI/UXデザインを採用すること

## 3. 技術仕様

### 3.1 データモデル

既存のユーザーモデルには以下のフィールドが存在します：

```typescript
// ユーザーテーブル関連フィールド
interface User {
  // 既存フィールド
  is_deleted: boolean;
  deleted_at?: Date;
  is_banned: boolean;
  banned_at?: Date;
  ban_reason?: string;
}
```

### 3.2 認証フローの修正

#### 3.2.1 Clerk Webhookの拡張

Clerkからのwebhookイベント（`user.created`および`user.updated`）処理に、BANと削除状態のチェックを追加します。

```typescript
// webhooks/clerk/route.tsの修正概要
export async function POST(req: Request) {
  // 既存の処理...
  
  // ユーザーがBANまたは削除されている場合、Clerkでのアクセスを制限
  if (eventType === 'user.updated' && payload.data) {
    const clerkUserId = payload.data.id;
    const dbUser = await getUserByClerkId(clerkUserId);
    
    if (dbUser && (dbUser.is_banned || dbUser.is_deleted)) {
      // Clerk APIを使用してユーザーを非アクティブ化
      // または制限付きセッションに設定
    }
  }
  
  // 残りの処理...
}
```

### 3.3 ミドルウェアの修正

`middleware.ts`ファイルを修正し、認証チェックに加えてBANと削除状態のチェックを追加します。

```typescript
// ミドルウェア修正概要
export default authMiddleware({
  publicRoutes: ['/'],
  async afterAuth(auth, req) {
    // 認証済みかつclerkIdが存在する場合
    if (auth.userId) {
      try {
        // データベースからユーザー情報を取得
        const dbUser = await getUserByClerkId(auth.userId);
        
        // ユーザーがBANまたは削除されている場合
        if (dbUser && (dbUser.is_banned || dbUser.is_deleted)) {
          // トップページにリダイレクト
          return NextResponse.redirect(new URL('/', req.url));
        }
      } catch (error) {
        console.error('ユーザー検証エラー:', error);
      }
    }
    
    // 通常の認証フロー継続
    return NextResponse.next();
  }
});
```

### 3.4 API制限の実装

すべてのAPI routeハンドラーで共通して使用できる高階関数（HOF）を作成し、BANおよび削除ユーザーのチェックを統一的に実装します。

```typescript
// lib/api-middlewareとして新規作成
export function withUserStatusCheck(handler: RouteHandler) {
  return async (req: Request) => {
    const { userId } = auth();
    
    if (!userId) {
      return Response.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    // データベースからユーザーを取得
    const dbUser = await getUserByClerkId(userId);
    
    // ユーザーが存在しない、BANされている、または削除されている場合
    if (!dbUser || dbUser.is_banned || dbUser.is_deleted) {
      // セキュリティベストプラクティスに従い、具体的なステータスを明示しない汎用的なメッセージを使用
      return Response.json({
        error: 'アカウントにアクセスできません。サポートにお問い合わせください。'
      }, { status: 403 });
    }
    
    // 問題なければ本来のハンドラを実行
    return handler(req, dbUser);
  };
}
```

各APIルートでの使用例：

```typescript
// APIルートの実装例
import { withUserStatusCheck } from '@/lib/api-middleware';

export const GET = withUserStatusCheck(async (req, user) => {
  // 通常のAPI処理...
  return Response.json({ data: '...' });
});
```

### 3.5 フロントエンドのエラー処理

ユーザーに適切なエラーメッセージを表示するために、APIからのエラーレスポンスを処理するユーティリティ関数を実装します。

```typescript
// utils/api-errorとして新規作成
export function handleApiError(error: unknown) {
  if (error instanceof Response) {
    const status = error.status;
    
    if (status === 403) {
      // セキュリティベストプラクティスに従い、BANや削除の具体的な理由を明示しない
      return {
        title: 'アクセスできません',
        message: 'アカウントにアクセスできません。問題が続く場合はサポートまでご連絡ください。',
        action: '/'
      };
    }
    
    // その他のエラー処理...
  }
  
  // デフォルトのエラーハンドリング
  return {
    title: 'エラーが発生しました',
    message: '予期せぬエラーが発生しました。しばらくしてから再試行してください。',
    action: null
  };
}
```

### 3.6 エラーメッセージとUI/UXのベストプラクティス

BANや削除されたユーザーへの対応において、以下のセキュリティとUX上のベストプラクティスを採用します：

#### 3.6.1 セキュリティ上の配慮事項

1. **具体的なステータス非表示**
   - BANされた理由や削除されたことを明示的に伝えない
   - 攻撃者に対する情報漏洩を防止
   - BANを回避する試みを抑制

2. **曖昧なエラーメッセージの使用**
   - 「アカウントにアクセスできません」などの一般的な表現を使用
   - BANと削除を区別しない統一メッセージを提供

3. **サポート連絡先の表示**
   - 正当なユーザーが問題解決できる手段を提供
   - 過剰な情報を明かさずにユーザビリティを確保

#### 3.6.2 国際標準とUI/UXのベストプラクティス

1. **OWASP情報漏洩防止ガイドラインの遵守**
   - 詳細なエラー情報はログにのみ記録し、ユーザーには汎用的なメッセージを表示
   - ユーザーのアカウント状態に関する不要な情報漏洩を防止

2. **Google Material Designに準拠したエラー表示**
   - 簡潔で明確な言葉遣い
   - 次に取るべき行動を示す（サポートへの連絡など）
   - 過度に技術的でない表現の使用

3. **W3C WAI-ARIAアクセシビリティ基準の適用**
   - スクリーンリーダー対応
   - キーボードナビゲーション機能
   - 色だけに依存しない情報伝達

4. **NNグループのエラーメッセージデザイン原則に基づく実装**
   - ユーザーを責めない中立的な表現
   - 明確な次のステップの提示
   - 簡潔なエラー表示

### 3.7 修正対象ファイル

実装時に修正が必要となる主要ファイルを以下にリストアップします。

#### 3.7.1 コアファイル

- **ミドルウェア**: `frontend/src/middleware.ts`
- **ユーティリティ関数**: 
  - `frontend/src/lib/api-middleware.ts`（新規作成）
  - `frontend/src/utils/api-error.ts`（新規作成または修正）
  - `frontend/src/utils/auth.ts`（既存のユーザー取得関数の修正）

#### 3.7.2 APIルートファイル

以下のすべてのAPIルートファイルに、3.4項で定義した`withUserStatusCheck`関数を適用する必要があります：

```
frontend/src/app/api/blocks/route.ts
frontend/src/app/api/bookmarks/route.ts
frontend/src/app/api/drafts/[id]/route.ts
frontend/src/app/api/drafts/route.ts
frontend/src/app/api/engagement/route.ts
frontend/src/app/api/followers/route.ts
frontend/src/app/api/follows/route.ts
frontend/src/app/api/me/route.ts
frontend/src/app/api/posts/[id]/bookmark/route.ts
frontend/src/app/api/posts/[id]/likes/route.ts
frontend/src/app/api/posts/[id]/replies/route.ts
frontend/src/app/api/posts/[id]/route.ts
frontend/src/app/api/posts/route.ts
frontend/src/app/api/profile/[username]/route.ts
frontend/src/app/api/profile/edit/route.ts
frontend/src/app/api/profile/route.ts
frontend/src/app/api/users/[id]/block/route.ts
frontend/src/app/api/users/[id]/follow/route.ts
```

#### 3.7.3 Webhookハンドラ

- **Clerkウェブフック**: `frontend/src/app/api/webhooks/clerk/route.ts`
  - このファイルは特殊ケースとして、BANや削除されたユーザーのセッション終了処理を実装

## 4. 実装計画

### 4.1 フェーズ1: API・ミドルウェア修正

1. **ミドルウェアの拡張**
   - `src/middleware.ts`にBANおよび削除ユーザーのチェックを追加
   - リダイレクト処理の実装

2. **API制限の実装**
   - `lib/api-middleware.ts`の作成
   - 共通のユーザー状態チェック関数の実装
   - 主要APIルートへの統合

3. **Webhookハンドラの修正**
   - `api/webhooks/clerk/route.ts`の更新
   - BANおよび削除ユーザーのClerk側での処理追加

### 4.2 フェーズ2: テストコード修正・追加

1. **単体テストの作成**
   - ミドルウェアのテスト
   - API制限機能のテスト
   - Webhookハンドラのテスト

2. **統合テストの更新**
   - BANユーザーのアクセス制限テスト
   - 削除ユーザーのアクセス制限テスト
   - リダイレクト動作のテスト

### 4.3 フェーズ3: テスト実行・コード修正

1. **テスト実行**
   - 単体テスト実行
   - 統合テスト実行
   - エッジケースの検証

2. **コード修正**
   - テスト結果に基づく修正
   - エラーハンドリングの改善
   - パフォーマンス最適化

### 4.4 フェーズ4: ビルド・ソース修正

1. **本番ビルド実行**
   - ビルドエラーの修正
   - パフォーマンス検証

2. **最終調整**
   - エラーメッセージの調整
   - ログ出力の最適化
   - ドキュメント更新

## 5. テスト計画

### 5.1 単体テスト

1. **ミドルウェアテスト**
   - 正常ユーザーのアクセス許可確認
   - BANユーザーのリダイレクト確認
   - 削除ユーザーのリダイレクト確認
   - エラーハンドリング検証

2. **API制限テスト**
   - 正常ユーザーのAPI呼び出し成功確認
   - BANユーザーのAPI制限確認（403応答）
   - 削除ユーザーのAPI制限確認（403応答）
   - 適切なエラーメッセージ返却確認
   - エラーメッセージが具体的なBANや削除の状態を明示していないことの確認

### 5.2 統合テスト

1. **エンドツーエンドフロー検証**
   - ユーザーBANから制限適用までのフロー
   - ユーザー削除から制限適用までのフロー
   - 様々なページアクセスでのリダイレクト動作

2. **WebhookフローのE2Eテスト**
   - Clerkイベント発生からユーザー状態反映までの確認
   - 状態変更に伴うセッション管理の確認

### 5.3 手動テスト

1. **ユーザー体験検証**
   - エラーメッセージの明確さ確認
   - リダイレクト動作の流動性確認
   - ブラウザ・デバイス互換性確認
   - アクセシビリティの確認（スクリーンリーダー、キーボードナビゲーション）

## 6. リスクと緩和策

1. **パフォーマンスリスク**
   - リスク: 各リクエストごとのDBクエリ増加によるパフォーマンス低下
   - 緩和策: キャッシュの導入、クエリの最適化

2. **ユーザー体験リスク**
   - リスク: 曖昧なエラーメッセージによるユーザーの混乱
   - 緩和策: 適切なサポート連絡先の提示、次のステップを明確に示す

3. **セキュリティリスク**
   - リスク: 制限回避の試みや一部ルートの漏れ
   - 緩和策: 完全なルートカバレッジのテスト、セキュリティ監査の実施

4. **実装の複雑性**
   - リスク: 統一されていない制限ロジックによる保守性低下
   - 緩和策: 共通ユーティリティ関数の使用、適切な抽象化

## 7. スケジュール

| フェーズ | タスク | 見積時間 |
|---------|------|---------|
| 1 | API・ミドルウェア修正 | 2日 |
| 2 | テストコード修正・追加 | 1.5日 |
| 3 | テスト実行・コード修正 | 1日 |
| 4 | ビルド・ソース修正 | 0.5日 |
| | **合計** | **5日** |

## 8. まとめ

BANユーザーおよび削除ユーザーに対するアクセス制限の実装により、プラットフォームのセキュリティとポリシー適用が強化されます。本計画に従って実装を進めることで、一貫性のある制限が適用され、ユーザーに適切なフィードバックが提供されます。

セキュリティとUI/UXのベストプラクティスを採用することで、プラットフォームの安全性を確保しつつ、ユーザーに対しては必要最小限の情報提供と明確な次のステップを示すことができます。これにより、不正アクセスの試みを抑制しながら、正当なユーザーに対しては問題解決のための適切なガイダンスを提供します。

## 9. コマンド実行ガイド

### 9.1 開発環境のセットアップ

以下のコマンドはすべて、プロジェクトディレクトリのルートから実行します。npm/npxコマンドはdocker compose経由で実行する必要があります。

```bash
# フロントエンドコンテナの起動
docker compose up -d

# 依存関係のインストール
docker compose exec frontend npm install
```

### 9.2 開発サーバーに関する重要な注意事項

**重要**: 開発サーバーは既に起動している状態であることを前提としています。以下のコマンドは実行しないでください。

```bash
# ❌ 開発サーバーを再起動しないでください
# docker compose exec frontend npm run dev
```

コード変更は、既存の起動中の開発サーバーに自動的に反映されます。サーバーを再起動すると、開発中の状態が失われるリスクがあります。

### 9.3 テスト実行コマンド

テストはDocker環境内で実行する必要があります。以下のコマンドを使用してテストを実行します。

```bash
# すべてのAPIテストを実行
docker compose exec frontend npm run test:api

# 特定のテストファイルを実行
docker compose exec frontend npm run test:api -- __tests__/api/middleware.test.ts

# 詳細出力でテストを実行
docker compose exec frontend npm run test:api -- --verbose
```

テスト環境では専用のテストデータベースが使用され、環境変数`TEST_MODE=true`が自動的に設定されます。

### 9.4 ビルドと検証

```bash
# 本番用ビルドの実行
docker compose exec frontend npm run build

# ビルド結果の検証
docker compose exec frontend npm run start
```

### 9.5 テスト環境でのデータベース操作

テストコードでは、テスト用のデータベースが使用されます。テスト用データベースのセットアップやリセットには以下のコマンドを使用します。

```bash
# テストデータベースのリセット
docker compose exec frontend npm run db:test:reset

# テストデータベースへのマイグレーション適用
docker compose exec frontend npm run db:test:migrate
```

### 9.6 デバッグツール

```bash
# テストでのデバッグ出力の有効化
docker compose exec frontend npm run test:api -- --debug

# 特定のファイルのパターンに一致するテストのみを実行
docker compose exec frontend npm run test:api -- -t "BANユーザー"
```

### 9.7 クラッシュレポートと分析

実装中に予期せぬエラーが発生した場合は、以下のコマンドでログを確認できます。

```bash
# アプリケーションのログ確認
docker compose logs frontend

# リアルタイムでのログ監視
docker compose logs -f frontend
``` 