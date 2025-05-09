/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET, POST } from '@/app/api/posts/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, posts, blocks } from '@/db/schema';
import { eq, and, desc, asc, count } from 'drizzle-orm';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

// テスト用のグローバル変数に型を追加
declare global {
  var currentTestUserId: string;
}

// テスト対象の投稿タイプ
const POST_TYPES = ['original', 'reply', 'quote', 'repost'] as const;

describe('Posts API', () => {
  // テスト用のユーザーを保存
  let testUser: any;
  let otherUser: any;
  let blockedUser: any;
  let testPosts: any[] = [];

  beforeEach(async () => {
    // テストユーザーを作成
    const testUserId = `test_user_id_${Date.now()}`;
    global.currentTestUserId = testUserId;
    
    testUser = await db.insert(users).values({
      clerk_id: testUserId,
      username: 'testuser_posts',
      email: 'testuser_posts@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // 別のテストユーザーを作成
    otherUser = await db.insert(users).values({
      clerk_id: `other_user_id_${Date.now()}`,
      username: 'otheruser_posts',
      email: 'otheruser_posts@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/other.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // ブロックされるユーザーを作成
    blockedUser = await db.insert(users).values({
      clerk_id: `blocked_user_id_${Date.now()}`,
      username: 'blockeduser_posts',
      email: 'blockeduser_posts@example.com',
      first_name: 'Blocked',
      last_name: 'User',
      profile_image_url: 'https://example.com/blocked.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
    
    // テスト投稿を作成
    testPosts = [];
    
    // テストユーザーの投稿を作成
    const post1 = await db.insert(posts).values({
      user_id: testUser.id,
      content: 'テストユーザーの最初の投稿です',
      post_type: 'original',
      created_at: new Date(Date.now() - 1000),
      updated_at: new Date(Date.now() - 1000)
    }).returning().then(res => res[0]);
    
    testPosts.push(post1);
    
    // 別のユーザーの投稿を作成
    const post2 = await db.insert(posts).values({
      user_id: otherUser.id,
      content: '別のユーザーの投稿です',
      post_type: 'original',
      created_at: new Date(Date.now() - 2000),
      updated_at: new Date(Date.now() - 2000)
    }).returning().then(res => res[0]);
    
    testPosts.push(post2);
    
    // テストユーザーの返信投稿を作成
    const post3 = await db.insert(posts).values({
      user_id: testUser.id,
      content: 'これは返信投稿です',
      post_type: 'reply',
      in_reply_to_post_id: post2.id,
      created_at: new Date(Date.now() - 3000),
      updated_at: new Date(Date.now() - 3000)
    }).returning().then(res => res[0]);
    
    testPosts.push(post3);
    
    // ブロックされるユーザーの投稿を作成
    const post4 = await db.insert(posts).values({
      user_id: blockedUser.id,
      content: 'ブロックされるユーザーの投稿です',
      post_type: 'original',
      created_at: new Date(Date.now() - 4000),
      updated_at: new Date(Date.now() - 4000)
    }).returning().then(res => res[0]);
    
    testPosts.push(post4);
  });

  // 投稿一覧の取得テスト
  describe('GET /api/posts', () => {
    test('認証済みユーザーは投稿一覧を取得できる', async () => {
      // テスト用リクエストの作成
      const request = createTestRequest('/api/posts', 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿一覧の検証
      expect(data.posts).toBeDefined();
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.posts.length).toBeGreaterThan(0);
      
      // 投稿の内容検証
      const firstPost = data.posts[0];
      expect(firstPost).toHaveProperty('id');
      expect(firstPost).toHaveProperty('content');
      expect(firstPost).toHaveProperty('user_id');
      expect(firstPost).toHaveProperty('created_at');
      expect(firstPost).toHaveProperty('post_type');
      
      // 投稿者情報の検証
      expect(firstPost.user).toBeDefined();
      expect(firstPost.user).toHaveProperty('username');
      expect(firstPost.user).toHaveProperty('profile_image_url');
      
      // ページネーション情報の検証
      expect(data.pagination).toBeDefined();
      expect(data.pagination).toHaveProperty('hasNextPage');
      expect(data.pagination).toHaveProperty('nextCursor');
    });
    
    test('特定のユーザーの投稿のみを取得できる', async () => {
      // テスト用リクエストの作成（特定ユーザーの投稿のみ）
      const request = createTestRequest(`/api/posts?userId=${testUser.id}`, 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 投稿が指定したユーザーのものであることを確認
      expect(data.posts).toBeDefined();
      expect(data.posts.length).toBeGreaterThan(0);
      
      // すべての投稿がテストユーザーのものであることを確認
      data.posts.forEach((post: any) => {
        expect(post.user_id).toBe(testUser.id);
      });
    });
    
    test('ページネーションが正しく機能する', async () => {
      // 追加の投稿を作成（ページネーションをテストするため）
      const additionalPosts = [];
      for (let i = 0; i < 10; i++) {
        const post = await db.insert(posts).values({
          user_id: testUser.id,
          content: `ページネーションテスト投稿 ${i}`,
          post_type: 'original',
          created_at: new Date(Date.now() - 5000 - (i * 100)),
          updated_at: new Date(Date.now() - 5000 - (i * 100))
        }).returning().then(res => res[0]);
        
        additionalPosts.push(post);
      }
      
      // 1ページ目を取得
      const limit = 5;
      const firstPageRequest = createTestRequest(`/api/posts?limit=${limit}`, 'GET', null, {}, testUser.clerk_id);
      const firstPageResponse = await GET(firstPageRequest);
      const firstPageData = await firstPageResponse.json();
      
      // 1ページ目の検証
      expect(firstPageResponse.status).toBe(200);
      expect(firstPageData.posts.length).toBe(limit);
      expect(firstPageData.pagination.hasNextPage).toBe(true);
      expect(firstPageData.pagination.nextCursor).toBeDefined();
      
      // 2ページ目を取得
      const cursor = firstPageData.pagination.nextCursor;
      const secondPageRequest = createTestRequest(`/api/posts?limit=${limit}&cursor=${cursor}`, 'GET', null, {}, testUser.clerk_id);
      const secondPageResponse = await GET(secondPageRequest);
      const secondPageData = await secondPageResponse.json();
      
      // 2ページ目の検証
      expect(secondPageResponse.status).toBe(200);
      expect(secondPageData.posts.length).toBeGreaterThan(0);
      
      // 1ページ目と2ページ目の投稿が重複していないことを確認
      const firstPageIds = firstPageData.posts.map((post: any) => post.id);
      const secondPageIds = secondPageData.posts.map((post: any) => post.id);
      
      for (const id of firstPageIds) {
        expect(secondPageIds).not.toContain(id);
      }
    });
    
    test('ブロックしたユーザーの投稿は表示されない', async () => {
      // ブロック関係を作成
      await db.insert(blocks).values({
        blocker_id: testUser.id,
        blocked_id: blockedUser.id,
        created_at: new Date(),
        is_deleted: false
      });
      
      // テスト用リクエストの作成
      const request = createTestRequest('/api/posts', 'GET', null, {}, testUser.clerk_id);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // ブロックしたユーザーの投稿が含まれていないことを確認
      const blockedPostIds = testPosts
        .filter(post => post.user_id === blockedUser.id)
        .map(post => post.id);
      
      const receivedPostIds = data.posts.map((post: any) => post.id);
      
      blockedPostIds.forEach(id => {
        expect(receivedPostIds).not.toContain(id);
      });
    });
    
    test('ソート順を指定できる', async () => {
      // 明示的な日付間隔を持つ投稿を作成
      // 古いものから順に作成
      const sortTestPosts = [];
      const baseDate = new Date(Date.now() - 100000);
      
      for (let i = 0; i < 3; i++) {
        const postDate = new Date(baseDate.getTime() + (i * 10000)); // 10秒間隔
        const post = await db.insert(posts).values({
          user_id: testUser.id,
          content: `ソート順テスト投稿 ${i}`,
          post_type: 'original',
          created_at: postDate,
          updated_at: postDate
        }).returning().then(res => res[0]);
        
        sortTestPosts.push(post);
      }
      
      // 昇順（古い順）でリクエスト
      const ascRequest = createTestRequest('/api/posts?sort=asc', 'GET', null, {}, testUser.clerk_id);
      const ascResponse = await GET(ascRequest);
      
      // レスポンスの検証
      expect(ascResponse.status).toBe(200);
      const ascData = await ascResponse.json();
      
      // 投稿のソート順が正しいことを確認
      // 最も古い投稿のIDが新しい投稿より前に来るか確認
      const oldestPostId = sortTestPosts[0].id;
      const newestPostId = sortTestPosts[sortTestPosts.length - 1].id;
      
      const ascPostIds = ascData.posts.map((post: any) => post.id);
      const oldestIndex = ascPostIds.indexOf(oldestPostId);
      const newestIndex = ascPostIds.indexOf(newestPostId);
      
      // 最も古い投稿が最も新しい投稿よりも前にあるか（存在する場合のみ）
      if (oldestIndex !== -1 && newestIndex !== -1) {
        expect(oldestIndex).toBeLessThan(newestIndex);
      }
      
      // 降順（新しい順）でリクエスト
      const descRequest = createTestRequest('/api/posts?sort=desc', 'GET', null, {}, testUser.clerk_id);
      const descResponse = await GET(descRequest);
      
      // レスポンスの検証
      expect(descResponse.status).toBe(200);
      const descData = await descResponse.json();
      
      // 投稿のソート順が正しいことを確認
      // 最も新しい投稿のIDが古い投稿より前に来るか確認
      const descPostIds = descData.posts.map((post: any) => post.id);
      const oldestIndexDesc = descPostIds.indexOf(oldestPostId);
      const newestIndexDesc = descPostIds.indexOf(newestPostId);
      
      // 最も新しい投稿が最も古い投稿よりも前にあるか（存在する場合のみ）
      if (oldestIndexDesc !== -1 && newestIndexDesc !== -1) {
        expect(newestIndexDesc).toBeLessThan(oldestIndexDesc);
      }
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // テスト用リクエストの作成（認証なし）
      global.currentTestUserId = null as unknown as string;
      const request = createTestRequest('/api/posts', 'GET');
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('存在しないユーザーIDの場合は404エラーを返す', async () => {
      // 存在しないユーザーIDを設定
      global.currentTestUserId = 'nonexistent_user_id';
      
      const request = createTestRequest('/api/posts', 'GET');
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  // 投稿作成のテスト
  describe('POST /api/posts', () => {
    test('認証済みユーザーは新しい投稿を作成できる', async () => {
      // テスト用リクエストの作成
      const body = { content: '新しい投稿です' };
      const request = createTestRequest('/api/posts', 'POST', body, {}, testUser.clerk_id);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.post).toBeDefined();
      expect(data.post.content).toBe('新しい投稿です');
      expect(data.post.user_id).toBe(testUser.id);
      expect(data.post.post_type).toBe('original');
      
      // DBに投稿が保存されていることを確認
      const [savedPost] = await db.select()
        .from(posts)
        .where(eq(posts.id, data.post.id))
        .limit(1);
      
      expect(savedPost).not.toBeNull();
      expect(savedPost?.content).toBe('新しい投稿です');
    });
    
    test('さまざまな投稿タイプを作成できる', async () => {
      // original以外の投稿タイプのテスト
      for (const postType of POST_TYPES) {
        if (postType === 'original') continue; // originalは上のテストでカバー
        
        let body: any = { 
          content: `これは${postType}タイプの投稿です`, 
          post_type: postType 
        };
        
        // 投稿タイプに応じた追加パラメータを設定
        if (postType === 'reply') {
          body.in_reply_to_post_id = testPosts[0].id;
        } else if (postType === 'quote') {
          body.quote_of_post_id = testPosts[0].id;
        } else if (postType === 'repost') {
          body.repost_of_post_id = testPosts[0].id;
        }
        
        const request = createTestRequest('/api/posts', 'POST', body, {}, testUser.clerk_id);
        const response = await POST(request);
        
        // レスポンスの検証
        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.post.post_type).toBe(postType);
        
        // 追加パラメータの検証
        if (postType === 'reply') {
          expect(data.post.in_reply_to_post_id).toBe(testPosts[0].id);
        } else if (postType === 'quote') {
          expect(data.post.quote_of_post_id).toBe(testPosts[0].id);
        } else if (postType === 'repost') {
          expect(data.post.repost_of_post_id).toBe(testPosts[0].id);
        }
      }
    });
    
    test('投稿内容のバリデーションが機能する', async () => {
      // 空の内容でリクエスト
      const emptyBody = { content: '' };
      const emptyRequest = createTestRequest('/api/posts', 'POST', emptyBody, {}, testUser.clerk_id);
      const emptyResponse = await POST(emptyRequest);
      
      // 空の内容は400エラー
      expect(emptyResponse.status).toBe(400);
      const emptyData = await emptyResponse.json();
      expect(emptyData.error).toBeDefined();
      
      // 長すぎる内容でリクエスト
      const longContent = 'a'.repeat(501); // 500文字超え
      const longBody = { content: longContent };
      const longRequest = createTestRequest('/api/posts', 'POST', longBody, {}, testUser.clerk_id);
      const longResponse = await POST(longRequest);
      
      // 長すぎる内容は400エラー
      expect(longResponse.status).toBe(400);
      const longData = await longResponse.json();
      expect(longData.error).toBeDefined();
    });
    
    test('返信先の投稿が存在しない場合は404エラーを返す', async () => {
      // 存在しない投稿IDで返信を作成
      const body = { 
        content: 'これは存在しない投稿への返信です', 
        post_type: 'reply',
        in_reply_to_post_id: 99999999 // 存在しないID
      };
      
      const request = createTestRequest('/api/posts', 'POST', body, {}, testUser.clerk_id);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('引用元の投稿が存在しない場合は404エラーを返す', async () => {
      // 存在しない投稿IDで引用を作成
      const body = { 
        content: 'これは存在しない投稿の引用です', 
        post_type: 'quote',
        quote_of_post_id: 99999999 // 存在しないID
      };
      
      const request = createTestRequest('/api/posts', 'POST', body, {}, testUser.clerk_id);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('リポスト元の投稿が存在しない場合は404エラーを返す', async () => {
      // 存在しない投稿IDでリポストを作成
      const body = { 
        content: 'これは存在しない投稿のリポストです', 
        post_type: 'repost',
        repost_of_post_id: 99999999 // 存在しないID
      };
      
      const request = createTestRequest('/api/posts', 'POST', body, {}, testUser.clerk_id);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // テスト用リクエストの作成（認証なし）
      global.currentTestUserId = null as unknown as string;
      const body = { content: '認証なしの投稿' };
      const request = createTestRequest('/api/posts', 'POST', body);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('存在しないユーザーIDの場合は404エラーを返す', async () => {
      // 存在しないユーザーIDを設定
      global.currentTestUserId = 'nonexistent_user_id';
      
      const body = { content: '存在しないユーザーの投稿' };
      const request = createTestRequest('/api/posts', 'POST', body);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
