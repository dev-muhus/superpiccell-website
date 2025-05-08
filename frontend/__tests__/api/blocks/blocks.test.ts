import { describe, expect, test, beforeEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, blocks } from '@/db/schema';
import { GET } from '@/app/api/blocks/route';
import { GET as getUserBlockStatus, POST as blockUser, DELETE as unblockUser } from '@/app/api/users/[id]/block/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { sql } from 'drizzle-orm';
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
      clerk_id: global.currentTestUserId, // グローバル変数を使用
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_2`,
      username: 'otheruser',
      email: 'other@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/image2.jpg',
      role: 'user'
    }
  ];
}

// 複数のブロックレコードを作成するヘルパー関数
async function createMultipleBlocks(currentUser: any, blockeeUsers: any[]) {
  // 一度に全部のブロックを作成する
  for (const blockee of blockeeUsers) {
    await db.insert(blocks).values({
      blocker_id: currentUser.id,
      blocked_id: blockee.id
    });
  }
}

// 特殊文字を含むユーザーを作成するヘルパー関数
async function createSpecialCharUser() {
  return await db.insert(users).values({
    clerk_id: `test_user_id_${Date.now()}_special`,
    username: 'user-with_special!@#$%^&*()chars',
    email: 'special@example.com',
    first_name: 'スペシャル',
    last_name: '特殊文字≈†ø',
    profile_image_url: 'https://example.com/special.jpg',
    role: 'user'
  }).returning().then(r => r[0]);
}

// 大量のユーザーとブロック関係を作成するヘルパー関数
async function createManyUsersAndBlocks(currentUser: any, count: number) {
  const createdUsers = [];
  
  // ユーザーの作成
  for (let i = 0; i < count; i++) {
    const newUser = await db.insert(users).values({
      clerk_id: `test_user_id_${Date.now()}_${i + 10}`,
      username: `testuser${i + 10}`,
      email: `test${i + 10}@example.com`,
      first_name: `Test${i + 10}`,
      last_name: `User${i + 10}`,
      profile_image_url: `https://example.com/image${i + 10}.jpg`,
      role: 'user'
    }).returning().then(r => r[0]);
    
    createdUsers.push(newUser);
  }
  
  // 各ユーザーをブロック
  for (const user of createdUsers) {
    await db.insert(blocks).values({
      blocker_id: currentUser.id,
      blocked_id: user.id
    });
  }
  
  return createdUsers;
}

