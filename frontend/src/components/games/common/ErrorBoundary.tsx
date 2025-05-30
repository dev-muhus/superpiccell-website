'use client';

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-[70vh] p-6 bg-black bg-opacity-80 text-white rounded-lg">
      <div className="mb-4 text-red-500 text-xl">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
        </svg>
      </div>
      <h2 className="text-2xl font-bold mb-4">3Dゲーム環境の読み込みに問題が発生しました</h2>
      <div className="mb-6 text-red-300 p-4 bg-red-900 bg-opacity-50 rounded overflow-auto max-w-full">
        <p>{error.message}</p>
      </div>
      <p className="mb-6 text-gray-300">
        ブラウザの互換性または一時的な問題により、ゲームの読み込みに失敗しました。
        再試行するか、別のブラウザで開いてみてください。
      </p>
      <div className="flex gap-4">
        <Button 
          onClick={resetErrorBoundary}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          再試行する
        </Button>
        <Button 
          onClick={() => window.location.href = '/games'}
          className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
        >
          ゲーム選択に戻る
        </Button>
      </div>
    </div>
  );
}

export function GameErrorBoundary({ children }: { children: React.ReactNode }) {
  const handleError = (error: Error) => {
    console.error('ゲームでエラーが発生しました:', error);
  };

  return (
    <ReactErrorBoundary 
      FallbackComponent={ErrorFallback}
      onError={handleError}
    >
      {children}
    </ReactErrorBoundary>
  );
} 