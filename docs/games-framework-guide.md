# Super Piccell ゲームフレームワーク開発・運用ガイド

## 1. 概要

Super Piccellプラットフォームは、さまざまなゲームコンテンツを統合的に提供するためのフレームワークを備えています。このドキュメントでは、プラットフォームへの新規ゲーム追加、既存ゲームの保守・運用、および全体的なゲーム機能の管理について包括的に説明します。

### 1.1 ゲームフレームワークの目的

- **統一されたユーザー体験**: すべてのゲームで一貫したUIと操作性の提供
- **モジュール型設計**: 個別のゲームを独立したモジュールとして開発可能
- **リソース共有**: 共通コンポーネントとユーティリティの再利用
- **容易な拡張性**: 新規ゲームの追加を簡素化するアーキテクチャ
- **一元管理**: 中央ダッシュボードからのゲーム管理と監視

### 1.2 現在実装されているゲーム

1. **Nag-Won**: 3Dメタバース環境でのアイテム収集ゲーム
2. （将来的に追加予定の他のゲーム）

## 2. アーキテクチャ

### 2.1 ディレクトリ構造

```
frontend/src/components/games/
├── GameCard.tsx           # ゲーム選択カードコンポーネント
├── common/                # すべてのゲームで共有されるコンポーネント
│   ├── UI/                # 共通UI要素
│   ├── hooks/             # 共通フック
│   ├── utils/             # 共通ユーティリティ
│   └── types/             # 共通型定義
├── nag-won/               # Nag-Wonゲーム実装
│   ├── NagWonGame.tsx     # メインゲームコンポーネント
│   ├── GameCanvas.tsx     # 3Dレンダリングコンテナ
│   ├── GameUI.tsx         # ゲームUI
│   └── ...                # その他のゲーム固有のファイル
└── [game-name]/           # 新規ゲーム用テンプレート
    ├── [GameName]Game.tsx # メインゲームコンポーネント
    ├── GameCanvas.tsx     # ゲームレンダリング
    ├── GameUI.tsx         # ゲームUI
    └── ...                # その他のゲーム固有のファイル
```

### 2.2 ゲームコンポーネントの構造

Super Piccellプラットフォームのゲームは、標準化されたコンポーネント構造を採用しています：

1. **メインゲームコンポーネント（[GameName]Game.tsx）**:
   - ゲームのエントリーポイントとして機能
   - ゲーム状態の管理（スコア、タイマーなど）
   - ユーザーインターフェースとゲームキャンバスの統合
   - ルーティングから直接アクセスされる
   - `config`プロパティを受け取りゲーム設定を管理

2. **ゲームキャンバス（GameCanvas.tsx）**:
   - レンダリングロジックを担当
   - 3Dゲームの場合はThree.js/React Three Fiberを使用
   - 2Dゲームの場合はCanvasやPixi.jsなどを使用
   - ゲームの視覚的要素とインタラクションを管理

3. **ゲームUI（GameUI.tsx）**:
   - ヘッドアップディスプレイ（HUD）
   - メニュー画面
   - ゲーム開始/終了画面
   - ユーザーフィードバック表示

新規ゲームを開発する際は、この標準的な構造に従うことで、プラットフォームとの統合が容易になります。

### 2.3 ゲーム統合フレームワーク

すべてのゲームは共通のインターフェースを実装し、メインアプリケーションと以下の方法で統合されます：

1. **エントリーポイント**: 各ゲームは統一されたエントリーポイントを持ちます
2. **ライフサイクル管理**: 開始、一時停止、再開、終了などの標準ライフサイクルイベント
3. **状態保存**: ゲーム状態の保存と復元のメカニズム
4. **設定インターフェース**: 統一された設定メニュー

### 2.4 状態管理

ゲーム状態の管理には以下のアプローチを採用しています：

1. **ゲーム固有の状態**: 各ゲーム内部でZustandを使用
2. **グローバル状態**: ユーザー情報やプラットフォーム設定用の共有ストア
3. **持続的状態**: ローカルストレージまたはデータベースに保存される進捗状況

### 2.5 プラグインシステム

ゲームはプラグインシステムとして実装され、以下の方法でプラットフォームに統合されます：

```typescript
// frontend/src/lib/games/config.ts
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

// ゲーム情報へのアクセス用の便利関数
export function getGameConfig(gameId: string): GameConfig | undefined {
  return GAMES_CONFIG[gameId];
}

export function getAllGames(): GameConfig[] {
  return Object.values(GAMES_CONFIG);
}

export function getAvailableGames(): GameConfig[] {
  return Object.values(GAMES_CONFIG).filter(game => !game.isComingSoon);
}
```

## 3. 新規ゲーム開発ガイド

### 3.1 開発環境のセットアップ

新しいゲームの開発を始めるには、以下の環境が必要です：

1. **基本開発環境**: Docker、Node.js、Next.js環境
2. **ゲーム固有のライブラリ**: 必要に応じて（2Dゲーム用PhaserやPixi.js、3Dゲーム用Three.jsなど）

### 3.2 新規ゲームの作成手順

1. **ゲームディレクトリの作成**:
   ```bash
   mkdir -p frontend/src/components/games/[game-name]
   ```

