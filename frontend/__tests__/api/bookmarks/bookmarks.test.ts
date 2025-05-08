/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET } from '@/app/api/bookmarks/route';
import { GET as GET_POST_BOOKMARK, POST as POST_POST_BOOKMARK } from '@/app/api/posts/[id]/bookmark/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, posts, bookmarks } from '@/db/schema';
import { eq, and, desc, count, asc } from 'drizzle-orm';
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
      username: 'testuser_bookmarks',
      email: 'testuser_bookmarks@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_2`,
      username: 'otheruser_bookmarks',
      email: 'otheruser_bookmarks@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/image2.jpg',
      role: 'user'
    }
  ];
}

// 投稿を作成するヘルパー関数
async function createPosts(userId: number, count: number) {
  const createdPosts = [];
  
  for (let i = 0; i < count; i++) {
    const newPost = await db.insert(posts).values({
      user_id: userId,
      content: `テスト投稿 ${i + 1} for bookmarks test`,
      post_type: 'post',
      created_at: new Date(Date.now() - (i * 3600000)) // i時間前
    }).returning().then(r => r[0]);
    
    createdPosts.push(newPost);
  }
  
  return createdPosts;
}

// 特殊文字を含む投稿を作成するヘルパー関数
async function createSpecialCharPost(userId: number) {
  return await db.insert(posts).values({
    user_id: userId,
    content: '特殊文字テスト：日本語≈†ø、絵文字😀🎉🚀、HTML<script>alert("test")</script>',
    post_type: 'post',
    created_at: new Date()
  }).returning().then(r => r[0]);
}

// 長いテキストコンテンツの投稿を作成するヘルパー関数
async function createLongTextPost(userId: number) {
  // 3000文字程度のテキスト
  const longText = 'これは長いテキストコンテンツのテストです。'.repeat(150);
  
  return await db.insert(posts).values({
    user_id: userId,
    content: longText,
    post_type: 'post',
    created_at: new Date()
  }).returning().then(r => r[0]);
}

// 大量の投稿とブックマークを作成するヘルパー関数
async function createManyPostsAndBookmarks(userId: number, count: number) {
  const createdPosts = await createPosts(userId, count);
  const bookmarkedPosts = [];
  
  // 全ての投稿をブックマーク
  for (const post of createdPosts) {
    const bookmark = await db.insert(bookmarks).values({
      user_id: userId,
      post_id: post.id,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 1000000)) // ランダムな時間
    }).returning().then(r => r[0]);
    
    bookmarkedPosts.push({ post, bookmark });
  }
  
  return bookmarkedPosts;
}

// ブックマークを作成するヘルパー関数
async function createBookmarks(userId: number, postIds: number[]) {
  const createdBookmarks = [];
  
  for (let i = 0; i < postIds.length; i++) {
    const newBookmark = await db.insert(bookmarks).values({
      user_id: userId,
      post_id: postIds[i],
      created_at: new Date(Date.now() - (i * 60000)) // i分前
    }).returning().then(r => r[0]);
    
    createdBookmarks.push(newBookmark);
  }
  
  return createdBookmarks;
}

