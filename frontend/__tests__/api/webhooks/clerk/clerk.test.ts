/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { POST } from '@/app/api/webhooks/clerk/route';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Next.jsモジュールをモック
jest.mock('next/headers', () => ({
  headers: jest.fn().mockImplementation(() => {
    return {
      get: (key: string) => {
        // テスト用のヘッダー値を返す
        const headerValues: Record<string, string> = {
          'svix-id': 'test-svix-id',
          'svix-timestamp': new Date().toISOString(),
          'svix-signature': 'test-svix-signature'
        };
        return headerValues[key] || null;
      }
    };
  })
}));

// Svixモジュールをモック
jest.mock('svix', () => {
  return {
    Webhook: jest.fn().mockImplementation(() => ({
      verify: jest.fn().mockImplementation((args: unknown) => {
        // テスト用にモックされた検証結果を返す
        return JSON.parse(args as string);
      })
    }))
  };
});

// 環境変数をモック
const originalEnv = process.env;

describe('Clerk Webhook API', () => {
  // コンソールエラー出力をモックする
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    // 環境変数をリセット
    process.env = { ...originalEnv };
    process.env.CLERK_WEBHOOK_SECRET = 'test_webhook_secret';
    
    // モックをリセット
    jest.clearAllMocks();
    
    // コンソールエラー出力を抑制
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // コンソールエラー出力のモックを元に戻す
    consoleErrorSpy.mockRestore();
  });
  
  // Webhookリクエストをシミュレートするヘルパー関数
  const createWebhookRequest = (body: any, headers = {}) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'svix-id': 'test-svix-id',
      'svix-timestamp': new Date().toISOString(),
      'svix-signature': 'test-svix-signature'
    };
    
    return new Request('https://example.com/api/webhooks/clerk', {
      method: 'POST',
      headers: {
        ...defaultHeaders,
        ...headers
      },
      body: JSON.stringify(body)
    });
  };
  
  describe('POST /api/webhooks/clerk', () => {
    test('user.createdイベントが処理できる', async () => {
      // テスト用のClerkユーザーデータ
      const userData = {
        type: 'user.created',
        data: {
          id: `clerk_user_${Date.now()}`,
          email_addresses: [{ email_address: 'test-clerk@example.com' }],
          username: 'test_clerk_user',
          first_name: 'Test',
          last_name: 'User',
          image_url: 'https://example.com/clerk_user.jpg'
        }
      };
      
      // Webhookリクエストを作成
      const request = createWebhookRequest(userData);
      
      // APIエンドポイントを呼び出し
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      // データベースに正しくユーザーが作成されたか確認
      const [createdUser] = await db.select()
        .from(users)
        .where(eq(users.clerk_id, userData.data.id))
        .limit(1);
      
      expect(createdUser).not.toBeNull();
      expect(createdUser?.username).toBe('test_clerk_user');
      expect(createdUser?.email).toBe('test-clerk@example.com');
      expect(createdUser?.first_name).toBe('Test');
      expect(createdUser?.last_name).toBe('User');
      expect(createdUser?.profile_image_url).toBe('https://example.com/clerk_user.jpg');
    });
    
    test('user.updatedイベントが処理できる', async () => {
      // 既存のユーザーを作成
      const clerkId = `clerk_user_update_${Date.now()}`;
      await db.insert(users).values({
        clerk_id: clerkId,
        username: 'old_username',
        email: 'old-email@example.com',
        first_name: 'Old',
        last_name: 'Name',
        profile_image_url: 'https://example.com/old.jpg',
        role: 'user'
      });
      
      // テスト用のClerkユーザー更新データ
      const userData = {
        type: 'user.updated',
        data: {
          id: clerkId,
          email_addresses: [{ email_address: 'updated-email@example.com' }],
          username: 'updated_username',
          first_name: 'Updated',
          last_name: 'User',
          image_url: 'https://example.com/updated.jpg'
        }
      };
      
      // Webhookリクエストを作成
      const request = createWebhookRequest(userData);
      
      // APIエンドポイントを呼び出し
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      // データベースのユーザーが更新されたか確認
      const [updatedUser] = await db.select()
        .from(users)
        .where(eq(users.clerk_id, clerkId))
        .limit(1);
      
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.username).toBe('updated_username');
      expect(updatedUser?.email).toBe('updated-email@example.com');
      expect(updatedUser?.first_name).toBe('Updated');
      expect(updatedUser?.last_name).toBe('User');
      expect(updatedUser?.profile_image_url).toBe('https://example.com/updated.jpg');
    });
    
    test('未知のイベントタイプは正常に処理される', async () => {
      // テスト用の未知のイベント
      const unknownEvent = {
        type: 'unknown.event',
        data: {
          id: `clerk_user_${Date.now()}`
        }
      };
      
      // Webhookリクエストを作成
      const request = createWebhookRequest(unknownEvent);
      
      // APIエンドポイントを呼び出し
      const response = await POST(request);
      
      // 未知のイベントでも200を返す
      expect(response.status).toBe(200);
    });
    
    test('必須ヘッダーがない場合は400エラーを返す', async () => {
      // Next.jsのheadersモックを変更して必須ヘッダーがないケースをシミュレート
      const headersModule = require('next/headers');
      headersModule.headers.mockImplementationOnce(() => ({
        get: () => null // すべてのヘッダーがnullを返す
      }));
      
      // テスト用のリクエストボディ
      const userData = {
        type: 'user.created',
        data: {
          id: `clerk_user_${Date.now()}`
        }
      };
      
      // ヘッダーなしでリクエストを作成
      const request = createWebhookRequest(userData);
      
      // APIエンドポイントを呼び出し
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(400);
    });
    
    test('Webhook検証が失敗した場合は400エラーを返す', async () => {
      // Webhookの検証を失敗させるためにモックを変更
      const svixMock = require('svix');
      svixMock.Webhook.mockImplementationOnce(() => ({
        verify: jest.fn().mockImplementation(() => {
          throw new Error('Verification failed');
        })
      }));
      
      // テスト用のリクエスト
      const userData = {
        type: 'user.created',
        data: {
          id: `clerk_user_${Date.now()}`
        }
      };
      
      const request = createWebhookRequest(userData);
      
      // APIエンドポイントを呼び出し
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(400);
    });
    
    test('Webhookシークレットが設定されていない場合は500エラーを返す', async () => {
      // 環境変数から削除
      delete process.env.CLERK_WEBHOOK_SECRET;
      
      // テスト用のリクエスト
      const userData = {
        type: 'user.created',
        data: {
          id: `clerk_user_${Date.now()}`
        }
      };
      
      const request = createWebhookRequest(userData);
      
      // APIエンドポイントを呼び出し
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(500);
    });
    
    test('ユーザー名がない場合は適切に処理される', async () => {
      // ユーザー名のないユーザーデータ
      const userData = {
        type: 'user.created',
        data: {
          id: `clerk_user_${Date.now()}`,
          email_addresses: [{ email_address: 'no-username@example.com' }],
          first_name: 'No',
          last_name: 'Username',
          image_url: 'https://example.com/no-username.jpg'
        }
      };
      
      // Webhookリクエストを作成
      const request = createWebhookRequest(userData);
      
      // APIエンドポイントを呼び出し
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      // データベースのユーザーを確認
      const [createdUser] = await db.select()
        .from(users)
        .where(eq(users.clerk_id, userData.data.id))
        .limit(1);
      
      expect(createdUser).not.toBeNull();
      // ユーザー名がない場合はfirst_nameまたはIDの一部が使用される
      expect(createdUser?.username).toBe('No');
    });
    
    test('プロフィール画像URLがない場合は適切に処理される', async () => {
      // 画像URLのないユーザーデータ
      const userData = {
        type: 'user.created',
        data: {
          id: `clerk_user_${Date.now()}`,
          email_addresses: [{ email_address: 'no-image@example.com' }],
          username: 'no_image_user',
          first_name: 'No',
          last_name: 'Image'
          // image_urlなし
        }
      };
      
      // Webhookリクエストを作成
      const request = createWebhookRequest(userData);
      
      // APIエンドポイントを呼び出し
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      // データベースのユーザーを確認
      const [createdUser] = await db.select()
        .from(users)
        .where(eq(users.clerk_id, userData.data.id))
        .limit(1);
      
      expect(createdUser).not.toBeNull();
      expect(createdUser?.profile_image_url).toBeNull();
    });
    
    test('メールアドレスがない場合は適切に処理される', async () => {
      // メールアドレスのないユーザーデータ
      const userData = {
        type: 'user.created',
        data: {
          id: `clerk_user_${Date.now()}`,
          email_addresses: [{ email_address: '' }], // 空のメールアドレス配列ではなく、空の文字列を持つオブジェクト
          username: 'no_email_user',
          first_name: 'No',
          last_name: 'Email',
          image_url: 'https://example.com/no-email.jpg'
        }
      };
      
      // Webhookリクエストを作成
      const request = createWebhookRequest(userData);
      
      // APIエンドポイントを呼び出し
      const response = await POST(request);
      
      // レスポンスの検証
      expect(response.status).toBe(200);
      
      // データベースのユーザーを確認
      const [createdUser] = await db.select()
        .from(users)
        .where(eq(users.clerk_id, userData.data.id))
        .limit(1);
      
      expect(createdUser).not.toBeNull();
      expect(createdUser?.email).toBe(''); // nullではなく空文字列
    });
  });
  
  // テスト終了後のクリーンアップ
  afterAll(() => {
    // 環境変数を元に戻す
    process.env = originalEnv;
    
    // モックをリセット
    jest.restoreAllMocks();
  });
}); 