2. **基本ファイルの作成**:
   - `[GameName]Game.tsx`: メインゲームコンポーネント
   - `GameCanvas.tsx`: ゲームのレンダリング
   - `GameUI.tsx`: UI要素
   - `Utils/stores.ts`: 状態管理
   - `Utils/types.ts`: 型定義

3. **メインゲームコンポーネントの実装**:
   ```tsx
   // frontend/src/components/games/[game-name]/[GameName]Game.tsx
   'use client';
   
   import { useState, useEffect, useCallback } from 'react';
   import { useRouter } from 'next/navigation';
   import GameCanvas from './GameCanvas';
   import GameUI from './GameUI';
   import { AvailableGameConfig } from '@/lib/games/config';
   
   interface GameProps {
     config: AvailableGameConfig;
   }
   
   export default function [GameName]Game({ config }: GameProps) {
     const router = useRouter();
     const [isLoading, setIsLoading] = useState(true);
     const [gameState, setGameState] = useState({
       score: 0,
       timeRemaining: config.settings.gameTime,
       isGameActive: false,
       isGameOver: false,
       error: null as Error | null
     });
     
     // 初期ロード
     useEffect(() => {
       // 画面遷移後、少し待ってからロード完了とする
       const timer = setTimeout(() => {
         setIsLoading(false);
       }, 1500);
       
       return () => clearTimeout(timer);
     }, []);
     
     // ゲーム開始処理
     const handleStartGame = useCallback(() => {
       setGameState({
         score: 0,
         timeRemaining: config.settings.gameTime,
         isGameActive: true,
         isGameOver: false,
         error: null
       });
     }, [config.settings.gameTime]);
     
     // スコア更新処理
     const handleScoreUpdate = useCallback((points: number) => {
       setGameState(prev => ({
         ...prev,
         score: prev.score + points
       }));
     }, []);
     
     // ダッシュボードに戻る
     const handleBackToDashboard = useCallback(() => {
       router.push('/dashboard/games');
     }, [router]);
     
     // 読み込み中の表示
     if (isLoading) {
       return (
         <div className="flex items-center justify-center h-screen bg-black text-white">
           <div className="text-center">
             <h3 className="text-xl font-bold mb-4">ゲーム環境を準備中...</h3>
             <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
           </div>
         </div>
       );
     }
     
     return (
       <div className="relative w-full h-screen bg-black text-white overflow-hidden">
         {/* ゲームUI */}
         <GameUI
           score={gameState.score}
           timeRemaining={gameState.timeRemaining}
           isGameActive={gameState.isGameActive}
           isGameOver={gameState.isGameOver}
           onStart={handleStartGame}
           onBackToDashboard={handleBackToDashboard}
         />
         
         {/* ゲームキャンバス - 全画面表示 */}
         <div className="absolute inset-0 z-0">
           <GameCanvas 
             onScoreUpdate={handleScoreUpdate} 
             isGameActive={gameState.isGameActive}
           />
         </div>
       </div>
     );
   }
   ```

4. **ゲームをGAMES_CONFIGに登録**:
   ```typescript
   // frontend/src/lib/games/config.ts に追加
   export const GAMES_CONFIG: Record<string, GameConfig> = {
     // 既存のゲーム...
     '[game-name]': {
       id: '[game-name]',
       title: '[Game Name]',
       description: 'ゲームの説明',
       thumbnail: '/image/games/[game-name].webp',
       isNew: true,
       settings: {
         gameTime: 60,
         pointsPerItem: 10,
         useProceduralGeneration: true,
         difficulty: 'normal'
       }
     },
   };
   ```

5. **ゲームのルーティングに追加**:
   ```typescript
   // frontend/src/app/dashboard/games/[gameId]/page.tsx のswitch文に追加
   switch (params.gameId) {
     case 'nag-won':
       if ('isComingSoon' in gameConfig) return null;
       return <NagWonGame config={gameConfig} />;
     case '[game-name]':
       if ('isComingSoon' in gameConfig) return null;
       return <[GameName]Game config={gameConfig} />;
     default:
       // ...
   }
   ```

6. **ゲーム選択カードの確認**:
   `GameCard.tsx`コンポーネントはすでに実装されており、自動的に新しく追加したゲームを表示します。特別な修正は必要ありません。

### 3.3 ゲーム選択インターフェース

ゲームセレクションは`GameCard.tsx`コンポーネントを使用して実装されています：

```tsx
// frontend/src/components/games/GameCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { FaPlay, FaLock } from 'react-icons/fa';
import { GameConfig } from '@/lib/games/config';

interface GameCardProps {
  game: GameConfig;
}

export function GameCard({ game }: GameCardProps) {
  const isAvailable = !game.isComingSoon;
  
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg transition-transform hover:shadow-xl">
      {/* サムネイル画像 */}
      <div className="relative">
        <div className="w-full h-48 relative">
          <Image 
            src={game.thumbnail} 
            alt={game.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
        {game.isNew && (
          <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            NEW
          </span>
        )}
      </div>
      
      {/* ゲーム情報とプレイボタン */}
      <div className="p-4">
        <h3 className="text-xl font-bold mb-2">{game.title}</h3>
        <p className="text-gray-600 text-sm mb-4">{game.description}</p>
        
        {isAvailable ? (
          <Link 
            href={`/dashboard/games/${game.id}`}
            className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors flex items-center justify-center"
          >
            <FaPlay className="mr-2" />
            プレイする
          </Link>
        ) : (
          <button
            disabled
            className="w-full text-center bg-gray-400 text-white py-2 px-4 rounded cursor-not-allowed flex items-center justify-center"
          >
            <FaLock className="mr-2" />
            準備中
          </button>
        )}
      </div>
    </div>
  );
}
```

