/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET } from '@/app/api/engagement/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, posts, likes, blocks, bookmarks } from '@/db/schema';
import { eq, and, desc, count, asc, isNull } from 'drizzle-orm';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

// テスト用のグローバル変数に型を追加
declare global {
  var currentTestUserId: string;
}

// テスト用のユーザーデータを動的に生成
function createTestUsers() {
  // グローバルに設定されたClerk IDを使用
  global.currentTestUserId = `test_user_id_${Date.now()}_1`;
  
  return [
    {
      clerk_id: global.currentTestUserId,
      username: 'testuser_engagement',
      email: 'testuser_engagement@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_2`,
      username: 'otheruser_engagement',
      email: 'otheruser_engagement@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/image2.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_3`,
      username: 'blockeduser_engagement',
      email: 'blockeduser_engagement@example.com',
      first_name: 'Blocked',
      last_name: 'User',
      profile_image_url: 'https://example.com/image3.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_4`,
      username: 'banneduser_engagement',
      email: 'banneduser_engagement@example.com',
      first_name: 'Banned',
      last_name: 'User',
      profile_image_url: 'https://example.com/image4.jpg',
      role: 'user',
      is_banned: true
    }
  ];
}

// テスト用の投稿を作成するヘルパー関数
async function createTestPosts(userIds: number[], count: number = 3) {
  const createdPosts = [];
  
  // 通常の投稿を作成
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    
    for (let j = 0; j < count; j++) {
      const newPost = await db.insert(posts).values({
        user_id: userId,
        content: `テスト投稿 ${i + 1}-${j + 1}`,
        post_type: 'post',
        created_at: new Date(Date.now() - (i * 3600000) - (j * 60000)), // タイムスタンプを少しずらす
        is_deleted: false,
        is_hidden: false
      }).returning().then(r => r[0]);
      
      createdPosts.push(newPost);
    }
  }
  
  return createdPosts;
}

// 返信を作成するヘルパー関数
async function createReply(userId: number, replyToPostId: number) {
  return await db.insert(posts).values({
    user_id: userId,
    content: `返信投稿 to ${replyToPostId}`,
    post_type: 'reply',
    in_reply_to_post_id: replyToPostId,
    created_at: new Date(),
    is_deleted: false,
    is_hidden: false
  }).returning().then(r => r[0]);
}

// いいねを作成するヘルパー関数
async function createLike(userId: number, postId: number) {
  // 同じ組み合わせが存在しないことを確認
  const [existingLike] = await db.select()
    .from(likes)
    .where(and(
      eq(likes.user_id, userId),
      eq(likes.post_id, postId)
    ))
    .limit(1);
  
  if (existingLike) {
    return existingLike;
  }
  
  return await db.insert(likes).values({
    user_id: userId,
    post_id: postId,
    created_at: new Date(),
    is_deleted: false
  }).returning().then(r => r[0]);
}

// ブックマークを作成するヘルパー関数
async function createBookmark(userId: number, postId: number) {
  return await db.insert(bookmarks).values({
    user_id: userId,
    post_id: postId,
    created_at: new Date(),
    is_deleted: false
  }).returning().then(r => r[0]);
}

// ブロックを作成するヘルパー関数
async function createBlock(blockerId: number, blockedId: number) {
  return await db.insert(blocks).values({
    blocker_id: blockerId,
    blocked_id: blockedId,
    created_at: new Date(),
    is_deleted: false
  }).returning().then(r => r[0]);
}

// 大量の投稿といいねを作成するヘルパー関数
async function createPostsWithLikes(userId: number, otherUserId: number, count: number) {
  const createdPosts = [];
  const createdLikes = [];
  
  // まず投稿を作成
  for (let i = 0; i < count; i++) {
    const newPost = await db.insert(posts).values({
      user_id: otherUserId,
      content: `ページネーションテスト投稿 ${i + 1}`,
      post_type: 'post',
      created_at: new Date(Date.now() - (i * 60000)), // タイムスタンプを少しずらす
      is_deleted: false,
      is_hidden: false
    }).returning().then(r => r[0]);
    
    createdPosts.push(newPost);
    
    // 各投稿にいいねを作成
    const newLike = await db.insert(likes).values({
      user_id: userId,
      post_id: newPost.id,
      created_at: new Date(Date.now() - (i * 30000)), // タイムスタンプを少しずらす
      is_deleted: false
    }).returning().then(r => r[0]);
    
    createdLikes.push(newLike);
  }
  
  return { posts: createdPosts, likes: createdLikes };
}

