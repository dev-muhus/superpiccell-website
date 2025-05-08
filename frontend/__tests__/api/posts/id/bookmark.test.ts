/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET, POST } from '@/app/api/posts/[id]/bookmark/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, posts, bookmarks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// テスト用のグローバル変数に型を追加
declare global {
  var currentTestUserId: string;
}

describe('Post Bookmark API', () => {
  let testUser: any;
  let otherUser: any;
  let testPost: any;
  
  beforeEach(async () => {
    // テストユーザーを作成
    const testUserId = `test_user_id_${Date.now()}`;
    global.currentTestUserId = testUserId;
    
    testUser = await db.insert(users).values({
      clerk_id: testUserId,
      username: 'testuser_bookmark',
      email: 'testuser_bookmark@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // 別のテストユーザーを作成
    otherUser = await db.insert(users).values({
      clerk_id: `other_user_id_${Date.now()}`,
      username: 'otheruser_bookmark',
      email: 'otheruser_bookmark@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/other.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // テスト投稿を作成
    testPost = await db.insert(posts).values({
      user_id: otherUser.id,
      content: 'これはブックマークテスト用の投稿です',
      post_type: 'original',
      created_at: new Date(),
      updated_at: new Date()
    }).returning().then(res => res[0]);
  });
  
  // ブックマーク追加・削除のテスト
  describe('POST /api/posts/[id]/bookmark', () => {
    test('認証済みユーザーは投稿をブックマークできる', async () => {
      // ブックマークするリクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.bookmarked).toBe(true);
      expect(data.bookmark_count).toBe(1);
      
      // DBにブックマークが追加されたことを確認
      const bookmark = await db.query.bookmarks.findFirst({
        where: and(
          eq(bookmarks.user_id, testUser.id),
          eq(bookmarks.post_id, testPost.id),
          eq(bookmarks.is_deleted, false)
        )
      });
      
      expect(bookmark).not.toBeNull();
      expect(bookmark?.user_id).toBe(testUser.id);
      expect(bookmark?.post_id).toBe(testPost.id);
    });
    
    test('すでにブックマークしている投稿は解除できる', async () => {
      // まずブックマークを追加
      await db.insert(bookmarks).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      // 再度リクエストするとブックマークを解除
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.bookmarked).toBe(false);
      expect(data.bookmark_count).toBe(0);
      
      // DBでブックマークが論理削除されたことを確認
      const activeBookmarks = await db.query.bookmarks.findMany({
        where: and(
          eq(bookmarks.user_id, testUser.id),
          eq(bookmarks.post_id, testPost.id),
          eq(bookmarks.is_deleted, false)
        )
      });
      
      expect(activeBookmarks.length).toBe(0);
    });
    
    test('削除済みのブックマークを再度ブックマークできる', async () => {
      // ブックマークを追加して論理削除
      const bookmark = await db.insert(bookmarks).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      }).returning().then(res => res[0]);
      
      await db.update(bookmarks)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(bookmarks.id, bookmark.id));
      
      // 再度ブックマークを追加
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.bookmarked).toBe(true);
      expect(data.bookmark_count).toBe(1);
      
      // DBに新しいブックマークが追加されたことを確認
      const newBookmark = await db.query.bookmarks.findFirst({
        where: and(
          eq(bookmarks.user_id, testUser.id),
          eq(bookmarks.post_id, testPost.id),
          eq(bookmarks.is_deleted, false)
        )
      });
      
      expect(newBookmark).not.toBeNull();
    });
    
    test('存在しない投稿IDの場合は404エラーを返す', async () => {
      // 存在しない投稿ID
      const nonExistentId = 999999;
      
      const request = createTestRequest(`/api/posts/${nonExistentId}/bookmark`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: nonExistentId.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('削除された投稿はブックマークできない', async () => {
      // 投稿を論理削除
      await db.update(posts)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(posts.id, testPost.id));
      
      // ブックマークしようとする
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'POST', null, {}, testUser.clerk_id);
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 認証なしのリクエスト
      global.currentTestUserId = null as unknown as string;
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'POST');
      const response = await POST(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
  
  // ブックマーク状態取得のテスト
  describe('GET /api/posts/[id]/bookmark', () => {
    test('認証済みユーザーはブックマーク状態を取得できる（ブックマークなし）', async () => {
      // ブックマーク状態取得リクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bookmark_count).toBe(0);
      expect(data.bookmarked).toBe(false);
    });
    
    test('認証済みユーザーはブックマーク状態を取得できる（ブックマークあり）', async () => {
      // ブックマークを追加
      await db.insert(bookmarks).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      // ブックマーク状態取得リクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bookmark_count).toBe(1);
      expect(data.bookmarked).toBe(true);
    });
    
    test('複数ユーザーのブックマークが正しくカウントされる', async () => {
      // 複数ユーザーがブックマーク
      await db.insert(bookmarks).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      await db.insert(bookmarks).values({
        user_id: otherUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      // ブックマーク状態取得リクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bookmark_count).toBe(2);
      expect(data.bookmarked).toBe(true);
    });
    
    test('論理削除されたブックマークはカウントされない', async () => {
      // ブックマークを追加
      const bookmark = await db.insert(bookmarks).values({
        user_id: testUser.id,
        post_id: testPost.id,
        created_at: new Date()
      }).returning().then(res => res[0]);
      
      // ブックマークを論理削除
      await db.update(bookmarks)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(bookmarks.id, bookmark.id));
      
      // ブックマーク状態取得リクエスト
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bookmark_count).toBe(0);
      expect(data.bookmarked).toBe(false);
    });
    
    test('未認証でもブックマーク数は取得できる', async () => {
      // ブックマークを追加
      await db.insert(bookmarks).values({
        user_id: otherUser.id,
        post_id: testPost.id,
        created_at: new Date()
      });
      
      // 認証なしでブックマーク状態取得リクエスト
      global.currentTestUserId = null as unknown as string;
      const request = createTestRequest(`/api/posts/${testPost.id}/bookmark`, 'GET');
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bookmark_count).toBe(1);
      expect(data.bookmarked).toBe(false); // 未認証なのでブックマークしていない状態
    });
    
    test('無効な投稿IDの場合は400エラーを返す', async () => {
      // 無効な投稿ID
      const invalidId = 'invalid';
      
      const request = createTestRequest(`/api/posts/${invalidId}/bookmark`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: invalidId } });
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
}); 