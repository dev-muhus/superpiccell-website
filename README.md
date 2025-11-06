# Super Piccell ウェブサイトプロジェクト

このプロジェクトはSuper Piccellのウェブサイトで、Next.jsとDockerを使用して構築され、コンテンツ管理にはContentful、データベースにはNeonを使用しています。環境変数を更新するだけで他のプロジェクトにも簡単に再利用できるように設計されています。

## プロジェクト構造

- **frontend**: Next.jsフロントエンドアプリケーション
- **backend**: 将来的なバックエンドサービス用のプレースホルダー

## SNS機能

Super Piccellウェブサイトには、ログイン後に利用可能な豊富なSNS機能が実装されています：

- **投稿機能** - テキスト投稿、コメント投稿
- **メディア添付機能** - 画像・動画の添付（最大2つまで）
- **エンゲージメント** - いいね、ブックマーク、フォロー
- **タイムライン** - フォローユーザー投稿の表示
- **プロフィール管理** - ユーザー情報の編集、カバー画像のアップロード・編集
- **下書き機能** - 投稿の一時保存
- **コネクション管理** - フォロー/フォロワー管理
- **ブロック機能** - 不要なユーザーのブロック
- **ユーザーBANシステム** - 管理者がユーザーをBAN/削除できる機能

これらの機能は、Clerk認証、Neon Database（PostgreSQL）、Next.jsのAppルーターを使用して実装されています。すべての機能は、カーソルベースのページネーションと無限スクロールで最適化されており、快適なユーザー体験を提供します。

詳細な技術仕様と実装状況については、以下のドキュメントを参照してください：
- [SNS機能技術仕様書](docs/sns-features.md)
- [メディア添付機能ガイド](docs/media-attachment-guide.md)

## プロフィールカバー画像機能

ユーザーがプロフィールページに表示されるカバー画像をアップロード・編集できる機能が実装されています：

### 機能概要

- **カバー画像アップロード** - プロフィール編集モーダルからドラッグ&ドロップまたはクリックでファイル選択
- **リアルタイムプレビュー** - アップロード前に画像プレビューを表示
- **自動最適化** - Cloudinaryによる自動リサイズ（1200x400px）と画質最適化
- **ファイル形式対応** - JPEG、PNG、WebP形式をサポート
- **ファイルサイズ制限** - 最大10MBまでのファイルをアップロード可能
- **削除機能** - 既存のカバー画像を削除してデフォルト状態に戻すことが可能

### 技術仕様

- **画像ストレージ**: Cloudinary統合による署名付きURL生成とセキュアアップロード
- **データベース**: usersテーブルの`cover_image_url`カラムでURL管理
- **API設計**: RESTful APIエンドポイント（`/api/upload/cover-images`、`/api/profile/edit`）
- **UI/UX**: ドラッグ&ドロップ対応、プログレス表示、エラーハンドリング
- **テスト**: 包括的なAPIテストとCloudinary統合テストを実装

この機能により、ユーザーは自分のプロフィールページをより個性的にカスタマイズできるようになります。

## Web3ウォレット連携機能

Super Piccellプラットフォームでは、MetaMaskなどのWeb3ウォレットと連携してメンバーシップNFTを表示・確認できる機能が実装されています：

### 機能概要

- **ウォレット接続** - MetaMaskや他のWeb3ウォレットとの接続
- **NFT自動検出** - 指定されたコントラクトアドレスのメンバーシップNFTを自動検出
- **ネットワーク自動切り替え** - 正しいブロックチェーンネットワーク（Polygon Mainnet）への自動切り替え
- **NFTコレクション表示** - 保有NFTのビジュアル表示（グリッドレイアウト）
- **無限スクロール** - 大量のNFTコレクションでも快適な閲覧体験
- **OpenSea連携** - NFTクリックでOpenSeaの詳細ページへ直接リンク
- **レスポンシブデザイン** - モバイル・デスクトップ両対応

### 技術仕様

