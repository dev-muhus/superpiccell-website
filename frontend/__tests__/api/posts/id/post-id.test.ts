/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET, DELETE } from '@/app/api/posts/[id]/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, posts, likes, bookmarks, post_media } from '@/db/schema';
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
  let mediaPost: any; // 追加：メディア付き投稿
  
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
    
    // メディア付き投稿の作成
    mediaPost = await db.insert(posts).values({
      user_id: testUser.id,
      content: 'メディア付き投稿のテスト',
      post_type: 'original',
      media_count: 2,
      created_at: new Date(),
      updated_at: new Date()
    }).returning().then(res => res[0]);
    
    // 投稿に紐づくメディアを追加
    await db.insert(post_media).values([
      {
        post_id: mediaPost.id,
        media_type: 'image',
        url: 'https://example.com/image1.jpg',
        width: 1200,
        height: 800,
        created_at: new Date()
      },
      {
        post_id: mediaPost.id,
        media_type: 'image',
        url: 'https://example.com/image2.jpg',
        width: 800,
        height: 600,
        created_at: new Date()
      }
    ]);
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
      
      // 引用投稿の詳細を取得（include_related=trueを指定）
      const request = createTestRequest(`/api/posts/${quotePost.id}?include_related=true`, 'GET', null, {}, testUser.clerk_id);
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
      
      // 返信投稿の詳細を取得（include_related=trueを指定）
      const request = createTestRequest(`/api/posts/${replyPost.id}?include_related=true`, 'GET', null, {}, testUser.clerk_id);
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
    
    test('返信先投稿にメディアがある場合、メディア情報も取得できる', async () => {
      // 返信先の投稿（メディア付き）を作成
      const mediaOriginalPost = await db.insert(posts).values({
        user_id: otherUser.id,
        content: 'メディア付き返信先投稿',
        post_type: 'original',
        media_count: 1,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // 投稿に紐づくメディアを追加
      await db.insert(post_media).values({
        post_id: mediaOriginalPost.id,
        media_type: 'image',
        url: 'https://example.com/image-for-reply.jpg',
        width: 1200,
        height: 800,
        created_at: new Date()
      });
      
      // この投稿に対する返信投稿を作成
      const replyToMediaPost = await db.insert(posts).values({
        user_id: testUser.id,
        content: 'メディア付き投稿への返信',
        post_type: 'reply',
        in_reply_to_post_id: mediaOriginalPost.id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // 返信投稿の詳細を取得（include_related=trueを指定）
      const request = createTestRequest(`/api/posts/${replyToMediaPost.id}?include_related=true`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: replyToMediaPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 返信先の投稿のメディア情報の検証
      expect(data.post.in_reply_to_post).toBeDefined();
      expect(data.post.in_reply_to_post.media).toBeDefined();
      expect(Array.isArray(data.post.in_reply_to_post.media)).toBe(true);
      expect(data.post.in_reply_to_post.media.length).toBe(1);
      
      // メディア情報の詳細を検証
      const media = data.post.in_reply_to_post.media[0];
      expect(media.mediaType).toBe('image');
      expect(media.url).toBe('https://example.com/image-for-reply.jpg');
      expect(media.width).toBe(1200);
      expect(media.height).toBe(800);
    });
    
    test('元記事の詳細にリポスト情報が含まれる', async () => {
      // リポスト投稿を作成
      const repostPost = await db.insert(posts).values({
        user_id: testUser.id,
        content: '',
        post_type: 'repost',
        repost_of_post_id: otherUserPost.id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // 元記事の詳細を取得（include_related=trueを指定）
      const request = createTestRequest(`/api/posts/${otherUserPost.id}?include_related=true`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: otherUserPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿データの検証
      expect(data.post).toBeDefined();
      expect(data.post.id).toBe(otherUserPost.id);
      expect(data.post.post_type).toBe('original');
      
      // リポスト情報の検証
      expect(data.post.reposted_by).toBeDefined();
      expect(data.post.reposted_by.id).toBe(repostPost.id);
      expect(data.post.reposted_by.username).toBe(testUser.username);
      expect(data.post.reposted_by.user_id).toBe(testUser.id);
      
      // リポスト数とリポスト状態の検証
      expect(data.post.repost_count).toBe(1);
      expect(data.post.is_reposted).toBe(true);
    });
    
    test('リポストされていない記事にはリポスト情報が含まれない', async () => {
      // リポストされていない記事の詳細を取得
      const request = createTestRequest(`/api/posts/${testPost.id}?include_related=true`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: testPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿データの検証
      expect(data.post).toBeDefined();
      expect(data.post.id).toBe(testPost.id);
      
      // リポスト情報がないことを検証
      expect(data.post.reposted_by).toBeNull();
      expect(data.post.repost_count).toBe(0);
      expect(data.post.is_reposted).toBe(false);
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
    
    test('メディア付き投稿の詳細と関連メディアを取得できる', async () => {
      // GET リクエストのテスト
      const request = createTestRequest(`/api/posts/${mediaPost.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: mediaPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿データの検証
      expect(data.post).toBeDefined();
      expect(data.post.id).toBe(mediaPost.id);
      expect(data.post.content).toBe(mediaPost.content);
      expect(data.post.media_count).toBe(2);
      
      // メディア情報の検証
      expect(data.post.media).toBeDefined();
      expect(Array.isArray(data.post.media)).toBe(true);
      expect(data.post.media.length).toBe(2);
      
      // 各メディアアイテムの検証
      const mediaItems = data.post.media;
      expect(mediaItems[0].media_type).toBe('image');
      expect(mediaItems[0].url).toBeDefined();
      expect(mediaItems[0].width).toBeDefined();
      expect(mediaItems[0].height).toBeDefined();
      
      expect(mediaItems[1].media_type).toBe('image');
      expect(mediaItems[1].url).toBeDefined();
    });
    
    // 動画付き投稿のテスト
    test('動画付き投稿の詳細を取得できる', async () => {
      // 動画付き投稿を作成
      const videoPost = await db.insert(posts).values({
        user_id: testUser.id,
        content: '動画付き投稿のテスト',
        post_type: 'original',
        media_count: 1,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // 投稿に紐づく動画メディアを追加
      await db.insert(post_media).values({
        post_id: videoPost.id,
        media_type: 'video',
        url: 'https://example.com/video.mp4',
        width: 1280,
        height: 720,
        duration_sec: 8,
        created_at: new Date()
      });
      
      // GET リクエストのテスト
      const request = createTestRequest(`/api/posts/${videoPost.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: videoPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿データの検証
      expect(data.post).toBeDefined();
      expect(data.post.id).toBe(videoPost.id);
      expect(data.post.content).toBe('動画付き投稿のテスト');
      expect(data.post.media_count).toBe(1);
      
      // メディア情報の検証
      expect(data.post.media).toBeDefined();
      expect(Array.isArray(data.post.media)).toBe(true);
      expect(data.post.media.length).toBe(1);
      
      // 動画メディアアイテムの検証
      const mediaItem = data.post.media[0];
      expect(mediaItem.media_type).toBe('video');
      expect(mediaItem.url).toBe('https://example.com/video.mp4');
      expect(mediaItem.width).toBe(1280);
      expect(mediaItem.height).toBe(720);
      expect(mediaItem.duration_sec).toBe(8);
    });

    // include_related パラメータのテスト
    test('include_related=trueの場合、関連投稿データが含まれる', async () => {
      // 引用投稿を作成
      const quotePost = await db.insert(posts).values({
        user_id: testUser.id,
        content: 'これは引用投稿です',
        post_type: 'quote',
        quote_of_post_id: otherUserPost.id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // include_related=trueで引用投稿の詳細を取得
      const request = createTestRequest(`/api/posts/${quotePost.id}?include_related=true`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: quotePost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 関連投稿データが含まれていることを検証
      expect(data.post.quote_of_post).toBeDefined();
      expect(data.post.quote_of_post.id).toBe(otherUserPost.id);
      expect(data.post.quote_of_post.content).toBe(otherUserPost.content);
    });

    test('include_related=falseの場合、関連投稿データが含まれない', async () => {
      // 引用投稿を作成
      const quotePost = await db.insert(posts).values({
        user_id: testUser.id,
        content: 'これは引用投稿です',
        post_type: 'quote',
        quote_of_post_id: otherUserPost.id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // include_related=falseで引用投稿の詳細を取得
      const request = createTestRequest(`/api/posts/${quotePost.id}?include_related=false`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: quotePost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 関連投稿データが含まれていないことを検証
      expect(data.post.quote_of_post).toBeUndefined();
      expect(data.post.in_reply_to_post).toBeUndefined();
      expect(data.post.repost_of_post).toBeUndefined();
    });

    test('include_relatedパラメータが省略された場合、関連投稿データが含まれない', async () => {
      // 返信投稿を作成
      const replyPost = await db.insert(posts).values({
        user_id: testUser.id,
        content: 'これは返信投稿です',
        post_type: 'reply',
        in_reply_to_post_id: otherUserPost.id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // include_relatedパラメータなしで返信投稿の詳細を取得
      const request = createTestRequest(`/api/posts/${replyPost.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: replyPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 関連投稿データが含まれていないことを検証
      expect(data.post.in_reply_to_post).toBeUndefined();
      expect(data.post.quote_of_post).toBeUndefined();
      expect(data.post.repost_of_post).toBeUndefined();
    });

    test('include_related=trueでリポスト投稿の場合、リポスト元データが含まれる', async () => {
      // リポスト投稿を作成
      const repostPost = await db.insert(posts).values({
        user_id: testUser.id,
        content: '',
        post_type: 'repost',
        repost_of_post_id: otherUserPost.id,
        created_at: new Date(),
        updated_at: new Date()
      }).returning().then(res => res[0]);
      
      // include_related=trueでリポスト投稿の詳細を取得
      const request = createTestRequest(`/api/posts/${repostPost.id}?include_related=true`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request, { params: { id: repostPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // リポスト元データが含まれていることを検証
      expect(data.post.repost_of_post).toBeDefined();
      expect(data.post.repost_of_post.id).toBe(otherUserPost.id);
      expect(data.post.repost_of_post.content).toBe(otherUserPost.content);
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