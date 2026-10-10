# Dependabot 対応（2026-10-10）

対象は `frontend/package-lock.json` の未解決アラート10件。GitHub APIと各パッケージの公式アドバイザリで修正版を確認した。

| アラート | パッケージ | ロックファイルの更新 | 修正版の下限 |
| --- | --- | --- | --- |
| [#182](https://github.com/dev-muhus/superpiccell-website/security/dependabot/182) | next | 16.3.5 → 16.3.8 | 16.3.6 |
| [#172](https://github.com/dev-muhus/superpiccell-website/security/dependabot/172)、[#174](https://github.com/dev-muhus/superpiccell-website/security/dependabot/174)、[#175](https://github.com/dev-muhus/superpiccell-website/security/dependabot/175)、[#176](https://github.com/dev-muhus/superpiccell-website/security/dependabot/176)、[#177](https://github.com/dev-muhus/superpiccell-website/security/dependabot/177)、[#178](https://github.com/dev-muhus/superpiccell-website/security/dependabot/178)、[#179](https://github.com/dev-muhus/superpiccell-website/security/dependabot/179)、[#180](https://github.com/dev-muhus/superpiccell-website/security/dependabot/180)、[#181](https://github.com/dev-muhus/superpiccell-website/security/dependabot/181) | axios | 1.18.1 → 1.20.0 | 1.20.0 |

`next` と `eslint-config-next` の指定は `^16.3.8` に揃えた。16.3.8は#182の修正（16.3.6）に加えて、画像最適化のSSRF（High）などアラート未登録のアドバイザリ7件も修正しているため、16.3系の最新パッチを採用した。16.4系への更新は行っていない。`axios` の指定は `^1.20.0` に上げた。

影響範囲：

- #182はNode.js版 `next/og` の `ImageResponse` に、攻撃者が制御できる値をSVGとして渡す場合に限られる。リポジトリ内に `next/og`・`ImageResponse`・`opengraph-image` 等の利用はなく、実害はない。
- axiosはアプリのコードから直接使っておらず、`contentful` SDK経由でのみ読み込まれる。Contentfulの呼び出しは `'use client'` の `Gallery`・`Character` だけで、接続先は固定、プロキシ・HTTP/2・FormDataは使っていない。実害は低いと判断したが、すべて修正版へ更新した。axios 1.20.0の破壊的変更はHTTPステータス名の別名追加のみで、後方互換。

公式情報：

- [Next.js next/og ImageResponseのRCE](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j)
- [Next.js 16.3.8のリリースノート](https://github.com/vercel/next.js/releases/tag/v16.3.8)
- [axios 1.20.0のリリースノート](https://github.com/axios/axios/releases/tag/v1.20.0)

## npm auditのみで検出された脆弱性

Dependabotにはアラートがないが、npm auditで検出されたもの。既存の `overrides` の下限を引き上げ、または追加した。いずれも非メジャーの更新。

| パッケージ | アドバイザリ | 重大度 | ロックファイルの更新 | 導入元 |
| --- | --- | --- | --- | --- |
| handlebars | [GHSA-8r5x-fm3f-whwj](https://github.com/advisories/GHSA-8r5x-fm3f-whwj)、[GHSA-p8wg-vrv2-v86f](https://github.com/advisories/GHSA-p8wg-vrv2-v86f)、[GHSA-xw65-4hp5-5hc7](https://github.com/advisories/GHSA-xw65-4hp5-5hc7) | Critical | 4.7.9 → 4.7.10 | ts-jest（開発のみ） |
| sharp | [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) | High | 0.35.4 → 0.35.5 | next |
| source-map-js | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | High | 1.2.1 → 1.2.2 | postcss |
| brace-expansion | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7)、[GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr)、[GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p)（[#173](https://github.com/dev-muhus/superpiccell-website/security/dependabot/173)、自動dismiss済み） | High | 5.0.9 → 5.0.12 | eslint（開発のみ） |
| fast-copy | [GHSA-jggr-w7fw-pc2j](https://github.com/advisories/GHSA-jggr-w7fw-pc2j) | Moderate | 3.0.2 → 3.1.0 | contentful |

sharp 0.35.5に同梱されるlibrsvgが2.63.2になったことを実行時に確認した。

## 保留（リスク受容）

修正版がない、またはメジャー更新が必要なため、以下の3件は更新していない。npm auditに残る41件は、すべてこの3件から連鎖したもの。

| パッケージ | アドバイザリ | 重大度 | 更新しない理由 | 導入元 |
| --- | --- | --- | --- | --- |
| braces 3.0.3 | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | High | 修正版なし（影響範囲は3.0.3以下、最新が3.0.3） | tailwindcss 3、jest、eslint-config-next |
| postcss-selector-parser 6.1.4 | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | Moderate | 修正は7.1.6のみ。tailwindcss 3は6系が必要 | tailwindcss 3 |
| sprintf-js 1.0.3 | [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | Moderate | 修正版なし（影響範囲は1.1.3以下、最新が1.1.3） | jest（babel-plugin-istanbul → js-yaml 3 → argparse） |

3件とも開発・ビルド時のみの依存で、`npm audit --omit=dev` は0件。脆弱な処理の入力は、グロブパターン・自前のCSS・テスト設定ファイルで、書けるのは開発者のみ。外部からの入力が届く経路はない。

再確認期限は2026-11-10。それまでにbraces・sprintf-jsの修正版公開を確認し、出ていなければtailwindcss 4・jest 30への移行を別途検討する。

## 検証

npm操作はすべてDocker Compose経由（Node 24.19.0 / npm 11.17.0）で実施した。

- `docker compose run --rm --no-deps frontend npm ci --legacy-peer-deps`：成功。
- `docker compose run --rm --no-deps frontend npm audit --omit=dev`：0件（変更前は5件：Critical 1、High 3、Moderate 1）。
- `docker compose run --rm --no-deps frontend npm audit --json`：41件（Critical 0、High 34、Moderate 7）。すべて「保留」の3件に由来する（変更前は48件：Critical 2、High 38、Moderate 8）。
- `docker compose run --rm --no-deps frontend npm run lint`：0 errors、266 warnings。前回と同数。
- `docker compose run --rm frontend npm run test:api -- --modulePathIgnorePatterns '<rootDir>/.next/'`：21 suites / 319 tests成功、skipなし。接続先が専用Dockerサービス `test-db` であることを事前に確認した。
- `docker compose run --rm --no-deps frontend npm run build`：Next.js 16.3.8でビルド、TypeScript検査、ページ生成に成功。
- sharp 0.35.5（libvips 8.18.7 / librsvg 2.63.2）でPNG→WebP変換・縮小、SVG→PNG変換に成功。esbuild / unrs-resolver / pgのロードも確認。
- axios 1.20.0はトップレベルの1コピーのみ。Docker内のNodeからcontentful SDKでContentful APIのアセット・エントリーを取得できること、不正なトークンでは `AccessTokenInvalid` になることを確認。
- ローカル本番ビルドのHTTP確認：ホーム200、プライバシーポリシー200、`/_next/image` でPNG画像の最適化200、NFT APIの不正アドレス400・正しい形式のアドレス200。未認証の保護ページは前回と同じ404。
- ブラウザでの画面確認は未実施。ギャラリー・キャラクターのContentful画像表示は、PreviewまたはProductionで目視確認する。

本番DBのスキーマ変更・マイグレーションは不要。

## 反映手順

今回は修正ブランチとVercel Previewを経由せず、`main` に直接pushしてProductionへ反映する。Productionでは公開URLのHTTP・ブラウザ確認とDependabotの再評価を行う。アラートの手動dismissは行わない。

「保留」の3件のリスク受容は、2026-11-10を期限として承認済み。
