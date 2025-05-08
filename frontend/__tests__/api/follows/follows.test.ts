/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET } from '@/app/api/follows/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, follows } from '@/db/schema';
import { eq, and, desc, asc, count } from 'drizzle-orm';
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
      username: 'testuser_follows',
      email: 'testuser_follows@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_2`,
      username: 'following1',
      email: 'following1@example.com',
      first_name: 'Following',
      last_name: 'One',
      profile_image_url: 'https://example.com/following1.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_3`,
      username: 'following2',
      email: 'following2@example.com',
      first_name: 'Following',
      last_name: 'Two',
      profile_image_url: 'https://example.com/following2.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_4`,
      username: 'following3',
      email: 'following3@example.com',
      first_name: 'Following',
      last_name: 'Three',
      profile_image_url: 'https://example.com/following3.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_5`,
      username: 'notfollowing',
      email: 'notfollowing@example.com',
      first_name: 'Not',
      last_name: 'Following',
      profile_image_url: 'https://example.com/notfollowing.jpg',
      role: 'user'
    }
  ];
}

// フォロー関係を作成するヘルパー関数
async function createFollow(followerId: number, followingId: number, createdAt: Date = new Date()) {
  return await db.insert(follows).values({
    follower_id: followerId,
    following_id: followingId,
    created_at: createdAt,
    is_deleted: false
  }).returning().then(r => r[0]);
}

// 大量のフォロー関係を作成するヘルパー関数
async function createManyFollows(followerId: number, followingIds: number[], count: number) {
  const createdFollows = [];
  
  for (let i = 0; i < count; i++) {
    // followingIdsの範囲内でループする
    const followingId = followingIds[i % followingIds.length];
    
    // 同じ組み合わせが存在しないことを確認
    const existingFollow = await db.query.follows.findFirst({
      where: and(
        eq(follows.follower_id, followerId),
        eq(follows.following_id, followingId)
      )
    });
    
    if (!existingFollow) {
      // 日付を少しずつずらして作成
      const createdAt = new Date(Date.now() - (i * 60000)); // i分前
      const newFollow = await createFollow(followerId, followingId, createdAt);
      createdFollows.push(newFollow);
    }
  }
  
  return createdFollows;
}

