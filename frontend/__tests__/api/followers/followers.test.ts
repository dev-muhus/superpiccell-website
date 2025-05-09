/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { GET } from '@/app/api/followers/route';
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
      username: 'testuser_followers',
      email: 'testuser_followers@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_2`,
      username: 'follower1',
      email: 'follower1@example.com',
      first_name: 'Follower',
      last_name: 'One',
      profile_image_url: 'https://example.com/follower1.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_3`,
      username: 'follower2',
      email: 'follower2@example.com',
      first_name: 'Follower',
      last_name: 'Two',
      profile_image_url: 'https://example.com/follower2.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_4`,
      username: 'follower3',
      email: 'follower3@example.com',
      first_name: 'Follower',
      last_name: 'Three',
      profile_image_url: 'https://example.com/follower3.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_5`,
      username: 'nonfollower',
      email: 'nonfollower@example.com',
      first_name: 'Non',
      last_name: 'Follower',
      profile_image_url: 'https://example.com/nonfollower.jpg',
      role: 'user'
    }
  ];
}

// フォロー関係を作成するヘルパー関数
async function createFollow(followerId: number, followingId: number, createdAt: Date = new Date()) {
  return await db.insert(follows).values({
    follower_id: followerId, // フォローする側
    following_id: followingId, // フォローされる側
    created_at: createdAt,
    is_deleted: false
  }).returning().then(r => r[0]);
}

// 大量のフォロワーを作成するヘルパー関数
async function createManyFollowers(followingId: number, followerIds: number[], count: number) {
  const createdFollows = [];
  
  for (let i = 0; i < count; i++) {
    // followerIdsの範囲内でループする
    const followerId = followerIds[i % followerIds.length];
    
    // 同じ組み合わせが存在しないことを確認
    const [existingFollow] = await db.select()
      .from(follows)
      .where(and(
        eq(follows.follower_id, followerId),
        eq(follows.following_id, followingId)
      ))
      .limit(1);
    
    if (!existingFollow) {
      // 日付を少しずつずらして作成
      const createdAt = new Date(Date.now() - (i * 60000)); // i分前
      const newFollow = await createFollow(followerId, followingId, createdAt);
      createdFollows.push(newFollow);
    }
  }
  
  return createdFollows;
}

