'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getGameConfig } from '@/lib/games/config';
import NagWonGame from '@/components/games/nag-won/NagWonGame';
import Loading from '@/components/Loading';

export default function GamePage({ params }: { params: { gameId: string } }) {
  const [loading, setLoading] = useState(true);
  const gameConfig = getGameConfig(params.gameId);
  
  useEffect(() => {
    // ゲーム固有の初期化
    setLoading(false);
  }, [params.gameId]);
  
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
  
  // ゲームIDに応じて異なるゲームコンポーネントをレンダリング
  switch (params.gameId) {
    case 'nag-won':
      if ('isComingSoon' in gameConfig) return null;
      return <NagWonGame config={gameConfig} />;
    default:
      return (
        <div className="container mx-auto px-4 py-8 h-screen bg-black text-white flex items-center justify-center">
          <div className="bg-gray-900 rounded-lg p-8 text-center max-w-md">
            <h1 className="text-2xl font-bold mb-4">実装中のゲームです</h1>
            <p>このゲームは現在開発中です。お楽しみに！</p>
          </div>
        </div>
      );
  }
} 