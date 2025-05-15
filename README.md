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
- **プロフィール管理** - ユーザー情報の編集
- **下書き機能** - 投稿の一時保存
- **コネクション管理** - フォロー/フォロワー管理
- **ブロック機能** - 不要なユーザーのブロック
- **ユーザーBANシステム** - 管理者がユーザーをBAN/削除できる機能

これらの機能は、Clerk認証、Neon Database（PostgreSQL）、Next.jsのAppルーターを使用して実装されています。すべての機能は、カーソルベースのページネーションと無限スクロールで最適化されており、快適なユーザー体験を提供します。

詳細な技術仕様と実装状況については、以下のドキュメントを参照してください：
- [SNS機能技術仕様書](docs/sns-features.md)
- [メディア添付機能ガイド](docs/media-attachment-guide.md)

## ユーザーBANシステム

Clerkのプライベートメタデータを使用したユーザーBAN/削除システムが実装されています。

### 機能概要

このシステムは、ユーザーのClerkプライベートメタデータにBANまたは削除のフラグを設定することで、即時に該当ユーザーをログアウトさせ、アクセスを制限する機能を提供します。

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
docker compose exec frontend sh -c "NODE_ENV=production DATABASE_URL=postgresql://superpiccell_owner:xxxxxxxxxxxx@xxxxxxxxxxxx.ap-southeast-1.aws.neon.tech/superpiccell?sslmode=require npm run db:migrate"

# データベースをリセット（テーブルを削除し、マイグレーションを再生成して適用）
docker compose exec frontend npm run db:reset
```

### データベーススキーマ

データベーススキーマは`frontend/src/db/schema.ts`でDrizzle ORMを使用して定義されています。データベース構造を変更するには：

1. `schema.ts`でスキーマを修正
2. 新しいマイグレーションを生成：`npm run db:generate`
3. マイグレーションを適用：`npm run db:migrate`

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

### 【重要】マイグレーション適用ルール

データベースマイグレーションを適用する際は、以下のルールに従ってください：

1. **開発環境へのマイグレーション**
   - 開発環境へのマイグレーションは必ず `NODE_ENV=development` を指定して実行してください
   - コマンド例: `docker compose exec frontend sh -c "NODE_ENV=development npm run db:migrate"`

2. **本番環境へのマイグレーション**
   - 本番環境へのマイグレーションは必ず事前に確認を取ってから実行してください
   - チームリードの承認なしに本番環境マイグレーションを実行してはいけません
   - 本番環境マイグレーション前にステージング環境でテストを行ってください
   - 本番マイグレーション実行前に必ずバックアップを取得してください
   - マイグレーション実行コマンド: `docker compose exec frontend sh -c "NODE_ENV=production npm run db:migrate"`

3. **データベーススキーマの変更について**
   - スキーマ変更を行う場合は必ずPRでコードレビューを受けてください
   - 破壊的変更（カラム削除やNOT NULL制約の追加など）には特に注意してください
   - ダウンタイムが必要な変更の場合は、事前に計画を立ててから実施してください

4. **データ移行が必要な場合**
   - データ移行スクリプトは必ず別途用意し、レビューを受けてください
   - 大量データの移行はバックグラウンドジョブとして実行することを検討してください

これらのルールに従うことで、データベースの整合性を保ち、予期しない問題を防ぐことができます。

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
     PORT=3000
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

   アプリケーションに[http://localhost:3000](http://localhost:3000)でアクセスできます。

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
