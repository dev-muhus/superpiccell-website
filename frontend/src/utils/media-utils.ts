// メディア削除用ユーティリティ関数
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

// R2クライアント初期化
const s3Client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
});

/**
 * Cloudinaryの画像を削除する
 * @param url 削除する画像のURL
 * @returns 成功時true、失敗時falseを返す
 */
export async function deleteCloudinaryImage(url: string): Promise<boolean> {
  try {
    // URLからpublic_idを抽出
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) {
      console.error('無効なCloudinary URL:', url);
      return false;
    }

    // Cloudinary APIで削除 - REST APIを直接使用
    const timestamp = Math.floor(Date.now() / 1000);
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      console.error('Cloudinary API認証情報が不足しています');
      return false;
    }
    
    // 署名の生成
    const signature = generateSHA1(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`);
    
    // DESTROYエンドポイントにPOSTリクエスト
    const apiUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/destroy`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_id: publicId,
        timestamp: timestamp,
        api_key: apiKey,
        signature: signature,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Cloudinary API error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary画像削除エラー:', error);
    return false;
  }
}

/**
 * SHA1ハッシュを生成する
 * @param data ハッシュ化するデータ
 * @returns SHA1ハッシュ
 */
function generateSHA1(data: string): string {
  const hash = crypto.createHash('sha1');
  hash.update(data);
  return hash.digest('hex');
}

/**
 * CloudflareのR2から動画を削除する
 * @param url 削除する動画のURL
 * @returns 成功時true、失敗時falseを返す
 */
export async function deleteR2Video(url: string): Promise<boolean> {
  try {
    // URLからオブジェクトキーを抽出
    const key = extractR2ObjectKey(url);
    if (!key) {
      console.error('無効なR2 URL:', url);
      return false;
    }

    // R2から削除
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('R2動画削除エラー:', error);
    return false;
  }
}

/**
 * メディアタイプに基づいて適切な削除関数を呼び出す
 * @param url メディアのURL
 * @param mediaType メディアタイプ('image'または'video')
 * @returns 削除の成功/失敗
 */
export async function deleteMedia(url: string, mediaType: 'image' | 'video'): Promise<boolean> {
  if (mediaType === 'image') {
    return deleteCloudinaryImage(url);
  } else if (mediaType === 'video') {
    return deleteR2Video(url);
  }
  return false;
}

/**
 * CloudinaryのURLからpublic_idを抽出する
 * @param url CloudinaryのURL
 * @returns public_id
 */
function extractCloudinaryPublicId(url: string): string | null {
  try {
    // URLからpublic_idを抽出する正規表現
    // 例: https://res.cloudinary.com/superpiccell/image/upload/v1623456789/dev/post/images/abcdef123456
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Cloudinary public_id抽出エラー:', error);
    return null;
  }
}

/**
 * R2のURLからオブジェクトキーを抽出する
 * @param url R2のURL
 * @returns オブジェクトキー
 */
function extractR2ObjectKey(url: string): string | null {
  try {
    // R2のURLからオブジェクトキーを抽出
    // 例: https://pub-xxxxx.r2.dev/post/videos/abcdef123456.mp4
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!publicUrl || !url.startsWith(publicUrl)) {
      return null;
    }
    
    // publicUrl以降の部分を抽出
    return url.substring(publicUrl.length + 1); // +1 for the leading slash
  } catch (error) {
    console.error('R2 objectKey抽出エラー:', error);
    return null;
  }
} 