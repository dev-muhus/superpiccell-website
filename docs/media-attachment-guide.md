# SNSメディア添付機能ガイド

## 1. 概要

投稿および下書きに画像と動画を添付できる機能を提供します。ユーザーはドラッグ＆ドロップまたはファイル選択で複数のメディアファイルを添付できます。アップロード前に種類を自動判別して最適な保存先に振り分けます。

### 主な機能
- 画像添付 (JPEG/PNG/WebP/GIF)
- 動画添付 (MP4/MOV/WebM)
- 複数ファイルのアップロード
- 下書き保存
- ドラッグ＆ドロップ対応
- プレビュー表示

### 技術仕様
- 画像: 最大20MB、最大解像度6,000px
- 動画: 最大20MB、最長10秒
- 総メディア数: 最大2つまで
- 保存先: 画像はCloudinary、動画はCloudflare R2

## 2. アーキテクチャ

```mermaid
graph TD
  subgraph Client
    UI[PostModal<br/>Dropzone]
    API1[/api/upload/media]
    API2[/api/posts]
  end
  subgraph Edge API
    U1[upload/media<br/>署名発行]
    U2[posts<br/>DB書込]
  end
  subgraph Storage
    C1[Cloudinary<br/>images/*]
    R2[Cloudflare R2<br/>videos/*]
  end
  subgraph DB
    P1[posts]
    M1[post_media]
    D1[drafts]
    DM1[draft_media]
  end

  UI -- file --> API1 --> U1
  U1 -- PUT --> C1
  U1 -- PUT --> R2
  UI -- meta --> API2 --> U2 --> P1 & M1
  UI -- draft --> API2 --> U2 --> D1 & DM1
```

### ストレージ構成

| 種類 | サービス | 無料枠 | 保存場所 |
|------|----------|--------|----------|
| 画像 | Cloudinary | 25GB相当 | `[env]/media/images/` |
| 動画 | Cloudflare R2 | 10GB | `[env]/media/videos/` |

*[env]は環境に応じて `dev` または `prod` に置き換える*

### データベース構造

メディアデータは専用テーブルで管理します：

- `post_media`: 投稿に添付されたメディア
- `draft_media`: 下書きに添付されたメディア

## 3. 開発ガイド

### 3.1 環境設定

#### 必要な環境変数

```env
# メディア機能の有効/無効化
NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD=true

# 画像 (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=dev
NEXT_PUBLIC_CLOUDINARY_POST_IMAGE_FOLDER=dev/media/images
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# 動画 (R2)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=dev-superpiccell-media
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev
NEXT_PUBLIC_POST_MOVIE_FOLDER=media/videos

# テスト環境用
NEXT_PUBLIC_CLOUDINARY_TEST_UPLOAD_PRESET=test
NEXT_PUBLIC_CLOUDINARY_TEST_POST_IMAGE_FOLDER=test/media/images
R2_TEST_BUCKET=test-superpiccell-media
R2_TEST_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev
```

#### 新規開発時の設定手順

