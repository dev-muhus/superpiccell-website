# Super Piccell Website – SNSメディア添付機能 仕様書

## 0. 目的
`superpiccell-website` (Next.js 14 + App Router) の投稿モーダルに **画像・動画添付** 機能を追加する。  
* 画像: JPEG/PNG/WebP (≤ 20 MB / ≤ 6,000 px)  
* 動画: MP4/H.264 10 秒以内 (≤ 8 MB 想定)  
添付は **ドラッグ＆ドロップ** と **ファイル選択** の両方に対応し、アップロード前に種類を自動判別して保存先を振り分ける。

---

## 1. アーキテクチャ概要

```mermaid
graph TD
  subgraph Client
    UI[PostModal<br/>Dropzone]
    API1[/api/upload/media]
    API2[/api/posts]
  end
  subgraph Edge API (Next.js)
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

---

## 2. ストレージ

| 種類 | サービス | 無料保存枠 | バケット/フォルダ |
|------|----------|-----------|-------------------|
| 画像 | **Cloudinary Free** | 25 GB 相当 (Credit) | `dev/media/images/`, `prod/media/images/` |
| 動画 | **Cloudflare R2 Free** | 10 GB | `dev/media/videos/`, `prod/media/videos/` |

### 2.1 Cloudinary設定
* Upload Preset `dev`, `prod`  
* `max_file_size=20971520` (20 MB)  
* `eager_async=true`  
* Transformation: `q_auto,f_auto` を強制付与

### 2.2 Cloudflare R2設定
* バケット `superpiccell-media`  
* S3互換公開ポリシーで GET を許可  
* オブジェクトキー: `prod/media/videos/{uuid}.mp4`

### 2.3 効率的なファイル管理
* 下書き用と投稿用で同じフォルダ構造を使用（`media/images/`, `media/videos/`）
* これにより下書きから投稿への変換時にファイルの物理的なコピーが不要
* DBのレコードのみを `draft_media` から `post_media` に移行

---

## 3. 保存可能件数（目安）

| メディア | 前提サイズ | 無料保存容量 | 保存可能数 |
|----------|-----------|--------------|-----------|
| 画像 | 4 MB / 枚 | 25 GB | 約 6,250 枚 |
| 動画 | 8 MB / 本 | 10 GB | 約 1,250 本 |

---

## 4. 環境変数
---

## 4.1 環境変数の取得・設定手順

### A. Cloudinary

| 手順 | 内容 |
|------|------|
| 1. アカウント作成 | https://cloudinary.com で無料サインアップ |
| 2. **Cloud name** 確認 | ダッシュボード右上の `Cloud Name` |
| 3. **API キー / シークレット** | *Settings → Access Keys* で表示 |
| 4. **Upload Preset** 作成 | *Media Library → Upload* → `Upload Presets` → `Add`<br>  *Folder* を `dev/media/images` または `prod/media/images` に設定し `max_file_size` を `20971520` (20 MB) に制限 |
| 5. Vercel に登録 | *Project → Settings → Environment Variables* で<br>`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,<br>`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` を **Production / Preview / Development** に追加 |
| 6. ローカル `.env.development.local` | 上記キーを同一名で記入 |

### B. Cloudflare R2

