import React from 'react';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="game-layout w-full h-screen bg-black overflow-hidden">
      {/* ゲーム用レイアウト - ヘッダー・フッターなし */}
      <main className="w-full h-screen bg-black">
        {children}
      </main>
    </div>
  );
} 