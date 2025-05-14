
# Clerk + Google OAuth 本番環境セットアップ手順

> **目的**  
> Next.js + Clerk で Google ログインを本番環境へデプロイする際に必要な最小構成の設定手順をまとめています。  
> 開発環境では動作していたが、本番で `Missing required parameter: client_id` 等が発生する場合のチェックリストとして利用してください。

---

## 1. 用語と前提
| 略称 | 意味 | 例 |
|------|------|----|
| **本番ドメイン** | 実際に公開する URL | `https://superpiccell.com` |
| **Clerk インスタンス** | Clerk 上の「Development」「Production」それぞれの環境 | Production |
| **OAuth クライアント** | Google Cloud Console で発行する *Client ID / Client Secret* | 例: `1234567890-xxxx.apps.googleusercontent.com` |

---

## 2. Clerk ダッシュボードでの Google OAuth 設定

| 手順 | 操作内容 | 補足 |
|------|----------|------|
| 2‑1 | Clerk ダッシュボードで **Production Instance** を開く | **Configure → SSO connections → Google** |
| 2‑2 | **Enable for sign‑up and sign‑in** を **ON** | Google ボタンを Sign‑in 画面に表示 |
| 2‑3 | **Use custom credentials** を **ON** | 本番では必須 |
| 2‑4 | **Authorized Redirect URI** をコピー | 例: `https://clerk.superpiccell.com/v1/oauth_callback/google` |
| 2‑5 | 後で取得する **Client ID / Client Secret** を入力し **Update** | 空のままでは `client_id` 欠落エラー |

> 🔑 **ポイント**: Production インスタンス毎に Google 資格情報を登録する必要があります。Development インスタンスの設定は引き継がれません。

---

## 3. Google Cloud Console での OAuth クライアント設定

| 手順 | 操作内容 |
|------|----------|
| 3‑1 | Google Cloud Console → **API とサービス → 認証情報** |
| 3‑2 | （初回のみ）**OAuth 同意画面**を「外部」で設定し公開ステータスを **本番 (In production)** へ |
| 3‑3 | **認証情報を作成 → OAuth クライアント ID** →  アプリケーションの種類「ウェブアプリ」 |
| 3‑4 | **承認済みの JavaScript 生成元**に本番ドメインを追加 | `https://superpiccell.com` |
| 3‑5 | **承認済みのリダイレクト URI**に *2‑4* の URI を追加 | **完全一致**が必要 |
| 3‑6 | 作成後に表示される **Client ID / Client Secret** をコピー |

> 📝 **補足**  
> - ローカル (`http://localhost:3000`) を残す場合は生成元/リダイレクト URI に両方記載  
> - 1 文字でも相違すると `redirect_uri_mismatch` エラーになります

---

## 4. 動作確認 & 追加設定

1. 本番環境へデプロイし、**環境変数** に次を設定  
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<pk_live_xxx>
   CLERK_SECRET_KEY=<sk_live_xxx>
   ```
2. アプリのログイン画面、または `https://accounts.<your-domain>/sign-in` にアクセス  
3. 「Continue with Google」→ アカウント選択 → リダイレクト後、ダッシュボード表示を確認  
4. エラーが出る場合は以下を再確認  
   - Clerk Production インスタンスに **Google** が **Enabled** か  
   - Google OAuth クライアントの **リダイレクト URI** が正確か  
   - OAuth 同意画面が **本番** になっているか（テストモードは 100 ユーザ制限）

---

## 5. チェックリスト（本番デプロイ前）

- [ ] Clerk **Production Instance** を使用している  
- [ ] Clerk **Publishable / Secret Key** を本番用に差し替え済み  
- [ ] Clerk で **Use custom credentials** を ON にし Client ID / Secret を入力済み  
- [ ] Google Cloud で **承認済みドメイン・リダイレクト URI** を登録済み  
- [ ] OAuth 同意画面の **ステータスが本番**  
- [ ] デプロイ後、Google ログイン成功を確認  

---

## 6. 参考リンク

- Clerk Docs – *Set up Social Connections*  
  https://clerk.com/docs/authentication/social-connections  
- Google Cloud – *OAuth クライアント ID の作成*  
  https://cloud.google.com/docs/authentication/getting-started  