ゲームカードは`getAllGames()`または`getAvailableGames()`関数を使用して取得したゲーム一覧からレンダリングされます。

### 3.4 ベストプラクティス

新しいゲームを開発する際には、以下のベストプラクティスに従ってください：

1. **パフォーマンス最適化**:
   - コンポーネントのメモ化を活用
   - 不要な再レンダリングを防止
   - アセットの適切な管理とプリロード

2. **レスポンシブデザイン**:
   - さまざまな画面サイズへの対応
   - モバイルとデスクトップの両方の入力方法をサポート
   - 適切なフォールバックUIの提供

3. **アクセシビリティ**:
   - キーボードナビゲーションのサポート
   - 色のコントラスト比の考慮
   - スクリーンリーダー対応のARIA属性

4. **モジュール化**:
   - 単一責任の原則に従ったコンポーネント設計
   - 再利用可能なユーティリティと関数
   - ゲームロジックとUIの分離

## 4. 既存ゲームの実装例（Nag-Won）

Nag-Wonはメタバースアイテム収集ゲームであり、フレームワークの実装例として参照できます。詳細は [Nag-Won開発・運用ガイド](./nag-won-guide.md) を参照してください。

### 4.1 重要なアーキテクチャパターン

Nag-Wonの実装から学べる重要なパターン：

1. **モジュール分割**:
   - コントロール、アニメーション、UIなどの論理的なグループへの分割
   - 各モジュールの責任範囲の明確化

2. **状態管理アプローチ**:
   - Zustandを使用した効率的な状態管理
   - ストアの適切な分割（プレイヤー、カメラ、ゲーム設定など）

3. **パフォーマンス最適化技術**:
   - Three.jsのベストプラクティス
   - アセット管理と動的ロード

## 5. ゲーム運用管理

### 5.1 ゲームのライフサイクル管理

プラットフォーム上のゲームは以下のライフサイクルに従って管理されます：

1. **開発**: 初期開発と機能実装
2. **テスト**: QAとユーザーテスト
3. **ベータリリース**: 限定的なユーザーに公開
4. **フルリリース**: すべてのユーザーに公開
5. **メンテナンス**: バグ修正と小さな機能追加
6. **メジャーアップデート**: 大きな機能追加とリニューアル
7. **サポート終了**: アクティブ開発の終了

### 5.2 パフォーマンスモニタリング

各ゲームのパフォーマンスを監視するための指標：

1. **技術的指標**:
   - フレームレート（FPS）
   - メモリ使用量
   - ロード時間
   - エラー発生率

2. **ユーザー体験指標**:
   - プレイ時間
   - セッション数
   - 完了率
   - ユーザーフィードバック

### 5.3 更新と拡張

ゲームの更新と拡張を管理するためのプロセス：

1. **機能追加計画**:
   - 優先順位付けされた機能のバックログ
   - ユーザーフィードバックに基づく改善提案

2. **更新展開**:
   - 段階的なロールアウト
   - A/Bテストによる新機能の検証
   - ユーザー通知メカニズム

3. **ドキュメント更新**:
   - 開発者ドキュメントの更新
   - ユーザーガイドの更新
   - リリースノートの作成

## 6. ゲーム開発のテンプレートとコンポーネント

### 6.1 Nag-Wonゲームのコア構造

Nag-Wonのコア構造を参考に、新しいゲームを開発する際の基本的なファイル構成を示します：

```
frontend/src/components/games/nag-won/
├── NagWonGame.tsx         # メインゲームコンポーネント
├── GameCanvas.tsx         # 3Dレンダリングコンテナ
├── GameUI.tsx             # ゲームUI
├── Player.tsx             # プレイヤー制御とアバター
├── Items.tsx              # アイテム管理
├── Ground.tsx             # 地形管理
├── GameSettings.tsx       # ゲーム設定
├── index.tsx              # エントリーポイント
├── Animation/             # アニメーション関連
├── Controls/              # 制御関連
├── Utils/                 # ユーティリティ
├── World/                 # ワールド関連
└── UI/                    # UI関連コンポーネント
```

### 6.2 標準的なゲームコンポーネントの実装例

以下は、Nag-Wonゲームを参考にした標準的なゲームコンポーネントの実装例です：