- **ブロックチェーン統合**: Alchemy SDK による高信頼性のNFTデータ取得
- **ウォレット接続**: EIP-1193準拠のプロバイダー（MetaMask等）対応
- **ネットワーク管理**: EIP-3085/EIP-3326による自動ネットワーク追加・切り替え
- **画像最適化**: Next.js Image コンポーネントによる最適化表示
- **パフォーマンス**: 遅延読み込み（Intersection Observer API）による高速表示
- **エラーハンドリング**: 包括的なエラー処理とユーザーフレンドリーなメッセージ

### 対応環境

- **ネットワーク**: Polygon Mainnet (ChainID: 0x89)
- **ウォレット**: MetaMask、WalletConnect対応ウォレット
- **マーケットプレイス**: OpenSea統合
- **ブロックエクスプローラー**: Polygonscan連携

この機能により、ユーザーは保有するSuper PiccellメンバーシップNFTを簡単に確認でき、Web3エコシステムとシームレスに連携できます。

## ユーザーBANシステム

Clerkのプライベートメタデータを使用したユーザーBAN/削除システムが実装されています。

### 機能概要

このシステムは、ユーザーのClerkプライベートメタデータにBANまたは削除のフラグを設定することで、即時に該当ユーザーをログアウトさせ、アクセスを制限する機能を提供します。

### 重要：暫定的な実装について

**注意**: 現在のミドルウェア（middleware.ts）による実装は暫定的な対応です。現時点では、データベーススキーマ（schema.ts）に定義されている `users.is_banned` および `users.is_deleted` カラムは使用されておらず、Clerkのプライベートメタデータのみに依存しています。

将来的な実装では、Clerkのプライベートメタデータとデータベースのカラムを連動させる予定です。これにより、システム全体で一貫したユーザー状態管理が可能になります。

### 将来的な実装の推奨アプローチ

現在の実装は暫定的なものであり、**Clerkのプライベートメタデータのみを使用したユーザーBAN・削除の管理は一般的なアプローチではありません**。Clerkの公式ドキュメントでも、プライベートメタデータは主にユーザーの権限、ロール、サブスクリプション状態などの保存に推奨されています。

将来的には以下のようなより標準的で堅牢な実装に移行することを推奨します：

1. **データベースを主要な状態管理場所として使用**
   - データベース（`users.is_banned`/`users.is_deleted`）をユーザー状態の主要な情報源とする
   - BANや削除操作をまずデータベースに反映し、その後Clerkのメタデータを更新
   - データベースの状態をシステム全体での「単一の信頼できる情報源」として扱う

2. **Webhookによる同期メカニズム**
   - Clerkのユーザー更新Webhookを使用してデータベースと同期（必要な場合のみ）
   - データベース更新時にClerkのメタデータも更新する処理を実装
   - 同期エラーを検出して回復するメカニズムの実装

3. **適切なユーザー体験の提供**
   - BANされたユーザーと削除されたユーザーに対して明確で異なるメッセージを表示
   - ユーザーに適切なアクションを促すためのガイダンス情報
   - アカウント回復や問い合わせのためのリンク提供
   - 国際的なUI/UXスタンダードに準拠した通知デザイン

4. **管理者インターフェースの提供**
   - 管理者がユーザーをBANまたは削除するための標準的なUI
   - 理由の記録と通知機能（コンプライアンス要件を満たすため）
   - バッチ処理や段階的なペナルティ管理機能
   - アクション履歴と監査ログ

これらの改善により、業界標準に準拠した、より堅牢でユーザーフレンドリーなBANおよび削除システムが実現できます。この方法は、Clerkへの過度な依存を避け、データの一貫性とシステムの柔軟性を向上させるでしょう。

### 仕組み

1. ユーザーがBANまたは削除されると、Clerkのプライベートメタデータにフラグが設定されます
2. Next.jsのミドルウェアがリクエスト時にユーザーのメタデータをチェックします
3. BANまたは削除されたユーザーは自動的にログアウトされ、ログイン画面にリダイレクトされます
4. ユーザーはアカウントが停止または削除されたことを示すメッセージを受け取ります

