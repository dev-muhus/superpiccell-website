/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { POST, DELETE } from '@/app/api/posts/[id]/repost/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, posts, blocks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// テスト用のグローバル変数に型を追加
declare global {
  var currentTestUserId: string;
}

describe('POST /api/posts/[id]/repost', () => {
  let testUser: any;
  let otherUser: any;
  let testPost: any;

  beforeEach(async () => {
    // テストユーザーを作成
    const testUserId = `test_user_id_${Date.now()}`;
    global.currentTestUserId = testUserId;
    
    testUser = await db.insert(users).values({
      clerk_id: testUserId,
      username: 'testuser_repost',
      email: 'testuser_repost@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // 別のテストユーザーを作成
    otherUser = await db.insert(users).values({
      clerk_id: `other_user_id_${Date.now()}`,
      username: 'otheruser_repost',
      email: 'otheruser_repost@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/other.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // リポスト元の投稿を作成
    testPost = await db.insert(posts).values({
      user_id: otherUser.id,
      content: 'リポスト元の投稿',
      post_type: 'original',
      created_at: new Date(),
      updated_at: new Date()
    }).returning().then(res => res[0]);
  });

  test('正常にリポストできること', async () => {
    const request = createTestRequest(`/api/posts/${testPost.id}/repost`, 'POST', null, {}, testUser.clerk_id);
    const response = await POST(request, { params: { id: testPost.id.toString() } });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.post).toMatchObject({
      user_id: testUser.id,
      content: null,
      post_type: 'repost',
      repost_of_post_id: testPost.id,
      media_count: 0
    });
  });

  test('同じ投稿を二度リポストできないこと', async () => {
    // 1回目のリポスト
    const request1 = createTestRequest(`/api/posts/${testPost.id}/repost`, 'POST', null, {}, testUser.clerk_id);
    const response1 = await POST(request1, { params: { id: testPost.id.toString() } });
    expect(response1.status).toBe(201);

    // 2回目のリポスト
    const request2 = createTestRequest(`/api/posts/${testPost.id}/repost`, 'POST', null, {}, testUser.clerk_id);
    const response2 = await POST(request2, { params: { id: testPost.id.toString() } });
    expect(response2.status).toBe(400);
    const data = await response2.json();
    expect(data.error).toContain('既にこの投稿をリポストしています');
  });

  test('存在しない投稿をリポストできないこと', async () => {
    const request = createTestRequest('/api/posts/99999/repost', 'POST', null, {}, testUser.clerk_id);
    const response = await POST(request, { params: { id: '99999' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('投稿が見つかりません');
  });

  test('削除された投稿をリポストできないこと', async () => {
    // 投稿を削除
    await db.update(posts)
      .set({ is_deleted: true, deleted_at: new Date() })
      .where(eq(posts.id, testPost.id));

    // リポストを試みる
    const request = createTestRequest(`/api/posts/${testPost.id}/repost`, 'POST', null, {}, testUser.clerk_id);
    const response = await POST(request, { params: { id: testPost.id.toString() } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('投稿が見つかりません');
  });

  test('ブロックしているユーザーの投稿をリポストできないこと', async () => {
    // otherUserをブロック
    await db.insert(blocks).values({
      blocker_id: testUser.id,
      blocked_id: otherUser.id,
      created_at: new Date(),
      is_deleted: false
    });

    // リポストを試みる
    const request = createTestRequest(`/api/posts/${testPost.id}/repost`, 'POST', null, {}, testUser.clerk_id);
    const response = await POST(request, { params: { id: testPost.id.toString() } });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('この投稿をリポストすることはできません');
  });

  test('ブロックされているユーザーの投稿をリポストできないこと', async () => {
    // otherUserから自分をブロック
    await db.insert(blocks).values({
      blocker_id: otherUser.id,
      blocked_id: testUser.id,
      created_at: new Date(),
      is_deleted: false
    });

    // リポストを試みる
    const request = createTestRequest(`/api/posts/${testPost.id}/repost`, 'POST', null, {}, testUser.clerk_id);
    const response = await POST(request, { params: { id: testPost.id.toString() } });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('この投稿をリポストすることはできません');
  });

  test('無効な投稿IDでエラーになること', async () => {
    const request = createTestRequest('/api/posts/invalid/repost', 'POST', null, {}, testUser.clerk_id);
    const response = await POST(request, { params: { id: 'invalid' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('無効な投稿IDです');
  });

  test('認証なしでリポストできないこと', async () => {
    // 認証なしのリクエスト
    global.currentTestUserId = null as unknown as string;
    const request = createTestRequest(`/api/posts/${testPost.id}/repost`, 'POST');
    const response = await POST(request, { params: { id: testPost.id.toString() } });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('認証が必要です');
  });
});

describe('DELETE /api/posts/[id]/repost', () => {
  let testUser: any;
  let otherUser: any;
  let testPost: any;
  let repostPost: any;

  beforeEach(async () => {
    // テストユーザーを作成
    const testUserId = `test_user_id_${Date.now()}`;
    global.currentTestUserId = testUserId;
    
    testUser = await db.insert(users).values({
      clerk_id: testUserId,
      username: 'testuser_unrepost',
      email: 'testuser_unrepost@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // 別のテストユーザーを作成
    otherUser = await db.insert(users).values({
      clerk_id: `other_user_id_${Date.now()}`,
      username: 'otheruser_unrepost',
      email: 'otheruser_unrepost@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/other.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // リポスト元の投稿を作成
    testPost = await db.insert(posts).values({
      user_id: otherUser.id,
      content: 'リポスト元の投稿',
      post_type: 'original',
      created_at: new Date(),
      updated_at: new Date()
    }).returning().then(res => res[0]);

    // リポスト投稿を作成
    repostPost = await db.insert(posts).values({
      user_id: testUser.id,
      content: null,
      post_type: 'repost',
      repost_of_post_id: testPost.id,
      media_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }).returning().then(res => res[0]);
  });

  test('正常にリポストを解除できること', async () => {
    const request = createTestRequest(`/api/posts/${testPost.id}/repost`, 'DELETE', null, {}, testUser.clerk_id);
    const response = await DELETE(request, { params: { id: testPost.id.toString() } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('リポストを解除しました');

    // データベースからリポストが削除されていることを確認
    const [deletedRepost] = await db.select()
      .from(posts)
      .where(and(
        eq(posts.id, repostPost.id),
        eq(posts.is_deleted, true)
      ))
      .limit(1);
    
    expect(deletedRepost).toBeDefined();
    expect(deletedRepost.is_deleted).toBe(true);
  });

  test('リポストしていない投稿の解除はできないこと', async () => {
    // 別の投稿を作成（リポストしていない）
    const anotherPost = await db.insert(posts).values({
      user_id: otherUser.id,
      content: 'リポストしていない投稿',
      post_type: 'original',
      created_at: new Date(),
      updated_at: new Date()
    }).returning().then(res => res[0]);

    const request = createTestRequest(`/api/posts/${anotherPost.id}/repost`, 'DELETE', null, {}, testUser.clerk_id);
    const response = await DELETE(request, { params: { id: anotherPost.id.toString() } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('リポストが見つかりません');
  });

  test('存在しない投稿のリポスト解除はできないこと', async () => {
    const request = createTestRequest('/api/posts/99999/repost', 'DELETE', null, {}, testUser.clerk_id);
    const response = await DELETE(request, { params: { id: '99999' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('リポストが見つかりません');
  });

  test('無効な投稿IDでエラーになること', async () => {
    const request = createTestRequest('/api/posts/invalid/repost', 'DELETE', null, {}, testUser.clerk_id);
    const response = await DELETE(request, { params: { id: 'invalid' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('無効な投稿IDです');
  });

  test('認証なしでリポスト解除できないこと', async () => {
    // 認証なしのリクエスト
    global.currentTestUserId = null as unknown as string;
    const request = createTestRequest(`/api/posts/${testPost.id}/repost`, 'DELETE');
    const response = await DELETE(request, { params: { id: testPost.id.toString() } });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('認証が必要です');
  });

  test('既に削除されたリポストは解除できないこと', async () => {
    // リポストを事前に削除
    await db.update(posts)
      .set({ is_deleted: true, updated_at: new Date() })
      .where(eq(posts.id, repostPost.id));

    const request = createTestRequest(`/api/posts/${testPost.id}/repost`, 'DELETE', null, {}, testUser.clerk_id);
    const response = await DELETE(request, { params: { id: testPost.id.toString() } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('リポストが見つかりません');
  });
});