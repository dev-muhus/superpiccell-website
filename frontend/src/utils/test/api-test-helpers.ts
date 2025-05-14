import { NextRequest } from 'next/server';

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * テスト用のNextRequestオブジェクトを作成するヘルパー関数
 * @param url リクエストURL
 * @param method HTTPメソッド
 * @param body リクエストボディ（JSON形式またはFormData）
 * @param headers リクエストヘッダー
 * @param userId Clerk認証でモックするユーザーID（認証済みテスト用）
 * @returns NextRequestオブジェクト
 */
export function createTestRequest(
  url: string,
  method: string,
  body: Record<string, unknown> | FormData | null = null,
  headers: Record<string, string> = {},
  userId: string | null = null
): NextRequest {
  // Clerk認証をバイパスするためのヘッダーを設定
  if (userId) {
    headers['x-clerk-auth-test-user-id'] = userId;
    headers['x-auth-user-id'] = userId;
  }

  // テストモードであることを明示
  headers['x-test-mode'] = 'true';
  headers['x-test-auth'] = 'true';

  // Bodyの処理
  let requestBody: BodyInit | null = null;
  
  if (body instanceof FormData) {
    requestBody = body as FormData;
  } else if (body) {
    requestBody = JSON.stringify(body);
  }

  // NextRequestオブジェクトを作成して返す
  const requestInit = {
    method,
    headers: new Headers(headers),
    body: requestBody
  };

  const request = new NextRequest(new URL(url, BASE_URL), requestInit);

  // テスト用にjsonメソッドをオーバーライド
  if (body && !(body instanceof FormData)) {
    const originalJson = request.json;
    request.json = async () => {
      try {
        return await originalJson.call(request);
      } catch {
        // 既にBodyがパースされている場合は、bodyをそのまま返す
        return body;
      }
    };
  }

  return request;
}

/**
 * テスト用の認証ヘッダーを含むfetch関数
 */
export async function fetchApi<T>(
  url: string, 
  options: RequestInit = {}
): Promise<{ status: number; data: T }> {
  const headers = new Headers(options.headers || {});
  
  // テスト用認証ヘッダーを設定
  headers.set('x-test-auth', 'true');
  headers.set('x-test-mode', 'true');
  headers.set('Content-Type', 'application/json');
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  return {
    status: response.status,
    data: await response.json() as T,
  };
}

/**
 * テスト時にClerkの認証をモックする。
 * jest.mockで`@clerk/nextjs/server`をモックする際に使用する関数。
 * 
 * 使用例:
 * ```ts
 * jest.mock('@clerk/nextjs/server', () => ({
 *   getAuth: mockClerkAuth
 * }));
 * ```
 */
export function mockClerkAuth(req: NextRequest) {
  const userId = req.headers.get('x-clerk-auth-test-user-id');
  
  return {
    userId: userId || null,
    isSignedIn: !!userId
  };
}

/**
 * テスト実行後のクリーンアップヘルパー
 */
export async function cleanupTestUsers() {
  try {
    // 関連するデータを削除するロジックを実装
    // 例: await db.delete(users).where(inArray(users.id, userIds));
    console.log('クリーンアップが必要な場合は実装してください');
  } catch (error) {
    console.error('テストユーザーのクリーンアップに失敗しました:', error);
  }
} 