```tsx
// frontend/src/components/games/[game-name]/[GameName]Game.tsx
import React, { useState, useEffect, useRef } from 'react';
import { GameConfig } from '@/lib/games/config';
import GameCanvas from './GameCanvas';
import GameUI from './GameUI';

interface GameProps {
  config: GameConfig;
}

const [GameName]Game: React.FC<GameProps> = ({ config }) => {
  // ゲームの状態
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.settings?.gameTime || 60);
  
  // タイマー参照
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // ゲーム開始処理
  const startGame = () => {
    setIsPlaying(true);
    setIsPaused(false);
    setScore(0);
    setTimeLeft(config.settings?.gameTime || 60);
    
    // タイマーの開始
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // ゲーム終了
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // ゲーム一時停止
  const pauseGame = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  // ゲーム再開
  const resumeGame = () => {
    setIsPaused(false);
    // タイマーの再開
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };
  
  // ゲーム終了
  const endGame = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  // スコア更新
  const updateScore = (points: number) => {
    setScore(prev => prev + points);
  };
  
  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  return (
    <div className="game-container relative w-full h-screen overflow-hidden">
      {/* ゲームキャンバス */}
      <GameCanvas 
        isPlaying={isPlaying} 
        isPaused={isPaused}
        onScoreUpdate={updateScore}
      />
      
      {/* ゲームUI */}
      <GameUI 
        isPlaying={isPlaying}
        isPaused={isPaused}
        score={score}
        timeLeft={timeLeft}
        onStart={startGame}
        onPause={pauseGame}
        onResume={resumeGame}
        onEnd={endGame}
      />
    </div>
  );
};

export default [GameName]Game;
```

### 6.3 新規ゲームの実装例

新規ゲーム開発のためのメインコンポーネントの実装例：

```tsx
// frontend/src/components/games/[game-name]/[GameName]Game.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GameCanvas from './GameCanvas';
import GameUI from './GameUI';
import { AvailableGameConfig } from '@/lib/games/config';

interface GameProps {
  config: AvailableGameConfig;
}

export default function [GameName]Game({ config }: GameProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useState({
    score: 0,
    timeRemaining: config.settings.gameTime,
    isGameActive: false,
    isGameOver: false,
    error: null as Error | null
  });
  
  // 初期ロード
  useEffect(() => {
    // 画面遷移後、少し待ってからロード完了とする
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // ゲーム開始処理
  const handleStartGame = useCallback(() => {
    setGameState({
      score: 0,
      timeRemaining: config.settings.gameTime,
      isGameActive: true,
      isGameOver: false,
      error: null
    });
  }, [config.settings.gameTime]);
  
  // スコア更新処理
  const handleScoreUpdate = useCallback((points: number) => {
    setGameState(prev => ({
      ...prev,
      score: prev.score + points
    }));
  }, []);
  
  // ダッシュボードに戻る
  const handleBackToDashboard = useCallback(() => {
    router.push('/dashboard/games');
  }, [router]);
  
  // 読み込み中の表示
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-4">ゲーム環境を準備中...</h3>
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* ゲームUI */}
      <GameUI
        score={gameState.score}
        timeRemaining={gameState.timeRemaining}
        isGameActive={gameState.isGameActive}
        isGameOver={gameState.isGameOver}
        onStart={handleStartGame}
        onBackToDashboard={handleBackToDashboard}
      />
      
      {/* ゲームキャンバス - 全画面表示 */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          onScoreUpdate={handleScoreUpdate} 
          isGameActive={gameState.isGameActive}
        />
      </div>
    </div>
  );
}
```

### 6.4 ゲームUIコンポーネントの実装例

ゲームUIの基本的な実装例：

```tsx
// frontend/src/components/games/[game-name]/GameUI.tsx
import React from 'react';
import { FaPlay, FaPause, FaHome, FaRedo } from 'react-icons/fa';

interface GameUIProps {
  score: number;
  timeRemaining: number;
  isGameActive: boolean;
  isGameOver: boolean;
  onStart: () => void;
  onBackToDashboard: () => void;
}

const GameUI: React.FC<GameUIProps> = ({
  score,
  timeRemaining,
  isGameActive,
  isGameOver,
  onStart,
  onBackToDashboard
}) => {
  // フォーマット関数
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // ゲーム中のHUD表示
  if (isGameActive) {
    return (
      <div className="absolute top-0 left-0 right-0 p-4 z-10">
        <div className="flex justify-between items-center bg-black bg-opacity-50 p-2 rounded">
          <div className="text-white">
            <span className="font-bold">スコア: </span>
            <span>{score}</span>
          </div>
          <div className="text-white">
            <span className="font-bold">残り時間: </span>
            <span>{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // ゲーム開始画面
  if (!isGameOver) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-70">
        <div className="bg-gray-900 p-8 rounded-lg max-w-md text-center">
          <h2 className="text-3xl font-bold mb-4 text-white">ゲームを開始</h2>
          <p className="mb-6 text-gray-300">
            制限時間内にできるだけたくさんのアイテムを集めよう！
          </p>
          <div className="flex flex-col space-y-4">
            <button
              onClick={onStart}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg flex items-center justify-center"
            >
              <FaPlay className="mr-2" />
              ゲーム開始
            </button>
            <button
              onClick={onBackToDashboard}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
            >
              <FaHome className="mr-2" />
              ゲーム選択に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // ゲームオーバー画面
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-70">
      <div className="bg-gray-900 p-8 rounded-lg max-w-md text-center">
        <h2 className="text-3xl font-bold mb-2 text-white">ゲーム終了</h2>
        <p className="text-xl mb-1 text-gray-300">最終スコア</p>
        <p className="text-4xl font-bold mb-6 text-yellow-400">{score}</p>
        <div className="flex flex-col space-y-4">
          <button
            onClick={onStart}
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg flex items-center justify-center"
          >
            <FaRedo className="mr-2" />
            もう一度プレイ
          </button>
          <button
            onClick={onBackToDashboard}
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
          >
            <FaHome className="mr-2" />
            ゲーム選択に戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameUI;
```

