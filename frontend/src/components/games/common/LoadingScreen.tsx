import React, { useState, useEffect } from 'react';
import { FaGamepad, FaSync } from 'react-icons/fa';

interface LoadingScreenProps {
  progress: number;
  message?: string;
  errorMessage?: string;
  onRetry?: () => void;
  assetName?: string;
  isCancellable?: boolean;
  onCancel?: () => void;
}

export function LoadingScreen({
  progress,
  message = 'ゲームをロード中...',
  errorMessage = '',
  onRetry,
  assetName = '',
  isCancellable = false,
  onCancel
}: LoadingScreenProps) {
  const [showTip, setShowTip] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  
  const tips = [
    'WASDキーまたは矢印キーで移動できます。',
    'スペースキーでジャンプします。',
    'マウスで視点を変更できます。',
    'アイテムを集めてスコアを稼ぎましょう！',
    'タイムアップまでに多くのポイントを獲得しましょう。'
  ];
  
  // 長時間ロード時にのみヒントを表示
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTip(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // ヒントのローテーション
  useEffect(() => {
    if (!showTip) return;
    
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [showTip, tips.length]);
  
  // エラー状態かどうか
  const hasError = !!errorMessage;
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-50">
      <div className="max-w-md w-full mx-4 px-6 py-8 bg-gray-900 rounded-lg shadow-xl">
        {/* ロゴとタイトル */}
        <div className="flex items-center justify-center mb-6">
          <FaGamepad className="text-blue-500 text-4xl mr-3" />
          <h2 className="text-2xl font-bold text-white">Nag-Won</h2>
        </div>
        
        {/* メインメッセージ */}
        <h3 className="text-lg font-bold text-white text-center mb-4">
          {hasError ? 'ロード中にエラーが発生しました' : message}
        </h3>
        
        {/* アセット名の表示 */}
        {assetName && !hasError && (
          <p className="text-sm text-gray-400 text-center mb-2">
            ロード中: {assetName}
          </p>
        )}
        
        {/* エラーメッセージ */}
        {hasError && (
          <div className="bg-red-900/30 border border-red-800 rounded-md p-3 mb-4">
            <p className="text-red-300 text-sm">{errorMessage}</p>
          </div>
        )}
        
        {/* プログレスバー */}
        <div className="relative w-full h-6 bg-gray-800 rounded-full mb-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 rounded-full ${
              hasError ? 'bg-red-600' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
          >
            {/* プログレスバーのアニメーションライン */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="h-full w-1/2 bg-white/20 transform -skew-x-12 animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* パーセント表示 */}
        <div className="flex justify-between text-sm text-gray-300 mb-6">
          <span>ロード中...</span>
          <span>{Math.round(progress)}%</span>
        </div>
        
        {/* 操作ボタン */}
        {hasError && onRetry && (
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center"
            onClick={onRetry}
          >
            <FaSync className="mr-2" />
            再試行
          </button>
        )}
        
        {isCancellable && onCancel && (
          <button 
            className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
            onClick={onCancel}
          >
            キャンセル
          </button>
        )}
        
        {/* ヒント表示 */}
        {showTip && !hasError && (
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">ヒント</p>
            <p className="text-gray-300 text-sm">{tips[currentTip]}</p>
          </div>
        )}
      </div>
      
      {/* アクセシビリティ対応: 読み上げ用ステータス */}
      <div className="sr-only" role="status" aria-live="polite">
        {hasError 
          ? `エラーが発生しました: ${errorMessage}` 
          : `ゲームのロード中です。現在${Math.round(progress)}%完了しています。`
        }
      </div>
    </div>
  );
} 