/**
 * Jest setupFilesAfterEnv - テスト前の設定
 */

// グローバル変数として現在のテストユーザーIDを管理
global.currentTestUserId = `test_user_id_${Date.now()}`;

// Clerk認証をモックする - 動的なID生成のためのモック関数
jest.mock('@clerk/nextjs/server', () => ({
  getAuth: () => ({ userId: global.currentTestUserId }),
  clerkClient: {
    users: {
      getUser: jest.fn().mockImplementation(() => Promise.resolve({
        id: global.currentTestUserId,
        username: 'testuser',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
        imageUrl: 'https://example.com/image.jpg'
      }))
    }
  }
}));

// 各テスト前にデータベースの状態をリセット
beforeEach(async () => {
  try {
    const { db } = require('./src/db');
    const { sql } = require('drizzle-orm');
    
    // 全テーブルを自動検出して一括リセット
    await db.execute(sql`
      DO
      $func$
      BEGIN
        EXECUTE (
          SELECT 'TRUNCATE TABLE ' || string_agg(quote_ident(tablename), ', ') || ' RESTART IDENTITY CASCADE'
          FROM pg_tables
          WHERE schemaname = 'public'
        );
      END
      $func$;
    `);
    
  } catch (error) {
    console.error('Failed to reset database:', error);
  }
});

// テスト終了時のクリーンアップ
afterAll(async () => {
  const { db } = require('./src/db');
  await db.end();
}); 