# Dependabot 対応（2026-09-16）

対象は `frontend/package-lock.json` の未解決アラート5件。GitHub APIと各パッケージの公式アドバイザリで修正版を確認した。

| アラート | パッケージ | ロックファイルの更新 | 修正版の下限 |
| --- | --- | --- | --- |
| [#168](https://github.com/dev-muhus/superpiccell-website/security/dependabot/168)、[#169](https://github.com/dev-muhus/superpiccell-website/security/dependabot/169) | next | 16.2.12 → 16.3.5 | 16.3.3 |
| [#167](https://github.com/dev-muhus/superpiccell-website/security/dependabot/167) | sharp | 0.35.3 → 0.35.4 | 0.35.4 |
| [#170](https://github.com/dev-muhus/superpiccell-website/security/dependabot/170) | js-yaml（4系） | 4.3.1 → 4.3.2 | 4.3.2 |
| [#171](https://github.com/dev-muhus/superpiccell-website/security/dependabot/171) | js-yaml（3系） | 3.15.1 → 3.15.2 | 3.15.2 |

`next` と `eslint-config-next` の指定を `^16.3.3` に揃え、既存の `overrides` にある sharp / js-yaml の下限も引き上げた。Next.js関連パッケージは16.3.5でロックされている。js-yamlは既存の導入元ごとに3系・4系を維持する。

公式情報：

- [Next.js Windows上のRCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)
- [Next.js AVIF画像最適化のRCE](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)
- [sharp / libheifの脆弱性](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c)
- [js-yamlの空マッピングによるCPU制限回避](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh)

Next.jsの修正版にはAVIF最適化を無効化する対策が含まれる。sharpの同梱libheifも1.23.2になったことを実行時に確認した。

## ビルド互換性

最初の本番ビルドでは、既存APIテスト12ファイルの169箇所で、動的ルートの `params` を通常のオブジェクトとして渡している型エラーが検出された。既存APIの `Promise` 型の契約に合わせて、呼び出し側を `Promise.resolve(...)` に修正した。テストの期待値やアプリケーションの処理は変更していない。

`next-env.d.ts` にはNext.jsが生成した `root-params.d.ts` の参照が追加された。型検査の無効化やテストの除外による回避は行っていない。

## 検証

npm操作はすべてDocker Compose経由（Node 24.19.0 / npm 11.17.0）で実施した。

- `docker compose run --rm --no-deps frontend npm ci --legacy-peer-deps`：成功。
- `docker compose run --rm --no-deps frontend npm audit --json`：全severityで0件。
- `docker compose run --rm --no-deps frontend npm run lint`：0 errors、266 warnings。警告は残存。
- `docker compose run --rm frontend npm run test:api -- --modulePathIgnorePatterns '<rootDir>/.next/'`：21 suites / 319 tests成功、skipなし。`.next` はビルド生成物の重複探索を避けるための指定。
- テストDB接続先が専用Dockerサービス `test-db` であることを事前確認。そこでマイグレーションとDBを使ったAPIテストを実行した。
- `docker compose run --rm --no-deps frontend npm run build`：ビルド、TypeScript検査、ページ生成成功。
- Docker内のNodeでjs-yaml 3.15.2 / 4.3.2の両方に空マッピングの反復mergeを入力し、`maxTotalMergeKeys: 10` で例外となることを確認。
- sharpのPNG→WebP変換・縮小成功。sharp 0.35.4 / libheif 1.23.2、esbuild / unrs-resolver / pgのロードを確認。
- ローカル本番ビルドのHTTP確認：ホーム200、プライバシーポリシー200、`/_next/image` でPNG画像の最適化200、NFT APIの不正アドレス400・空アドレス200。未認証の保護ページ/APIは変更前の本番と同じ404。
- ブラウザ確認：デスクトップ1200px・モバイル390pxでホームの見出しと画像表示、横方向のはみ出しなし、コンソールエラー0件を確認。

本番DBのスキーマ変更・マイグレーションは不要。

## 反映手順

既存の運用どおり、修正ブランチをpushしてVercel Previewの成功を確認後、同じコミットを `main` に反映してProductionを確認する。独立したstagingブランチはない。PreviewはVercel認証で保護されており、ログインなしでの画面検証はできない。Productionでは公開URLのHTTP・ブラウザ確認とDependabotの再評価を実施する。アラートの手動dismissは行わない。
