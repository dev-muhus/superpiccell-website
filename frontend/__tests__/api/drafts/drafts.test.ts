/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import { GET, POST } from '@/app/api/drafts/route';
import { DELETE } from '@/app/api/drafts/[id]/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, drafts, posts, draft_media } from '@/db/schema';
import { eq, and, desc, count, asc, isNull } from 'drizzle-orm';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

// コンソールログとエラーを抑制
let consoleErrorSpy: jest.SpyInstance;
let consoleLogSpy: jest.SpyInstance;

beforeEach(() => {
  // コンソールログとエラーを抑制
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  // スパイをリストア
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

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
      username: 'testuser_drafts',
      email: 'testuser_drafts@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_2`,
      username: 'otheruser_drafts',
      email: 'otheruser_drafts@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/image2.jpg',
      role: 'user'
    }
  ];
}

// 下書きを作成するヘルパー関数
async function createDrafts(userId: number, count: number) {
  const createdDrafts = [];
  
  for (let i = 0; i < count; i++) {
    const newDraft = await db.insert(drafts).values({
      user_id: userId,
      content: `テスト下書き ${i + 1}`,
      created_at: new Date(Date.now() - (i * 3600000)), // i時間前
      updated_at: new Date(Date.now() - (i * 3600000)), // i時間前
      is_deleted: false
    }).returning().then(r => r[0]);
    
    createdDrafts.push(newDraft);
  }
  
  return createdDrafts;
}

// 返信用の投稿を作成するヘルパー関数
async function createReplyPost(userId: number) {
  return await db.insert(posts).values({
    user_id: userId,
    content: '返信先のテスト投稿',
    post_type: 'post',
    created_at: new Date(),
    is_deleted: false
  }).returning().then(r => r[0]);
}

// 返信下書きを作成するヘルパー関数
async function createReplyDraft(userId: number, replyToPostId: number) {
  return await db.insert(drafts).values({
    user_id: userId,
    content: '返信下書きのテスト',
    in_reply_to_post_id: replyToPostId,
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false
  }).returning().then(r => r[0]);
}

// 特殊文字を含む下書きを作成するヘルパー関数
async function createSpecialCharDraft(userId: number) {
  return await db.insert(drafts).values({
    user_id: userId,
    content: '特殊文字テスト：日本語≈†ø、絵文字😀🎉🚀、HTML<script>alert("test")</script>',
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false
  }).returning().then(r => r[0]);
}

// 長いテキストコンテンツの下書きを作成するヘルパー関数（制限内の499文字）
async function createLongTextDraft(userId: number) {
  // 499文字程度のテキスト
  const longText = 'これは長いテキストコンテンツのテストです。'.repeat(35).substring(0, 499);
  
  return await db.insert(drafts).values({
    user_id: userId,
    content: longText,
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false
  }).returning().then(r => r[0]);
}

// 大量の下書きを作成するヘルパー関数
async function createManyDrafts(userId: number, count: number) {
  const createdDrafts = [];
  
  for (let i = 0; i < count; i++) {
    const newDraft = await db.insert(drafts).values({
      user_id: userId,
      content: `大量データテスト下書き ${i + 1}`,
      created_at: new Date(Date.now() - (i * 60000)), // i分前
      updated_at: new Date(Date.now() - (i * 60000)), // i分前
      is_deleted: false
    }).returning().then(r => r[0]);
    
    createdDrafts.push(newDraft);
  }
  
  return createdDrafts;
}

