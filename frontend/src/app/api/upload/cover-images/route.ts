import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

/**
 * カバー画像アップロードAPI
 * 
 * 既存のpost-mediaアップロードパターンを踏襲したカバー画像専用の署名付きURL生成API
 * カバー画像用の変換パラメータ: c_fill,w_1200,h_400,q_80,f_auto
 */

// Cloudinaryの署名を生成する関数
function generateSignature(params: Record<string, string | number>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
  
  return crypto.createHash('sha1')
    .update(stringToSign + apiSecret)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await auth();
    if (!userId) {
      console.error('認証エラー: ユーザーIDがありません');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('カバー画像アップロードAPI: リクエスト受信', { userId });

    // メディアアップロード有効化チェック
    const enableMediaUpload = process.env.NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD !== 'false';
    
    if (!enableMediaUpload) {
      console.error('メディアアップロードが無効化されています');
      return NextResponse.json({ error: 'Media uploads are currently disabled' }, { status: 403 });
    }

    // リクエストデータの取得
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      console.error('ファイルが提供されていません');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('カバー画像アップロードAPI: ファイル受信', { 
      type: file.type, 
      size: file.size, 
      name: file.name
    });

    // ファイルサイズのチェック (10MB以下 - カバー画像用)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('ファイルサイズが大きすぎます', { size: file.size, maxSize });
      return NextResponse.json({ error: 'File must be 10 MB or smaller.' }, { status: 400 });
    }

    // ファイルタイプの判別 - 画像のみ許可
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop() || '';
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    const isImage = file.type.startsWith('image/') || imageExtensions.includes(extension);

    console.log('【ファイル判定】', { 
      fileType: file.type, 
      fileName, 
      extension,
      isImage
    });

    if (!isImage) {
      console.error('無効なファイル形式', { type: file.type, name: fileName, extension });
      return NextResponse.json(
        { error: 'Invalid file type. Only images (jpg, jpeg, png, webp) are allowed.' },
        { status: 400 }
      );
    }

    // Cloudinaryアップロード設定
    try {
      // 一意のファイル名を生成
      const uniqueId = uuidv4();
      const timestamp = Date.now();
      
      // 日付ベースのディレクトリ構造を生成（YYYY/MM/DD）
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateDir = `${year}/${month}/${day}`;

      // カバー画像専用フォルダ
      const baseFolder = process.env.NEXT_PUBLIC_CLOUDINARY_PROFILE_COVER_FOLDER || 'dev/cover/images';
      const folderPath = `${baseFolder}/${dateDir}`;
      
      // ファイル拡張子を取得
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      
      // public_idを生成 (フォルダパス/UUID) - 拡張子は含めない
      const publicId = `${folderPath}/${uniqueId}`;
      
      // アップロードプリセットを取得
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'dev';
      
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
      
      // カバー画像用のパブリックURL（変換パラメータ付き）
      const uploadResponse = `https://res.cloudinary.com/${cloudName}/image/upload`;
      const publicUrl = `${uploadResponse}/c_fill,w_1200,h_400,q_80,f_auto/${publicId}.${fileExt}`;
      
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
      
      console.log('カバー画像アップロード情報を返却:', { 
        publicId, 
        timestamp,
        uploadPreset,
        signature: signature.substring(0, 10) + '...',
        folder: folderPath,
        dateDir,
        url: response.uploadUrl,
        publicUrl: publicUrl
      });
      
      return NextResponse.json(response);
    } catch (error) {
      console.error('Cloudinary setup error:', error);
      return NextResponse.json({ 
        error: 'Failed to setup cover image upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Cover image upload API error:', error);
    return NextResponse.json({ 
      error: 'Server error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}