### 設定方法についての重要な注意

**現在のシステムでは、プライベートメタデータの設定は手動でのみ行います。**
自動設定用のAPIは実装されていません。管理者はClerkのダッシュボードから直接メタデータを編集する必要があります。

### ユーザーBANの方法

ClerkのダッシュボードでユーザーをBANする手順は以下の通りです：

1. [Clerk管理ダッシュボード](https://dashboard.clerk.com/)にログイン
2. 「Users」タブを開いて、BANしたいユーザーを検索
3. ユーザーを選択し、「Edit private metadata」をクリック
4. 以下のいずれかの形式でメタデータを設定：

**直接フラグ形式:**
```json
{
  "is_banned": true
}
```

**ネストされたユーザー情報形式:**
```json
{
  "users": {
    "is_banned": true
  }
}
```

### ユーザー削除の方法

削除フラグをClerkのプライベートメタデータに設定するには：

1. [Clerk管理ダッシュボード](https://dashboard.clerk.com/)にログイン
2. 「Users」タブを開いて、削除したいユーザーを検索
3. ユーザーを選択し、「Edit private metadata」をクリック
4. 以下のいずれかの形式でメタデータを設定：

**直接フラグ形式:**
```json
{
  "is_deleted": true
}
```

**ネストされたユーザー情報形式:**
```json
{
  "users": {
    "is_deleted": true
  }
}
```

### 注意事項

- プライベートメタデータはClerkのバックエンドAPIからのみ読み取り可能で、フロントエンドからは直接アクセスできません
- この機能を使用するには、Clerkの適切なAPIキーが設定されている必要があります
- BANされたユーザーは、次のページ読み込み時に強制的にログアウトされます
- 複数のデバイスで同時にログインしている場合でも、すべてのセッションが無効化されます
- メタデータの変更は即時に反映されるわけではなく、次回リクエスト時に適用されます

## Cookie同意機能

ウェブサイトは、GDPRやその他のプライバシー法に準拠するためのCookie同意システムを実装しています：

- **Cookie同意バナー** - ユーザーにCookieの使用を通知し、選択肢を提供
- **詳細設定機能** - ユーザーが使用するCookieの種類を選択可能
  - 必須Cookie: サイト機能のために常に有効
  - 機能Cookie: ユーザー設定の保存などのために使用
  - 分析Cookie: サイト利用統計のために使用
  - マーケティングCookie: ターゲット広告のために使用
- **プライバシーポリシーページ** - Cookie使用方法とプライバシーに関する詳細情報
- **条件付きトラッキング** - ユーザーの同意に基づいてのみGoogle AnalyticsやGoogle Tagマネージャーが有効化

この機能は、js-cookieを使用してユーザーの同意設定を保存し、@radix-ui/react-switchを使用して直感的なスイッチUIを提供しています。ユーザーはいつでも設定を変更できます。

## ゲームフレームワーク

**重要**: このゲーム機能は将来的に削除される可能性があります。現在は**Embryo（https://embryo.superpiccell.com/）**でゲーム機能を提供しているため、Super Piccell本体プラットフォームからのゲーム機能の削除を検討しています。

Super Piccellプラットフォームには、さまざまなゲームコンテンツを統合的に提供するための拡張可能なフレームワークが実装されています：

- **モジュール型ゲーム設計** - 個別のゲームを独立したモジュールとして開発可能な構造
- **統一されたユーザー体験** - すべてのゲームで一貫したUIと操作性の提供
- **プラグインシステム** - 新規ゲームを簡単に追加できる拡張性の高いアーキテクチャ
- **ゲーム管理ダッシュボード** - 中央管理インターフェースからのゲーム設定と監視
- **共通コンポーネント** - 再利用可能なUI要素、フック、ユーティリティ
- **状態管理ソリューション** - Zustandを活用したゲーム状態の効率的な管理
- **スコア保存・ランキング機能** - プレイヤーのスコア記録と競争要素の提供
- **モバイル最適化** - タッチ操作とレスポンシブデザインに対応

現在、**Nag-Won**（3Dメタバース環境でのアイテム収集ゲーム）が実装されていますが、**ダッシュボードからのゲームアクセスは無効化されています**。

### ゲームスコア・ランキング機能

プラットフォームには包括的なスコア管理システムが実装されています：

- **スコア保存**: ゲーム終了時に自動的にスコア保存確認を表示
- **ランキング表示**: ゲーム内からリアルタイムでランキングを確認可能
- **プライバシー保護**: ブロック関係や削除ユーザーを適切に除外
- **ページネーション**: 大量のランキングデータを効率的に表示
- **セキュリティ**: 認証済みユーザーのみアクセス可能、不正なスコア操作を防止

### モバイルUI/UX最適化

モバイルデバイスでの快適なゲーム体験を提供：

- **Pull to Refresh対策**: ゲーム中の誤操作を防止
- **デュアルジョイスティック**: 移動とカメラ操作を分離した直感的な操作
- **レスポンシブデザイン**: 様々な画面サイズに対応
- **タッチ最適化**: モバイル操作に最適化されたボタン配置

フレームワークの詳細な説明、開発ガイドライン、新規ゲーム追加方法については、[ゲームフレームワーク開発・運用ガイド](docs/games-framework-guide.md)を参照してください。

---

## フロントエンド

このプロジェクトのフロントエンドはNext.jsで構築されています。セットアップはDockerでコンテナ化され、CMS統合にはContentful、データベースにはNeonをDrizzle ORMとともに使用しています。

### 前提条件

開始する前に、以下のものが準備されていることを確認してください：

- DockerとDocker Composeがインストールされている
- ContentfulアカウントとAPIトークン（Space ID、Access Tokenなど）
- ブロックチェーンAPI連携のためのAlchemyアカウント（APIキーが必要）
- Neonデータベースインスタンスと接続URL
- 設定された環境変数（`.env.local`）
- 認証用のClerkアカウント（APIキーとウェブフックシークレットが必要）

---

## テスト

このプロジェクトは、APIの機能性と信頼性を確保するための包括的なAPIテストを実装しています。すべてのAPIルートはDrizzle ORMを使用して実際のPostgreSQLデータベース操作でテストされています。

### APIテスト

APIテストは以下のテストパターンですべてのエンドポイントをカバーしています：
- **正常系** - 期待される入力と成功レスポンスによるハッピーパス
- **異常系** - 無効な入力、不正アクセスなどのエラー処理
- **エッジケース** - 境界値、特殊文字、大量データなどの特殊なケース

### テストデータベース設定

テストでは、開発環境や本番環境のデータに影響を与えないよう、専用のテストデータベースコンテナを使用します。以下の環境変数を`.env`ファイルに追加してください：

```
# テストDB設定
TEST_DB_USER=test_user
TEST_DB_PASSWORD=test_pass
TEST_DB_NAME=test_db
TEST_DB_HOST=test-db
TEST_DB_PORT=5432
```

これらの変数は`test:api`スクリプトによって設定される`TEST_MODE=true`の場合に自動的に使用されます。

### テストの実行

```bash
# すべてのAPIテストを実行
docker compose run --rm frontend npm run test:api

# 特定のテストファイルを実行
docker compose run --rm frontend npm run test:api -- __tests__/api/users/id/block.test.ts

# 詳細出力でテストを実行
docker compose run --rm frontend npm run test:api -- --verbose
```

### テストディレクトリ構造

APIテストは`frontend/__tests__/api`ディレクトリに配置され、APIルートの構造を反映しています。

### テストガイドライン

- Drizzle ORMを通じて実際のデータベース操作を使用する（SQLクエリは避ける）
- テストデータはテストケース間で分離される
- APIレスポンスとデータベースの状態の両方をテストする
- 意図的なエラーテストのためのコンソールエラーログを抑制する
- テスト同士が独立している状態を保つ

詳細なテスト仕様、ガイドライン、実装の詳細については、[APIテスト仕様書](docs/api-test-plan.md)を参照してください。

---

## Clerkによる認証

このプロジェクトでは、認証とユーザー管理にClerkを使用しています。セットアップ方法は以下の通りです：

### Clerk認証のセットアップ

1. [https://clerk.com/](https://clerk.com/)でClerkアカウントを作成
2. Clerkダッシュボードで新しいアプリケーションを作成
3. ダッシュボードからAPIキーを取得
4. 以下のClerk環境変数を`.env.local`に追加：

```
# Clerk認証
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXX
CLERK_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXX
```

### Google OAuthの設定

本番環境では、Google OAuth認証を正しく機能させるために追加設定が必要です。「Missing required parameter: client_id」などのエラーを防ぐため、以下の手順に従ってください：

1. Google Cloud Consoleでプロジェクトを設定し、OAuth資格情報を取得
2. ClerkダッシュボードでGoogle OAuth設定を適切に構成
3. リダイレクトURIの正確な設定

詳細な手順については、[Clerk + Google OAuth 本番環境セットアップ手順](docs/clerk-google-oauth-setup.md)を参照してください。

### Clerkウェブフックの設定

ウェブフックは、Clerkとデータベースとのユーザーデータの同期に不可欠です。ウェブフックを設定するには、以下の手順に従ってください：

1. ngrokを有効にして開発環境を起動：
   ```
   docker compose up -d
   ```

2. ngrokパブリックURLを確認：
   ```
   # ngrokウェブインターフェースへアクセス（http://localhost:4040 またはNGROK_UI_PORTで設定したポート）
   # または以下のコマンドでURLを取得
   docker compose exec ngrok ngrok config inspect
   ```

3. Clerkダッシュボードで**Webhooks**に移動し、新しいウェブフックを追加：
   - **URL**: パス`/api/webhooks/clerk`を含むngrok URLを使用（例：`https://abc-123-xyz.ngrok.io/api/webhooks/clerk`）
   - **Events**: `user.created`と`user.updated`イベントを購読

4. Clerkから提供された**Signing Secret**をコピーし、`CLERK_WEBHOOK_SECRET`として`.env.local`に追加

5. Clerkダッシュボードの"Test endpoint"をクリックしてウェブフックをテスト

**ngrok URLについての注意**: デフォルトでは、ngrokの無料プランではトンネルを再起動するたびに新しいランダムURLが生成されます。一貫したURLが必要な場合：
- 静的/永続的なドメインを取得するために、ngrokの有料アカウントにサインアップすることができます
- ngrok認証トークンを`.env`に`NGROK_AUTHTOKEN`として追加
- 開発中は、ngrokを再起動するたびにClerkのウェブフックURLを更新する必要があります

本番環境では、ngrok URLをあなたの本番URLに置き換えてください。

---

## データベース管理

このプロジェクトでは、タイプセーフなデータベース操作のためにDrizzle ORMとともにNeonをデータベースとして使用しています。

### データベース設定

1. Neonデータベースインスタンスを作成し、接続URLを取得
2. 以下のデータベースURLを`.env.local`に追加：
   ```
   DATABASE_URL=postgres://user:password@...
   ```

### データベースコマンド

プロジェクトにはいくつかのデータベース管理コマンドが含まれています：

```bash
# スキーマ変更からマイグレーションファイルを生成
docker compose exec frontend npm run db:generate

# 保留中のマイグレーションを適用（開発環境）
docker compose exec frontend npm run db:migrate

# 本番環境のデータベースにマイグレーションを適用
docker compose exec frontend npm run db:migrate:production

# データベースをリセット（テーブルを削除し、マイグレーションを再生成して適用）
docker compose exec frontend npm run db:reset
```

### データベーススキーマ

データベーススキーマは`frontend/src/db/schema.ts`でDrizzle ORMを使用して定義されています。データベース構造を変更するには：

1. `schema.ts`でスキーマを修正
2. 新しいマイグレーションを生成：`npm run db:generate`
3. 開発環境でテスト：`npm run db:migrate`
4. 本番環境に適用：`npm run db:migrate:production`

スキーマ定義の例：
```typescript
// frontend/src/db/schema.ts
import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerk_id: text('clerk_id').notNull().unique(),
  username: text('username').notNull(),
  // ... その他のフィールド
});
```

### 本番マイグレーション運用

本番環境へのマイグレーションは、以下のコマンドでローカルから実行します：

```bash
# 本番マイグレーション実行
docker compose exec frontend npm run db:migrate:production

# 本番マイグレーション修復（問題が発生した場合）
docker compose exec frontend npm run db:migrate:production:repair
```

このコマンドは以下の機能を提供します：
- **対話式確認**: 実行前に確認プロンプトが表示されます
- **環境検証**: 本番環境への接続と設定を事前に検証
- **実行ログ**: マイグレーション実行の詳細ログを出力
- **セキュリティ**: 本番データベースURLの検証
- **結果検証**: マイグレーション後に実際のスキーマ変更を確認
- **修復機能**: マイグレーション履歴とスキーマの不整合を検出・修復

#### 本番マイグレーション実行手順

1. **スキーマ変更とマイグレーション生成**
   ```bash
   # スキーマを編集後、マイグレーションファイルを生成
   docker compose exec frontend npm run db:generate
   ```

2. **開発環境でのテスト**
   ```bash
   # 開発環境でマイグレーションをテスト
   docker compose exec frontend npm run db:migrate
   ```

3. **本番環境への適用**
   ```bash
   # 本番マイグレーション実行
   docker compose exec frontend npm run db:migrate:production
   ```

#### マイグレーション問題のトラブルシューティング

**問題**: マイグレーションが成功したように見えるが、実際のスキーマ変更が反映されていない

**症状**:
- マイグレーション実行ログに「成功」と表示される
- `_drizzle_migrations`テーブルに新しいエントリが追加される
- しかし実際のテーブルにカラムが追加されていない

**原因**:
- マイグレーション履歴とデータベーススキーマの不整合
- 部分的なマイグレーション実行の失敗
- Drizzleマイグレーション管理の競合状態

**解決方法**:
```bash
# 1. 修復スクリプトを実行して現状を確認・修復
docker compose exec frontend npm run db:migrate:production:repair

# 2. 修復後は改良されたマイグレーションスクリプトを使用
docker compose exec frontend npm run db:migrate:production
```

**予防策**:
- マイグレーション後は必ずスキーマ検証を実行
- 本番マイグレーション前に開発環境で十分にテスト
- マイグレーションファイルの一意性を確保
- 定期的なデータベーススキーマのバックアップ

#### 注意事項

- **破壊的変更**: データ損失の可能性がある変更は事前に十分な検証が必要
- **バックアップ**: 重要な変更前は手動バックアップを推奨
- **監視**: マイグレーション実行後は本番環境の動作確認が必要
- **実行環境**: 本番マイグレーションは必ずローカル環境から実行してください
- **検証**: マイグレーション後は必ず実際のスキーマ変更を確認してください

---

## 再利用方法

このプロジェクトを他の目的で再利用するには、`.env.local`の環境変数を新しいプロジェクトの要件に合わせて更新します。調整可能な項目には以下が含まれます：

- ブロックチェーン設定（契約アドレス、ネットワーク詳細など）
- ContentfulコンテンツタイプID
- Alchemyネットワーク設定
- データベース接続URL
- Clerk認証設定

### セットアップ手順

1. **リポジトリをクローン**:

   ```
   git clone <repository-url>
   cd superpiccell-website
   ```

2. **環境変数を設定**:

   - プロジェクトのルートに、以下の内容で`.env`ファイルを作成：
     ```
     PORT=3131
     NGROK_UI_PORT=4040  # ポート番号を変更可能
     NGROK_AUTHTOKEN=your_ngrok_auth_token  # オプション、カスタムドメイン用
     ```

   - `frontend`ディレクトリに、以下の変数を含む`.env.local`ファイルが存在することを確認：
     ```
     # データベース設定
     DATABASE_URL=postgres://user:password@...

     # Clerk認証
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXX
     CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXX
     CLERK_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXX

     # プロジェクト全体の設定
     NEXT_PUBLIC_SITE_NAME="Super Piccell"
     NEXT_PUBLIC_SITE_TITLE="Super Piccell - Web3 Media Franchise | SuperPiccell"
     NEXT_PUBLIC_SITE_ALTERNATE_NAME=SuperPiccell
     NEXT_PUBLIC_SITE_DESCRIPTION="Welcome to Super Piccell (SuperPiccell), the ultimate Web3 media franchise. Explore NFTs, characters, and more!"
     NEXT_PUBLIC_SITE_URL=https://superpiccell.com
     NEXT_PUBLIC_CONTRACT_ADDRESS=XXXXXXXXXXXXXXXX

     # Contentful固有の設定
     NEXT_PUBLIC_CONTENTFUL_SPACE_ID=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_CONTENTFUL_ENVIRONMENT=master
     NEXT_PUBLIC_CONTENTFUL_CONTENT_TYPE_GALLERY="gallery"
     NEXT_PUBLIC_CONTENTFUL_CONTENT_TYPE_CHARACTER="character"

     # Alchemy API
     NEXT_PUBLIC_ALCHEMY_API_KEY=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_ALCHEMY_NETWORK="MATIC_MAINNET"

     # コントラクトとブロックチェーン設定
     NEXT_PUBLIC_MEMBERSHIP_CONTRACT=XXXXXXXXXXXXXXXX
     NEXT_PUBLIC_MEMBERSHIP_COLLECTION_NAME="XXX-XXXX-XXXXX"
     NEXT_PUBLIC_RPC_URL="https://polygon-rpc.com/"
     NEXT_PUBLIC_SCAN_URL="https://polygonscan.com/"
     NEXT_PUBLIC_CHAIN_ID="0x89"
     NEXT_PUBLIC_NETWORK_NAME="Polygon Mainnet"
     NEXT_PUBLIC_CURRENCY_NAME="MATIC"
     NEXT_PUBLIC_CURRENCY_SYMBOL="MATIC"
     NEXT_PUBLIC_CURRENCY_DECIMALS="18"

     # スタイル設定
     NEXT_PUBLIC_HEADER_IMAGE_URL="image/main.png"
     NEXT_PUBLIC_OVERLAY_IMAGE_URL="image/main_icon.png"
     NEXT_PUBLIC_OVERLAY_TEXT="Web3 native media franchise project"
     NEXT_PUBLIC_HEADER_IMAGE_HEIGHT="600px"
     NEXT_PUBLIC_HEADER_BG_COLOR="#2C3E50"
     NEXT_PUBLIC_HEADER_TEXT_COLOR="#ffffff"
     NEXT_PUBLIC_FOOTER_BG_COLOR="#2C3E50"
     NEXT_PUBLIC_FOOTER_TEXT_COLOR="#ffffff"
     NEXT_PUBLIC_COPYRIGHT_BG_COLOR="#1a1a1a"
     NEXT_PUBLIC_COPYRIGHT_TEXT_COLOR="#cccccc"
     NEXT_PUBLIC_SCROLL_BUTTON_BG_COLOR="#2563eb"
     NEXT_PUBLIC_SCROLL_BUTTON_TEXT_COLOR="#ffffff"

     # サイトメトリクス追跡用のGoogle Analytics ID
     NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=XXXXXXXXXXXXXXXXXXXXXXX
     ```

### フロントエンドの起動

1. **Dockerコンテナをビルドして起動**:

   ```
   docker compose down
   docker compose up -d --build
   ```

2. **依存関係をインストール**:

   コンテナが起動した後、ログインして手動で依存関係をインストール：

   ```
   docker compose exec frontend bash
   npm install
   ```

3. **データベースをセットアップ**:

   ```
   # 初期マイグレーションを生成して適用
   docker compose exec frontend npm run db:migrate
   ```

4. **開発サーバーを実行**:

   ```
   npm run dev
   ```

   アプリケーションに[http://localhost:3131](http://localhost:3131)でアクセスできます。

5. **ngrokパブリックURLにアクセス**:

   開発環境でウェブフックをテストするには、ngrok管理パネルにアクセス：
   ```
   http://localhost:4040  # または設定したNGROK_UI_PORT
   ```
   これにより、Clerkウェブフックに使用できるパブリックURLが表示されます。

---

## トラブルシューティング

### Clerkウェブフックの問題

- `.env.local`の`CLERK_WEBHOOK_SECRET`がClerkダッシュボードのSigning Secretと一致していることを確認
- ngrokトンネルが実行中で、正しいURLがClerkで設定されていることを確認
- `docker compose logs ngrok`でログを確認し、接続問題がないか確認
- `/api/webhooks/clerk`のウェブフックエンドポイントが正しく実装されていることを確認

### 認証の問題

- ルートを保護するためのミドルウェアが正しく設定されていることを確認
- Clerk環境変数が`.env.local`に正しく設定されていることを確認
- 開発用には、テストキー（`pk_test_`と`sk_test_`)を使用していることを確認
- カスタムドメインの場合、ドメインがClerkダッシュボードで適切に設定されていることを確認

### ngrokの問題

- 再起動後にngrok URLが変更された場合、ClerkダッシュボードでウェブフックURLを更新
- 開発中の頻繁な再起動の場合、永続的なURLのためにngrokの有料プランへのアップグレードを検討
- 必要に応じて`.env`でカスタム`NGROK_UI_PORT`を設定し、ポート競合が解決されていることを確認

---

## バックエンド（追加予定）

バックエンドのセットアップ手順と設定は、プロジェクトにバックエンドサービスが追加された時点で提供されます。

---

## ライセンス

このプロジェクトはパブリックドメインです。

---

## 認証設定

### Clerkプロダクション環境のDNS設定

Clerk認証を本番環境で正常に動作させるには、以下のDNSレコードを設定する必要があります。これらの設定はドメインプロバイダー（お名前.com、AWS Route53、Cloudflareなど）のDNS管理画面で行います。

#### 必要なCNAMEレコード

| サブドメイン | レコードタイプ | 値 |
|------------|-------------|-----|
| `clerk` | CNAME | `frontend-api.clerk.services` |
| `accounts` | CNAME | `accounts.clerk.services` |
| `clk._domainkey` | CNAME | `dkim1.q9muopcd1lhn.clerk.services` (※) |
| `clk2._domainkey` | CNAME | `dkim2.q9muopcd1lhn.clerk.services` (※) |
| `clkmail` | CNAME | `mail.q9muopcd1lhn.clerk.services` (※) |

※ DKIM値はClerkダッシュボードで提供される実際の値に置き換えてください

#### 設定手順

1. Clerkダッシュボードで「**Configure**」→「**Domains**」ページを開く
2. 表示されるDNSレコード情報を確認
3. ドメインプロバイダーのDNS設定画面で上記のレコードを追加
4. Cloudflareを使用している場合は「**DNS only**」モード（プロキシを通さない）で設定
5. DNSの伝播には最大24時間かかる場合があります
6. Clerkダッシュボードの「**Validate configuration**」ボタンをクリックして検証

これらの設定が完了すると、Clerk認証が本番環境で正常に動作するようになり、サインイン/サインアップボタンが正しく機能します。

---
