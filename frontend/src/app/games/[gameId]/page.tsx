'use client';

import { useEffect, useState, use } from 'react';
import { notFound } from 'next/navigation';
import { getGameConfig } from '@/lib/games/config';
import NagWonGame from '@/components/games/nag-won/NagWonGame';
import Loading from '@/components/Loading';

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const [loading, setLoading] = useState(true);
  const gameConfig = getGameConfig(gameId);
  
  useEffect(() => {
    // ゲーム固有の初期化
    setLoading(false);
  }, [gameConfig]);
  
  if (!gameConfig) {
    // ゲームが見つからない場合は404
    notFound();
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <Loading message="ゲームを準備中..." />
      </div>
    );
  }
  
  // ゲームIDに応じて異なるゲームコンポーネントを表示
  switch (gameId) {
    case 'nag-won':
      if ('isComingSoon' in gameConfig && gameConfig.isComingSoon) return null;
      return <NagWonGame config={gameConfig} />;
    default:
      return (
        <div className="flex justify-center items-center h-screen bg-black text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">ゲームが見つかりません</h2>
            <p>指定されたゲームID: {gameId}</p>
          </div>
        </div>
      );
  }
}