これらのテンプレートを基に、新しいゲームを開発する際は、ゲーム固有のロジックとUI要素を実装してください。

## 7. トラブルシューティング

### 7.1 一般的な問題と解決策

#### ゲームパフォーマンスの問題

**症状**: ゲームのフレームレートが低い、遅延が発生する

**解決策**:
1. レンダリングの最適化（不要なコンポーネントの再レンダリングを防止）
2. メモ化テクニックの使用（useMemo、useCallback）
3. 重いコンポーネントの遅延ロード
4. アセットの圧縮と最適化

#### ゲームの統合問題

**症状**: ゲームがメインアプリケーションと正しく統合されない

**解決策**:
1. 標準インターフェースの実装を確認
2. イベントハンドリングの検証
3. ライフサイクルメソッドの適切な実装
4. コンソールエラーの確認と対処

### 7.2 開発環境の問題

**症状**: 開発環境でのエラーや動作の問題

**解決策**:
1. 依存関係の確認とアップデート
2. Node.jsとnpmのバージョン互換性の確認
3. キャッシュのクリア (`npm cache clean --force`)
4. 開発サーバーの再起動

## 8. 今後の展望

Super Piccellゲームフレームワークの将来的な拡張計画：

1. **マルチプレイヤーフレームワーク**:
   - リアルタイム対戦機能の共通基盤
   - マッチメイキングシステム

2. **クロスプラットフォーム拡張**:
   - モバイルアプリ対応
   - デスクトップアプリ対応

3. **AIと機械学習の統合**:
   - ダイナミックな難易度調整
   - プレイヤー行動分析と予測

4. **拡張現実（AR）対応**:
   - ARゲーム開発のためのフレームワーク拡張
   - 位置情報ベースのゲーム機能

## 9. ゲームスコア保存・ランキング機能

### 9.1 概要

Super Piccellプラットフォームには、ゲームスコアの保存とランキング表示機能が実装されています。この機能により、プレイヤーは自分のスコアを記録し、他のプレイヤーと競うことができます。

### 9.2 データベース設計

ゲームスコアは`game_scores`テーブルに保存されます：

```sql
CREATE TABLE "game_scores" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "game_id" text NOT NULL,
  "stage_id" text NOT NULL,
  "score" integer NOT NULL,
  "game_time" integer NOT NULL,
  "items_collected" integer DEFAULT 0,
  "difficulty" text DEFAULT 'normal',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "is_deleted" boolean DEFAULT false NOT NULL
);
```

### 9.3 API仕様

#### スコア保存API

**エンドポイント**: `POST /api/games/scores`

**認証**: 必須（ログインユーザーのみ）

**リクエストボディ**:
```json
{
  "game_id": "nag-won",
  "stage_id": "cyber-city",
  "score": 1500,
  "game_time": 60,
  "items_collected": 15,
  "difficulty": "normal"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "user_id": 1,
    "game_id": "nag-won",
    "stage_id": "cyber-city",
    "score": 1500,
    "game_time": 60,
    "items_collected": 15,
    "difficulty": "normal",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### ランキング取得API

**エンドポイント**: `GET /api/games/scores`

**認証**: 必須（ログインユーザーのみ）

**クエリパラメータ**:
- `game_id` (必須): ゲームID
- `stage_id` (オプション): ステージID（指定しない場合は全ステージ）
- `limit` (オプション): 取得件数（デフォルト: 10）
- `cursor` (オプション): ページネーション用カーソル

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "score": 2000,
      "game_time": 60,
      "items_collected": 20,
      "difficulty": "normal",
      "stage_id": "cyber-city",
      "created_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": 1,
        "username": "player1",
        "profile_image_url": "https://example.com/avatar.jpg",
        "first_name": "Player",
        "last_name": "One",
        "is_current_user": true
      }
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": 122,
    "totalCount": 50
  }
}
```

### 9.4 セキュリティ機能

- **認証必須**: すべてのAPIはログインユーザーのみアクセス可能
- **ユーザー制限**: 他人のスコアを保存することは不可
- **データ整合性**: スコアは新規追加のみ（更新・削除なし）
- **プライバシー保護**: ブロック関係にあるユーザーのスコアは表示されない
- **除外処理**: 削除・BANされたユーザーのスコアは表示されない

### 9.5 UI統合

#### ランキングモーダル

`GameRankingModal`コンポーネントがランキング表示を担当します：

```tsx
<GameRankingModal
  isOpen={showRanking}
  onClose={() => setShowRanking(false)}
  gameId="nag-won"
  stageId={selectedStageId}
/>
```

#### スコア保存モーダル

`ScoreSaveModal`コンポーネントがスコア保存確認を担当します：

```tsx
<ScoreSaveModal
  isOpen={showScoreSaveModal}
  onClose={() => setShowScoreSaveModal(false)}
  onSave={handleSaveScore}
  score={gameState.score}
  gameTime={config.settings.gameTime - gameState.timeRemaining}
  itemsCollected={itemsCollected}
  stageId={selectedStageId}
/>
```

### 9.6 ゲームへの統合方法

新しいゲームでスコア機能を使用するには：

