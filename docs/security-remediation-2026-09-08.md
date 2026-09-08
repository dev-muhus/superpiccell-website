# Dependabot 対応（2026-09-08）

対象は `frontend/package-lock.json` の未解決アラート7件。

| アラート | パッケージ | 対応 |
| --- | --- | --- |
| [#165](https://github.com/dev-muhus/superpiccell-website/security/dependabot/165)、[#166](https://github.com/dev-muhus/superpiccell-website/security/dependabot/166) | browserslist | 4.28.1 → 4.28.9（修正版は4.28.7以降） |
| [#162](https://github.com/dev-muhus/superpiccell-website/security/dependabot/162) | qs | 6.15.2 → 6.16.0 |
| [#163](https://github.com/dev-muhus/superpiccell-website/security/dependabot/163) | @humanfs/node | 0.16.7 → 0.16.8 |
| [#161](https://github.com/dev-muhus/superpiccell-website/security/dependabot/161) | postcss-selector-parser | 6.1.2 → 6.1.4（修正版は6.1.3以降） |
| [#164](https://github.com/dev-muhus/superpiccell-website/security/dependabot/164) | stream-json | 導入元のAlchemy SDKとともに依存ツリーから除去 |
| [#42](https://github.com/dev-muhus/superpiccell-website/security/dependabot/42) | elliptic | 導入元のAlchemy SDKとともに依存ツリーから除去 |

`elliptic` は[上流に修正版がない](https://github.com/advisories/GHSA-848j-6mx2-7j84)。SDKの用途はウォレットのNFT一覧取得1箇所のみだったため、同じAlchemy NFT API v3をNext.jsの `/api/nfts/owned` から標準 `fetch` で呼ぶ方式に変更した。`stream-json` も `alchemy-sdk → @solana/web3.js → jayson` の依存だったため、互換性のないメジャーバージョンの強制上書きは不要になった。アラートの手動dismissは行わない。

ウォレット接続・ネットワーク切替・NFT画像・OpenSeaリンク・先頭100件の取得・10件ずつの表示は既存の挙動を維持する。上流のトークンIDは256bit整数として検証し、既存の画像パスに合わせて10進文字列に変換する。UIのスタイルやDBスキーマの変更はない。

新APIは公開ホームから呼べるよう、そのパスだけをmiddlewareの公開ルートへ追加した。接続先と対象コントラクトはサーバー設定で固定し、ウォレットアドレスの検証、リダイレクト拒否、10秒タイムアウト、上流エラーの秘匿を行う。既存のAlchemyキーは[接続元許可リスト](https://www.alchemy.com/docs/how-to-add-allowlists-to-your-apps-for-enhanced-security)を使用するため、`Origin` は `NEXT_PUBLIC_SITE_URL` から生成する。未設定時の既定値は既存のレイアウトと同じ `https://superpiccell.com`。呼び出し元のヘッダーからは生成しない。

## 検証

プロジェクトルールに従い、npm操作はすべてDocker Compose経由で実行した（Node 24 / npm 11）。

- `docker compose run --rm --no-deps frontend npm ci --legacy-peer-deps`：成功。
- `docker compose run --rm --no-deps frontend npm audit --json`：全severityで0件（変更前は推移的な影響を含め20件）。
- `docker compose run --rm --no-deps frontend npm run lint`：0 errors、既存と同じ265 warnings。
- `docker compose run --rm frontend npm run test:api -- --modulePathIgnorePatterns '<rootDir>/.next/'`：21 suites / 319 tests成功、skipなし。NFT APIの26ケースを含む。マイグレーションとデータリセットは専用のDockerテストDBで実行。既存のJest設定がビルド生成物も探索するため、最終実行では `.next` のみを探索対象から除外した。
- `docker compose run --rm --no-deps frontend npm run build`：ビルド・型チェック成功。
- `esbuild`、`unrs-resolver`、`sharp`、`pg` のロード成功。
- ローカル本番ビルドの未認証HTTP確認：ホーム200、不正アドレス400、NFTなし200・0件、実際の保有者200・65件。
- ブラウザ確認：ウォレットプロバイダーを模擬して接続・ネットワーク切替を行い、実Alchemy APIのNFTを初回10件、スクロール後20件表示。画像パス `cert_1.png` と接続状態を確認。

本番DBのスキーマ・データへの変更やマイグレーションは不要。

## 反映手順

このリポジトリには独立したstagingブランチはなく、VercelのPreview / Productionが既存の経路。修正ブランチをpushしてPreviewのデプロイ成功を確認後、同じコミットを `main` に反映し、Productionの成功と公開サイトの動作、Dependabotの再評価を確認する。PreviewはVercelの認証で保護されているため、未認証のHTTPリクエストでは画面を検証できない。