describe('Bookmarks API', () => {
  let currentUser: any;
  let otherUser: any;
  let testPosts: any[] = [];
  let bookmarkedPosts: any[] = [];

  beforeEach(async () => {
    // 毎回ユニークなユーザーデータを生成
    const testUsers = createTestUsers();
    
    // テストユーザーをデータベースに挿入
    [currentUser, otherUser] = await Promise.all(
      testUsers.map(user => db.insert(users).values(user).returning())
    ).then(results => results.map(r => r[0]));
    
    // 投稿を作成（現在のユーザーが5件、他のユーザーが2件）
    const currentUserPosts = await createPosts(currentUser.id, 5);
    const otherUserPosts = await createPosts(otherUser.id, 2);
    
    testPosts = [...currentUserPosts, ...otherUserPosts];
    
    // 最初の3件をブックマーク
    const postsToBookmark = testPosts.slice(0, 3);
    bookmarkedPosts = await createBookmarks(currentUser.id, postsToBookmark.map(p => p.id));
  });

  describe('GET /api/bookmarks', () => {
    test('ブックマーク一覧を取得できる', async () => {
      // APIリクエスト - 現在のテストユーザーのclerk_idを使用
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/bookmarks', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts).toBeDefined();
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.posts.length).toBe(3); // ブックマークした3件の投稿が取得できる
      
      if (data.posts.length > 0) {
        const post = data.posts[0];
        expect(post.is_bookmarked).toBe(true);
        expect(post.user).toBeDefined();
      }
    });

    test('ブックマークがない場合は空配列を返す', async () => {
      // 別ユーザーでリクエスト（ブックマークなし）
      const testUserId = otherUser.clerk_id;
      global.currentTestUserId = testUserId;
      
      const request = createTestRequest('/api/bookmarks', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts).toHaveLength(0);
      
      // レスポンス構造に応じて確認
      if (data.pagination) {
        // paginationオブジェクトがある場合
        expect(data.pagination.nextCursor === null || data.pagination.nextCursor === undefined).toBeTruthy();
      } else if (data.nextCursor !== undefined) {
        // nextCursorが直接ある場合
        expect(data.nextCursor).toBeNull();
      }
    });

    test('ページネーション機能でlimitパラメータが正しく使われる', async () => {
      // さらに投稿とブックマークを追加
      const morePosts = await createPosts(currentUser.id, 3);
      await createBookmarks(currentUser.id, morePosts.map(p => p.id));
      
      // APIリクエスト - limitを2に設定
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/bookmarks?limit=2', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts).toHaveLength(2); // limitで指定した通り2件のみ取得
      
      // ページネーション情報の存在確認（レスポンス構造に応じて）
      if (data.pagination) {
        // paginationオブジェクトがある場合
        expect(data.pagination.hasNextPage).toBe(true);
        expect(data.pagination.nextCursor).toBeDefined();
      } else {
        // nextCursorが直接ある場合
        expect(data.nextCursor).toBeDefined();
      }
    });

    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const request = createTestRequest('/api/bookmarks', 'GET');
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('存在しないユーザーの場合は404エラーを返す', async () => {
      // 存在しないユーザーIDを設定
      global.currentTestUserId = 'nonexistent_user_id';
      
      const request = createTestRequest('/api/bookmarks', 'GET', null, {});
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('ソート順が適切に機能する', async () => {
      // APIリクエスト - デフォルトのソート順
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/bookmarks', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.posts.length).toBeGreaterThan(0);
      
      // ソートされていることを確認（何らかの基準でソートされていればOK）
      if (data.posts.length >= 2) {
        // 一貫したソート順であることを確認（基準は問わない）
        const sortedByDate = [...data.posts].sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        const sortedById = [...data.posts].sort((a, b) => b.id - a.id);
        
        // 元の順序が日付かIDの降順のどちらかに一致するか
        const isSortedByDate = JSON.stringify(data.posts) === JSON.stringify(sortedByDate);
        const isSortedById = JSON.stringify(data.posts) === JSON.stringify(sortedById);
        
        expect(isSortedByDate || isSortedById).toBe(true);
      }
    });
  });

  describe('GET /api/posts/[id]/bookmark', () => {
    test('投稿のブックマーク状態を取得できる', async () => {
      // ブックマーク済みの投稿
      const bookmarkedPost = testPosts[0];
      const testUserId = currentUser.clerk_id;
      
      const request = createTestRequest(`/api/posts/${bookmarkedPost.id}/bookmark`, 'GET', null, {}, testUserId);
      const response = await GET_POST_BOOKMARK(request, { params: { id: bookmarkedPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.bookmarked).toBe(true);
      expect(data.bookmark_count).toBeGreaterThanOrEqual(1);
    });
    
    test('ブックマークしていない投稿の状態を取得できる', async () => {
      // ブックマークしていない投稿（4番目以降）
      const unbookmarkedPost = testPosts[4];
      const testUserId = currentUser.clerk_id;
      
      const request = createTestRequest(`/api/posts/${unbookmarkedPost.id}/bookmark`, 'GET', null, {}, testUserId);
      const response = await GET_POST_BOOKMARK(request, { params: { id: unbookmarkedPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.bookmarked).toBe(false);
    });
    
    test('存在しない投稿IDの場合は400エラーを返す', async () => {
      const testUserId = currentUser.clerk_id;
      const invalidPostId = 'invalid';
      
      const request = createTestRequest(`/api/posts/${invalidPostId}/bookmark`, 'GET', null, {}, testUserId);
      const response = await GET_POST_BOOKMARK(request, { params: { id: invalidPostId } });
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/posts/[id]/bookmark', () => {
    test('投稿をブックマークできる', async () => {
      // ブックマークしていない投稿
      const unbookmarkedPost = testPosts[4];
      const testUserId = currentUser.clerk_id;
      
      const request = createTestRequest(`/api/posts/${unbookmarkedPost.id}/bookmark`, 'POST', {}, {}, testUserId);
      const response = await POST_POST_BOOKMARK(request, { params: { id: unbookmarkedPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.bookmarked).toBe(true);
      
      // データベースで確認
      const bookmarkRecord = await db.query.bookmarks.findFirst({
        where: and(
          eq(bookmarks.user_id, currentUser.id),
          eq(bookmarks.post_id, unbookmarkedPost.id),
          eq(bookmarks.is_deleted, false)
        )
      });
      
      expect(bookmarkRecord).toBeTruthy();
    });
    
    test('ブックマーク済みの投稿のブックマークを解除できる', async () => {
      // すでにブックマーク済みの投稿
      const bookmarkedPost = testPosts[0];
      const testUserId = currentUser.clerk_id;
      
      const request = createTestRequest(`/api/posts/${bookmarkedPost.id}/bookmark`, 'POST', {}, {}, testUserId);
      const response = await POST_POST_BOOKMARK(request, { params: { id: bookmarkedPost.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.bookmarked).toBe(false);
      
      // データベースで確認 - 論理削除されている
      const bookmarkRecord = await db.query.bookmarks.findFirst({
        where: and(
          eq(bookmarks.user_id, currentUser.id),
          eq(bookmarks.post_id, bookmarkedPost.id),
          eq(bookmarks.is_deleted, false)
        )
      });
      
      expect(bookmarkRecord).toBeFalsy();
    });

    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const post = testPosts[0];
      const request = createTestRequest(`/api/posts/${post.id}/bookmark`, 'POST');
      const response = await POST_POST_BOOKMARK(request, { params: { id: post.id.toString() } });
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  // エッジケースのテスト
  describe('Edge Cases', () => {
    test('特殊文字を含む投稿をブックマークできる', async () => {
      // 特殊文字を含む投稿を作成
      const specialCharPost = await createSpecialCharPost(currentUser.id);
      const testUserId = currentUser.clerk_id;
      
      // まずブックマークする
      const bookmarkRequest = createTestRequest(`/api/posts/${specialCharPost.id}/bookmark`, 'POST', {}, {}, testUserId);
      const bookmarkResponse = await POST_POST_BOOKMARK(bookmarkRequest, { params: { id: specialCharPost.id.toString() } });
      
      // ブックマークのレスポンス検証
      expect(bookmarkResponse.status).toBe(200);
      const bookmarkData = await bookmarkResponse.json();
      expect(bookmarkData.success).toBe(true);
      expect(bookmarkData.bookmarked).toBe(true);
      
      // ブックマーク一覧を取得して特殊文字の投稿が含まれることを確認
      const listRequest = createTestRequest('/api/bookmarks', 'GET', null, {}, testUserId);
      const listResponse = await GET(listRequest);
      
      expect(listResponse.status).toBe(200);
      const listData = await listResponse.json();
      
      // 特殊文字の投稿がブックマーク一覧に含まれていることを確認
      const specialPost = listData.posts.find((p: any) => p.id === specialCharPost.id);
      expect(specialPost).toBeDefined();
      expect(specialPost.content).toBe(specialCharPost.content);
    });
    
    test('長いテキストコンテンツの投稿をブックマークできる', async () => {
      // 長いテキストコンテンツの投稿を作成
      const longTextPost = await createLongTextPost(currentUser.id);
      const testUserId = currentUser.clerk_id;
      
      // ブックマークする
      const bookmarkRequest = createTestRequest(`/api/posts/${longTextPost.id}/bookmark`, 'POST', {}, {}, testUserId);
      const bookmarkResponse = await POST_POST_BOOKMARK(bookmarkRequest, { params: { id: longTextPost.id.toString() } });
      
      // ブックマークのレスポンス検証
      expect(bookmarkResponse.status).toBe(200);
      const bookmarkData = await bookmarkResponse.json();
      expect(bookmarkData.success).toBe(true);
      
      // ブックマーク一覧を取得して長いテキストの投稿が含まれることを確認
      const listRequest = createTestRequest('/api/bookmarks', 'GET', null, {}, testUserId);
      const listResponse = await GET(listRequest);
      
      expect(listResponse.status).toBe(200);
      const listData = await listResponse.json();
      
      // 長いテキストの投稿がブックマーク一覧に含まれていることを確認
      const longPost = listData.posts.find((p: any) => p.id === longTextPost.id);
      expect(longPost).toBeDefined();
      expect(longPost.content).toBe(longTextPost.content);
      expect(longPost.content.length).toBeGreaterThan(1000); // 長いテキストであることを確認
    });
    
    test('大量データのページネーションが正しく機能する', async () => {
      // 大量の投稿とブックマークを作成（20件）
      const testUserId = currentUser.clerk_id;
      const manyBookmarks = await createManyPostsAndBookmarks(currentUser.id, 20);
      
      // デフォルトのlimitでページ1を取得（通常10件または設定値）
      const firstPageRequest = createTestRequest('/api/bookmarks', 'GET', null, {}, testUserId);
      const firstPageResponse = await GET(firstPageRequest);
      
      // レスポンスの検証
      expect(firstPageResponse.status).toBe(200);
      
      const firstPageData = await firstPageResponse.json();
      expect(firstPageData.posts.length).toBeLessThanOrEqual(ITEMS_PER_PAGE);
      
      // ページネーション情報があるか確認
      let hasNextPage = false;
      let nextCursor: string | null = null;
      
      if (firstPageData.pagination) {
        hasNextPage = firstPageData.pagination.hasNextPage;
        nextCursor = firstPageData.pagination.nextCursor;
      } else if (firstPageData.nextCursor) {
        hasNextPage = !!firstPageData.nextCursor;
        nextCursor = firstPageData.nextCursor;
      }
      
      expect(hasNextPage).toBe(true);
      expect(nextCursor).toBeTruthy();
      
      // 次のページを取得
      if (nextCursor) {
        const secondPageRequest = createTestRequest(`/api/bookmarks?cursor=${nextCursor}`, 'GET', null, {}, testUserId);
        const secondPageResponse = await GET(secondPageRequest);
        
        expect(secondPageResponse.status).toBe(200);
        const secondPageData = await secondPageResponse.json();
        
        // 次のページにもデータがある
        expect(secondPageData.posts.length).toBeGreaterThan(0);
        
        // 重複がないことを確認
        const firstPageIds = firstPageData.posts.map((p: any) => p.id);
        const secondPageIds = secondPageData.posts.map((p: any) => p.id);
        
        // 2つの配列に重複する要素がないことを確認
        const hasDuplicates = firstPageIds.some((id: number) => secondPageIds.includes(id));
        expect(hasDuplicates).toBe(false);
      }
    });
    
    test('トグル操作の整合性を確認（ブックマーク追加と削除）', async () => {
      const testUserId = currentUser.clerk_id;
      const post = testPosts[4]; // ブックマークしていない投稿
      
      // 1. ブックマーク追加
      const addRequest = createTestRequest(`/api/posts/${post.id}/bookmark`, 'POST', {}, {}, testUserId);
      const addResponse = await POST_POST_BOOKMARK(addRequest, { params: { id: post.id.toString() } });
      
      expect(addResponse.status).toBe(200);
      const addData = await addResponse.json();
      expect(addData.bookmarked).toBe(true);
      
      // ブックマークが追加されたことを確認
      const checkAfterAddRequest = createTestRequest(`/api/posts/${post.id}/bookmark`, 'GET', null, {}, testUserId);
      const checkAfterAddResponse = await GET_POST_BOOKMARK(checkAfterAddRequest, { params: { id: post.id.toString() } });
      
      expect(checkAfterAddResponse.status).toBe(200);
      const checkAfterAddData = await checkAfterAddResponse.json();
      expect(checkAfterAddData.bookmarked).toBe(true);
      
      // 2. ブックマーク削除（トグル）
      const removeRequest = createTestRequest(`/api/posts/${post.id}/bookmark`, 'POST', {}, {}, testUserId);
      const removeResponse = await POST_POST_BOOKMARK(removeRequest, { params: { id: post.id.toString() } });
      
      expect(removeResponse.status).toBe(200);
      const removeData = await removeResponse.json();
      expect(removeData.bookmarked).toBe(false);
      
      // ブックマークが削除されたことを確認
      const checkAfterRemoveRequest = createTestRequest(`/api/posts/${post.id}/bookmark`, 'GET', null, {}, testUserId);
      const checkAfterRemoveResponse = await GET_POST_BOOKMARK(checkAfterRemoveRequest, { params: { id: post.id.toString() } });
      
      expect(checkAfterRemoveResponse.status).toBe(200);
      const checkAfterRemoveData = await checkAfterRemoveResponse.json();
      expect(checkAfterRemoveData.bookmarked).toBe(false);
      
      // データベースでも確認
      const bookmark = await db.query.bookmarks.findFirst({
        where: and(
          eq(bookmarks.user_id, currentUser.id),
          eq(bookmarks.post_id, post.id),
          eq(bookmarks.is_deleted, false)
        )
      });
      
      expect(bookmark).toBeFalsy();
    });
    
    test('同じ投稿を複数回ブックマークしても重複しない', async () => {
      const testUserId = currentUser.clerk_id;
      const post = testPosts[4]; // ブックマークしていない投稿
      
      // 1回目のブックマーク
      const firstRequest = createTestRequest(`/api/posts/${post.id}/bookmark`, 'POST', {}, {}, testUserId);
      const firstResponse = await POST_POST_BOOKMARK(firstRequest, { params: { id: post.id.toString() } });
      
      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      expect(firstData.bookmarked).toBe(true);
      
      // 2回目のブックマーク（同じ投稿）
      const secondRequest = createTestRequest(`/api/posts/${post.id}/bookmark`, 'POST', {}, {}, testUserId);
      const secondResponse = await POST_POST_BOOKMARK(secondRequest, { params: { id: post.id.toString() } });
      
      // 結果は「トグル」の場合はブックマーク解除、「追加のみ」の場合は既にブックマーク済みと返す
      expect(secondResponse.status).toBe(200);
      
      // ブックマーク一覧を取得して、重複がないことを確認
      const listRequest = createTestRequest('/api/bookmarks', 'GET', null, {}, testUserId);
      const listResponse = await GET(listRequest);
      
      expect(listResponse.status).toBe(200);
      const listData = await listResponse.json();
      
      // 同じ投稿IDのブックマークが重複していないことを確認
      const postIds = listData.posts.map((p: any) => p.id);
      const uniquePostIds = [...new Set(postIds)];
      expect(uniquePostIds.length).toBe(postIds.length);
    });
  });
});
