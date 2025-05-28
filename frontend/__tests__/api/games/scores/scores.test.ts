import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { users, game_scores } from '@/db/schema';
import { GET, POST } from '@/app/api/games/scores/route';
import { createTestRequest, BASE_URL } from '@/utils/test/api-test-helpers';
import { sql } from 'drizzle-orm';

// コンソールログとエラーを抑制
let consoleErrorSpy: jest.SpyInstance;
let consoleLogSpy: jest.SpyInstance;

beforeEach(() => {
  // コンソールログとエラーを抑制
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  // コンソールログとエラーのモックを元に戻す
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

// テスト用の型定義
interface GameScoreData {
  id: number;
  score: number;
  game_time: number;
  items_collected: number;
  difficulty: string;
  stage_id: string;
  created_at: string;
  user: {
    id: number;
    username: string;
    profile_image_url?: string;
    first_name?: string;
    last_name?: string;
    is_current_user: boolean;
  };
}

interface GameScoreResponse {
  success: boolean;
  data: GameScoreData;
}

interface GameScoreRankingResponse {
  success: boolean;
  data: GameScoreData[];
  pagination: {
    hasMore: boolean;
    nextCursor: number | null;
    totalCount: number;
  };
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

// テスト用ユーザーデータを作成する関数
function createTestUsers() {
  return [
    {
      clerk_id: `test_user_id_${Date.now()}_1`,
      username: 'testuser1',
      email: 'testuser1@example.com',
      first_name: 'Test',
      last_name: 'User1',
      profile_image_url: 'https://example.com/testuser1.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_2`,
      username: 'testuser2',
      email: 'testuser2@example.com',
      first_name: 'Test',
      last_name: 'User2',
      profile_image_url: 'https://example.com/testuser2.jpg',
      role: 'user'
    }
  ];
}

describe('ゲームスコアAPI', () => {
  let testUsers: any[] = [];

  beforeEach(async () => {
    // テストデータをクリーンアップ
    await db.execute(sql`DELETE FROM game_scores WHERE user_id IN (SELECT id FROM users WHERE clerk_id LIKE 'test_user_id_%')`);
    await db.execute(sql`DELETE FROM users WHERE clerk_id LIKE 'test_user_id_%'`);

    // テスト用ユーザーを作成
    const testUserData = createTestUsers();
    testUsers = await db.insert(users).values(testUserData).returning();

    // グローバルテストユーザーIDを設定
    global.currentTestUserId = testUsers[0].clerk_id;
  });

  afterAll(async () => {
    // テストデータをクリーンアップ
    await db.execute(sql`DELETE FROM game_scores WHERE user_id IN (SELECT id FROM users WHERE clerk_id LIKE 'test_user_id_%')`);
    await db.execute(sql`DELETE FROM users WHERE clerk_id LIKE 'test_user_id_%'`);
  });

  describe('POST /api/games/scores - スコア保存', () => {
    test('正常なスコア保存ができる', async () => {
      const scoreData = {
        game_id: 'nag-won',
        stage_id: 'cyber-city',
        score: 1500,
        game_time: 60,
        items_collected: 15,
        difficulty: 'normal'
      };

      const request = createTestRequest('/api/games/scores', 'POST', scoreData, {}, testUsers[0].clerk_id);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.score).toBe(1500);
      expect(data.data.game_time).toBe(60);
      expect(data.data.items_collected).toBe(15);
      expect(data.data.difficulty).toBe('normal');
      expect(data.data.stage_id).toBe('cyber-city');
    });

    test('未認証ユーザーはスコア保存できない', async () => {
      const scoreData = {
        game_id: 'nag-won',
        stage_id: 'cyber-city',
        score: 1500,
        game_time: 60
      };

      // 認証なしでリクエスト
      global.currentTestUserId = null as unknown as string;
      const request = createTestRequest('/api/games/scores', 'POST', scoreData);
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('ログインが必要です');
      
      // テストユーザーIDを元に戻す
      global.currentTestUserId = testUsers[0].clerk_id;
    });

    test('無効なデータでスコア保存を試行するとエラーになる', async () => {
      const scoreData = {
        game_id: 'nag-won',
        stage_id: 'cyber-city',
        score: -100, // 無効なスコア
        game_time: 60
      };

      const request = createTestRequest('/api/games/scores', 'POST', scoreData, {}, testUsers[0].clerk_id);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('リクエストデータが無効です');
    });

    test('必須フィールドが不足している場合エラーになる', async () => {
      const scoreData = {
        // game_id が不足
        stage_id: 'cyber-city',
        score: 1500,
        game_time: 60
      };

      const request = createTestRequest('/api/games/scores', 'POST', scoreData, {}, testUsers[0].clerk_id);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('リクエストデータが無効です');
    });
  });

  describe('GET /api/games/scores - ランキング取得', () => {
    beforeEach(async () => {
      // テスト用スコアデータを作成（同一ユーザーの複数スコアを含む）
      await db.insert(game_scores).values([
        // testUsers[0]の複数スコア（最高は2500）
        {
          user_id: testUsers[0].id,
          game_id: 'nag-won',
          stage_id: 'cyber-city',
          score: 2000,
          game_time: 60,
          items_collected: 20,
          difficulty: 'normal'
        },
        {
          user_id: testUsers[0].id,
          game_id: 'nag-won',
          stage_id: 'cyber-city',
          score: 2500, // 最高得点
          game_time: 45,
          items_collected: 25,
          difficulty: 'normal'
        },
        {
          user_id: testUsers[0].id,
          game_id: 'nag-won',
          stage_id: 'cyber-city',
          score: 1800,
          game_time: 70,
          items_collected: 18,
          difficulty: 'normal'
        },
        // testUsers[1]の複数スコア（最高は1500）
        {
          user_id: testUsers[1].id,
          game_id: 'nag-won',
          stage_id: 'cyber-city',
          score: 1500, // 最高得点
          game_time: 60,
          items_collected: 15,
          difficulty: 'normal'
        },
        {
          user_id: testUsers[1].id,
          game_id: 'nag-won',
          stage_id: 'cyber-city',
          score: 1200,
          game_time: 80,
          items_collected: 12,
          difficulty: 'normal'
        }
      ]);
    });

    test('ユーザーごとの最高得点のみが表示される', async () => {
      const url = '/api/games/scores?game_id=nag-won&stage_id=cyber-city';
      const request = createTestRequest(url, 'GET', null, {}, testUsers[0].clerk_id);
      const response = await GET(request);

      if (response.status !== 200) {
        const errorData = await response.json();
        console.log('Error response:', errorData);
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // ユーザー数は2人だが、各ユーザーの最高得点のみ表示される
      expect(data.data).toHaveLength(2);
      
      // スコア順でソートされている
      expect(data.data[0].score).toBe(2500); // testUsers[0]の最高得点
      expect(data.data[1].score).toBe(1500); // testUsers[1]の最高得点
      
      // 各ユーザーが1回ずつのみ表示される
      const userIds = data.data.map((item: GameScoreData) => item.user.id);
      const uniqueUserIds = [...new Set(userIds)];
      expect(userIds.length).toBe(uniqueUserIds.length);
      
      expect(data.data[0].user.is_current_user).toBe(true);
      expect(data.pagination.totalCount).toBe(2); // ユニークユーザー数
    });

    test('ゲームランキングを取得できる', async () => {
      const url = '/api/games/scores?game_id=nag-won&stage_id=cyber-city';
      const request = createTestRequest(url, 'GET', null, {}, testUsers[0].clerk_id);
      const response = await GET(request);

      if (response.status !== 200) {
        const errorData = await response.json();
        console.log('Error response:', errorData);
      }

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].score).toBe(2500); // 修正：最高得点
      expect(data.data[1].score).toBe(1500);
      expect(data.data[0].user.is_current_user).toBe(true);
      expect(data.pagination.totalCount).toBe(2);
    });

    test('ステージ指定なしでゲーム全体のランキングを取得できる', async () => {
      const url = '/api/games/scores?game_id=nag-won';
      const request = createTestRequest(url, 'GET', null, {}, testUsers[0].clerk_id);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].score).toBe(2500); // 修正：最高得点
      expect(data.data[1].score).toBe(1500);
    });

    test('未認証ユーザーはランキングを取得できない', async () => {
      // 認証なしでリクエスト
      global.currentTestUserId = null as unknown as string;
      const url = '/api/games/scores?game_id=nag-won';
      const request = createTestRequest(url, 'GET');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('ログインが必要です');
      
      // テストユーザーIDを元に戻す
      global.currentTestUserId = testUsers[0].clerk_id;
    });

    test('無効なゲームIDでランキング取得を試行するとエラーになる', async () => {
      const url = '/api/games/scores?game_id=';
      const request = createTestRequest(url, 'GET', null, {}, testUsers[0].clerk_id);
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('リクエストパラメータが無効です');
    });

    test('ページネーション機能が正常に動作する', async () => {
      const url = '/api/games/scores?game_id=nag-won&limit=1';
      const request = createTestRequest(url, 'GET', null, {}, testUsers[0].clerk_id);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.pagination.hasMore).toBe(true);
      expect(data.pagination.nextCursor).toBeDefined();
    });
  });
}); 