1. **スコア保存処理の実装**:
```tsx
const handleSaveScore = useCallback(async () => {
  try {
    const response = await fetch('/api/games/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        game_id: 'your-game-id',
        stage_id: selectedStageId,
        score: gameState.score,
        game_time: gameTime,
        items_collected: itemsCollected,
        difficulty: 'normal'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'スコアの保存に失敗しました');
    }
  } catch (error) {
    console.error('スコア保存エラー:', error);
    throw error;
  }
}, [gameState.score, gameTime, itemsCollected, selectedStageId]);
```

2. **ランキングボタンの追加**:
```tsx
<button
  onClick={() => setShowRanking(true)}
  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
>
  🏆 ランキング
</button>
```

3. **ゲーム終了時のスコア保存確認**:
```tsx
// ゲーム終了時
if (gameOver && score > 0) {
  setTimeout(() => setShowScoreSaveModal(true), 1000);
}
```

## 10. モバイルUI/UX改善

### 10.1 国際標準準拠のモバイルゲームUI設計

Super Piccellプラットフォームは、国際的なモバイルゲームUI/UXスタンダードに準拠した設計を採用しています：

#### UI配置の国際標準
- **左下**: 移動ジョイスティック（左手親指操作）
- **右下**: アクションボタン（ジャンプ・ダッシュ）
- **左上**: ズームコントロール
- **画面中央**: ピンチズーム対応
- **視点移動**: 画面スワイプ（Pull to Refresh無効化により実現）

この配置は以下の国際標準に基づいています：
- **Google Material Design Guidelines**
- **Apple Human Interface Guidelines**
- **モバイルゲーム業界のベストプラクティス**

#### UI要素の重複回避
- **適切な間隔**: 各UI要素間に十分な間隔を確保（8px以上）
- **サイズ最適化**: タッチターゲットは44dp以上を維持しつつ、重複を防ぐサイズ調整
- **階層配置**: 重要度に応じた配置（移動・カメラ操作を最優先）

### 10.2 Pull to Refresh対策

モバイルデバイスでのPull to Refresh問題を解決するため、以下の包括的な対策を実装しています：

```tsx
<div 
  className="relative w-full h-screen bg-black text-white overflow-hidden"
  style={{
    // Pull to Refresh対策（国際標準）
    overscrollBehavior: 'none',
    touchAction: 'none',
    WebkitOverflowScrolling: 'touch',
    // iOS Safari対策
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    // Android Chrome対策
    overscrollBehaviorY: 'none',
    // 追加のブラウザ対策
    msOverflowStyle: 'none',
    scrollbarWidth: 'none'
  }}
  onTouchStart={(e) => {
    // タッチイベントの伝播を制御（国際標準のアプローチ）
    if (isMobile && gameState.isGameActive) {
      // ゲーム中は全てのタッチイベントを制御
      e.preventDefault();
    }
  }}
  onTouchMove={(e) => {
    // Pull to Refreshを完全に防止
    if (isMobile && gameState.isGameActive) {
      e.preventDefault();
      e.stopPropagation();
    }
  }}
  onTouchEnd={(e) => {
    // タッチ終了時も制御
    if (isMobile && gameState.isGameActive) {
      e.preventDefault();
    }
  }}
>
```

### 10.3 デュアルジョイスティックシステム

モバイルでの操作性向上のため、シンプルな操作システムを実装：

#### 移動ジョイスティック（左下）
- プレイヤーの移動を制御
- 位置: 画面左下（`bottom-8 left-8`）
- サイズ: 80px（最適なタッチ領域）
- 色: 青系統（#3182ce）

#### 視点移動（スワイプ操作）
- Pull to Refreshが無効化されているため、画面スワイプで視点移動が可能
- 自然な操作感を提供
- 追加のUI要素が不要でシンプルな画面構成

```tsx
{/* 移動ジョイスティック（左下） */}
<div className="absolute bottom-8 left-8 z-30">
  <VirtualJoystick 
    size={80}
    baseColor="#4a5568"
    stickColor="#3182ce"
    baseOpacity={0.7}
    stickOpacity={0.9}
    disabled={!gameState.isGameActive}
  />
</div>
```

### 10.4 アクションボタンの最適化

国際標準に準拠したアクションボタン配置：

```tsx
{/* アクションボタン（右下に配置） */}
<div className="absolute bottom-8 right-8 z-30 flex flex-col gap-3">
  {/* ジャンプボタン */}
  <button
    className="w-16 h-16 bg-blue-600 bg-opacity-80 rounded-full flex items-center justify-center touch-manipulation active:bg-blue-700 border-2 border-white border-opacity-40 shadow-lg"
    onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))}
    onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))}
    aria-label="ジャンプ"
  >
    {/* ジャンプアイコン */}
  </button>
  
  {/* ダッシュボタン */}
  <button
    className="w-16 h-16 bg-red-600 bg-opacity-80 rounded-full flex items-center justify-center touch-manipulation active:bg-red-700 border-2 border-white border-opacity-40 shadow-lg"
    onTouchStart={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }))}
    onTouchEnd={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }))}
    aria-label="ダッシュ"
  >
    {/* ダッシュアイコン */}
  </button>
</div>
```

### 10.5 ズーム機能

