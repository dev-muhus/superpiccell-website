/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET, DELETE } from '@/app/api/posts/[id]/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, posts, likes, bookmarks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// テスト用のグローバル変数に型を追加
declare global {
  var currentTestUserId: string;
}

describe('Post ID API', () => {
  let testUser: any;
  let otherUser: any;
  let testPost: any;
  let otherUserPost: any;
  
  beforeEach(async () => {
    // テストユーザーを作成
    const testUserId = `test_user_id_${Date.now()}`;
    global.currentTestUserId = testUserId;
    
    testUser = await db.insert(users).values({
      clerk_id: testUserId,
      username: 'testuser_post_id',
      email: 'testuser_post_id@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // 別のテストユーザーを作成
    otherUser = await db.insert(users).values({
      clerk_id: `other_user_id_${Date.now()}`,
      username: 'otheruser_post_id',
      email: 'otheruser_post_id@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/other.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // テストユーザーの投稿を作成
    testPost = await db.insert(posts).values({
      user_id: testUser.id,
      content: 'テスト投稿の詳細を取得するテスト',
      post_type: 'original',
      created_at: new Date(),
      updated_at: new Date()
    }).returning().then(res => res[0]);
    
    // 別のユーザーの投稿を作成
    otherUserPost = await db.insert(posts).values({
      user_id: otherUser.id,
      content: '別のユーザーの投稿',
      post_type: 'original',
      created_at: new Date(),
      updated_at: new Date()
    }).returning().then(res => res[0]);
    
    // いいねを追加
    await db.insert(likes).values({
      user_id: otherUser.id,
      post_id: testPost.id,
      created_at: new Date()
    });
    
    // ブックマークを追加
    await db.insert(bookmarks).values({
      user_id: otherUser.id,
      post_id: testPost.id,
      created_at: new Date()
    });
  });
  
  // 投稿詳細の取得テスト
  describe('GET /api/posts/[id]', () => {
    test('認証済みユーザーは投稿詳細を取得できる', async () => {
      // GET リクエストのテスト
      const request = createTestRequest(`/api/posts/${testPost.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿データの検証
      expect(data.post).toBeDefined();
      expect(data.post.id).toBe(testPost.id);
      expect(data.post.content).toBe(testPost.content);
      expect(data.post.user_id).toBe(testUser.id);
      
      // 投稿者情報の検証
      expect(data.post.user).toBeDefined();
      expect(data.post.user.id).toBe(testUser.id);
      expect(data.post.user.username).toBe(testUser.username);
      
      // いいね・ブックマーク情報の検証
      expect(data.post.like_count).toBe(1);
      expect(data.post.bookmark_count).toBe(1);
    });
    
    test('別のユーザーの投稿も取得できる', async () => {
      // 別のユーザーの投稿を取得
      const request = createTestRequest(`/api/posts/${otherUserPost.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: otherUserPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿データの検証
      expect(data.post).toBeDefined();
      expect(data.post.id).toBe(otherUserPost.id);
      expect(data.post.content).toBe(otherUserPost.content);
      expect(data.post.user_id).toBe(otherUser.id);
      
      // 投稿者情報の検証
      expect(data.post.user).toBeDefined();
      expect(data.post.user.id).toBe(otherUser.id);
      expect(data.post.user.username).toBe(otherUser.username);
    });
    
    test('引用投稿の詳細を取得できる', async () => {
      // 引用投稿を作成
      const quotePost = await db.insert(posts).values({
        user_id: testUser.id,
        content: 'これは引用投稿です',
        post_type: 'quote',
        quote_of_post_id: otherUserPost.id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // 引用投稿の詳細を取得
      const request = createTestRequest(`/api/posts/${quotePost.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: quotePost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿データの検証
      expect(data.post).toBeDefined();
      expect(data.post.id).toBe(quotePost.id);
      expect(data.post.content).toBe(quotePost.content);
      expect(data.post.post_type).toBe('quote');
      expect(data.post.quote_of_post_id).toBe(otherUserPost.id);
      
      // 引用元の投稿データの検証
      expect(data.post.quote_of_post).toBeDefined();
      expect(data.post.quote_of_post.id).toBe(otherUserPost.id);
      expect(data.post.quote_of_post.content).toBe(otherUserPost.content);
    });
    
    test('返信投稿の詳細を取得できる', async () => {
      // 返信投稿を作成
      const replyPost = await db.insert(posts).values({
        user_id: testUser.id,
        content: 'これは返信投稿です',
        post_type: 'reply',
        in_reply_to_post_id: otherUserPost.id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // 返信投稿の詳細を取得
      const request = createTestRequest(`/api/posts/${replyPost.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: replyPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿データの検証
      expect(data.post).toBeDefined();
      expect(data.post.id).toBe(replyPost.id);
      expect(data.post.content).toBe(replyPost.content);
      expect(data.post.post_type).toBe('reply');
      expect(data.post.in_reply_to_post_id).toBe(otherUserPost.id);
      
      // 返信先の投稿データの検証
      expect(data.post.in_reply_to_post).toBeDefined();
      expect(data.post.in_reply_to_post.id).toBe(otherUserPost.id);
      expect(data.post.in_reply_to_post.content).toBe(otherUserPost.content);
    });
    
    test('リポスト投稿の詳細を取得できる', async () => {
      // リポスト投稿を作成
      const repostPost = await db.insert(posts).values({
        user_id: testUser.id,
        content: '',
        post_type: 'repost',
        repost_of_post_id: otherUserPost.id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // リポスト投稿の詳細を取得
      const request = createTestRequest(`/api/posts/${repostPost.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: repostPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿データの検証
      expect(data.post).toBeDefined();
      expect(data.post.id).toBe(repostPost.id);
      expect(data.post.post_type).toBe('repost');
      expect(data.post.repost_of_post_id).toBe(otherUserPost.id);
      
      // リポスト元の投稿データの検証
      expect(data.post.repost_of_post).toBeDefined();
      expect(data.post.repost_of_post.id).toBe(otherUserPost.id);
      expect(data.post.repost_of_post.content).toBe(otherUserPost.content);
    });
    
    test('存在しない投稿IDの場合は404エラーを返す', async () => {
      // 存在しない投稿ID
      const nonExistentId = 999999;
      
      const request = createTestRequest(`/api/posts/${nonExistentId}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: nonExistentId.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('削除された投稿の場合は404エラーを返す', async () => {
      // 投稿を論理削除
      await db.update(posts)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(posts.id, testPost.id));
      
      const request = createTestRequest(`/api/posts/${testPost.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 認証なしのリクエスト
      global.currentTestUserId = null as unknown as string;
      const request = createTestRequest(`/api/posts/${testPost.id}`, 'GET');
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
  
  // 投稿削除のテスト
  describe('DELETE /api/posts/[id]', () => {
    test('投稿者は自分の投稿を削除できる', async () => {
      // DELETE リクエストのテスト
      const request = createTestRequest(`/api/posts/${testPost.id}`, 'DELETE', null, {}, testUser.clerk_id);
      const response = await DELETE(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // 論理削除されていることを確認
      const [deletedPost] = await db.select()
        .from(posts)
        .where(eq(posts.id, testPost.id))
        .limit(1);
      
      expect(deletedPost).not.toBeNull();
      expect(deletedPost?.is_deleted).toBe(true);
      expect(deletedPost?.deleted_at).not.toBeNull();
    });
    
    test('他人の投稿は削除できない', async () => {
      // 他のユーザーの投稿を削除しようとする
      const request = createTestRequest(`/api/posts/${otherUserPost.id}`, 'DELETE', null, {}, testUser.clerk_id);
      const response = await DELETE(request, { params: { id: otherUserPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBeDefined();
      
      // 投稿が削除されていないことを確認
      const [notDeletedPost] = await db.select()
        .from(posts)
        .where(eq(posts.id, otherUserPost.id))
        .limit(1);
      
      expect(notDeletedPost).not.toBeNull();
      expect(notDeletedPost?.is_deleted).toBe(false);
    });
    
    test('存在しない投稿の削除は404エラーを返す', async () => {
      // 存在しない投稿ID
      const nonExistentId = 999999;
      
      const request = createTestRequest(`/api/posts/${nonExistentId}`, 'DELETE', null, {}, testUser.clerk_id);
      const response = await DELETE(request, { params: { id: nonExistentId.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      global.currentTestUserId = null as unknown as string;
      
      const request = createTestRequest(`/api/posts/${testPost.id}`, 'DELETE');
      const response = await DELETE(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('削除済みの投稿を再度削除すると404エラーを返す', async () => {
      // 投稿を論理削除
      await db.update(posts)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(posts.id, testPost.id));
      
      // 削除済みの投稿を削除しようとする
      const request = createTestRequest(`/api/posts/${testPost.id}`, 'DELETE', null, {}, testUser.clerk_id);
      const response = await DELETE(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
}); 