describe('Followers API', () => {
  let testUsers: any[] = [];
  let userFollows: any[] = [];
  
  beforeEach(async () => {
    // 毎回ユニークなユーザーデータを生成
    const userData = createTestUsers();
    
    // テストユーザーをデータベースに挿入
    testUsers = await Promise.all(
      userData.map(user => db.insert(users).values(user).returning())
    ).then(results => results.map(r => r[0]));
    
    const [currentUser, follower1, follower2, follower3, nonFollower] = testUsers;
    
    // フォロー関係を作成 (follower1, follower2, follower3 が currentUser をフォローする)
    userFollows = [];
    
    // 最新順に作成（テスト時の期待値を確認しやすくするため）
    const follow1 = await createFollow(follower1.id, currentUser.id, new Date(Date.now() - 1000)); // 最新
    const follow2 = await createFollow(follower2.id, currentUser.id, new Date(Date.now() - 2000)); // 2番目
    const follow3 = await createFollow(follower3.id, currentUser.id, new Date(Date.now() - 3000)); // 3番目
    
    userFollows.push(follow1, follow2, follow3);
    
    // currentUserがfollower1をフォローする（相互フォロー）
    await createFollow(currentUser.id, follower1.id);
  });
  
  describe('GET /api/followers', () => {
    test('フォロワー一覧を取得できる', async () => {
      // APIリクエスト
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/followers', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.followers).toBeDefined();
      expect(Array.isArray(data.followers)).toBe(true);
      expect(data.followers.length).toBe(3); // 3人のフォロワーが存在する
      
      // フォロワーの情報が正しく含まれているか確認
      const followerIds = testUsers.slice(1, 4).map(user => user.id); // follower1, follower2, follower3のID
      data.followers.forEach((follow: any) => {
        expect(followerIds).toContain(follow.follower_id);
        expect(follow.following_id).toBe(testUsers[0].id); // すべてcurrentUserをフォローしている
        expect(follow.follower_user).toBeDefined();
        expect(follow.follower_user.username).toBeDefined();
        expect(follow.follower_user.profile_image_url).toBeDefined();
      });
      
      // ページネーション情報が含まれているか確認
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(3);
    });
    
    test('フォロワーがいない場合は空配列を返す', async () => {
      // フォロワーがいないユーザー (nonfollower) を使用
      const testUserId = testUsers[4].clerk_id;
      global.currentTestUserId = testUserId;
      
      const request = createTestRequest('/api/followers', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.followers).toHaveLength(0);
      expect(data.pagination.hasNextPage).toBe(false);
      expect(data.pagination.nextCursor).toBeNull();
      expect(data.pagination.total).toBe(0);
    });
    
    test('昇順（古い順）でソートできる', async () => {
      // APIリクエスト - sort=ascを指定
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/followers?sort=asc', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.followers.length).toBe(3);
      
      // 古い順にソートされていることを確認（created_atが昇順）
      if (data.followers.length >= 2) {
        const firstCreatedAt = new Date(data.followers[0].created_at).getTime();
        const secondCreatedAt = new Date(data.followers[1].created_at).getTime();
        
        expect(firstCreatedAt).toBeLessThan(secondCreatedAt);
      }
    });
    
    test('降順（新しい順）でソートできる', async () => {
      // APIリクエスト - sort=descを指定
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/followers?sort=desc', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.followers.length).toBe(3);
      
      // 新しい順にソートされていることを確認（created_atが降順）
      if (data.followers.length >= 2) {
        const firstCreatedAt = new Date(data.followers[0].created_at).getTime();
        const secondCreatedAt = new Date(data.followers[1].created_at).getTime();
        
        expect(firstCreatedAt).toBeGreaterThan(secondCreatedAt);
      }
    });
    
    test('ページネーション機能でlimitパラメータが正しく使われる', async () => {
      // いくつかのフォロワーを追加
      const additionalFollowers = await createManyFollowers(
        testUsers[0].id, // currentUser
        [testUsers[1].id, testUsers[2].id, testUsers[3].id], // フォロワー候補
        5 // 5人のフォロワーを追加（重複は除外される）
      );
      
      // APIリクエスト - limitを2に設定
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/followers?limit=2', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.followers).toHaveLength(2); // limitで指定した通り2件のみ取得
      
      // ページネーション情報の確認
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.nextCursor).toBeDefined();
      expect(data.pagination.total).toBeGreaterThan(2); // 合計は2件以上
    });
    
    test('カーソルベースのページネーションが機能する', async () => {
      // いくつかのフォロワーを追加
      const additionalFollowers = await createManyFollowers(
        testUsers[0].id, // currentUser
        [testUsers[1].id, testUsers[2].id, testUsers[3].id], // フォロワー候補
        5 // 5人のフォロワーを追加（重複は除外される）
      );
      
      // 1ページ目を取得
      const testUserId = testUsers[0].clerk_id;
      const firstPageRequest = createTestRequest('/api/followers?limit=2', 'GET', null, {}, testUserId);
      const firstPageResponse = await GET(firstPageRequest);
      const firstPageData = await firstPageResponse.json();
      
      expect(firstPageData.followers).toHaveLength(2);
      expect(firstPageData.pagination.hasNextPage).toBe(true);
      expect(firstPageData.pagination.nextCursor).toBeDefined();
      
      // 2ページ目を取得
      const cursor = firstPageData.pagination.nextCursor;
      const secondPageRequest = createTestRequest(`/api/followers?limit=2&cursor=${cursor}`, 'GET', null, {}, testUserId);
      const secondPageResponse = await GET(secondPageRequest);
      const secondPageData = await secondPageResponse.json();
      
      expect(secondPageData.followers).toBeDefined();
      expect(secondPageData.followers.length).toBeGreaterThan(0);
      
      // 1ページ目と2ページ目でフォロワーが重複しないことを確認
      const firstPageIds = firstPageData.followers.map((f: any) => f.id);
      const secondPageIds = secondPageData.followers.map((f: any) => f.id);
      
      firstPageIds.forEach((id: number) => {
        expect(secondPageIds).not.toContain(id);
      });
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const request = createTestRequest('/api/followers', 'GET');
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('存在しないユーザーの場合は404エラーを返す', async () => {
      // 存在しないユーザーIDを設定
      global.currentTestUserId = 'nonexistent_user_id';
      
      const request = createTestRequest('/api/followers', 'GET', null, {});
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('論理削除されたフォロワーは表示されない', async () => {
      // フォロワーの一人を論理削除
      const deletedFollowerId = userFollows[0].id;
      await db.update(follows)
        .set({ is_deleted: true })
        .where(eq(follows.id, deletedFollowerId));
      
      // APIリクエスト
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/followers', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.followers.length).toBe(2); // 3人から1人削除されて2人に
      
      // 削除されたフォロワーのIDがリストに含まれていないことを確認
      const followIds = data.followers.map((f: any) => f.id);
      expect(followIds).not.toContain(deletedFollowerId);
      
      // 総数も正しく2人になっていることを確認
      expect(data.pagination.total).toBe(2);
    });
    
    test('大量のフォロワーでもページネーションが正しく機能する', async () => {
      // 大量のフォロワーを追加（20人）
      const manyFollowers = await createManyFollowers(
        testUsers[0].id, // currentUser
        [testUsers[1].id, testUsers[2].id, testUsers[3].id], // フォロワー候補
        20 // 20人分のフォロー関係を作成（重複は除外される）
      );
      
      // 追加されたフォロワーの数を確認
      const totalFollowers = await db
        .select({ count: count() })
        .from(follows)
        .where(
          and(
            eq(follows.following_id, testUsers[0].id),
            eq(follows.is_deleted, false)
          )
        )
        .then(result => result[0].count);
      
      // 最初のページを取得（デフォルトのlimit）
      const testUserId = testUsers[0].clerk_id;
      const request = createTestRequest('/api/followers', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.followers.length).toBeLessThanOrEqual(ITEMS_PER_PAGE);
      expect(data.pagination.hasNextPage).toBe(totalFollowers > ITEMS_PER_PAGE);
      expect(data.pagination.total).toBe(totalFollowers);
      
      // もしtotalFollowers > ITEMS_PER_PAGEならnextCursorが存在するはず
      if (totalFollowers > ITEMS_PER_PAGE) {
        expect(data.pagination.nextCursor).toBeDefined();
      }
    });
  });
}); 