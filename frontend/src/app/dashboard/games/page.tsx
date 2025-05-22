'use client';

import { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import { GameCard } from '@/components/games/GameCard';
import { getAllGames } from '@/lib/games/config';

export default function GamesHubPage() {
  const [games] = useState(getAllGames());
  
  return (
    <PageLayout>
      <ContentLayout
        title="GAME CENTRE"
        subtitle="Super Piccellのゲームコレクション"
        backUrl="/dashboard"
        backText="ダッシュボードに戻る"
        contentClass="p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map(game => (
            <GameCard 
              key={game.id}
              game={game}
            />
          ))}
        </div>
      </ContentLayout>
    </PageLayout>
  );
} 