# Next.js ルートハンドラで最新データが返らない問題と応急処置

## 事象概要
| 環境 | DB | 挙動 |
|------|----|------|
| **ローカル** (PostgreSQL 17.5 + `pg` TCP ドライバ) | `localhost` | `POST /follow` → 直後の `GET /profile/:username` で最新のフォロー情報が取得できる |
| **Neon** (PostgreSQL 17.4 + **HTTP ドライバ** `@neondatabase/serverless`) | `neon.tech` | `POST /follow` の INSERT は成功するが、同じブラウザセッションでページをリロードしても **古いフォロー数** が返る |

- **対象 API ルート例**
  - `/api/users/[id]/follow` (POST)
  - `/api/profile/[username]` (GET)
- Drizzle ORM + Neon HTTP ドライバを使用

## 原因
Next.js (App Router) では、**"最初に発行された fetch と同一 URL・同一オプションの後続 fetch をメモ化 (fetch cache) する"** 仕様がある。

- `@neondatabase/serverless` HTTP ドライバは **各 SQL** を `fetch('https://.../sql', { body: 'SELECT ...' })` で送信
- 同じクエリ文字列が繰り返されると Next.js がキャッシュを再利用 → **“直前の INSERT を反映しない結果”** が返ってしまう
- TCP 接続 (`pg` Pool) では fetch を使わないためローカルでは再現しなかった

## 応急処置 (最小変更)
対象の **Route Handler** に以下のエクスポート行を追加して、fetch キャッシュを明示的に無効化する。

```ts:title=src/app/api/profile/[username]/route.ts
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store'; // ← 追加
```

またはハンドラ内の先頭で局所的に無効化:

```ts
import { unstable_noStore as noStore } from 'next/cache';

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  noStore();      // この関数呼び出しでも OK
  // ...
}
```

### 効果
- **Neon** で POST → 直後の GET でも最新状態が取得できる
- ローカル環境には影響なし

## HTTP vs Socket 接続とキャッシュの関係
| ドライバ種別 | 実際の I/O | Next.js fetch キャッシュ対象 |
|--------------|------------|----------------------------|
| **`pg` / Neon Pool (WebSocket/TCP)** | ソケット通信 (LAN/Internet 共通) | **対象外** |
| **`@neondatabase/serverless` HTTP** | `fetch()` 経由の HTTPS | **対象内** |

> **要点:** キャッシュの有無は「Web 経由かローカルか」ではなく、**`fetch()` を使うかどうか** で決まる。

## 恒久対応の検討ポイント
1. **Driver 切り替え**  
   - WebSocket 版 `@neondatabase/serverless` (`Pool`) あるいは `pg` を使用し、単一接続でトランザクションを扱う
2. **キャッシュ戦略の整理**  
   - `fetchCache` か `unstable_noStore` を **書き忘れない** 運用ルールを決める
3. **統合テスト**  
   - POST → GET の整合性チェックを CI に追加

---

> **TL;DR**: Neon HTTP ドライバを使う Next.js Route Handler では、`fetchCache = 'force-no-store'`（または `unstable_noStore()`）を設定しないと、Next.js の fetch キャッシュにより **読取が即時反映されない** ことがあります。