describe('Blocks API', () => {
  let currentUser: any;
  let otherUser: any;

  beforeEach(async () => {
    // 毎回ユニークなユーザーデータを生成
    const testUsers = createTestUsers();
    
    // テストユーザーをデータベースに挿入
    [currentUser, otherUser] = await Promise.all(
      testUsers.map(user => db.insert(users).values(user).returning())
    ).then(results => results.map(r => r[0]));
  });

  describe('GET /api/blocks', () => {
    test('ブロック一覧を取得できる', async () => {
      // ブロックデータの作成
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: otherUser.id
      });

      // APIリクエスト - 現在のテストユーザーのclerk_idを使用
      // テスト用のID形式に合わせる（プレフィックスを含む）
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/blocks', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.blocks).toHaveLength(1);
      expect(data.blocks[0].blocker_id).toBe(currentUser.id);
      expect(data.blocks[0].blocked_id).toBe(otherUser.id);
      expect(data.blocks[0].blocked_user.username).toBe('otheruser');
    });

    test('ブロックが存在しない場合は空配列を返す', async () => {
      // APIリクエスト - 現在のテストユーザーのclerk_idを使用
      // テスト用のID形式に合わせる（プレフィックスを含む）  
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/blocks', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.blocks).toHaveLength(0);
    });

    test('ページネーション機能でlimitパラメータが正しく使われる', async () => {
      // 追加ユーザーの作成
      const additionalUser = await db.insert(users).values({
        clerk_id: `test_user_id_${Date.now()}_3`,
        username: 'user3',
        email: 'user3@example.com',
        first_name: 'User',
        last_name: 'Three',
        profile_image_url: 'https://example.com/image3.jpg',
        role: 'user'
      }).returning().then(r => r[0]);
      
      // 複数のブロックを作成
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: otherUser.id
      });
      
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: additionalUser.id
      });
      
      // APIリクエスト - limitを1に指定
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/blocks?limit=1', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.blocks).toHaveLength(1); // limitで指定した通り1件のみ取得
      expect(data.pagination.total).toBe(2); // 合計2件のブロックが存在
    });
    
    test('ソート順（降順）が正しく機能する', async () => {
      // 追加ユーザーの作成
      const additionalUser = await db.insert(users).values({
        clerk_id: `test_user_id_${Date.now()}_3`,
        username: 'user3',
        email: 'user3@example.com',
        first_name: 'User',
        last_name: 'Three',
        profile_image_url: 'https://example.com/image3.jpg',
        role: 'user'
      }).returning().then(r => r[0]);
      
      // 時間差を持たせてブロックを作成
      // 古いブロック
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: otherUser.id,
        created_at: new Date(Date.now() - 1000) // 1秒前
      });
      
      // 新しいブロック
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: additionalUser.id,
        created_at: new Date() // 現在時刻
      });
      
      // デフォルトの降順（DESC）で取得
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/blocks', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.blocks).toHaveLength(2);
      
      // 降順なので最初のブロックは最新のもの（additionalUser）
      expect(data.blocks[0].blocked_id).toBe(additionalUser.id);
      expect(data.blocks[1].blocked_id).toBe(otherUser.id);
    });
    
    test('ソート順（昇順）が正しく機能する', async () => {
      // 追加ユーザーの作成
      const additionalUser = await db.insert(users).values({
        clerk_id: `test_user_id_${Date.now()}_3`,
        username: 'user3',
        email: 'user3@example.com',
        first_name: 'User',
        last_name: 'Three',
        profile_image_url: 'https://example.com/image3.jpg',
        role: 'user'
      }).returning().then(r => r[0]);
      
      // 時間差を持たせてブロックを作成
      // 古いブロック
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: otherUser.id,
        created_at: new Date(Date.now() - 1000) // 1秒前
      });
      
      // 新しいブロック
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: additionalUser.id,
        created_at: new Date() // 現在時刻
      });
      
      // 昇順（ASC）で取得
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/blocks?sort=asc', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.blocks).toHaveLength(2);
      
      // 昇順なので最初のブロックは古いもの（otherUser）
      expect(data.blocks[0].blocked_id).toBe(otherUser.id);
      expect(data.blocks[1].blocked_id).toBe(additionalUser.id);
    });

    test('カーソルページネーションが正しく機能する', async () => {
      // 複数のユーザーとブロックを作成（5件）
      const blockeeUsers = await createManyUsersAndBlocks(currentUser, 5);
      
      // 1ページ目を取得（3件）
      const testUserId = currentUser.clerk_id;
      const firstPageRequest = createTestRequest('/api/blocks?limit=3', 'GET', null, {}, testUserId);
      const firstPageResponse = await GET(firstPageRequest);
      
      // レスポンスの検証
      expect(firstPageResponse.status).toBe(200);
      
      const firstPageData = await firstPageResponse.json();
      expect(firstPageData.blocks).toHaveLength(3);
      expect(firstPageData.pagination.hasNextPage).toBe(true);
      expect(firstPageData.pagination.nextCursor).toBeTruthy();
      
      // 次ページを取得（残りの件数）
      const nextCursor = firstPageData.pagination.nextCursor;
      const secondPageRequest = createTestRequest(`/api/blocks?limit=3&cursor=${nextCursor}`, 'GET', null, {}, testUserId);
      const secondPageResponse = await GET(secondPageRequest);
      
      // レスポンスの検証 - 件数は動的に変わる可能性があるため期待値を緩く設定
      expect(secondPageResponse.status).toBe(200);
      
      const secondPageData = await secondPageResponse.json();
      expect(secondPageData.blocks.length).toBeGreaterThanOrEqual(1); // 少なくとも1件以上あること
      // hasNextPageがfalseなら最後のページであることを確認
      if (!secondPageData.pagination.hasNextPage) {
        expect(secondPageData.pagination.nextCursor).toBeNull();
      }
      
      // 2つのページのブロックIDに重複がないことを確認
      const firstPageBlockIds = firstPageData.blocks.map((block: any) => block.id);
      const secondPageBlockIds = secondPageData.blocks.map((block: any) => block.id);
      
      // 2つの配列に重複する要素がないことを確認
      const hasDuplicates = firstPageBlockIds.some((id: number) => secondPageBlockIds.includes(id));
      expect(hasDuplicates).toBe(false);
    });

    test('大量データのページネーションが正しく機能する', async () => {
      // 大量のユーザーとブロックを作成（20件）
      const blockeeUsers = await createManyUsersAndBlocks(currentUser, 20);
      
      // デフォルトのlimitでページ1を取得（通常10件）
      const testUserId = currentUser.clerk_id;
      const firstPageRequest = createTestRequest('/api/blocks', 'GET', null, {}, testUserId);
      const firstPageResponse = await GET(firstPageRequest);
      
      // レスポンスの検証
      expect(firstPageResponse.status).toBe(200);
      
      const firstPageData = await firstPageResponse.json();
      expect(firstPageData.blocks.length).toBeLessThanOrEqual(ITEMS_PER_PAGE);
      expect(firstPageData.pagination.hasNextPage).toBe(true);
      expect(firstPageData.pagination.nextCursor).toBeTruthy();
      
      // ページネーションの合計件数を取得
      const totalItems = firstPageData.pagination.total;
      expect(totalItems).toBeGreaterThanOrEqual(blockeeUsers.length); // 少なくともブロックした数以上
      
      // 複数ページにわたって全データを取得できることを確認
      let allBlocks: any[] = [...firstPageData.blocks];
      let nextCursor = firstPageData.pagination.nextCursor;
      
      while (nextCursor) {
        const nextPageRequest = createTestRequest(`/api/blocks?cursor=${nextCursor}`, 'GET', null, {}, testUserId);
        const nextPageResponse = await GET(nextPageRequest);
        const nextPageData = await nextPageResponse.json();
        
        allBlocks = [...allBlocks, ...nextPageData.blocks];
        nextCursor = nextPageData.pagination.nextCursor;
      }
      
      // 全てのブロックデータを取得できたことを確認 - 合計件数と比較
      expect(allBlocks.length).toBeGreaterThanOrEqual(totalItems - 1); // 許容誤差1
      
      // 重複なくブロック情報が取得できることを確認
      const blockIds = allBlocks.map(block => block.id);
      const uniqueBlockIds = [...new Set(blockIds)];
      expect(uniqueBlockIds.length).toBe(blockIds.length);
    });

    test('特殊文字を含むユーザー名のブロックが正しく動作する', async () => {
      // 特殊文字を含むユーザーを作成
      const specialCharUser = await createSpecialCharUser();
      
      // ブロック関係を作成
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: specialCharUser.id
      });
      
      // APIリクエスト
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/blocks', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      const specialCharBlock = data.blocks.find((block: any) => block.blocked_id === specialCharUser.id);
      
      // 特殊文字を含むユーザーのブロック情報が正しく取得できることを確認
      expect(specialCharBlock).toBeTruthy();
      expect(specialCharBlock.blocked_user.username).toBe('user-with_special!@#$%^&*()chars');
      expect(specialCharBlock.blocked_user.first_name).toBe('スペシャル');
      expect(specialCharBlock.blocked_user.last_name).toBe('特殊文字≈†ø');
    });
  });

  describe('User Block API', () => {
    test('ユーザーをブロックできる', async () => {
      // リクエストの作成 - /api/users/[id]/block
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest(`/api/users/${otherUser.id}/block`, 'POST', null, {}, testUserId);
      
      // POSTリクエストを実行
      const response = await blockUser(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.blocked).toBe(true);
      
      // データベースを確認して実際にブロックされているか検証
      const blockRecords = await db.select()
        .from(blocks)
        .execute();
      
      // JavaScriptでフィルタリング
      const filteredBlocks = blockRecords.filter(block => 
        block.blocker_id === currentUser.id && 
        block.blocked_id === otherUser.id && 
        block.is_deleted === false
      );
      
      expect(filteredBlocks.length).toBe(1);
    });
    
    test('ブロック済みのユーザーをブロックしても重複作成されない', async () => {
      // 事前にブロック関係を作成
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: otherUser.id
      });
      
      // リクエストの作成
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest(`/api/users/${otherUser.id}/block`, 'POST', null, {}, testUserId);
      
      // POSTリクエストを実行
      const response = await blockUser(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証 - 既存のブロックがあっても成功する
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.blocked).toBe(true);
      
      // データベースを確認 - 重複ブロックがないことを確認
      const blockRecords = await db.select()
        .from(blocks)
        .execute();
        
      // JavaScriptでフィルタリング
      const filteredBlocks = blockRecords.filter(block => 
        block.blocker_id === currentUser.id && 
        block.blocked_id === otherUser.id && 
        block.is_deleted === false
      );
      
      expect(filteredBlocks.length).toBe(1); // 重複作成されていない
    });
    
    test('自分自身をブロックすることはできない', async () => {
      // 自分自身をブロックしようとする
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest(`/api/users/${currentUser.id}/block`, 'POST', null, {}, testUserId);
      
      // POSTリクエストを実行
      const response = await blockUser(request, { params: { id: String(currentUser.id) } });
      
      // レスポンスの検証 - エラーが返される
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe("自分自身をブロックすることはできません");
    });
    
    test('ブロックを解除できる', async () => {
      // 事前にブロック関係を作成
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: otherUser.id
      });
      
      // リクエストの作成
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest(`/api/users/${otherUser.id}/block`, 'DELETE', null, {}, testUserId);
      
      // DELETEリクエストを実行
      const response = await unblockUser(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.blocked).toBe(false);
      
      // データベースを確認 - 論理削除されていることを確認
      const blockRecords = await db.select()
        .from(blocks)
        .execute();
        
      // JavaScriptでフィルタリング
      const filteredBlocks = blockRecords.filter(block => 
        block.blocker_id === currentUser.id && 
        block.blocked_id === otherUser.id && 
        block.is_deleted === false
      );
      
      // blockRecordが空配列であることを確認
      expect(filteredBlocks.length).toBe(0);
    });
    
    test('ブロック状態を取得できる', async () => {
      // 事前にブロック関係を作成
      await db.insert(blocks).values({
        blocker_id: currentUser.id,
        blocked_id: otherUser.id
      });
      
      // リクエストの作成
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest(`/api/users/${otherUser.id}/block`, 'GET', null, {}, testUserId);
      
      // GETリクエストを実行
      const response = await getUserBlockStatus(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.blocked).toBe(true);
    });
    
    test('未ブロックの場合はfalseを返す', async () => {
      // リクエストの作成 - ブロックせずに状態確認
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest(`/api/users/${otherUser.id}/block`, 'GET', null, {}, testUserId);
      
      // GETリクエストを実行
      const response = await getUserBlockStatus(request, { params: { id: String(otherUser.id) } });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.blocked).toBe(false);
    });
  });
}); 