describe('Engagement API', () => {
  let testUsers: any[] = [];
  let testPosts: any[] = [];
  let userLikes: any[] = [];
  let userReplies: any[] = [];
  
  beforeEach(async () => {
    // 毎回ユニークなユーザーデータを生成
    const userData = createTestUsers();
    
    // テストユーザーをデータベースに挿入
    testUsers = await Promise.all(
      userData.map(user => db.insert(users).values(user).returning())
    ).then(results => results.map(r => r[0]));
    
    const [currentUser, otherUser, blockedUser, bannedUser] = testUsers;
    
    // テスト投稿を作成
    testPosts = await createTestPosts([otherUser.id, blockedUser.id, bannedUser.id]);
    
    // 現在のユーザーが他のユーザーの投稿にいいねする
    userLikes = [];
    for (let i = 0; i < 5; i++) {
      if (i < testPosts.length) {
        const like = await createLike(currentUser.id, testPosts[i].id);
        userLikes.push(like);
      }
    }
    
    // 現在のユーザーが投稿に返信する
    userReplies = [];
    for (let i = 0; i < 3; i++) {
      if (i < testPosts.length) {
        const reply = await createReply(currentUser.id, testPosts[i].id);
        userReplies.push(reply);
      }
    }
    
    // 他のユーザーの投稿をブックマーク
    for (let i = 0; i < 2; i++) {
      if (i < testPosts.length) {
        await createBookmark(currentUser.id, testPosts[i].id);
      }
    }
    
    // blockedUserをブロック
    await createBlock(currentUser.id, blockedUser.id);
  });
  
  describe('GET /api/engagement', () => {
    test('いいねした投稿のリストを取得できる', async () => {
      // APIリクエスト
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/engagement?type=likes', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts).toBeDefined();
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.posts.length).toBeGreaterThan(0);
      
      // いいねした投稿のみが含まれることを確認
      const likedPostIds = userLikes.map(like => like.post_id);
      data.posts.forEach((post: any) => {
        expect(likedPostIds).toContain(post.id);
      });
      
      // ブロックしたユーザーの投稿が含まれないことを確認
      const blockedUserId = testUsers[2].id;
      data.posts.forEach((post: any) => {
        expect(post.user_id).not.toBe(blockedUserId);
      });
      
      // BANされたユーザーの投稿が含まれないことを確認
      const bannedUserId = testUsers[3].id;
      data.posts.forEach((post: any) => {
        expect(post.user_id).not.toBe(bannedUserId);
      });
      
      // いいね状態が含まれることを確認
      data.posts.forEach((post: any) => {
        expect(post.is_liked).toBe(true);
        expect(post.like_count).toBeGreaterThanOrEqual(1);
      });
    });
    
    test('コメントした投稿のリストを取得できる', async () => {
      // APIリクエスト
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/engagement?type=comments', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts).toBeDefined();
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.posts.length).toBeGreaterThan(0);
      
      // 返信投稿が含まれていることを確認
      const replyIds = userReplies.map(reply => reply.id);
      data.posts.forEach((post: any) => {
        expect(replyIds).toContain(post.id);
        expect(post.post_type).toBe('reply');
      });
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const request = createTestRequest('/api/engagement', 'GET');
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('存在しないユーザーの場合は404エラーを返す', async () => {
      // 存在しないユーザーIDを設定
      global.currentTestUserId = 'nonexistent_user_id';
      
      const request = createTestRequest('/api/engagement', 'GET', null, {});
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('ページネーション機能でlimitパラメータが正しく使われる', async () => {
      // ページネーション用に追加の投稿といいねを作成
      const { posts: additionalPosts, likes: additionalLikes } = await createPostsWithLikes(
        testUsers[0].id,  // currentUser
        testUsers[1].id,  // otherUser
        5  // 5つの追加投稿+いいね
      );
      
      // APIリクエスト - limitを2に設定（デフォルトより少ない）
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/engagement?type=likes&limit=2', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts).toHaveLength(2); // limitで指定した通り2件のみ取得
      
      // ページネーション情報の確認
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.nextCursor).toBeDefined();
    });
    
    test('カーソルベースのページネーションが機能する', async () => {
      // ページネーション用に追加の投稿といいねを作成
      const { posts: additionalPosts, likes: additionalLikes } = await createPostsWithLikes(
        testUsers[0].id,  // currentUser
        testUsers[1].id,  // otherUser
        6  // 6つの追加投稿+いいね
      );
      
      // 1ページ目を取得 (limit=3に設定)
      const testUserId = testUsers[0].clerk_id;
      const firstPageRequest = createTestRequest('/api/engagement?type=likes&limit=3', 'GET', null, {}, testUserId);
      const firstPageResponse = await GET(firstPageRequest);
      const firstPageData = await firstPageResponse.json();
      
      expect(firstPageData.posts).toHaveLength(3);
      expect(firstPageData.pagination.hasNextPage).toBe(true);
      expect(firstPageData.pagination.nextCursor).toBeDefined();
      
      // 2ページ目を取得
      const cursor = firstPageData.pagination.nextCursor;
      const secondPageRequest = createTestRequest(`/api/engagement?type=likes&limit=3&cursor=${cursor}`, 'GET', null, {}, testUserId);
      const secondPageResponse = await GET(secondPageRequest);
      const secondPageData = await secondPageResponse.json();
      
      expect(secondPageData.posts).toBeDefined();
      expect(secondPageData.posts.length).toBeGreaterThan(0);
      
      // 1ページ目と2ページ目で投稿が重複しないことを確認
      const firstPageIds = firstPageData.posts.map((p: any) => p.id);
      const secondPageIds = secondPageData.posts.map((p: any) => p.id);
      
      firstPageIds.forEach((id: number) => {
        expect(secondPageIds).not.toContain(id);
      });
    });
    
    test('いいねやコメントがない場合は空配列を返す', async () => {
      // 別のユーザー（テスト内で作成したがいいね・コメントは作成していない）
      const testUserId = testUsers[1].clerk_id;
      global.currentTestUserId = testUserId;
      
      const request = createTestRequest('/api/engagement?type=likes', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts).toHaveLength(0);
      expect(data.pagination.hasNextPage).toBe(false);
      expect(data.pagination.nextCursor).toBeNull();
    });
    
    test('デフォルトでいいね（likes）モードが使われる', async () => {
      // タイプパラメータなしで取得
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/engagement', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts).toBeDefined();
      
      // 返ってきたデータがいいねモードと一致することを確認
      // いいねモードの場合は、いいねした投稿のIDが含まれる
      const likedPostIds = userLikes.map(like => like.post_id);
      data.posts.forEach((post: any) => {
        expect(likedPostIds).toContain(post.id);
      });
    });
    
    test('いいね・ブックマーク・返信の数が正しく含まれる', async () => {
      // APIリクエスト
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/engagement?type=likes', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts.length).toBeGreaterThan(0);
      
      // 各投稿のエンゲージメント情報を確認
      data.posts.forEach((post: any) => {
        expect(post).toHaveProperty('like_count');
        expect(post).toHaveProperty('is_liked');
        expect(post).toHaveProperty('reply_count');
        expect(post).toHaveProperty('bookmark_count');
        expect(post).toHaveProperty('is_bookmarked');
        
        // いいねモードではis_likedはtrueであるはず
        expect(post.is_liked).toBe(true);
      });
      
      // ブックマークした投稿を確認
      const bookmarkedPosts = data.posts.filter((post: any) => post.is_bookmarked);
      expect(bookmarkedPosts.length).toBeGreaterThan(0);
    });
    
    test('存在しないタイプの場合はデフォルトのlikesが使われる', async () => {
      // 無効なタイプパラメータ
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/engagement?type=invalid', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts).toBeDefined();
      
      // 返ってきたデータがいいねモードと一致することを確認
      const likedPostIds = userLikes.map(like => like.post_id);
      data.posts.forEach((post: any) => {
        expect(likedPostIds).toContain(post.id);
      });
    });
  });
}); 