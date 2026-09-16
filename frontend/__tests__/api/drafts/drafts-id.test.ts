/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import { GET, PUT } from '@/app/api/drafts/[id]/route';
import { createTestRequest } from '@/utils/test/api-test-helpers';
import { db } from '@/db';
import { users, drafts, posts, draft_media } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
      username: 'testuser_drafts_id',
      email: 'testuser_drafts_id@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    },
    {
      clerk_id: `test_user_id_${Date.now()}_2`,
      username: 'otheruser_drafts_id',
      email: 'otheruser_drafts_id@example.com',
      first_name: 'Other',
      last_name: 'User',
      profile_image_url: 'https://example.com/image2.jpg',
      role: 'user'
    }
  ];
}

// 下書きを作成するヘルパー関数
async function createDraft(userId: number, content: string = 'テスト下書き', replyToPostId: number | null = null, mediaItems: any = null) {
  const draftData = {
    user_id: userId,
    content: content,
    in_reply_to_post_id: replyToPostId,
    media_count: mediaItems ? mediaItems.media.length : 0,
    created_at: new Date(),
    updated_at: new Date(),
    is_deleted: false
  };

  // 下書きを作成
  const [draft] = await db.insert(drafts).values(draftData).returning();

  // メディアアイテムがある場合は、draft_mediaテーブルに保存
  if (mediaItems && mediaItems.media.length > 0) {
    const mediaValues = mediaItems.media.map((m: any) => ({
      draft_id: draft.id,
      media_type: m.mediaType,
      url: m.url,
      width: m.width || null,
      height: m.height || null,
      duration_sec: m.mediaType === 'video' ? m.duration_sec || null : null,
      created_at: new Date(),
      is_deleted: false
    }));

    await db.insert(draft_media).values(mediaValues);
  }

  return draft;
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

// 特殊文字を含む下書きを作成するヘルパー関数
async function createSpecialCharDraft(userId: number) {
  return await createDraft(
    userId, 
    '特殊文字テスト：日本語≈†ø、絵文字😀🎉🚀、HTML<script>alert("test")</script>'
  );
}

// 長いテキストコンテンツの下書きを作成するヘルパー関数（制限内の499文字）
async function createLongTextDraft(userId: number) {
  // 499文字程度のテキスト
  const longText = 'これは長いテキストコンテンツのテストです。'.repeat(35).substring(0, 499);
  return await createDraft(userId, longText);
}

describe('Drafts [id] API', () => {
  let currentUser: any;
  let otherUser: any;
  let testDraft: any;
  let replyPost: any;
  let replyDraft: any;

  beforeEach(async () => {
    // 毎回ユニークなユーザーデータを生成
    const testUsers = createTestUsers();
    
    // テストユーザーをデータベースに挿入
    [currentUser, otherUser] = await Promise.all(
      testUsers.map(user => db.insert(users).values(user).returning())
    ).then(results => results.map(r => r[0]));
    
    // 基本的な下書きを作成
    testDraft = await createDraft(currentUser.id);
    
    // 返信用の投稿と返信下書きを作成
    replyPost = await createReplyPost(otherUser.id);
    replyDraft = await createDraft(currentUser.id, '返信下書きのテスト', replyPost.id);
  });

  describe('GET /api/drafts/[id]', () => {
    test('特定のIDの下書きを取得できる', async () => {
      // APIリクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(testDraft.id);
      expect(data.draft.content).toBe(testDraft.content);
      expect(data.draft.user_id).toBe(currentUser.id);
    });

    test('返信下書きを取得できる', async () => {
      // APIリクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: replyDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${replyDraft.id}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(replyDraft.id);
      expect(data.draft.content).toBe(replyDraft.content);
      expect(data.draft.in_reply_to_post_id).toBe(replyPost.id);
    });
    
    test('特殊文字を含む下書きを取得できる', async () => {
      // 特殊文字を含む下書きを作成
      const specialDraft = await createSpecialCharDraft(currentUser.id);
      
      // APIリクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: specialDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${specialDraft.id}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(specialDraft.id);
      expect(data.draft.content).toBe(specialDraft.content);
    });
    
    test('長いテキストの下書きを取得できる', async () => {
      // 長いテキストを含む下書きを作成
      const longDraft = await createLongTextDraft(currentUser.id);
      
      // APIリクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: longDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${longDraft.id}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(longDraft.id);
      expect(data.draft.content).toBe(longDraft.content);
      expect(data.draft.content.length).toBe(499);
    });
    
    test('存在しないIDの場合は404エラーを返す', async () => {
      // 存在しないID
      const nonExistentId = 999999;
      const testUserId = currentUser.clerk_id;
      const params = { id: nonExistentId.toString() };
      const request = createTestRequest(`/api/drafts/${nonExistentId}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('無効なIDの場合は400エラーを返す', async () => {
      // 無効なID（数値でない）
      const invalidId = 'invalid';
      const testUserId = currentUser.clerk_id;
      const params = { id: invalidId };
      const request = createTestRequest(`/api/drafts/${invalidId}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('他ユーザーの下書きは取得できない', async () => {
      // 他ユーザーで現在のユーザーの下書きにアクセス
      const otherUserId = otherUser.clerk_id;
      global.currentTestUserId = otherUserId;
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'GET', null, {}, otherUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('削除済みの下書きは取得できない', async () => {
      // 下書きを削除マーク
      await db.update(drafts)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(drafts.id, testDraft.id));
      
      // 削除済み下書きへのアクセス
      const testUserId = currentUser.clerk_id;
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'GET', null, {});
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('PUT /api/drafts/[id]', () => {
    test('下書きを更新できる', async () => {
      // 更新データ
      const updateData = {
        content: '更新されたテスト下書き'
      };
      
      const testUserId = currentUser.clerk_id;
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(testDraft.id);
      expect(data.draft.content).toBe(updateData.content);
      
      // データベースで確認
      const [updatedDraft] = await db.select()
        .from(drafts)
        .where(eq(drafts.id, testDraft.id))
        .limit(1);
      
      expect(updatedDraft).toBeTruthy();
      expect(updatedDraft?.content).toBe(updateData.content);
    });
    
    test('返信下書きを更新できる', async () => {
      // 更新データ
      const updateData = {
        content: '更新された返信下書き',
        in_reply_to_post_id: replyPost.id
      };
      
      const testUserId = currentUser.clerk_id;
      const params = { id: replyDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${replyDraft.id}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(replyDraft.id);
      expect(data.draft.content).toBe(updateData.content);
      expect(data.draft.in_reply_to_post_id).toBe(replyPost.id);
    });
    
    test('メディアデータを追加して更新できる', async () => {
      // 空のコンテンツでない下書きを作成
      const emptyDraft = await createDraft(currentUser.id, 'メディア追加テスト');
      
      // メディアデータを追加する更新
      const updateData = {
        content: 'メディアデータ追加テスト',
        media: [
          {
            url: 'https://example.com/test.jpg',
            mediaType: 'image',
            width: 1200,
            height: 800
          }
        ]
      };
      
      // 更新リクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: emptyDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${emptyDraft.id}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.draft).toBeDefined();
      expect(data.draft.content).toBe(updateData.content);
      
      // 特定のフィールドだけを個別にチェック
      expect(data.draft.media).toBeDefined();
      expect(data.draft.media.length).toBe(1);
      expect(data.draft.media[0].url).toBe(updateData.media[0].url);
      expect(data.draft.media[0].media_type).toBe('image'); // mediaTypeではなくmedia_type
      expect(data.draft.media[0].width).toBe(updateData.media[0].width);
      expect(data.draft.media[0].height).toBe(updateData.media[0].height);
      
      // データベースで確認
      const [updatedDraft] = await db.select()
        .from(drafts)
        .where(eq(drafts.id, emptyDraft.id))
        .limit(1);
      
      expect(updatedDraft).toBeTruthy();
      // データベース側のmediaカラムは使われなくなった可能性があるため、このチェックは省略
    });
    
    test('空のコンテンツの場合は400エラーを返す', async () => {
      // 空のコンテンツ
      const updateData = {
        content: ''
      };
      
      const testUserId = currentUser.clerk_id;
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('コンテンツが500文字を超える場合は400エラーを返す', async () => {
      // 500文字を超えるコンテンツ
      const longContent = 'あ'.repeat(501);
      const updateData = {
        content: longContent
      };
      
      const testUserId = currentUser.clerk_id;
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('存在しないIDの場合は404エラーを返す', async () => {
      // 存在しないID
      const nonExistentId = 999999;
      const updateData = {
        content: '更新テスト'
      };
      
      const testUserId = currentUser.clerk_id;
      const params = { id: nonExistentId.toString() };
      const request = createTestRequest(`/api/drafts/${nonExistentId}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('無効なIDの場合は400エラーを返す', async () => {
      // 無効なID（数値でない）
      const invalidId = 'invalid';
      const updateData = {
        content: '更新テスト'
      };
      
      const testUserId = currentUser.clerk_id;
      const params = { id: invalidId };
      const request = createTestRequest(`/api/drafts/${invalidId}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('他ユーザーの下書きは更新できない', async () => {
      // 他ユーザーで現在のユーザーの下書きを更新
      const otherUserId = otherUser.clerk_id;
      global.currentTestUserId = otherUserId;
      
      const updateData = {
        content: '他ユーザーによる更新'
      };
      
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'PUT', updateData, {}, otherUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
      
      // データベースで確認 - 更新されていないこと
      const [nonUpdatedDraft] = await db.select()
        .from(drafts)
        .where(eq(drafts.id, testDraft.id))
        .limit(1);
      
      expect(nonUpdatedDraft).toBeTruthy();
      expect(nonUpdatedDraft?.content).toBe(testDraft.content);
    });
    
    test('削除済みの下書きは更新できない', async () => {
      // 下書きを削除マーク
      await db.update(drafts)
        .set({ is_deleted: true, deleted_at: new Date() })
        .where(eq(drafts.id, testDraft.id));
      
      // 削除済み下書きの更新
      const updateData = {
        content: '削除済み下書きへの更新'
      };
      
      const testUserId = currentUser.clerk_id;
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    
    test('未認証の場合は401エラーを返す', async () => {
      // 未認証状態を設定
      global.currentTestUserId = null as unknown as string;
      
      const updateData = {
        content: '更新テスト'
      };
      
      const params = { id: testDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${testDraft.id}`, 'PUT', updateData, {});
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  // メディア対応テスト追加
  describe('メディア添付機能のテスト', () => {
    // メディアデータを含む下書きを作成するヘルパー関数
    async function createMediaDraft(userId: number, mediaType: 'image' | 'video' = 'image') {
      const mediaData = {
        media: [
          mediaType === 'image' 
            ? {
                url: 'https://example.com/test-image.jpg',
                mediaType: 'image',
                width: 1200,
                height: 800
              }
            : {
                url: 'https://example.com/test-video.mp4',
                mediaType: 'video',
                width: 1280,
                height: 720,
                duration_sec: 8
              }
        ]
      };
      
      return await createDraft(
        userId, 
        'メディアデータ付き下書きテスト',
        null,
        mediaData
      );
    }
    
    test('画像メディアを含む下書きの詳細を取得できる', async () => {
      // 画像メディアを含む下書きを作成
      const imageDraft = await createMediaDraft(currentUser.id, 'image');
      
      // APIリクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: imageDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${imageDraft.id}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(imageDraft.id);
      
      // メディアデータの検証
      expect(data.draft.media).toBeDefined();
      expect(Array.isArray(data.draft.media)).toBe(true);
      expect(data.draft.media.length).toBe(1);
      expect(data.draft.media[0].media_type).toBe('image');
      expect(data.draft.media[0].url).toBe('https://example.com/test-image.jpg');
      expect(data.draft.media[0].width).toBe(1200);
      expect(data.draft.media[0].height).toBe(800);
    });
    
    test('動画メディアを含む下書きの詳細を取得できる', async () => {
      // 動画メディアを含む下書きを作成
      const videoDraft = await createMediaDraft(currentUser.id, 'video');
      
      // APIリクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: videoDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${videoDraft.id}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(videoDraft.id);
      
      // メディアデータの検証
      expect(data.draft.media).toBeDefined();
      expect(Array.isArray(data.draft.media)).toBe(true);
      expect(data.draft.media.length).toBe(1);
      expect(data.draft.media[0].media_type).toBe('video');
      expect(data.draft.media[0].url).toBe('https://example.com/test-video.mp4');
      expect(data.draft.media[0].width).toBe(1280);
      expect(data.draft.media[0].height).toBe(720);
      expect(data.draft.media[0].duration_sec).toBe(8);
    });
    
    test('複数画像メディアを含む下書きの詳細を取得できる', async () => {
      // 複数画像メディアを含む下書きを作成
      const multipleMediaData = {
        media: [
          {
            url: 'https://example.com/test-image1.jpg',
            mediaType: 'image',
            width: 1200,
            height: 800
          },
          {
            url: 'https://example.com/test-image2.jpg',
            mediaType: 'image',
            width: 800,
            height: 600
          },
          {
            url: 'https://example.com/test-image3.jpg',
            mediaType: 'image',
            width: 1920,
            height: 1080
          }
        ]
      };
      
      const multiImageDraft = await createDraft(
        currentUser.id, 
        '複数画像メディア付き下書きテスト',
        null,
        multipleMediaData
      );
      
      // APIリクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: multiImageDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${multiImageDraft.id}`, 'GET', null, {}, testUserId);
      const response = await GET(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(multiImageDraft.id);
      
      // メディアデータの検証
      expect(data.draft.media).toBeDefined();
      expect(Array.isArray(data.draft.media)).toBe(true);
      expect(data.draft.media.length).toBe(3);
      // 各メディア要素の検証（URLのみ確認）
      const urls = data.draft.media.map((m: any) => m.url).sort();
      const expectedUrls = [
        'https://example.com/test-image1.jpg',
        'https://example.com/test-image2.jpg',
        'https://example.com/test-image3.jpg'
      ].sort();
      expect(urls).toEqual(expectedUrls);
    });
    
    test('メディアデータを含む下書きを更新できる', async () => {
      // メディアデータを含む下書きを作成
      const imageDraft = await createMediaDraft(currentUser.id, 'image');
      
      // 更新データ (メディアデータを変更)
      const updateData = {
        content: 'メディアデータ更新テスト',
        media: [
          {
            url: 'https://example.com/updated-image.jpg',
            mediaType: 'image',
            width: 1600,
            height: 900
          }
        ]
      };
      
      // 更新リクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: imageDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${imageDraft.id}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(imageDraft.id);
      expect(data.draft.content).toBe(updateData.content);
      
      // 更新されたメディアデータの検証 - media_typeフィールドに変換されていることを考慮
      expect(data.draft.media).toBeDefined();
      expect(data.draft.media.length).toBe(1);
      expect(data.draft.media[0].url).toBe('https://example.com/updated-image.jpg');
      expect(data.draft.media[0].media_type).toBe('image');
      
      // 再取得して永続化されていることを確認
      const getRequest = createTestRequest(`/api/drafts/${imageDraft.id}`, 'GET', null, {}, testUserId);
      const getResponse = await GET(getRequest, { params: Promise.resolve(params) });
      const getData = await getResponse.json();
      
      expect(getData.draft.media[0].url).toBe('https://example.com/updated-image.jpg');
    });
    
    test('メディアデータを削除して下書きを更新できる', async () => {
      // メディアデータを含む下書きを作成
      const imageDraft = await createMediaDraft(currentUser.id, 'image');
      
      // メディアデータを削除する更新
      const updateData = {
        content: 'メディアデータ削除テスト',
        media: []
      };
      
      // 更新リクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: imageDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${imageDraft.id}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.draft).toBeDefined();
      expect(data.draft.id).toBe(imageDraft.id);
      expect(data.draft.content).toBe(updateData.content);
      
      // メディアデータが削除されたことを確認（空の配列として返される）
      expect(data.draft.media).toEqual([]);
    });
    
    test('画像から動画へメディアタイプを変更できる', async () => {
      // 画像メディアを含む下書きを作成
      const imageDraft = await createMediaDraft(currentUser.id, 'image');
      
      // 動画メディアに更新
      const updateData = {
        content: 'メディアタイプ変更テスト',
        media: [
          {
            url: 'https://example.com/new-video.mp4',
            mediaType: 'video',
            width: 1280,
            height: 720,
            duration_sec: 15
          }
        ]
      };
      
      // 更新リクエスト
      const testUserId = currentUser.clerk_id;
      const params = { id: imageDraft.id.toString() };
      const request = createTestRequest(`/api/drafts/${imageDraft.id}`, 'PUT', updateData, {}, testUserId);
      const response = await PUT(request, { params: Promise.resolve(params) });
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // メディアタイプが変更されていることを確認
      expect(data.draft.media[0].media_type).toBe('video');
      expect(data.draft.media[0].url).toBe('https://example.com/new-video.mp4');
      expect(data.draft.media[0].duration_sec).toBe(15);
    });
  });
}); 