export interface BaseGameConfig {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  isNew?: boolean;
  isComingSoon?: boolean;
}

export interface AvailableGameConfig extends BaseGameConfig {
  settings: {
    gameTime: number;
    pointsPerItem: number;
    useProceduralGeneration?: boolean;
    difficulty?: 'easy' | 'normal' | 'hard';
  };
}

export interface ComingSoonGameConfig extends BaseGameConfig {
  isComingSoon: true;
}

export type GameConfig = AvailableGameConfig | ComingSoonGameConfig;

export const GAMES_CONFIG: Record<string, GameConfig> = {
  'nag-won': {
    id: 'nag-won',
    title: 'Nag-Won',
    description: '各種ステージを探索するメタバースゲーム',
    thumbnail: '/image/games/nag-won.webp',
    isNew: true,
    settings: {
      gameTime: 60, // 秒
      pointsPerItem: 10,
      useProceduralGeneration: true,
      difficulty: 'normal'
    }
  },
  'future-game': {
    id: 'future-game',
    title: '次回追加予定',
    description: '準備中...',
    thumbnail: '/image/games/coming-soon.webp',
    isComingSoon: true
  }
  // 将来的に追加するゲーム
};

export type GameId = keyof typeof GAMES_CONFIG;

export function getGameConfig(gameId: string): GameConfig | undefined {
  return GAMES_CONFIG[gameId];
}

export function getAllGames(): GameConfig[] {
  return Object.values(GAMES_CONFIG);
}

export function getAvailableGames(): GameConfig[] {
  return Object.values(GAMES_CONFIG).filter(game => !game.isComingSoon);
} 