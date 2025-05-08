import React from 'react';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';

export const metadata = {
  title: `Privacy Policy | ${process.env.NEXT_PUBLIC_SITE_TITLE || 'Super Piccell'}`,
  description: `${process.env.NEXT_PUBLIC_SITE_NAME || 'Super Piccell'}のプライバシーポリシーです。本サイトでの個人情報の取り扱いやCookieの利用について説明しています。`,
};

export default function PrivacyPolicyPage() {
  return (
    <PageLayout>
      <ContentLayout
        title="Privacy Policy"
        subtitle="個人情報の取り扱いについて"
        backUrl="/"
        backText="ホームに戻る"
        contentClass="p-4 max-w-4xl mx-auto"
      >
        <div className="prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">プライバシーポリシー</h2>
            <p>
              ウェブサイト（{process.env.NEXT_PUBLIC_SITE_URL || 'https://superpiccell.com'}）（以下「本サイト」）における個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">1. 収集する情報</h2>
            <p>本サイトを通じて以下の情報を収集する場合があります。</p>
            <ul className="list-disc pl-6 my-4">
              <li>お名前、メールアドレス等の個人情報</li>
              <li>IPアドレス、ブラウザの種類、デバイス情報等の技術的情報</li>
              <li>本サイトでの行動履歴、閲覧ページ、クリック情報等の利用状況</li>
              <li>クッキー（Cookie）およびローカルストレージに保存された情報</li>
            </ul>
          </section>

          <section className="mb-8" id="cookie-policy">
            <h2 className="text-xl font-bold mb-4">2. クッキー（Cookie）について</h2>
            <p>
              本サイトは、ユーザーの利便性向上やサイト改善のため、Cookieおよび類似技術を使用しています。
              Cookie（クッキー）とは、ウェブサイトがユーザーのブラウザに送信する小さなテキストファイルで、
              ユーザーのコンピュータに保存され、後でウェブサーバーがそれを取得することができるものです。
            </p>
            
            <h3 className="text-lg font-semibold mt-6 mb-2">2.1 Cookieの種類と目的</h3>
            <p>本サイトでは、以下の種類のCookieを使用しています：</p>
            
            <div className="mt-4 mb-6">
              <h4 className="font-semibold mb-2">①必須Cookie</h4>
              <p className="mb-2">
                サイトの基本的な機能を有効にするために必要なもので、常に有効になっています。これには、ログイン状態の維持やセキュリティ機能の提供が含まれます。
              </p>
              <ul className="list-disc pl-6 my-2">
                <li>保存期間：セッション中〜最大365日</li>
                <li>提供元：本サイト</li>
                <li>利用目的：サイト機能の維持</li>
              </ul>
            </div>
            
            <div className="mb-6">
              <h4 className="font-semibold mb-2">②機能Cookie</h4>
              <p className="mb-2">
                サイトの機能強化やユーザー体験の向上に使用されます。これらのCookieが無効になっていると、一部の機能が動作しない場合があります。
              </p>
              <ul className="list-disc pl-6 my-2">
                <li>保存期間：セッション中〜最大365日</li>
                <li>提供元：本サイト</li>
                <li>利用目的：ユーザー設定の保存、UIカスタマイズ</li>
              </ul>
            </div>
            
            <div className="mb-6">
              <h4 className="font-semibold mb-2">③分析Cookie</h4>
              <p className="mb-2">
                ユーザーのサイト利用状況を分析し、サービス改善に役立てるために使用されます。匿名の統計データを収集し、サイトの最適化に活用します。
              </p>
              <ul className="list-disc pl-6 my-2">
                <li>保存期間：最大2年</li>
                <li>提供元：Google Analytics（Google LLC）</li>
                <li>利用目的：アクセス解析、サイト改善</li>
                <li>データ送信先：米国</li>
              </ul>
            </div>
            
            <div className="mb-6">
              <h4 className="font-semibold mb-2">④マーケティングCookie</h4>
              <p className="mb-2">
                広告の効果測定や最適化、ターゲティング広告の配信などのために使用されます。ユーザーの興味関心に基づいた広告を表示するために使われることがあります。
              </p>
              <ul className="list-disc pl-6 my-2">
                <li>保存期間：最大2年</li>
                <li>提供元：Google Ads、Facebook Pixel等</li>
                <li>利用目的：広告配信、マーケティング分析</li>
                <li>データ送信先：米国</li>
              </ul>
            </div>
            
            <h3 className="text-lg font-semibold mt-6 mb-2">2.2 Cookieの管理方法</h3>
            <p>
              ユーザーは、本サイト右下に表示される「Cookie設定」から、必須Cookie以外のCookieの使用を許可するかどうかを選択できます。
              また、ほとんどのウェブブラウザでは、設定からCookieを管理することが可能です。ブラウザの設定でCookieを無効にすると、
              本サイトの一部機能が正常に動作しなくなる可能性があります。
            </p>
            
            <p className="mt-3">
              各ブラウザでのCookie設定方法については、以下のリンクを参照してください：
            </p>
            <ul className="list-disc pl-6 my-2">
              <li><a href="https://support.google.com/chrome/answer/95647" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/ja/kb/disable-third-party-cookies" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/ja-jp/guide/safari/sfri11471/mac" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Safari</a></li>
              <li><a href="https://support.microsoft.com/ja-jp/microsoft-edge/microsoft-edge-での-cookie-の削除-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">3. 情報の利用目的</h2>
            <p>収集した情報は、以下の目的で利用します：</p>
            <ul className="list-disc pl-6 my-4">
              <li>本サイトのサービス提供および運用</li>
              <li>ユーザーからのお問い合わせへの対応</li>
              <li>サービスの改善および新機能の開発</li>
              <li>利用状況の分析およびマーケティング活動</li>
              <li>不正アクセスの検知および防止</li>
              <li>法令に基づく場合やユーザーの同意を得た場合の情報提供</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">4. 個人情報の第三者提供</h2>
            <p>
              以下の場合を除き、収集した個人情報を第三者に提供または開示することはありません。
            </p>
            <ul className="list-disc pl-6 my-4">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
              <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
              <li>業務委託先に対して、業務の遂行に必要な範囲内で個人情報を開示する場合（この場合、本サイトは委託先に対して適切な管理を要求します）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">5. 安全管理措置</h2>
            <p>
              収集した個人情報の漏洩、滅失または毀損を防止するため、適切なセキュリティ対策を実施しています。
              ただし、インターネット上での完全なセキュリティを保証することはできません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">6. ユーザーの権利</h2>
            <p>
              ユーザーは、本サイトが保有する自身の個人情報について、開示、訂正、削除、利用停止を求めることができます。
              これらの権利を行使する場合は、下記のお問い合わせ先までご連絡ください。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">7. プライバシーポリシーの変更</h2>
            <p>
              法令変更や事業内容の変更等に応じて、本プライバシーポリシーを変更することがあります。
              変更した場合は、本サイト上で通知します。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">8. お問い合わせ先</h2>
            <p>
              本プライバシーポリシーに関するお問い合わせは、以下までお願いいたします。
            </p>
            <div className="mt-4">
              {/* <p>株式会社〇〇</p>
              <p>住所：〒000-0000 東京都〇〇区〇〇町1-1-1</p> */}
              <p>メール：privacy@example.com</p>
            </div>
          </section>

          <div className="text-right mt-10 text-sm text-gray-600">
            制定日：2025年5月8日<br />
            最終更新日：2025年5月8日
          </div>
        </div>
      </ContentLayout>
    </PageLayout>
  );
} 