#### ボタンズーム（左上）
```tsx
{/* ズームコントロール（左上） */}
<div className="absolute left-8 top-20 z-30 flex flex-col gap-2">
  {/* ズームイン */}
  <button
    className="w-12 h-12 bg-gray-700 bg-opacity-80 rounded-full flex items-center justify-center touch-manipulation active:bg-gray-800 border-2 border-white border-opacity-30 shadow-lg"
    onTouchStart={() => handleZoomChange(0.1)}
    aria-label="ズームイン"
  >
    {/* プラスアイコン */}
  </button>
  
  {/* ズームアウト */}
  <button
    className="w-12 h-12 bg-gray-700 bg-opacity-80 rounded-full flex items-center justify-center touch-manipulation active:bg-gray-800 border-2 border-white border-opacity-30 shadow-lg"
    onTouchStart={() => handleZoomChange(-0.1)}
    aria-label="ズームアウト"
  >
    {/* マイナスアイコン */}
  </button>
</div>
```

#### ピンチズーム
```tsx
// ピンチズーム処理
useEffect(() => {
  if (!isMobile) return;

  let initialDistance = 0;
  let isZooming = false;

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      isZooming = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && isZooming) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const deltaDistance = currentDistance - initialDistance;
      const zoomDelta = deltaDistance * 0.001; // 感度調整
      
      if (Math.abs(zoomDelta) > 0.01) {
        handleZoomChange(zoomDelta);
        initialDistance = currentDistance;
      }
    }
  };

  // イベントリスナー登録...
}, [isMobile, handleZoomChange]);
```

### 10.6 操作ヒントシステム

初回プレイ時に5秒間表示される操作ヒント：

```tsx
const ControlHint = () => {
  const [show, setShow] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  
  if (!show) return null;
  
  return (
    <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-black bg-opacity-90 p-3 rounded-lg text-white text-xs max-w-[300px] border border-white border-opacity-20">
      <div className="text-center mb-2 font-bold text-yellow-400">操作ガイド</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-blue-600 mr-2 flex-shrink-0"></span>
          <span>移動（左下）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-green-600 mr-2 flex-shrink-0"></span>
          <span>視点（スワイプ）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-blue-600 mr-2 flex-shrink-0"></span>
          <span>ジャンプ（右下）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-red-600 mr-2 flex-shrink-0"></span>
          <span>ダッシュ（右下）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-gray-600 mr-2 flex-shrink-0"></span>
          <span>ズーム（左上）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-gray-800 mr-2 flex-shrink-0"></span>
          <span>ピンチズーム</span>
        </div>
      </div>
    </div>
  );
};
```

### 10.7 レスポンシブ対応

- **横向き推奨**: モバイルデバイスでは横向き表示を推奨
- **画面サイズ対応**: 様々な画面サイズに対応したUI調整
- **タッチ最適化**: タッチ操作に最適化されたボタンサイズと配置（44px以上）
- **アクセシビリティ**: WCAG 2.1 AA準拠のコントラスト比とaria-label

### 10.8 パフォーマンス最適化

#### イベント処理の最適化
モバイルゲームでは、タッチイベントやジョイスティック操作が高頻度で発生するため、適切な最適化が必要です：

##### スロットリング実装
```tsx
// 60fps制限のスロットリング
const emitCameraMove = useCallback((deltaX: number, deltaY: number) => {
  const now = performance.now();
  const timeSinceLastEmit = now - lastEmitTimeRef.current;
  const minInterval = 16; // 約60fps (1000ms / 60fps = 16.67ms)

  if (timeSinceLastEmit >= minInterval) {
    // イベント発火処理
    try {
      const event = new CustomEvent('joystick-camera-move', {
        detail: { deltaX: moveX, deltaY: moveY }
      });
      window.dispatchEvent(event);
      lastEmitTimeRef.current = now;
    } catch (error) {
      console.warn('Event dispatch failed:', error);
    }
  }
}, []);
```

##### requestAnimationFrame活用
```tsx
// スムーズなアニメーション更新
const handleTouchMove = useCallback((e: React.TouchEvent) => {
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
  }
  
  animationFrameRef.current = requestAnimationFrame(() => {
    updateStickPosition(touch.clientX, touch.clientY);
  });
}, []);
```

##### GPU加速の活用
```tsx
// CSS最適化
style={{
  willChange: 'transform', // GPU加速を有効化
  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
  transition: isDragging ? 'none' : 'transform 0.2s ease-out'
}}
```

#### エラーハンドリング
```tsx
// 値の妥当性チェック
if (typeof deltaX !== 'number' || typeof deltaY !== 'number') {
  console.warn('Invalid camera move values:', { deltaX, deltaY });
  return;
}

// NaNや無限大の値をチェック
if (!isFinite(deltaX) || !isFinite(deltaY)) {
  console.warn('Non-finite camera move values:', { deltaX, deltaY });
  return;
}
```

#### パッシブイベントリスナー
```tsx
// パフォーマンス向上のためpassive: trueを使用
window.addEventListener('joystick-camera-move', handler, { passive: true });
document.addEventListener('touchmove', handler, { passive: false }); // preventDefaultが必要な場合のみfalse
```

これらの最適化により、モバイルデバイスでも60fpsの滑らかな操作体験を実現しています。

## 11. 参考資料