describe('Drafts API', () => {
  let currentUser: any;
  let otherUser: any;
  let testDrafts: any[] = [];
  let replyPost: any;
  let replyDraft: any;

  beforeEach(async () => {
    // 毎回ユニークなユーザーデータを生成
    const testUsers = createTestUsers();
    
    // テストユーザーをデータベースに挿入
    [currentUser, otherUser] = await Promise.all(
      testUsers.map(user => db.insert(users).values(user).returning())
    ).then(results => results.map(r => r[0]));
    
    // 下書きを作成（現在のユーザーが3件）
    testDrafts = await createDrafts(currentUser.id, 3);
    
    // 返信用の投稿と返信下書きを作成
    replyPost = await createReplyPost(otherUser.id);
    replyDraft = await createReplyDraft(currentUser.id, replyPost.id);
  });

  describe('GET /api/drafts', () => {
    test('下書き一覧を取得できる', async () => {
      // APIリクエスト
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.drafts).toBeDefined();
      expect(Array.isArray(data.drafts)).toBe(true);
      
      // 通常の下書きと返信下書きの両方を含む合計が正しいことを確認
      expect(data.drafts.length).toBe(testDrafts.length + 1); // 通常の下書き + 返信下書き
      
      // 返信下書きに返信先情報が含まれていることを確認
      const replyDraftData = data.drafts.find((d: any) => d.in_reply_to_post_id === replyPost.id);
      expect(replyDraftData).toBeDefined();
      if (replyDraftData?.replyToPost) {
        expect(replyDraftData.replyToPost.id).toBe(replyPost.id);
        expect(replyDraftData.replyToPost.user).toBeDefined();
      }
    });

    test('下書きがない場合は空配列を返す', async () => {
      // 別ユーザーでリクエスト（下書きなし）
      const testUserId = otherUser.clerk_id;
      global.currentTestUserId = testUserId;
      
      const request = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.drafts).toHaveLength(0);
      
      // ページネーション情報も確認
      expect(data.pagination.hasNextPage).toBe(false);
      expect(data.pagination.nextCursor).toBeNull();
    });

    test('ページネーション機能でlimitパラメータが正しく使われる', async () => {
      // さらに下書きを追加
      await createDrafts(currentUser.id, 3);
      
      // APIリクエスト - limitを2に設定
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/drafts?limit=2', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.drafts).toHaveLength(2); // limitで指定した通り2件のみ取得
      
      // ページネーション情報の確認
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.nextCursor).toBeDefined();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const request = createTestRequest('/api/drafts', 'GET');
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('存在しないユーザーの場合は404エラーを返す', async () => {
      // 存在しないユーザーIDを設定
      global.currentTestUserId = 'nonexistent_user_id';
      
      const request = createTestRequest('/api/drafts', 'GET', null, {});
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('更新日時によるソート順が適切に機能する', async () => {
      // APIリクエスト - デフォルトのソート順
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.drafts.length).toBeGreaterThan(1);
      
      // 更新日時の降順であることを確認
      if (data.drafts.length >= 2) {
        const firstUpdateTime = new Date(data.drafts[0].updated_at).getTime();
        const secondUpdateTime = new Date(data.drafts[1].updated_at).getTime();
        
        // 降順なら最初の下書きの方が新しい
        expect(firstUpdateTime >= secondUpdateTime).toBe(true);
      }
    });
  });

  describe('POST /api/drafts', () => {
    test('下書きを保存できる', async () => {
      // 新しい下書きのデータ
      const draftData = {
        content: 'テスト用の新しい下書き'
      };
      
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/drafts', 'POST', draftData, {}, testUserId);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.draft).toBeDefined();
      expect(data.draft.content).toBe(draftData.content);
      expect(data.draft.user_id).toBe(currentUser.id);
      
      // データベースで確認
      const [savedDraft] = await db.select()
        .from(drafts)
        .where(eq(drafts.id, data.draft.id))
        .limit(1);
      
      expect(savedDraft).toBeTruthy();
      expect(savedDraft?.content).toBe(draftData.content);
    });
    
    test('返信として下書きを保存できる', async () => {
      // 返信下書きのデータ
      const draftData = {
        content: '返信用の新しい下書き',
        in_reply_to_post_id: replyPost.id
      };
      
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/drafts', 'POST', draftData, {}, testUserId);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.draft).toBeDefined();
      expect(data.draft.content).toBe(draftData.content);
      expect(data.draft.in_reply_to_post_id).toBe(replyPost.id);
      
      // 一覧取得で返信情報が含まれることを確認
      const listRequest = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const listResponse = await GET(listRequest);
      
      const listData = await listResponse.json();
      const savedReplyDraft = listData.drafts.find((d: any) => d.id === data.draft.id);
      
      expect(savedReplyDraft).toBeDefined();
      expect(savedReplyDraft.in_reply_to_post_id).toBe(replyPost.id);
    });
    
    test('空のコンテンツの場合は400エラーを返す', async () => {
      // 空のコンテンツ
      const draftData = {
        content: ''
      };
      
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/drafts', 'POST', draftData, {}, testUserId);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('コンテンツが500文字を超える場合は400エラーを返す', async () => {
      // 500文字を超えるコンテンツ
      const longContent = 'あ'.repeat(501);
      const draftData = {
        content: longContent
      };
      
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/drafts', 'POST', draftData, {}, testUserId);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const draftData = {
        content: 'テスト用の下書き'
      };
      
      const request = createTestRequest('/api/drafts', 'POST', draftData);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/drafts', () => {
    test('下書きを削除できる', async () => {
      // 削除対象の下書き
      const draftToDelete = testDrafts[0];
      const testUserId = currentUser.clerk_id;
      
      // URLとパラメータを更新
      const request = createTestRequest(`/api/drafts/${draftToDelete.id}`, 'DELETE', null, {}, testUserId);
      const params = { id: draftToDelete.id.toString() };
      const response = await DELETE(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // データベースで確認 - 論理削除されている
      const [deletedDraft] = await db.select()
        .from(drafts)
        .where(eq(drafts.id, draftToDelete.id))
        .limit(1);
      
      expect(deletedDraft).toBeTruthy();
      expect(deletedDraft?.is_deleted).toBe(true);
      expect(deletedDraft?.deleted_at).toBeTruthy();
      
      // 一覧に表示されないことを確認
      const listRequest = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const listResponse = await GET(listRequest);
      
      const listData = await listResponse.json();
      const deletedDraftInList = listData.drafts.find((d: any) => d.id === draftToDelete.id);
      
      expect(deletedDraftInList).toBeUndefined();
    });
    
    test('draft_idが指定されていない場合は400エラーを返す', async () => {
      const testUserId = currentUser.clerk_id;
      
      // 無効なIDでリクエスト
      const request = createTestRequest('/api/drafts/invalid', 'DELETE', null, {}, testUserId);
      const params = { id: 'invalid' };
      const response = await DELETE(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('存在しない下書きIDの場合は404エラーを返す', async () => {
      const testUserId = currentUser.clerk_id;
      const nonexistentId = 9999999;
      
      const request = createTestRequest(`/api/drafts/${nonexistentId}`, 'DELETE', null, {}, testUserId);
      const params = { id: nonexistentId.toString() };
      const response = await DELETE(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('他ユーザーの下書きは削除できない', async () => {
      // 現在のユーザーの下書きIDで別ユーザーから削除リクエスト
      const draftToDelete = testDrafts[0];
      const otherUserId = otherUser.clerk_id;
      global.currentTestUserId = otherUserId;
      
      const request = createTestRequest(`/api/drafts/${draftToDelete.id}`, 'DELETE', null, {}, otherUserId);
      const params = { id: draftToDelete.id.toString() };
      const response = await DELETE(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証 - 404が返される（存在しないか削除済みと表示）
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
      
      // データベースで確認 - 削除されていないこと
      const [nonDeletedDraft] = await db.select()
        .from(drafts)
        .where(eq(drafts.id, draftToDelete.id))
        .limit(1);
      
      expect(nonDeletedDraft).toBeTruthy();
      expect(nonDeletedDraft?.is_deleted).toBe(false);
      expect(nonDeletedDraft?.deleted_at).toBeNull();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const draftToDelete = testDrafts[0];
      const request = createTestRequest(`/api/drafts/${draftToDelete.id}`, 'DELETE');
      const params = { id: draftToDelete.id.toString() };
      const response = await DELETE(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('削除した下書きが一覧から除外されることを確認', async () => {
      const testUserId = currentUser.clerk_id;
      
      // 現在の下書き数を確認
      const initialRequest = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const initialResponse = await GET(initialRequest);
      
      const initialData = await initialResponse.json();
      const initialCount = initialData.drafts.length;
      
      // 下書きを削除
      const draftToDelete = testDrafts[0];
      const deleteRequest = createTestRequest(`/api/drafts/${draftToDelete.id}`, 'DELETE', null, {}, testUserId);
      const params = { id: draftToDelete.id.toString() };
      await DELETE(deleteRequest, { params: Promise.resolve(params) });
      
      // 削除後の下書き数を確認
      const afterRequest = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const afterResponse = await GET(afterRequest);
      
      const afterData = await afterResponse.json();
      const afterCount = afterData.drafts.length;
      
      // 件数が1つ減っていることを確認
      expect(afterCount).toBe(initialCount - 1);
      
      // 削除した下書きが含まれていないことを確認
      const deletedDraftInList = afterData.drafts.find((d: any) => d.id === draftToDelete.id);
      expect(deletedDraftInList).toBeUndefined();
    });
  });

  // エッジケースのテスト
  describe('Edge Cases', () => {
    test('特殊文字を含む下書きを保存・取得できる', async () => {
      // 特殊文字を含む下書きを作成
      const specialCharDraft = await createSpecialCharDraft(currentUser.id);
      const testUserId = currentUser.clerk_id;
      
      // 下書き一覧を取得して特殊文字の下書きが含まれることを確認
      const request = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 特殊文字の下書きが一覧に含まれていることを確認
      const specialDraft = data.drafts.find((d: any) => d.id === specialCharDraft.id);
      expect(specialDraft).toBeDefined();
      expect(specialDraft.content).toBe(specialCharDraft.content);
    });
    
    test('制限内の長いテキストコンテンツの下書きを保存・取得できる', async () => {
      // 長いテキストコンテンツの下書きを作成（499文字）
      const longTextDraft = await createLongTextDraft(currentUser.id);
      const testUserId = currentUser.clerk_id;
      
      // 下書き一覧を取得して長いテキストの下書きが含まれることを確認
      const request = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // 長いテキストの下書きが一覧に含まれていることを確認
      const longDraft = data.drafts.find((d: any) => d.id === longTextDraft.id);
      expect(longDraft).toBeDefined();
      expect(longDraft.content).toBe(longTextDraft.content);
      expect(longDraft.content.length).toBe(499);
    });
    
    test('大量データのページネーションが正しく機能する', async () => {
      // 大量の下書きを作成（20件）
      const testUserId = currentUser.clerk_id;
      const manyDrafts = await createManyDrafts(currentUser.id, 20);
      
      // デフォルトのlimitでページ1を取得
      const firstPageRequest = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const firstPageResponse = await GET(firstPageRequest);
      
      // レスポンスの検証
      expect(firstPageResponse.status).toBe(200);
      
      const firstPageData = await firstPageResponse.json();
      expect(firstPageData.drafts.length).toBeLessThanOrEqual(ITEMS_PER_PAGE);
      expect(firstPageData.pagination.hasNextPage).toBe(true);
      expect(firstPageData.pagination.nextCursor).toBeTruthy();
      
      // 次のページを取得
      const nextCursor = firstPageData.pagination.nextCursor;
      const nextCursorId = parseInt(nextCursor as string, 10);
      const secondPageRequest = createTestRequest(`/api/drafts?cursor=${nextCursor}`, 'GET', null, {}, testUserId);
      const secondPageResponse = await GET(secondPageRequest);
      
      expect(secondPageResponse.status).toBe(200);
      const secondPageData = await secondPageResponse.json();
      
      // 次のページにもデータがある
      expect(secondPageData.drafts.length).toBeGreaterThan(0);
      
      // カーソルが機能していることを確認（次ページのIDがカーソルよりも小さい）
      if (secondPageData.drafts.length > 0) {
        const secondPageIds = secondPageData.drafts.map((d: any) => d.id);
        // すべてのIDがカーソルID未満であることを確認
        const allIdsLessThanCursor = secondPageIds.every((id: number) => id < nextCursorId);
        expect(allIdsLessThanCursor).toBe(true);
      }
    });
    
    test('メディアデータを含む下書きを保存・取得できる', async () => {
      // メディアデータを含む下書き
      const draftData = {
        content: 'メディアデータつき下書き',
        media: [
          {
            url: 'https://example.com/test.jpg',
            mediaType: 'image',
            width: 800,
            height: 600
          }
        ]
      };
      
      const testUserId = currentUser.clerk_id;
      const request = createTestRequest('/api/drafts', 'POST', draftData, {}, testUserId);
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.draft).toBeDefined();
      expect(data.draft.content).toBe(draftData.content);
      expect(data.draft.media).toBeDefined();
      expect(data.draft.media.length).toBe(1);
      expect(data.draft.media[0].url).toBe(draftData.media[0].url);
      
      // 一覧取得でメディアデータが含まれることを確認
      const listRequest = createTestRequest('/api/drafts', 'GET', null, {}, testUserId);
      const listResponse = await GET(listRequest);
      
      const listData = await listResponse.json();
      const savedDraft = listData.drafts.find((d: any) => d.id === data.draft.id);
      
      expect(savedDraft).toBeDefined();
      expect(savedDraft.media).toBeDefined();
      expect(savedDraft.media.length).toBe(1);
      expect(savedDraft.media[0].url).toBe(draftData.media[0].url);
    });
  });
}); 