| 手順 | 内容 |
|------|------|
| 1. アカウント登録 | https://dash.cloudflare.com でアカウント作成後 "R2" を有効化 |
| 2. バケット作成 | *R2 → Create Bucket* → `superpiccell-media` |
| 3. **Access Key** 発行 | *R2 → Manage Tokens → Create Access Key* で取得<br>`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| 4. **Endpoint** 取得 | バケット詳細の Endpoint (`https://<accountid>.r2.cloudflarestorage.com`) |
| 5. **Public Access** 設定 | *Bucket Settings → Permissions* で Public Access を有効化<br>生成された公開URL (`https://pub-xxxxx.r2.dev`) をメモ |
| 6. Vercel に登録 | `R2_ENDPOINT`, `R2_REGION=auto`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` を環境別に追加 |
| 7. ローカル `.env.development.local` | 同じキーを記入 |

> **環境別キーのポイント**  
> * **開発 (`dev/*`) と本番 (`prod/*`)** でフォルダ or バケットを分けると誤アップロードを防止。  
> * *Preview* 環境 (PR ブランチ) は開発用キーを流用して問題ない。  
> * 先頭が `NEXT_PUBLIC_` のキーのみクライアントに露出。バックエンド用シークレットはプレフィックスなしで保存。

```env
# 画像 (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=spc
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=prod_media
NEXT_PUBLIC_CLOUDINARY_POST_IMAGE_FOLDER=prod/media/images
CLOUDINARY_API_KEY=***
CLOUDINARY_API_SECRET=***

# 動画 (R2)
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=superpiccell-media
R2_ACCESS_KEY_ID=***
R2_SECRET_ACCESS_KEY=***
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
NEXT_PUBLIC_POST_MOVIE_FOLDER=post/videos

# テスト環境用
NEXT_PUBLIC_CLOUDINARY_TEST_UPLOAD_PRESET=test
NEXT_PUBLIC_CLOUDINARY_TEST_POST_IMAGE_FOLDER=test/media/images
R2_TEST_BUCKET=test-superpiccell-media
R2_TEST_PUBLIC_URL=https://pub-XXXXXXXXXXXX.r2.dev

# メディア機能の有効/無効化
NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD=true      # メディア添付を有効化（true = 有効、false = 無効）
```

**注意**: 以下の環境変数は不要になるため削除します
```
NEXT_PUBLIC_CLOUDINARY_DRAFT_IMAGE_FOLDER
NEXT_PUBLIC_CLOUDINARY_TEST_DRAFT_IMAGE_FOLDER
NEXT_PUBLIC_DRAFT_MOVIE_FOLDER
```

* 開発環境は `spc-dev`, `dev`, `dev/post/images/`, `dev/post/videos/` に読み替える。  
* Vercel の Environment Variables で Production/Preview/Development を分離。

### C. メディアアップロード有効化設定

| 環境変数 | 説明 | デフォルト値 |
|----------|------|-------------|
| `NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD` | メディア添付機能全体を有効化 | `true` |

運用例:
- メンテナンス時: `NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD=false`
- 通常時: `NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD=true`

**注意**: このフラグはクライアント側と API 側の両方でチェックする必要があります。

---

## 5. DB スキーマ

```sql
-- posts: テキスト主体
CREATE TABLE posts (
  id           bigserial primary key,
  user_id      bigint not null references users(id),
  body         text,
  media_count  smallint default 0,
  created_at   timestamptz default now()
);

-- post_media: 画像・動画共通
CREATE TABLE post_media (
  id           bigserial primary key,
  post_id      bigint not null references posts(id) on delete cascade,
  media_type   varchar(8) not null check (media_type in ('image','video')),
  url          text not null,
  width        int,
  height       int,
  duration_sec int,
  created_at   timestamptz default now()
);

-- drafts: 下書き投稿
CREATE TABLE drafts (
  id           serial primary key,
  user_id      integer not null references users(id),
  content      text,
  in_reply_to_post_id integer references posts(id),
  media_data   json,
  media_count  smallint default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  deleted_at   timestamptz,
  is_deleted   boolean not null default false
);

-- draft_media: 下書き用メディア
CREATE TABLE draft_media (
  id           serial primary key,
  draft_id     integer not null references drafts(id) on delete cascade,
  media_type   varchar(8) not null check (media_type in ('image','video')),
  url          text not null,
  width        integer,
  height       integer,
  duration_sec integer,
  created_at   timestamptz default now(),
  is_deleted   boolean default false,
  deleted_at   timestamptz
);
```

> 画像・動画は必ず **post_media** / **draft_media** に保存する。posts/drafts 表には URL 列を持たせない。

---

## 6. API

### 6.1 `POST /api/upload/post-media`
* `multipart/form-data` (`file`)  
* 処理フロー  
  1. MIME 判定  
  2. **画像**: Cloudinary 署名付き URL 生成  
  3. **動画**: R2 署名付き PUT URL 生成  
  4. 返却 `{ uploadUrl, publicUrl, mediaType }`

### 6.2 `POST /api/posts`
```json
{
  "body":"hello",
  "media":[
    {"url":"https://...jpg","mediaType":"image","width":1280,"height":720}
  ]
}
```
サーバで posts と post_media にトランザクション挿入。

### 6.3 削除処理における注意点
* 投稿の削除時には以下の処理を行う:
  1. post_mediaテーブルの論理削除（on delete cascadeによる）
  2. Cloudinary/R2のストレージからメディアファイルの削除
* 下書きの削除時には以下の処理を行う:
  1. draft_mediaテーブルの論理削除（on delete cascadeによる）
  2. Cloudinary/R2のストレージからメディアファイルの削除（下書きと投稿で共通のファイルパスを使用しない場合）
* ストレージ管理については、投稿または下書きに紐づくメディアの状態を必ず確認してから削除すること

### 6.4 下書きから投稿への変換
* 下書きから投稿に変換する場合:
  1. 下書きのメディアデータをDBでのみpost_mediaテーブルにコピー
  2. 実際のファイルは同じストレージ場所を使用するため物理的なコピーは不要
  3. media_countカラムの値を適切に設定

---

## 7. フロントエンド

### 7.1 Dropzone 設定

```tsx
useDropzone({
  accept:{
    'image/*':['.jpg','.jpeg','.png','.webp'],
    'video/mp4':['.mp4']
  },
  maxFiles:4,
  maxSize: 20*1024*1024, // 20 MB
  maxHeight:6000,
  maxWidth:6000,
});
```
* 動画は `HTMLVideoElement` で読み込み、`duration <= 10` を確認。  
* 画像と動画の混在は禁止 (UI/JS でバリデーション)。

### 7.2 プレビュー & 送信
* `URL.createObjectURL` でサムネイル/動画プレビュー。  
* 送信ボタンで `Promise.all(uploadMedia(files))` → `/api/posts`.

---

## 8. バリデーション一覧

| チェック内容 | エラーメッセージ |
|--------------|-----------------|
| 動画時間 > 10 秒 | `Video must be 10 seconds or shorter.` |
| 動画 + 画像混在 | `Choose either images or a video, not both.` |
| 画像数 > 4 | `You can attach up to 4 images.` |
| ファイル > 20 MB | `File must be 20 MB or smaller.` |
| 解像度 > 6,000 px | `Image resolution too large.` |

---

## 9. 運用

| 項目 | 方法 |
|------|------|
| Cloudinary Credit 監視 | Admin API → Cloud Function → Slack 通知 (80 % で警告) |
| R2 容量監視 | `HeadBucket` 使用量計測 → 80 % で警告 |
| バックアップ | `rclone sync r2:superpiccell-media s3://backup-bucket` 月次 |
| 画像/動画削除 | 投稿/下書き削除時に必要な対応: <br>1. post_media/draft_mediaは自動的にon delete cascade<br>2. Cloudinary/R2 APIを呼び出してストレージからファイル削除<br>3. 複数の投稿/下書きで同じファイルが使用されている場合は参照カウントを確認 |

---

## 10. デプロイ手順

1. DB マイグレーションを生成・適用
   ```bash
   # スキーマ変更からマイグレーションファイルを生成（手動でマイグレーションファイルを作成しないこと）
   docker compose exec frontend npm run db:generate
   
   # 生成されたマイグレーションファイルを確認
   
   # 保留中のマイグレーションを適用
   docker compose exec frontend npm run db:migrate
   ```
   **重要**: マイグレーションファイルは必ず `db:generate` コマンドで生成すること。手動作成は厳禁。

2. Cloudinary Upload Preset & R2 バケットを作成。  
3. Vercel に環境変数を登録。  
4. ブランチを Production へマージし自動デプロイ。  
5. 投稿テストで画像/動画プレビュー・保存を確認。

---

## 11. 参考実装パッケージ

* `cloudinary` `^2.0` – Node SDK  
* `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner` – R2 署名  
* `react-dropzone` – D&D UI  
* `ffprobe-static` (dev) – オフライン動画時間検証

---

## 12. テスト要件 【最重要】

### 12.1 テスト環境の準備 【必須】

テストを実行する際は、本番/開発環境とは別の**テスト専用**のストレージ設定を使用する必要があります。
これにより、テスト実行中に本番/開発データが影響を受けることを防ぎます。

#### テスト用環境変数の設定

`.env.local` または `.env.test` に以下のテスト専用環境変数を設定します：

```env
# Cloudinaryテスト環境設定
NEXT_PUBLIC_CLOUDINARY_TEST_UPLOAD_PRESET=test
NEXT_PUBLIC_CLOUDINARY_TEST_POST_IMAGE_FOLDER=test/media/images

# R2テスト環境設定
R2_TEST_BUCKET=test-superpiccell-media
R2_TEST_PUBLIC_URL=https://pub-XXXXXXXXXXXX.r2.dev
```

#### テスト用ストレージの準備

1. **Cloudinary**:
   - `test` という名前の Upload Preset を作成
   - フォルダを `test/media/images` に設定

2. **Cloudflare R2**:
   - `test-superpiccell-media` という名前のバケットを作成
   - 本番/開発バケットと同じアクセス設定を適用
   - パブリックアクセスを有効にし、発行された公開URLを`R2_TEST_PUBLIC_URL`に設定

#### テスト実行時の環境変数の自動切り替え

テストコードは、`afterAll` フックを使用して、テスト終了後に元の環境変数に自動的に戻すよう実装します：

```typescript
// テスト環境変数を一時的に設定（元の値を保存）
const originalEnv = {
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  NEXT_PUBLIC_CLOUDINARY_POST_IMAGE_FOLDER: process.env.NEXT_PUBLIC_CLOUDINARY_POST_IMAGE_FOLDER,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL
};

// テスト用の環境変数をセット
if (process.env.NEXT_PUBLIC_CLOUDINARY_TEST_UPLOAD_PRESET) {
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_TEST_UPLOAD_PRESET;
}
if (process.env.NEXT_PUBLIC_CLOUDINARY_TEST_POST_IMAGE_FOLDER) {
  process.env.NEXT_PUBLIC_CLOUDINARY_POST_IMAGE_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_TEST_POST_IMAGE_FOLDER;
}
if (process.env.R2_TEST_BUCKET) {
  process.env.R2_BUCKET = process.env.R2_TEST_BUCKET;
}
if (process.env.R2_TEST_PUBLIC_URL) {
  process.env.R2_PUBLIC_URL = process.env.R2_TEST_PUBLIC_URL;
}

// テスト終了後に元の環境変数に戻す
afterAll(() => {
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = originalEnv.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  process.env.NEXT_PUBLIC_CLOUDINARY_POST_IMAGE_FOLDER = originalEnv.NEXT_PUBLIC_CLOUDINARY_POST_IMAGE_FOLDER;
  process.env.R2_BUCKET = originalEnv.R2_BUCKET;
  process.env.R2_PUBLIC_URL = originalEnv.R2_PUBLIC_URL;
});
```

### 12.2 実際のファイルアップロードテストの義務化 【必須】

APIエンドポイントのテストにおいて、**実際のファイルをCloudinaryとCloudflare R2に物理的にアップロードすること**が絶対に必須です。モックやエミュレーションは許容されません。

以下の理由から、実際のアップロードテストが必要不可欠です：

1. **信頼性の担保**: 署名の生成だけでなく、実際のファイルが正しくストレージにアップロードされることを確認するため
2. **エンドツーエンドの動作確認**: 理論上の動作ではなく、実際の環境での完全なフローを検証するため 
3. **ストレージ設定の検証**: Cloudinary/R2の設定（アクセス権限、フォルダ構造など）が正しいことを検証するため
4. **リグレッション防止**: 自動テストによって継続的な品質保証を行うため

### 12.3 テスト実装要件 【実装必須】

`frontend/__tests__/api/upload/media.test.ts` は以下の要件を満たす必要があります：

```typescript
test('実際の画像ファイルをCloudinaryにアップロードする', async () => {
  // ここで署名付きURLを取得するだけでなく
  // 実際にCloudinaryにファイルをアップロードし
  // アップロード結果のレスポンスを検証する
  
  // 省略不可: Cloudinaryへの実アップロード処理
  const cloudinaryUploadData = new FormData();
  cloudinaryUploadData.append('file', file);
  cloudinaryUploadData.append('api_key', data.apiKey);
  cloudinaryUploadData.append('timestamp', data.timestamp);
  cloudinaryUploadData.append('signature', data.signature);
  cloudinaryUploadData.append('public_id', data.publicId);
  cloudinaryUploadData.append('upload_preset', data.uploadPreset);

  // 実際のCloudinaryへのアップロード
  const uploadResponse = await fetch(data.uploadUrl, {
    method: 'POST',
    body: cloudinaryUploadData
  });

  // アップロード結果の検証
  expect(uploadResponse.status).toBe(200);
  const uploadResult = await uploadResponse.json();
  expect(uploadResult.public_id).toBeDefined();
  // 実際のアップロード成功を確認
  expect(uploadResult.url).toBeDefined();
});
```

同様に、R2のテストも実際にファイルをアップロードして検証する必要があります。

### 12.4 テスト検証項目 【必須】

1. **アップロード成功の検証**: ストレージ側から返されるレスポンスで成功を確認
2. **アップロードURLの検証**: 生成されたURLが実際にアクセス可能であることの確認
3. **メタデータの検証**: サイズ、形式などが正しく保存されていることの確認
4. **エラーケースの検証**: 不正なファイルやサイズ制限超過の場合の挙動確認

### 12.5 制約事項

- テスト実行環境には必要な環境変数がすべて設定されている必要があります
- CIパイプラインでもテストが実行できるよう、環境変数の設定が必要です
- テストコードにシークレットを直接記載することは厳禁です

**注意**: エミュレーションや模擬テストは認められません。実際のCloudinaryとR2へのアップロードを行わないテストは不合格と見なし、承認されません。

---

## 13. CloudFlare R2 CORS設定 【重要】

動画ファイルのアップロードにおいて、クライアントから直接CloudFlare R2へファイルを転送する際にCORSエラーが発生する問題に対応するため、以下の設定を実施する必要があります。

### 13.1 CloudFlare R2 CORS設定手順

1. **CloudFlareダッシュボードにログイン**
   - https://dash.cloudflare.com/ にアクセス

2. **R2セクションに移動**
   - 左側のナビゲーションから「R2」を選択

3. **該当バケットを選択**
   - `superpiccell-media`バケットをクリック

4. **CORS設定を構成**
   - 「設定」タブ→「CORS構成」をクリック
   - 「CORS構成を追加」をクリック

5. **CORS構成に以下の設定を追加**

#### 開発環境用CORS設定
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

#### 本番環境用CORS設定
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

### 13.2 設定項目の説明

| 設定項目 | 説明 |
|---------|------|
| `AllowedOrigins` | アクセスを許可するオリジン（ドメイン）。開発環境は`http://localhost:3000`、本番環境は`https://superpiccell.com` |
| `AllowedMethods` | 許可するHTTPメソッド。ファイルアップロードには特に`PUT`が必要 |
| `AllowedHeaders` | 許可するリクエストヘッダー。`*`ですべてのヘッダーを許可 |
| `ExposeHeaders` | JavaScriptから参照可能にするレスポンスヘッダー。ファイルサイズ確認などに必要 |
| `MaxAgeSeconds` | ブラウザがCORS情報をキャッシュする秒数 |

### 13.3 CORS設定の検証方法

CORS設定が正しく適用されているか確認するために、以下の手順でテストします：

1. 開発環境または本番環境でメディアアップロード機能を実行
2. ブラウザの開発者ツールを開き、ネットワークタブでR2へのリクエストを確認
3. 正常な場合は、プリフライトリクエスト（OPTIONS）が200ステータスコードを返し、実際のPUTリクエストも成功する
4. エラーの場合は、CORS設定の伝播に最大30秒かかる場合があるため、少し待ってから再試行

### 13.4 よくある問題と解決方法

- **設定が反映されない**: R2のCORS設定の伝播には最大30秒かかることがあります
- **OriginヘッダーがR2に届いていない**: リクエストに`Origin`ヘッダーが含まれていることを確認
- **許可されたオリジンの書式が不正**: スキーム（http/https）とホスト名の正確な組み合わせが必要
- **ヘッダーが不足している**: 必要なカスタムヘッダーがある場合は`AllowedHeaders`に追加

**注意**: CORS設定はR2バケットごとに個別に設定する必要があります。開発環境用と本番環境用で別々のバケットを使用している場合は、それぞれのバケットに適切なCORS設定を行ってください。

---

**作成日: 2025‑05‑13**
**最終更新日: 2024‑06‑26**

# SNSメディア添付機能 - 実装完了報告

## 実装済み機能
- ✅ PostModal.tsx: メディア添付処理とアップロード機能
- ✅ /api/posts/route.ts: 投稿作成APIのメディア対応
- ✅ /api/posts/[id]/route.ts: 投稿詳細取得APIのメディア情報返却
- ✅ /api/upload/post-media/route.ts: 画像/動画アップロードAPI
- ✅ /api/drafts/route.ts: draft_mediaテーブル対応(完全実装済み)
- ✅ /api/drafts/[id]/route.ts: draft_mediaテーブル対応(完全実装済み)
- ✅ /api/drafts/[id]/media/route.ts: 下書きメディア取得API
- ✅ クライアントから直接CloudFlare R2へ動画ファイルをアップロード(CORS対応)
- ✅ 画像と動画の混在投稿に対応
- ✅ メディア添付上限を2件に変更（定数化）

## テスト実装状況
- ✅ post-media.test.ts: 実際のファイルアップロードテスト
- ✅ posts.test.ts: 画像添付、動画添付、複数画像添付のテスト
- ✅ post-id.test.ts: メディア付き投稿取得、動画付き投稿取得のテスト
- ✅ drafts.test.ts: draft_mediaテーブル対応で既存テスト通過
- ✅ drafts-id.test.ts: draft_mediaテーブル対応で既存テスト通過

## 残タスク（実装中）
1. **DBマイグレーション適用**
   - ✅ draft_mediaテーブルの新設（schema.tsに定義済み）
   - ✅ draftsテーブルにmedia_countカラム追加（schema.tsに定義済み）
   - ✅ マイグレーションスクリプト作成（0002_parallel_starfox.sql）
   - ✅ マイグレーション実行

2. **下書きAPI修正完了**
   - ✅ `/api/drafts/route.ts`: draft_mediaテーブル使用への完全移行
   - ✅ `/api/drafts/[id]/route.ts`: draft_mediaテーブル使用への完全移行
   - ✅ `/api/drafts/[id]/media/route.ts`: 下書きメディア取得API新規作成

3. **メディア削除処理の実装**
   - ✅ `media-utils.ts`: メディア削除ユーティリティ関数の作成
   - ✅ 投稿削除時のメディアファイル削除処理
   - ✅ 下書き削除時のメディアファイル削除処理

4. **下書きから投稿への変換改善**
   - ✅ `PostModal.tsx`: 下書きメディアを投稿に変換する処理の改善

5. **環境変数の更新**
   - ✅ 不要な環境変数の削除（`NEXT_PUBLIC_CLOUDINARY_DRAFT_IMAGE_FOLDER`, `NEXT_PUBLIC_CLOUDINARY_TEST_DRAFT_IMAGE_FOLDER`, `NEXT_PUBLIC_DRAFT_MOVIE_FOLDER`）
   - ✅ 共通フォルダ構造のための環境変数更新

6. **機能改善**
   - ✅ 画像と動画の混在投稿対応（APIとUI両方で対応）
   - ✅ メディア添付上限を定数管理で2件に変更（MAX_MEDIA_ATTACHMENTS）
   - ✅ CloudFlare R2のCORS設定対応（デバッグログ追加と仕様書更新）
   - ✅ R2直接アップロードとサーバー経由アップロードの切り替え対応

7. **下書きのメディア対応**
   - ⬜ 下書き編集時の画像・動画アップロード機能の実装
   - ⬜ 下書き一覧画面でのメディアプレビュー表示の実装
   - ⬜ 下書き詳細画面でのメディア表示の実装

8. **UIでのメディア表示対応**
   - ⬜ タイムライン表示でのメディア（画像・動画）のレスポンシブ表示
   - ⬜ 投稿詳細画面でのメディア表示の最適化
   - ⬜ ユーザープロフィール画面の投稿一覧でのメディア表示

9. **データベースのカラム型修正**
   - ⬜ `post_media`と`draft_media`テーブルの`duration_sec`カラムを整数型から浮動小数点型に変更
   - ⬜ マイグレーションスクリプトの作成と実行

## 最新の実装状況（2024年7月1日追加）

1. ✅ **メディアの複合投稿対応**
   - 画像と動画を同時に投稿できるように機能拡張
   - APIとフロントエンドの両方で対応
   - テスト対応も完了

2. ✅ **CloudFlare R2 CORS設定対応**
   - 開発環境と本番環境それぞれに対応したCORS設定を追加
   - デバッグログを追加して問題の特定と解決を容易に
   - 仕様書に詳細なCORS設定方法を追加

3. ✅ **メディア添付上限の改善**
   - `MAX_MEDIA_ATTACHMENTS = 2`に設定し、定数で管理
   - 全コンポーネントで統一的に定数を参照するように改修
   - サーバー側とクライアント側の両方で同じ制限を適用

## 実装手順
1. ✅ DBスキーマの更新（schema.tsに定義済み）
2. ✅ マイグレーションスクリプトの作成（0002_parallel_starfox.sql）
3. ✅ マイグレーションの実行（2024年6月26日完了）
4. ✅ `/api/drafts/route.ts`の修正と完全移行
5. ✅ `/api/drafts/[id]/route.ts`の修正と完全移行
6. ✅ `/api/drafts/[id]/media/route.ts`の新規作成
7. ✅ テストコードの動作確認（テスト全て成功）
8. ✅ メディア削除処理の実装
   - ✅ `media-utils.ts`ユーティリティ関数の作成
   - ✅ 投稿削除APIの修正
   - ✅ 下書き削除APIの修正
9. ✅ 環境変数の更新と不要変数の削除
10. ✅ 下書きから投稿への変換処理の改善（`PostModal.tsx`）
11. ✅ 最終確認とドキュメント更新

## 注意事項
- media_dataカラムはすぐには削除せず、互換性維持のために当面は残しておく
- 移行期間中はmedia_dataの内容とdraft_mediaテーブルの両方をサポート
- 全機能が十分にテストされた後に、将来的にmedia_dataカラムの削除を検討
- 削除機能を実装済み：投稿/下書きの削除時にメディアファイルもストレージから削除する処理を実装
- 複数の投稿/下書きで同じファイルが使われている可能性があるため、参照カウントを確認してからファイル削除を行う仕組みが将来的には必要

## 8. 機能要件

### 8.1 基本要件

- 投稿作成時に画像または動画を添付可能にする
- 画像添付は最大2枚まで（最初は4枚だったが変更）
- 動画添付は最大2本まで（最初は1本だったが変更）
- 画像と動画の混在添付に対応
- テキストなしでメディアのみの投稿に対応
- 総メディア数は2個まで（例：画像1枚+動画1本、画像2枚、動画2本）
- 投稿表示時にメディアを適切に表示する
- 下書き保存時にもメディア添付可能にする

### 8.2 画像添付要件

- 許容フォーマット: JPG、PNG、GIF、WebP
- 最大ファイルサイズ: 20MB
- 最大解像度: 6000x6000px
- Cloudinaryへ直接アップロード
- 必要に応じて最適化（リサイズ、圧縮）
- アルバム表示（複数画像がある場合）

### 8.3 動画添付要件

- 許容フォーマット: MP4、MOV、WebM
- 最大ファイルサイズ: 20MB
- 最大長さ: 10秒
- CloudFlare R2へ直接アップロード
- 自動再生（ミュート、ループ）
- 必要に応じてポスター画像表示

### 8.4 UI要件

- ドラッグ&ドロップでのアップロード
- プレビュー表示
- メディア削除機能
- アップロード進捗表示
- エラー表示
- メディアアップロード中は投稿ボタンを無効化
- テキストが空でもメディアがある場合は投稿可能
