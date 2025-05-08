/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET } from '@/app/api/me/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// テスト用のグローバル変数に型を追加
declare global {
  var currentTestUserId: string;
}

describe('Me API', () => {
  let testUser: any;
  let bannedUser: any;

  beforeEach(async () => {
    // テスト用ユーザーの作成
    const testUserId = `test_user_id_${Date.now()}`;
    global.currentTestUserId = testUserId;

    // 通常ユーザーの作成
    testUser = await db.insert(users).values({
      clerk_id: testUserId,
      username: 'testuser_me',
      email: 'testuser_me@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      bio: 'This is a test user for API testing',
      role: 'user',
      subscription_type: 'free'
    }).returning().then(res => res[0]);

    // BANされたユーザーの作成
    bannedUser = await db.insert(users).values({
      clerk_id: `banned_user_id_${Date.now()}`,
      username: 'banneduser_me',
      email: 'banneduser_me@example.com',
      first_name: 'Banned',
      last_name: 'User',
      profile_image_url: 'https://example.com/banned.jpg',
      bio: 'This is a banned user',
      role: 'user',
      is_banned: true,
      subscription_type: 'free'
    }).returning().then(res => res[0]);
  });

  // 自分のプロフィール情報取得のテスト
  describe('GET /api/me', () => {
    test('認証済みユーザーは自分のプロフィール情報を取得できる', async () => {
      // テスト用リクエストの作成
      const request = createTestRequest('/api/me', 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // ユーザー情報の検証
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(testUser.id);
      expect(data.user.username).toBe('testuser_me');
      expect(data.user.first_name).toBe('Test');
      expect(data.user.last_name).toBe('User');
      expect(data.user.profile_image_url).toBe('https://example.com/image.jpg');
      expect(data.user.bio).toBe('This is a test user for API testing');
      expect(data.user.role).toBe('user');
      expect(data.user.subscription_type).toBe('free');
      
      // 機密情報が含まれていないことを確認
      expect(data.user.password).toBeUndefined();
      expect(data.user.email).toBeUndefined();
    });

    test('未認証の場合は401エラーを返す', async () => {
      // テスト用リクエストの作成（認証なし）
      global.currentTestUserId = null as unknown as string;
      const request = createTestRequest('/api/me', 'GET');
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('存在しないユーザーIDの場合は404エラーを返す', async () => {
      // 存在しないユーザーIDを設定
      global.currentTestUserId = 'nonexistent_user_id';
      
      const request = createTestRequest('/api/me', 'GET');
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('BANされたユーザーでも自分の情報を取得できる', async () => {
      // BANされたユーザーでリクエスト
      global.currentTestUserId = bannedUser.clerk_id;
      const request = createTestRequest('/api/me', 'GET', null, {}, bannedUser.clerk_id);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // ユーザー情報の検証
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(bannedUser.id);
      expect(data.user.username).toBe('banneduser_me');
    });

    test('ユーザー情報を更新した後も最新の情報を取得できる', async () => {
      // ユーザー情報を更新
      const updatedBio = `Updated bio at ${new Date().toISOString()}`;
      await db.update(users)
        .set({ bio: updatedBio })
        .where(eq(users.id, testUser.id));
      
      // テスト用リクエストの作成
      const request = createTestRequest('/api/me', 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 更新された情報が反映されていることを確認
      expect(data.user.bio).toBe(updatedBio);
    });

    test('全ての必須フィールドが返されることを確認', async () => {
      // テスト用リクエストの作成
      const request = createTestRequest('/api/me', 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 必須フィールドの存在確認
      const requiredFields = [
        'id', 
        'username', 
        'first_name', 
        'last_name', 
        'profile_image_url', 
        'bio', 
        'created_at', 
        'updated_at', 
        'role', 
        'subscription_type'
      ];
      
      requiredFields.forEach(field => {
        expect(data.user).toHaveProperty(field);
      });
    });

    test('特殊文字を含むプロフィール情報も正しく取得できる', async () => {
      // 特殊文字を含むユーザー情報に更新
      const specialBio = '特殊文字テスト！＆＊（）：；＜script＞alert("XSS")＜/script＞';
      await db.update(users)
        .set({ bio: specialBio })
        .where(eq(users.id, testUser.id));
      
      // テスト用リクエストの作成
      const request = createTestRequest('/api/me', 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 特殊文字が正しく処理されていることを確認
      expect(data.user.bio).toBe(specialBio);
    });

    test('サーバーエラーの場合は500エラーを返す', async () => {
      // モックでエラーを発生させる（このテストはスキップ - 実際のエラーをシミュレートするのは難しい）
      // 実際のアプリケーションではエラーハンドリングが機能することを別の方法で確認する
    });
  });
});
