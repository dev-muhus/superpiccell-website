/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET, POST } from '@/app/api/posts/[id]/likes/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, posts, likes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// テスト用のグローバル変数に型を追加
declare global {
  var currentTestUserId: string;
}

describe('Post Likes API', () => {
  let testUser: any;
  let otherUser: any;
  let testPost: any;
  
  beforeEach(async () => {
    // テストユーザーを作成
    const testUserId = `test_user_id_${Date.now()}`;
    global.currentTestUserId = testUserId;
    
    testUser = await db.insert(users).values({
      clerk_id: testUserId,
      username: 'testuser_likes',
      email: 'testuser_likes@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // 別のテストユーザーを作成
    otherUser = await db.insert(users).values({
      clerk_id: `other_user_id_${Date.now()}`,
      username: 'otheruser_likes',
      email: 'otheruser_likes@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/other.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // テスト投稿を作成
    testPost = await db.insert(posts).values({
      user_id: otherUser.id,
      content: 'これはいいねテスト用の投稿です',
      post_type: 'original',
      created_at: new Date(),
      updated_at: new Date()
    }).returning().then(res => res[0]);
  });
  
  // いいね追加・削除のテスト
  describe('POST /api/posts/[id]/likes', () => {
    test('認証済みユーザーは投稿にいいねできる', async () => {
      // いいねするリクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.liked).toBe(true);
      expect(data.like_count).toBe(1);
      
      // DBにいいねが追加されたことを確認
      const like = await db.query.likes.findFirst({
        where: and(
          eq(likes.user_id, testUser.id),
          eq(likes.post_id, testPost.id),
          eq(likes.is_deleted, false)
        )
      });
      
      expect(like).not.toBeNull();
      expect(like?.user_id).toBe(testUser.id);
      expect(like?.post_id).toBe(testPost.id);
    });
    
    test('すでにいいねしている投稿は解除できる', async () => {
      // まずいいねを追加
      await db.insert(likes).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      // 再度リクエストするといいねを解除
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.liked).toBe(false);
      expect(data.like_count).toBe(0);
      
      // DBでいいねが論理削除されたことを確認
      const activeLikes = await db.query.likes.findMany({
        where: and(
          eq(likes.user_id, testUser.id),
          eq(likes.post_id, testPost.id),
          eq(likes.is_deleted, false)
        )
      });
      
      expect(activeLikes.length).toBe(0);
    });
    
    test('削除済みのいいねを再度いいねできる', async () => {
      // いいねを追加して論理削除
      const like = await db.insert(likes).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      }).returning().then(res => res[0]);
      
      await db.update(likes)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(likes.id, like.id));
      
      // 再度いいねを追加
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.liked).toBe(true);
      expect(data.like_count).toBe(1);
      
      // DBに新しいいいねが追加されたことを確認
      const newLike = await db.query.likes.findFirst({
        where: and(
          eq(likes.user_id, testUser.id),
          eq(likes.post_id, testPost.id),
          eq(likes.is_deleted, false)
        )
      });
      
      expect(newLike).not.toBeNull();
    });
    
    test('存在しない投稿IDの場合は404エラーを返す', async () => {
      // 存在しない投稿ID
      const nonExistentId = 999999;
      
      const request = createTestRequest(`/api/posts/${nonExistentId}/likes`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: nonExistentId.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('削除された投稿はいいねできない', async () => {
      // 投稿を論理削除
      await db.update(posts)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(posts.id, testPost.id));
      
      // いいねしようとする
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 認証なしのリクエスト
      global.currentTestUserId = null as unknown as string;
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'POST');
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
  
  // いいね状態取得のテスト
  describe('GET /api/posts/[id]/likes', () => {
    test('認証済みユーザーはいいね状態を取得できる（いいねなし）', async () => {
      // いいね状態取得リクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.like_count).toBe(0);
      expect(data.liked).toBe(false);
    });
    
    test('認証済みユーザーはいいね状態を取得できる（いいねあり）', async () => {
      // いいねを追加
      await db.insert(likes).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      // いいね状態取得リクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.like_count).toBe(1);
      expect(data.liked).toBe(true);
    });
    
    test('複数ユーザーのいいねが正しくカウントされる', async () => {
      // 複数ユーザーがいいね
      await db.insert(likes).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      await db.insert(likes).values({
        user_id: otherUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      // いいね状態取得リクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.like_count).toBe(2);
      expect(data.liked).toBe(true);
    });
    
    test('論理削除されたいいねはカウントされない', async () => {
      // いいねを追加
      const like = await db.insert(likes).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      }).returning().then(res => res[0]);
      
      // いいねを論理削除
      await db.update(likes)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(likes.id, like.id));
      
      // いいね状態取得リクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.like_count).toBe(0);
      expect(data.liked).toBe(false);
    });
    
    test('未認証でもいいね数は取得できる', async () => {
      // いいねを追加
      await db.insert(likes).values({
        user_id: otherUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      // 認証なしでいいね状態取得リクエスト
      global.currentTestUserId = null as unknown as string;
      const request = createTestRequest(`/api/posts/${testPost.id}/likes`, 'GET');
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.like_count).toBe(1);
      expect(data.liked).toBe(false); // 未認証なのでいいねしていない状態
    });
    
    test('無効な投稿IDの場合は400エラーを返す', async () => {
      // 無効な投稿ID
      const invalidId = 'invalid';
      
      const request = createTestRequest(`/api/posts/${invalidId}/likes`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: invalidId } });
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
}); 