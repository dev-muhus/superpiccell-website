/**
 * @jest-environment node
 */
import { describe, test, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { POST } from '@/app/api/upload/cover-images/route';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { BASE_URL } from '@/utils/test/api-test-helpers';

// .env.localファイルを明示的にロード
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// テスト環境変数を一時的に設定（元の値を保存）
const originalEnv = {
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  NEXT_PUBLIC_CLOUDINARY_PROFILE_COVER_FOLDER: process.env.NEXT_PUBLIC_CLOUDINARY_PROFILE_COVER_FOLDER
};

// テスト用の環境変数をセット
if (process.env.NEXT_PUBLIC_CLOUDINARY_TEST_UPLOAD_PRESET) {
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_TEST_UPLOAD_PRESET;
}
if (process.env.NEXT_PUBLIC_CLOUDINARY_TEST_PROFILE_COVER_FOLDER) {
  process.env.NEXT_PUBLIC_CLOUDINARY_PROFILE_COVER_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_TEST_PROFILE_COVER_FOLDER;
}

// ノードフェッチとフォームデータをrequireで読み込み
const fetch = require('node-fetch');
const FormData = require('form-data');

// Clerk認証をモック
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn().mockImplementation(() => {
    return Promise.resolve({ userId: global.currentTestUserId });
  }),
  getAuth: () => ({ userId: global.currentTestUserId }),
  clerkClient: {
    users: {
      getUser: jest.fn().mockImplementation(() => Promise.resolve({
        id: global.currentTestUserId,
        username: 'testuser',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
        imageUrl: 'https://example.com/image.jpg'
      }))
    }
  }
}));

// モックのカスタムFormData
class MockFormData {
  private data = new Map<string, any>();

  append(key: string, value: any) {
    this.data.set(key, value);
  }

  get(key: string) {
    return this.data.get(key) || null;
  }

  getAll(key: string) {
    const value = this.data.get(key);
    return value ? [value] : [];
  }

  has(key: string) {
    return this.data.has(key);
  }

  delete(key: string) {
    this.data.delete(key);
  }

  forEach(callback: (value: any, key: string) => void) {
    this.data.forEach((value, key) => callback(value, key));
  }
}

// NextRequestのformDataメソッドをモック
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  return {
    ...originalModule,
    NextRequest: class MockNextRequest extends originalModule.NextRequest {
      formData() {
        // モックされたFormDataを返す
        return Promise.resolve(global.mockFormData);
      }
    }
  };
});

// テスト用のグローバル変数に型を追加
declare global {
  // eslint-disable-next-line no-var
  var currentTestUserId: string;
  var mockFormData: any;
}

// Fileオブジェクトの完全なモック
class MockFile {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  buffer: Buffer;

  constructor(name: string, type: string, size: number, buffer?: Buffer) {
    this.name = name;
    this.type = type;
    this.size = size;
    this.lastModified = Date.now();
    this.buffer = buffer || Buffer.from('mock content');
  }

  // File APIメソッド
  arrayBuffer() {
    return Promise.resolve(this.buffer.buffer);
  }

  slice(start?: number, end?: number, contentType?: string) {
    return new Blob([this.buffer.slice(start, end)], { type: contentType || this.type });
  }

  stream() {
    return new ReadableStream();
  }

  text() {
    return Promise.resolve(this.buffer.toString('utf-8'));
  }
}

// テスト用ファイルの作成
function createTestImageFile(): Buffer {
  // 1x1ピクセルの最小PNGファイル
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
}

// デバッグ用ヘルパー関数
async function debugResponse(response: any) {
  try {
    const responseText = await response.text();
    try {
      const json = JSON.parse(responseText);
      return json;
    } catch (e) {
      return responseText;
    }
  } catch (error) {
    console.error('デバッグ中にエラーが発生しました:', error);
    return null;
  }
}

