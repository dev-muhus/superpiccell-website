import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * APIのメディアアップロード方法の注意点:
 * 
 * 1. 画像ファイル: Cloudinaryへのアップロード用の署名付きURLとパラメータを生成
 *    クライアント側でこのURLにPOSTリクエストを行い、直接Cloudinaryに画像をアップロード
 * 
 * 2. 動画ファイル: Cloudflare R2への署名付きURLを生成
 *    そのURLを使ってクライアントからR2へ直接PUTリクエストを行う設計
 *    ※ しかしCORSの問題でクライアントからの直接アップロードが失敗するため、
 *    現在はサーバーを経由するアップロード方式に変更しています。
 *    理想的にはR2のCORS設定を適切に構成することで直接アップロードが可能になります。
 */

// 動画アップロードのレスポンス型を定義
interface VideoUploadResponse {
  mediaType: 'video';
  key: string;
  uploadUrl: string;
  publicUrl: string;
  directUpload: boolean;
}

// Cloudinaryの署名を生成する関数
function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
  
  return crypto.createHash('sha1')
    .update(stringToSign + apiSecret)
    .digest('hex');
}

// 動画の場合はR2にアップロード
const handleVideoUpload = async (file: File, userId: string, fileName: string, basePath: string): Promise<VideoUploadResponse> => {
  try {
    // 環境変数の取得
    const accountId = process.env.R2_ACCOUNT_ID || '';
    const bucket = process.env.R2_BUCKET || '';
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
    const region = process.env.R2_REGION || 'auto';
    const publicUrlBase = process.env.R2_PUBLIC_URL || '';
    const fileType = file.type; // ファイルタイプを取得

    // パラメータの検証
    if (!bucket || !accountId || !accessKeyId || !secretAccessKey || !publicUrlBase) {
      throw new Error('Missing R2 configuration');
    }

    // エンドポイントをCloudflare R2の形式で構築
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    
    // ファイルキー
    const key = `${basePath}/${fileName}.mp4`;
    
    // バケット名を連結したURLを作成（公開アクセス用）
    const publicUrl = `${publicUrlBase}/${key}`;
    
    // CORS関連のデバッグ情報
    console.log("【CORS設定】クライアントでのR2アップロード前の確認:", {
      cors_enabled: true,
      origin_will_be_sent: true,
      allowed_origins: ["http://localhost:3000", "https://superpiccell.com"],
      message: "CloudFlare R2のCORS設定が正しく構成されていることを確認してください"
    });

    const r2Client = new S3({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      forcePathStyle: true // S3との互換性のために追加
    });
    
    console.log("【デバッグ強化】R2クライアント生成完了");

    // PutObjectCommandを作成
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType.startsWith('video/') ? fileType : 'video/mp4' // 適切なContent-Type
    });

    try {
      // 署名付きURLを取得
      const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
      
      return {
        mediaType: 'video',
        key,
        uploadUrl,
        publicUrl,
        directUpload: true  // クライアントから直接アップロードするフラグを追加
      };
    } catch (signError: unknown) {
      console.error('【デバッグ強化】R2署名URL生成エラー:', signError);
      throw new Error(`署名付きURL生成に失敗しました: ${signError instanceof Error ? signError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('【デバッグ強化】R2署名付きURL生成エラー:', error);
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await auth();
    if (!userId) {
      console.error('認証エラー: ユーザーIDがありません');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('メディアアップロードAPI: リクエスト受信', { userId });

    // メディアアップロード有効化チェック
    const enableMediaUpload = process.env.NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD !== 'false';
    
    if (!enableMediaUpload) {
      console.error('メディアアップロードが無効化されています');
      return NextResponse.json({ error: 'Media uploads are currently disabled' }, { status: 403 });
    }

    // リクエストデータの取得
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string || 'post'; // 'post' または 'draft'
    
    if (!file) {
      console.error('ファイルが提供されていません');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('メディアアップロードAPI: ファイル受信', { 
      type: file.type, 
      size: file.size, 
      name: file.name,
      contentType: type // 'post' または 'draft'
    });

    // ファイルサイズのチェック (20MB以下)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      console.error('ファイルサイズが大きすぎます', { size: file.size, maxSize });
      return NextResponse.json({ error: 'File must be 20 MB or smaller.' }, { status: 400 });
    }

    // ファイルタイプの判別
    const fileName = file.name.toLowerCase();
    
    // 拡張子を取得
    const extension = fileName.split('.').pop() || '';
    const videoExtensions = ['mp4', 'mov', 'webm', 'avi'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    // MIMEタイプまたは拡張子で判断
    const isImage = file.type.startsWith('image/') || imageExtensions.includes(extension);
    const isVideo = file.type.startsWith('video/') || 
                    videoExtensions.includes(extension) || 
                    (file.type === 'application/octet-stream' && videoExtensions.includes(extension));

    console.log('【ファイル判定】', { 
      fileType: file.type, 
      fileName, 
      extension,
      isImage,
      isVideo
    });

    if (!isImage && !isVideo) {
      console.error('無効なファイル形式', { type: file.type, name: fileName, extension });
      return NextResponse.json(
        { error: 'Invalid file type. Only images (jpg, png, webp) and videos (mp4, mov, webm, avi) are allowed.' },
        { status: 400 }
      );
    }

    // 一意のファイル名を生成
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    
    // 日付ベースのディレクトリ構造を生成（YYYY/MM/DD）
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateDir = `${year}/${month}/${day}`;

    // 画像がアップロード可能かチェック
    if (isImage) {
      // Cloudinaryアップロード設定
      try {
        // 投稿か下書きかによってフォルダを分ける
        const baseFolder = type === 'draft' 
          ? (process.env.NEXT_PUBLIC_CLOUDINARY_DRAFT_IMAGE_FOLDER || 'dev/draft/images')
          : (process.env.NEXT_PUBLIC_CLOUDINARY_POST_IMAGE_FOLDER || 'dev/post/images');
        
        // 日付ディレクトリを追加
        const folderPath = `${baseFolder}/${dateDir}`;
        
        // ファイル拡張子を取得
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        
        // public_idを生成 (フォルダパス/UUID.拡張子) - 拡張子は含めない
        const publicId = `${folderPath}/${uniqueId}`;
        
        // アップロードプリセットを取得
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'dev_posts';
        
        const apiKey = process.env.CLOUDINARY_API_KEY || '';
        const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
        
        // パラメータの検証
        if (!uploadPreset || !apiKey || !apiSecret || !cloudName) {
          console.error('Cloudinary設定エラー:', { 
            uploadPreset: !!uploadPreset,
            apiKey: !!apiKey,
            apiSecret: !!apiSecret,
            cloudName: !!cloudName
          });
          return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        
        // 署名パラメータ
        const params = {
          timestamp: timestamp.toString(),
          public_id: publicId,
          upload_preset: uploadPreset
        };
        
        // 署名の生成
        const signature = generateSignature(params, apiSecret);
        
        // 正しいCloudinaryパブリックURLを構築
        // 変換を含まないバージョン: https://res.cloudinary.com/CLOUD_NAME/image/upload/v1234567890/PATH/TO/FILE.EXT
        const uploadResponse = `https://res.cloudinary.com/${cloudName}/image/upload`;
        const publicUrl = `${uploadResponse}/${publicId}.${fileExt}`;
        
        const response = {
          uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          publicUrl: publicUrl,
          mediaType: 'image',
          signature,
          timestamp,
          apiKey,
          uploadPreset,
          publicId
        };
        
        console.log('画像アップロード情報を返却:', { 
          publicId, 
          timestamp,
          uploadPreset,
          signature: signature.substring(0, 10) + '...',
          folder: folderPath,
          dateDir,
          contentType: type,
          url: response.uploadUrl,
          publicUrl: publicUrl
        });
        
        return NextResponse.json(response);
      } catch (error) {
        console.error('Cloudinary setup error:', error);
        return NextResponse.json({ 
          error: 'Failed to setup image upload',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    } else if (isVideo) {
      // R2への動画アップロード処理
      try {
        // 一意のファイル名を作成
        const fileName = uniqueId;
        
        // 投稿か下書きかによってフォルダを分ける
        const baseFolder = process.env.NEXT_PUBLIC_POST_MOVIE_FOLDER || 'post/videos';
        
        const basePath = `${baseFolder}/${dateDir}`;
        
        // handleVideoUpload関数を使用して署名付きURLを取得
        const uploadData = await handleVideoUpload(file, userId, fileName, basePath);
        
        console.log('動画アップロード情報を返却:', { 
          key: uploadData.key,
          mediaType: 'video',
          dateDir,
          contentType: type
        });
        
        return NextResponse.json(uploadData);
      } catch (error) {
        console.error('R2 setup error:', error);
        return NextResponse.json({ 
          error: 'Failed to setup video upload',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // ここには到達しないはず
    return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 });
  } catch (error) {
    console.error('Media upload API error:', error);
    return NextResponse.json({ 
      error: 'Server error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 