1. **Cloudinary設定**
   - [Cloudinary](https://cloudinary.com)でアカウント作成
   - Upload Presetを作成（Folder: `dev/media/images`、File Size Limit: 20MB）
   - API KeyとSecretを取得

2. **Cloudflare R2設定**
   - [Cloudflare Dashboard](https://dash.cloudflare.com)でR2を有効化
   - バケット作成（`dev-superpiccell-media`など）
   - Access KeyとSecretを発行
   - パブリックアクセスを有効化して公開URL取得

3. **CORS設定**
   - R2バケットのCORS設定を構成（下記参照）

4. **環境変数設定**
   - `.env.local`に必要な環境変数を設定

### 3.2 API概要

| エンドポイント | 機能 |
|--------------|------|
| `/api/upload/post-media` | メディアアップロード用署名付きURL発行 |
| `/api/posts` | 投稿作成（メディア添付含む） |
| `/api/drafts` | 下書き作成・取得（メディア添付含む） |
| `/api/drafts/[id]` | 下書き編集・削除 |
| `/api/drafts/[id]/media` | 下書きのメディア管理 |

### 3.3 コンポーネント実装

主要コンポーネント：
- `MediaDropzone.tsx`: メディアのアップロード・プレビュー機能
- `PostModal.tsx`: 投稿・下書き作成モーダル

実装例（Dropzone設定）：
```tsx
useDropzone({
  accept: {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    'video/*': ['.mp4', '.mov', '.webm']
  },
  maxFiles: MAX_MEDIA_ATTACHMENTS,
  maxSize: MAX_FILE_SIZE
});
```

### 3.4 CloudFlare R2 CORS設定

開発環境用：
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

本番環境用：
```json
[
  {
    "AllowedOrigins": ["https://superpiccell.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

## 4. テスト

### 4.1 テスト環境設定

テストには専用のストレージを使用します：

1. **Cloudinary**:
   - `test` Upload Presetを作成
   - フォルダ: `test/media/images`

2. **R2**:
   - `test-superpiccell-media` バケットを作成
   - パブリックアクセスを有効化

3. **環境変数**:
   ```env
   NEXT_PUBLIC_CLOUDINARY_TEST_UPLOAD_PRESET=test
   NEXT_PUBLIC_CLOUDINARY_TEST_POST_IMAGE_FOLDER=test/media/images
   R2_TEST_BUCKET=test-superpiccell-media
   R2_TEST_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev
   ```

### 4.2 実際のファイルアップロードテスト

APIテストでは実際のストレージにファイルをアップロードする必要があります。
モックやエミュレーションではなく、実際のアップロードをテストします。

テスト実装例（`__tests__/api/upload/post-media.test.ts`）：
```typescript
test('実際の画像ファイルをCloudinaryにアップロードする', async () => {
  // URLの取得
  const { data } = await uploadImage();
  
  // 実際のアップロード
  const uploadResponse = await uploadToCloudinary(data, testImageFile);
  
  // 結果の検証
  expect(uploadResponse.status).toBe(200);
  const result = await uploadResponse.json();
  expect(result.url).toBeDefined();
});
```

## 5. 運用ガイド

### 5.1 リソース管理

| リソース | 監視方法 | 対応アクション |
|---------|---------|--------------|
| Cloudinary | Admin APIで使用量監視 | 80%でアラート |
| R2 | `HeadBucket`で使用量計測 | 80%でアラート |

### 5.2 メディア削除ポリシー（未設定）

メディアファイルの削除は以下のタイミングで行われます：

1. **投稿削除時**:
   - `post_media` レコードは自動的に削除（カスケード）
   - ストレージからのファイル削除

2. **下書き削除時**:
   - `draft_media` レコードは自動的に削除（カスケード）
   - ストレージからのファイル削除

注意: 同じファイルが複数の投稿/下書きで参照されている場合は参照カウントを確認

### 5.3 バックアップ戦略（未設定）

1. **定期バックアップ**:
   - 月次でストレージデータをバックアップ
   - R2: `rclone sync r2:superpiccell-media s3://backup-bucket`
   - Cloudinary: APIを使用したバックアップ

2. **障害復旧**:
   - ストレージサービスで障害発生時はAPIでエラーを返す
   - 障害回復後に通常運用に戻る

### 5.4 環境別対応

| 環境 | Cloudinaryフォルダ | R2バケット |
|------|-------------------|-----------|
| 開発 | `dev/media/images` | `dev-superpiccell-media` |
| 本番 | `prod/media/images` | `superpiccell-media` |
| テスト | `test/media/images` | `test-superpiccell-media` |

## 6. デプロイガイド

1. **DBマイグレーション**:
   ```bash
   # マイグレーションファイル生成
   docker compose exec frontend npm run db:generate
   
   # マイグレーション適用
   docker compose exec frontend npm run db:migrate
   ```

2. **ストレージ設定**:
   - 開発/本番環境それぞれでCloudinaryプリセットを作成
   - R2バケットを作成しCORS設定を適用

3. **環境変数設定**:
   - Vercelに環境変数を登録（Production/Preview/Development）

4. **デプロイ後の確認**:
   - 画像・動画のアップロードテスト
   - プレビュー表示確認
   - メディア削除機能確認

## 7. 実装済み機能と今後の展開

### 実装済み機能
- ✅ メディア添付処理とアップロード機能
- ✅ 投稿・下書きAPIのメディア対応
- ✅ 画像・動画アップロードAPI
- ✅ クライアントから直接R2へのアップロード(CORS対応)
- ✅ 画像と動画の混在投稿対応
- ✅ メディア添付上限の定数管理(MAX_MEDIA_ATTACHMENTS)

### 今後の展開
1. **UIの改善**:
   - タイムラインでのメディアレスポンシブ表示最適化
   - メディアビューワーの機能強化

2. **パフォーマンス最適化**:
   - 画像の自動最適化（サイズ、形式）
   - 動画の最適化（圧縮、サムネイル自動生成）

3. **機能拡張**:
   - アルト（代替）テキスト対応
   - 多言語対応のエラーメッセージ
   - メディアのタグ付け機能 