describe('カバー画像アップロードAPI', () => {
  let testUserId: string;
  
  // コンソールログとエラーのスパイを保持する変数
  let consoleErrorSpy: any;
  let consoleLogSpy: any;
  
  beforeEach(async () => {
    // コンソールログとエラーを抑制
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // テスト用のグローバルFormDataオブジェクトを初期化
    global.mockFormData = new MockFormData();
    
    // テストユーザーIDを設定
    testUserId = `test_user_id_${Date.now()}`;
    global.currentTestUserId = testUserId;

    // テストユーザーをデータベースに作成
    await db.insert(users).values({
      clerk_id: testUserId,
      username: 'testuser_cover',
      email: 'testuser_cover@example.com',
      first_name: 'Test',
      last_name: 'User',
      profile_image_url: 'https://example.com/image.jpg',
      role: 'user'
    }).returning().then(res => res[0]);
  });
  
  afterEach(() => {
    // テスト後にコンソールのモックを元に戻す
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test('カバー画像ファイルの署名付きURLを取得できる', async () => {
    // モック画像ファイルを作成
    const mockFile = new MockFile('test-cover.png', 'image/png', 1024);
    
    // FormDataにモックファイルを追加
    global.mockFormData.append('file', mockFile);
    
    // リクエストオブジェクトを作成
    const request = new NextRequest(`${BASE_URL}/api/upload/cover-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=boundary',
        'x-test-mode': 'true',
        'x-test-auth': 'true',
        'x-auth-user-id': testUserId
      }
    });
    
    // APIルートハンドラを呼び出す
    const response = await POST(request);
    
    // レスポンスの検証
    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.mediaType).toBe('image');
    expect(responseData.uploadUrl).toContain('cloudinary.com');
    expect(responseData.publicUrl).toContain('cloudinary.com');
    expect(responseData.publicUrl).toContain('c_fill,w_1200,h_400,q_80,f_auto');
    expect(responseData.signature).toBeDefined();
    expect(responseData.apiKey).toBeDefined();
    expect(responseData.timestamp).toBeDefined();
    expect(responseData.uploadPreset).toBeDefined();
    expect(responseData.publicId).toBeDefined();
  });

  test('JPEG画像ファイルの署名付きURLを取得できる', async () => {
    // モックJPEG画像ファイルを作成
    const mockFile = new MockFile('test-cover.jpg', 'image/jpeg', 2048);
    
    // FormDataにモックファイルを追加
    global.mockFormData.append('file', mockFile);
    
    // リクエストオブジェクトを作成
    const request = new NextRequest(`${BASE_URL}/api/upload/cover-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=boundary',
        'x-test-mode': 'true',
        'x-test-auth': 'true',
        'x-auth-user-id': testUserId
      }
    });
    
    // APIルートハンドラを呼び出す
    const response = await POST(request);
    
    // レスポンスの検証
    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.mediaType).toBe('image');
    expect(responseData.publicUrl).toContain('.jpg');
  });

  test('ファイルが提供されていない場合、エラーを返す', async () => {
    // ファイルを追加せずに空のFormData
    // global.mockFormDataはbeforeEachで既に初期化済み
    
    // リクエストオブジェクトを作成
    const request = new NextRequest(`${BASE_URL}/api/upload/cover-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=boundary',
        'x-test-mode': 'true',
        'x-test-auth': 'true',
        'x-auth-user-id': testUserId
      }
    });
    
    // APIルートハンドラを呼び出す
    const response = await POST(request);
    
    // レスポンスの検証
    expect(response.status).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.error).toBe('No file provided');
  });

  test('ファイルサイズが大きすぎる場合、エラーを返す', async () => {
    // 大きなサイズのモックファイルを作成（11MB）
    const mockFile = new MockFile('large-cover.png', 'image/png', 11 * 1024 * 1024);
    
    // FormDataにモックファイルを追加
    global.mockFormData.append('file', mockFile);
    
    // リクエストオブジェクトを作成
    const request = new NextRequest(`${BASE_URL}/api/upload/cover-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=boundary',
        'x-test-mode': 'true',
        'x-test-auth': 'true',
        'x-auth-user-id': testUserId
      }
    });
    
    // APIルートハンドラを呼び出す
    const response = await POST(request);
    
    // レスポンスの検証
    expect(response.status).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.error).toBe('File must be 10 MB or smaller.');
  });

  test('無効なファイル形式の場合、エラーを返す', async () => {
    // 無効な形式のモックファイルを作成
    const mockFile = new MockFile('invalid.txt', 'text/plain', 1024);
    
    // FormDataにモックファイルを追加
    global.mockFormData.append('file', mockFile);
    
    // リクエストオブジェクトを作成
    const request = new NextRequest(`${BASE_URL}/api/upload/cover-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=boundary',
        'x-test-mode': 'true',
        'x-test-auth': 'true',
        'x-auth-user-id': testUserId
      }
    });
    
    // APIルートハンドラを呼び出す
    const response = await POST(request);
    
    // レスポンスの検証
    expect(response.status).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.error).toContain('Invalid file type');
  });

  test('動画ファイルの場合、エラーを返す', async () => {
    // 動画ファイルのモックを作成
    const mockFile = new MockFile('video.mp4', 'video/mp4', 1024);
    
    // FormDataにモックファイルを追加
    global.mockFormData.append('file', mockFile);
    
    // リクエストオブジェクトを作成
    const request = new NextRequest(`${BASE_URL}/api/upload/cover-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=boundary',
        'x-test-mode': 'true',
        'x-test-auth': 'true',
        'x-auth-user-id': testUserId
      }
    });
    
    // APIルートハンドラを呼び出す
    const response = await POST(request);
    
    // レスポンスの検証
    expect(response.status).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.error).toContain('Invalid file type');
  });
  
  // 実際のファイルをCloudinaryにアップロードするテスト 【仕様要件必須】
  test('実際のカバー画像ファイルをCloudinaryにアップロードする', async () => {
    // 仕様書の要件に従い、実際のファイルアップロードテストを実装
    // テスト用の小さな画像ファイルを作成
    const imageBuffer = createTestImageFile();
    const mockFile = new MockFile('real-test-cover.png', 'image/png', imageBuffer.length, imageBuffer);
    
    // FormDataにファイルを追加
    global.mockFormData.append('file', mockFile);
    
    // リクエストオブジェクトを作成
    const request = new NextRequest(`${BASE_URL}/api/upload/cover-images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=boundary',
        'x-test-mode': 'true',
        'x-test-auth': 'true',
        'x-auth-user-id': testUserId
      }
    });
    
    // APIルートハンドラを呼び出し、署名付きURLを取得
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // 署名付きURL情報を確認
    expect(data.mediaType).toBe('image');
    expect(data.uploadUrl).toContain('cloudinary.com');
    expect(data.publicUrl).toContain('c_fill,w_1200,h_400,q_80,f_auto');
    
    // 実際のCloudinaryへのアップロード処理 【仕様必須】
    const cloudinaryFormData = new FormData();
    
    // ファイルバッファをFormDataに追加
    cloudinaryFormData.append('file', imageBuffer, {
      filename: 'real-test-cover.png',
      contentType: 'image/png'
    });
    cloudinaryFormData.append('api_key', data.apiKey);
    cloudinaryFormData.append('timestamp', data.timestamp.toString());
    cloudinaryFormData.append('signature', data.signature);
    cloudinaryFormData.append('public_id', data.publicId);
    cloudinaryFormData.append('upload_preset', data.uploadPreset);
    
    // 実際のCloudinaryへのアップロード
    const uploadResponse = await fetch(data.uploadUrl, {
      method: 'POST',
      body: cloudinaryFormData
    });

    // 返ってきたJSONを調査（エラーの場合も含めて）
    const uploadResultRaw = await debugResponse(uploadResponse);
    
    // アップロード結果の検証
    expect(uploadResponse.status).toBe(200);
    const uploadResult = typeof uploadResultRaw === 'string' ? JSON.parse(uploadResultRaw) : uploadResultRaw;
    expect(uploadResult.public_id).toBeDefined();
    expect(uploadResult.url).toBeDefined();
    
    // メタデータの検証
    expect(uploadResult.format).toBe('png');
    expect(uploadResult.resource_type).toBe('image');
  });

  test('サポートされている画像形式の検証', async () => {
    // サポートされている画像形式のテスト
    const supportedFormats = [
      { ext: 'jpg', type: 'image/jpeg' },
      { ext: 'jpeg', type: 'image/jpeg' },
      { ext: 'png', type: 'image/png' },
      { ext: 'webp', type: 'image/webp' }
    ];
    
    for (const format of supportedFormats) {
      const mockFile = new MockFile(`test-cover.${format.ext}`, format.type, 1024);
      global.mockFormData = new MockFormData();
      global.mockFormData.append('file', mockFile);
      
      // リクエストオブジェクトを作成
      const request = new NextRequest(`${BASE_URL}/api/upload/cover-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=boundary',
          'x-test-mode': 'true',
          'x-test-auth': 'true',
          'x-auth-user-id': testUserId
        }
      });
      
      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.mediaType).toBe('image');
      expect(responseData.publicUrl).toContain(format.ext);
    }
  });

  // テスト終了後に元の環境変数に戻す
  afterAll(() => {
    // 元の環境変数に戻す
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = originalEnv.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    process.env.NEXT_PUBLIC_CLOUDINARY_PROFILE_COVER_FOLDER = originalEnv.NEXT_PUBLIC_CLOUDINARY_PROFILE_COVER_FOLDER;
  });
});