describe('Follows API', () => {
  let testUsers: any[] = [];
  let userFollows: any[] = [];
  
  beforeEach(async () => {
    // 毎回ユニークなユーザーデータを生成
    const userData = createTestUsers();
    
    // テストユーザーをデータベースに挿入
    testUsers = await Promise.all(
      userData.map(user => db.insert(users).values(user).returning())
    ).then(results => results.map(r => r[0]));
    
    const [currentUser, following1, following2, following3, notFollowing] = testUsers;
    
    // フォロー関係を作成 (currentUser が following1, following2, following3 をフォローする)
    userFollows = [];
    
    // 最新順に作成（テスト時の期待値を確認しやすくするため）
    const follow1 = await createFollow(currentUser.id, following1.id, new Date(Date.now() - 1000)); // 最新
    const follow2 = await createFollow(currentUser.id, following2.id, new Date(Date.now() - 2000)); // 2番目
    const follow3 = await createFollow(currentUser.id, following3.id, new Date(Date.now() - 3000)); // 3番目
    
    userFollows.push(follow1, follow2, follow3);
    
    // following1がcurrentUserをフォローする（相互フォロー）
    await createFollow(following1.id, currentUser.id);
  });
  
  describe('GET /api/follows', () => {
    test('フォロー一覧を取得できる', async () => {
      // APIリクエスト
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/follows', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.follows).toBeDefined();
      expect(Array.isArray(data.follows)).toBe(true);
      expect(data.follows.length).toBe(3); // 3人をフォローしている
      
      // フォロー情報が正しく含まれているか確認
      const followingIds = testUsers.slice(1, 4).map(user => user.id); // following1, following2, following3のID
      data.follows.forEach((follow: any) => {
        expect(follow.follower_id).toBe(testUsers[0].id); // すべてcurrentUserがフォローしている
        expect(followingIds).toContain(follow.following_id);
        expect(follow.following_user).toBeDefined();
        expect(follow.following_user.username).toBeDefined();
        expect(follow.following_user.profile_image_url).toBeDefined();
      });
      
      // ページネーション情報が含まれているか確認
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(3);
    });
    
    test('フォローしているユーザーがいない場合は空配列を返す', async () => {
      // フォローしていないユーザー (notfollowing) を使用
      const testUserId = testUsers[4].clerk_id;
      global.currentTestUserId = testUserId;
      
      const request = createTestRequest('/api/follows', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.follows).toHaveLength(0);
      expect(data.pagination.hasNextPage).toBe(false);
      expect(data.pagination.nextCursor).toBeNull();
      expect(data.pagination.total).toBe(0);
    });
    
    test('昇順（古い順）でソートできる', async () => {
      // APIリクエスト - sort=ascを指定
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/follows?sort=asc', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.follows.length).toBe(3);
      
      // 古い順にソートされていることを確認（created_atが昇順）
      if (data.follows.length >= 2) {
        const firstCreatedAt = new Date(data.follows[0].created_at).getTime();
        const secondCreatedAt = new Date(data.follows[1].created_at).getTime();
        
        expect(firstCreatedAt).toBeLessThan(secondCreatedAt);
      }
    });
    
    test('降順（新しい順）でソートできる', async () => {
      // APIリクエスト - sort=descを指定
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/follows?sort=desc', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.follows.length).toBe(3);
      
      // 新しい順にソートされていることを確認（created_atが降順）
      if (data.follows.length >= 2) {
        const firstCreatedAt = new Date(data.follows[0].created_at).getTime();
        const secondCreatedAt = new Date(data.follows[1].created_at).getTime();
        
        expect(firstCreatedAt).toBeGreaterThan(secondCreatedAt);
      }
    });
    
    test('ページネーション機能でlimitパラメータが正しく使われる', async () => {
      // いくつかのフォローを追加
      const additionalFollows = await createManyFollows(
        testUsers[0].id, // currentUser
        [testUsers[1].id, testUsers[2].id, testUsers[3].id], // フォロー候補
        5 // 5人のフォローを追加（重複は除外される）
      );
      
      // APIリクエスト - limitを2に設定
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/follows?limit=2', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.follows).toHaveLength(2); // limitで指定した通り2件のみ取得
      
      // ページネーション情報の確認
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.nextCursor).toBeDefined();
      expect(data.pagination.total).toBeGreaterThan(2); // 合計は2件以上
    });
    
    test('カーソルベースのページネーションが機能する', async () => {
      // いくつかのフォローを追加
      const additionalFollows = await createManyFollows(
        testUsers[0].id, // currentUser
        [testUsers[1].id, testUsers[2].id, testUsers[3].id], // フォロー候補
        5 // 5人のフォローを追加（重複は除外される）
      );
      
      // 1ページ目を取得
      const testUserId = testUsers[0].clerk_id;
      const firstPageRequest = createTestRequest('/api/follows?limit=2', 'GET', null, {}, testUserId);
      const firstPageResponse = await GET(firstPageRequest);
      const firstPageData = await firstPageResponse.json();
      
      expect(firstPageData.follows).toHaveLength(2);
      expect(firstPageData.pagination.hasNextPage).toBe(true);
      expect(firstPageData.pagination.nextCursor).toBeDefined();
      
      // 2ページ目を取得
      const cursor = firstPageData.pagination.nextCursor;
      const secondPageRequest = createTestRequest(`/api/follows?limit=2&cursor=${cursor}`, 'GET', null, {}, testUserId);
      const secondPageResponse = await GET(secondPageRequest);
      const secondPageData = await secondPageResponse.json();
      
      expect(secondPageData.follows).toBeDefined();
      expect(secondPageData.follows.length).toBeGreaterThan(0);
      
      // 1ページ目と2ページ目でフォローが重複しないことを確認
      const firstPageIds = firstPageData.follows.map((f: any) => f.id);
      const secondPageIds = secondPageData.follows.map((f: any) => f.id);
      
      firstPageIds.forEach((id: number) => {
        expect(secondPageIds).not.toContain(id);
      });
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const request = createTestRequest('/api/follows', 'GET');
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('存在しないユーザーの場合は404エラーを返す', async () => {
      // 存在しないユーザーIDを設定
      global.currentTestUserId = 'nonexistent_user_id';
      
      const request = createTestRequest('/api/follows', 'GET', null, {});
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('論理削除されたフォローは表示されない', async () => {
      // フォローの一つを論理削除
      const deletedFollowId = userFollows[0].id;
      await db.update(follows)
        .set({ is_deleted: true })
        .where(eq(follows.id, deletedFollowId));
      
      // APIリクエスト
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/follows', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.follows.length).toBe(2); // 3人から1人削除されて2人に
      
      // 削除されたフォローのIDがリストに含まれていないことを確認
      const followIds = data.follows.map((f: any) => f.id);
      expect(followIds).not.toContain(deletedFollowId);
      
      // 総数も正しく2人になっていることを確認
      expect(data.pagination.total).toBe(2);
    });
    
    test('大量のフォロー関係でもページネーションが正しく機能する', async () => {
      // 大量のフォロー関係を追加（20人）
      const manyFollows = await createManyFollows(
        testUsers[0].id, // currentUser
        [testUsers[1].id, testUsers[2].id, testUsers[3].id], // フォロー候補
        20 // 20人分のフォロー関係を作成（重複は除外される）
      );
      
      // 追加されたフォローの数を確認
      const totalFollows = await db
        .select({ count: count() })
        .from(follows)
        .where(
          and(
            eq(follows.follower_id, testUsers[0].id),
            eq(follows.is_deleted, false)
          )
        )
        .then(result => result[0].count);
      
      // 最初のページを取得（デフォルトのlimit）
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/follows', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.follows.length).toBeLessThanOrEqual(ITEMS_PER_PAGE);
      expect(data.pagination.hasNextPage).toBe(totalFollows > ITEMS_PER_PAGE);
      expect(data.pagination.total).toBe(totalFollows);
      
      // もしtotalFollows > ITEMS_PER_PAGEならnextCursorが存在するはず
      if (totalFollows > ITEMS_PER_PAGE) {
        expect(data.pagination.nextCursor).toBeDefined();
      }
    });
    
    test('特殊文字を含むユーザーをフォローした場合も正しく取得できる', async () => {
      // 特殊文字を含むユーザーを作成
      const specialCharUser = await db.insert(users).values({
        clerk_id: `test_user_id_${Date.now()}_special`,
        username: 'user_with_特殊文字_and_symbols!@#',
        email: 'special@example.com',
        first_name: 'Special <script>alert("XSS")</script>',
        last_name: 'User & Co.',
        profile_image_url: 'https://example.com/special.jpg',
        role: 'user'
      }).returning().then(r => r[0]);
      
      // 特殊文字ユーザーをフォロー
      await createFollow(testUsers[0].id, specialCharUser.id);
      
      // APIリクエスト
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/follows', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // 特殊文字ユーザーがフォローリストに含まれていることを確認
      const specialUserInList = data.follows.some((follow: any) => 
        follow.following_id === specialCharUser.id
      );
      
      expect(specialUserInList).toBe(true);
      
      // 特殊文字を含むユーザー情報が正しく含まれていることを確認
      const specialUserFollow = data.follows.find((follow: any) => 
        follow.following_id === specialCharUser.id
      );
      
      expect(specialUserFollow.following_user.username).toBe('user_with_特殊文字_and_symbols!@#');
    });
  });
}); 