'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { X, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CookieSettings from '@/components/CookieSettings';

// クッキー同意状態の型定義
export interface CookieConsents {
  necessary: boolean; // 必須クッキー（常にtrue）
  functional: boolean; // 機能性クッキー
  analytics: boolean; // 分析用クッキー
  marketing: boolean; // マーケティング用クッキー
}

// プロパティの型定義
interface CookieConsentProps {
  privacyPolicyUrl: string;
}

// クッキー設定の保存キー
const COOKIE_CONSENT_KEY = 'cookie-consent';
// クッキーの有効期限（日数）
const COOKIE_EXPIRY_DAYS = 365;

const CookieConsent: React.FC<CookieConsentProps> = ({ 
  privacyPolicyUrl = '/privacy-policy' 
}) => {
  // クッキー同意バナーの表示状態
  const [showBanner, setShowBanner] = useState<boolean>(false);
  // 詳細設定モーダルの表示状態
  const [showSettings, setShowSettings] = useState<boolean>(false);
  // クッキー同意状態
  const [consents, setConsents] = useState<CookieConsents>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  // 初期化時にクッキー同意状態をチェック
  useEffect(() => {
    const storedConsent = Cookies.get(COOKIE_CONSENT_KEY);
    if (!storedConsent) {
      // 同意がまだ保存されていない場合はバナーを表示
      setShowBanner(true);
    } else {
      try {
        // 保存されている同意状態を復元
        const parsedConsent = JSON.parse(storedConsent);
        setConsents(parsedConsent);
      } catch (error) {
        console.error('Failed to parse cookie consent:', error);
        setShowBanner(true);
      }
    }
  }, []);

  // すべて許可する
  const acceptAll = () => {
    const allConsents: CookieConsents = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    saveConsents(allConsents);
  };

  // 必須のみ許可する
  const acceptNecessaryOnly = () => {
    const necessaryConsents: CookieConsents = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    saveConsents(necessaryConsents);
  };

  // 同意状態を保存する
  const saveConsents = (newConsents: CookieConsents) => {
    setConsents(newConsents);
    Cookies.set(COOKIE_CONSENT_KEY, JSON.stringify(newConsents), { 
      expires: COOKIE_EXPIRY_DAYS,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
    setShowBanner(false);
    setShowSettings(false);
  };

  // バナーを閉じる（拒否として扱う）
  const closeBanner = () => {
    acceptNecessaryOnly();
  };

  // 設定モーダルを開く
  const openSettings = () => {
    setShowSettings(true);
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {/* メインのクッキー同意バナー */}
      {showBanner && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-white shadow-lg border-t border-gray-200 p-4 md:p-6 animate-fade-in-up"
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-description"
        >
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="flex-1">
                <h2 id="cookie-consent-title" className="text-lg font-semibold mb-2">
                  Cookieの使用について
                </h2>
                <p id="cookie-consent-description" className="text-sm text-gray-600 mb-2">
                  当サイトではお客様の体験を向上させ、コンテンツやサービスをカスタマイズするためにCookieを使用しています。
                  ブラウジングを続けることで、Cookieの使用に同意いただいたものとみなされます。
                </p>
                <div className="text-xs text-gray-500 flex items-center">
                  <Info size={14} className="mr-1" />
                  <a 
                    href={privacyPolicyUrl} 
                    className="underline hover:text-gray-700"
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    プライバシーポリシーを読む
                  </a>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3 md:mt-0 md:flex-col md:justify-center">
                <Button 
                  onClick={acceptAll}
                  className="flex-1 bg-primary text-white hover:bg-primary/90"
                  size="sm"
                >
                  すべて許可
                </Button>
                <Button 
                  onClick={acceptNecessaryOnly}
                  variant="outline" 
                  className="flex-1"
                  size="sm"
                >
                  必要なものだけ
                </Button>
                <Button 
                  onClick={openSettings}
                  variant="ghost" 
                  className="flex-1 flex items-center justify-center"
                  size="sm"
                >
                  <Settings size={16} className="mr-1" />
                  <span>詳細設定</span>
                </Button>
              </div>
              
              <button 
                onClick={closeBanner}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="閉じる"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 詳細設定モーダル */}
      {showSettings && (
        <CookieSettings 
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          consents={consents}
          onSave={saveConsents}
          privacyPolicyUrl={privacyPolicyUrl}
        />
      )}

      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default CookieConsent; 