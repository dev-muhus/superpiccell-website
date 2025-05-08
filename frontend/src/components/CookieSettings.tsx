'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { CookieConsents } from './CookieConsent';

interface CookieSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  consents: CookieConsents;
  onSave: (consents: CookieConsents) => void;
  privacyPolicyUrl: string;
}

const CookieSettings: React.FC<CookieSettingsProps> = ({
  isOpen,
  onClose,
  consents,
  onSave,
  privacyPolicyUrl
}) => {
  // ローカルの同意状態を管理
  const [localConsents, setLocalConsents] = useState<CookieConsents>({...consents});

  // 同意状態の更新
  const handleToggle = (key: keyof CookieConsents) => {
    // 必須Cookieは常にtrueなので変更不可
    if (key === 'necessary') return;
    
    setLocalConsents(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // すべて許可
  const acceptAll = () => {
    const allConsents: CookieConsents = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setLocalConsents(allConsents);
  };

  // すべて拒否（必須以外）
  const rejectAll = () => {
    const necessaryOnly: CookieConsents = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setLocalConsents(necessaryOnly);
  };

  // 設定を保存
  const saveSettings = () => {
    onSave(localConsents);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose} // 背景クリックで閉じる
      role="dialog"
      aria-labelledby="cookie-settings-title"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()} // イベントバブリングを防止
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
          <h2 id="cookie-settings-title" className="text-xl font-semibold">
            Cookie設定
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-6">
            当サイトでは、さまざまな目的でCookieを使用しています。
            あなたのプライバシー設定を管理するため、以下のカテゴリからCookieの使用を選択できます。
          </p>

          <div className="space-y-6">
            {/* 必須Cookie */}
            <div className="p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">必須Cookie</h3>
                <Switch 
                  checked={localConsents.necessary} 
                  disabled={true}
                  aria-label="必須Cookie（変更不可）"
                />
              </div>
              <p className="text-sm text-gray-600">
                必須Cookieはウェブサイトの基本的な機能に必要なもので、無効にすることはできません。
                これらはログインセッションの維持、セキュリティ、サイト設定の記憶などに使用されます。
              </p>
            </div>

            {/* 機能Cookie */}
            <div className="p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">機能Cookie</h3>
                <Switch 
                  checked={localConsents.functional} 
                  onCheckedChange={() => handleToggle('functional')}
                  aria-label="機能Cookie"
                />
              </div>
              <p className="text-sm text-gray-600">
                機能Cookieはより良いユーザー体験を提供するために使用されます。
                ユーザー設定の記憶、お気に入りコンテンツのパーソナライズなどに使用されます。
              </p>
            </div>

            {/* 分析Cookie */}
            <div className="p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">分析Cookie</h3>
                <Switch 
                  checked={localConsents.analytics} 
                  onCheckedChange={() => handleToggle('analytics')}
                  aria-label="分析Cookie"
                />
              </div>
              <p className="text-sm text-gray-600">
                分析Cookieは匿名のデータを収集し、サイトの利用状況を分析するために使用されます。
                これによりサイトのパフォーマンスを向上させ、ユーザー体験を改善することができます。
              </p>
            </div>

            {/* マーケティングCookie */}
            <div className="p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">マーケティングCookie</h3>
                <Switch 
                  checked={localConsents.marketing} 
                  onCheckedChange={() => handleToggle('marketing')}
                  aria-label="マーケティングCookie"
                />
              </div>
              <p className="text-sm text-gray-600">
                マーケティングCookieは広告配信や行動ターゲティングに使用されます。
                これにより、あなたの興味に関連する広告が表示される可能性があります。
              </p>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500 flex items-start">
            <Info size={14} className="mr-1 mt-0.5 flex-shrink-0" />
            <div>
              詳細については
              <a 
                href={privacyPolicyUrl} 
                className="underline hover:text-gray-700 ml-1"
                target="_blank" 
                rel="noopener noreferrer"
              >
                プライバシーポリシー
              </a>
              をご確認ください。
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex flex-wrap gap-2 justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={rejectAll}
          >
            すべて拒否
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={acceptAll}
          >
            すべて許可
          </Button>
          <Button 
            className="bg-primary text-white hover:bg-primary/90"
            size="sm"
            onClick={saveSettings}
          >
            設定を保存
          </Button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CookieSettings; 