- [Next.js ドキュメント](https://nextjs.org/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Zustand 状態管理](https://github.com/pmndrs/zustand)
- [Phaser ゲームフレームワーク](https://phaser.io/docs)
- [WebGL パフォーマンス最適化](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) 

### 技術的な成果
- **本番マイグレーション自動化**: 安全で効率的なデータベース管理
- **ステージリッチ化完了**: 高品質3Dゲーム体験の実現
- **衝突判定システム**: 精密なゲームインタラクション
- **パフォーマンス最適化**: 60fps維持とメモリ効率化
- **国際標準準拠**: モバイルUI/UXベストプラクティス実装
- **拡張可能アーキテクチャ**: 将来的な機能追加に対応

## 12. 本番マイグレーション運用

### 12.1 概要

Super Piccellプラットフォームでは、本番データベース（Neon DB）へのマイグレーションをローカル環境から手動で実行します。

### 12.2 本番マイグレーション手順

#### マイグレーション実行コマンド
```bash
# 本番マイグレーション実行
docker compose exec frontend npm run db:migrate:production
```

#### 実行される処理
1. **環境検証**: 本番環境の設定確認
2. **対話式確認**: 実行前の安全確認プロンプト
3. **接続テスト**: データベース接続の検証
4. **マイグレーション実行**: 未適用のマイグレーションを順次実行
5. **実行ログ**: 詳細な実行結果の記録

### 12.3 開発フロー

#### 通常の開発手順
```bash
# 1. スキーマ変更
# frontend/src/db/schema.ts を編集

# 2. マイグレーションファイル生成
docker compose exec frontend npm run db:generate

# 3. 開発環境でテスト
docker compose exec frontend npm run db:migrate

# 4. 本番環境に適用
docker compose exec frontend npm run db:migrate:production

# 5. コミット・プッシュ
git add .
git commit -m "feat: add new database schema"
git push origin main
```

### 12.4 安全性の確保

- **対話式確認**: 実行前に確認プロンプトが表示
- **環境検証**: 本番環境への接続と設定を事前に検証
- **実行ログ**: マイグレーション実行の詳細ログを出力
- **セキュリティ**: 本番データベースURLの検証

### 12.5 注意事項

- **破壊的変更**: データ損失の可能性がある変更は事前に十分な検証が必要
- **バックアップ**: 重要な変更前は手動バックアップを推奨
- **監視**: マイグレーション実行後は本番環境の動作確認が必要
- **実行環境**: 本番マイグレーションは必ずローカル環境から実行してください

## 13. ステージリッチ化システム

### 13.1 概要

Nag-Wonゲームでは、高品質な3Dアセットと拡張された衝突判定システムにより、よりリッチでスタイリッシュなゲーム体験を提供しています。

### 13.2 実装された機能

#### 3Dアセット管理システム
- **プログレッシブローディング**: 優先度に基づく段階的読み込み
- **アセットキャッシュ**: メモリ効率的な管理
- **ローディングオーバーレイ**: ユーザーフレンドリーな読み込み表示

#### 拡張された衝突判定システム
- **複数の衝突タイプ**: sphere、box、capsule、mesh
- **空間分割最適化**: 大規模ワールドでの高速処理
- **レイヤーベース判定**: 用途別の衝突判定制御

#### エンハンスドワールド
- **サイバーシティ**: パーティクルエフェクト、アニメーション建物
- **多様な建物タイプ**: skyscraper、tower、complex等
- **動的エフェクト**: rotate、float、pulse、orbit、spiral

#### 拡張アイテムシステム
- **6つのレア度**: standard、rare、legendary、special、epic、mythic
- **多様な形状**: sphere、crystal、star、cube、gem、orb、shard
- **インタラクティブエフェクト**: パーティクル、トレイル、マグネット効果

### 13.3 パフォーマンス最適化

- **LOD（Level of Detail）**: 距離に応じた詳細度調整
- **フラストラムカリング**: 視界外オブジェクトの描画スキップ
- **バッチング**: 描画コールの最適化
- **メモリ管理**: 不要なアセットの自動解放

### 13.4 使用方法

#### 基本的な使用
```tsx
<GameCanvas 
  onScoreUpdate={handleScoreUpdate} 
  useEnhancedGraphics={true} // 拡張グラフィック有効
/>
```

#### カスタムアセット追加
```typescript
// AssetLoader.tsxのSTAGE_ASSETSに追加
'custom-stage': [
  {
    id: 'custom-model',
    type: 'model',
    url: '/models/custom/model.glb',
    priority: 'high',
    compressed: true
  }
]
```

### 13.5 今後の拡張予定

- **物理エンジン統合**: より現実的な物理挙動
- **動的天候システム**: 時間と天候の変化
- **NPCシステム**: インタラクティブなキャラクター
- **マルチプレイヤー対応**: リアルタイム協力・対戦機能

---

## 参考資料

- [Next.js ドキュメント](https://nextjs.org/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Zustand 状態管理](https://github.com/pmndrs/zustand)
- [Neon Database](https://neon.tech/docs)
- [GitHub Actions](https://docs.github.com/en/actions)
- [WebGL パフォーマンス最適化](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

### 技術的な成果
- **本番マイグレーション自動化**: 安全で効率的なデータベース管理
- **ステージリッチ化完了**: 高品質3Dゲーム体験の実現
- **衝突判定システム**: 精密なゲームインタラクション
- **パフォーマンス最適化**: 60fps維持とメモリ効率化
- **国際標準準拠**: モバイルUI/UXベストプラクティス実装
- **拡張可能アーキテクチャ**: 将来的な機能追加に対応 