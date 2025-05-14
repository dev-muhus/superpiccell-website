'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaImage, FaVideo, FaTimes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { MAX_MEDIA_ATTACHMENTS, MAX_FILE_SIZE, MAX_VIDEO_DURATION, MAX_IMAGE_RESOLUTION } from '@/constants/media';

export interface MediaFile {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
  mediaType: 'image' | 'video';
  width?: number | null;
  height?: number | null;
  duration_sec?: number | null;
  error?: string;
}

interface MediaDropzoneProps {
  maxFiles?: number;
  onChange: (files: MediaFile[]) => void;
  value: MediaFile[];
}

// 環境変数からメディアアップロード設定を取得する関数
const getMediaUploadSettings = () => {
  const enableMediaUpload = process.env.NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD !== 'false';
  
  return {
    isMediaEnabled: enableMediaUpload
  };
};

const MediaDropzone: React.FC<MediaDropzoneProps> = ({
  maxFiles = MAX_MEDIA_ATTACHMENTS,
  onChange,
  value
}) => {
  const [files, setFiles] = useState<MediaFile[]>(value || []);
  const mediaSettings = getMediaUploadSettings();

  useEffect(() => {
    setFiles(value || []);
  }, [value]);

  // ファイルをドロップしたときの処理
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // メディアアップロードが有効かチェック
    if (!mediaSettings.isMediaEnabled) {
      toast.error('メディアのアップロードは現在無効化されています');
      return;
    }

    // ファイル数のチェック
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`最大${maxFiles}ファイルまでアップロードできます`);
      return;
    }

    // ファイルの種類をチェック
    const isMediaFile = (file: File): { isImage: boolean; isVideo: boolean } => {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      const extension = fileName.split('.').pop() || '';
      
      const videoExtensions = ['mp4', 'mov', 'webm', 'avi'];
      const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      
      const isImage = fileType.startsWith('image/') || imageExtensions.includes(extension);
      const isVideo = fileType.startsWith('video/') || 
                     videoExtensions.includes(extension) || 
                     (fileType === 'application/octet-stream' && videoExtensions.includes(extension));
      
      return { isImage, isVideo };
    };

    // ファイルをタイプ別に分類
    const imageFiles: File[] = [];
    const videoFiles: File[] = [];
    
    acceptedFiles.forEach(file => {
      const { isImage, isVideo } = isMediaFile(file);
      if (isImage) imageFiles.push(file);
      if (isVideo) videoFiles.push(file);
    });

    // 各メディアタイプの制限をチェック
    const currentImages = files.filter(f => f.mediaType === 'image').length;
    const currentVideos = files.filter(f => f.mediaType === 'video').length;
    const totalImages = currentImages + imageFiles.length;
    const totalVideos = currentVideos + videoFiles.length;
    const totalFiles = totalImages + totalVideos;

    // 合計ファイル数のチェック
    if (totalFiles > maxFiles) {
      toast.error(`合計で最大${maxFiles}つのメディアファイルまでアップロードできます`);
      return;
    }

    // ファイルサイズのチェック（20MB以下）
    const oversizedFiles = acceptedFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error('ファイルは20MB以下にしてください');
      return;
    }

    try {
      // 新しいファイル配列を作成
      const newMediaFiles: MediaFile[] = [];

      for (const file of acceptedFiles) {
        // プレビューURL作成
        const preview = URL.createObjectURL(file);
        const { isImage, isVideo } = isMediaFile(file);
        
        let width = undefined;
        let height = undefined;
        let duration_sec = undefined;

        // 画像の場合、幅と高さを取得
        if (isImage) {
          try {
            const dimensions = await getImageDimensions(file);
            width = dimensions.width;
            height = dimensions.height;

            // 解像度チェック
            if (width > MAX_IMAGE_RESOLUTION || height > MAX_IMAGE_RESOLUTION) {
              URL.revokeObjectURL(preview);
              toast.error(`画像の解像度が大きすぎます (最大 ${MAX_IMAGE_RESOLUTION}px)`);
              continue;
            }
          } catch {
            URL.revokeObjectURL(preview);
            toast.error('画像の解析に失敗しました');
            continue;
          }
        }

        // 動画の場合、時間を取得
        if (isVideo) {
          try {
            duration_sec = await getVideoLength(file);
            
            // 動画時間のチェック（10秒以内）
            if (duration_sec > MAX_VIDEO_DURATION) {
              URL.revokeObjectURL(preview);
              toast.error(`動画は${MAX_VIDEO_DURATION}秒以内にしてください`);
              continue;
            }
          } catch {
            URL.revokeObjectURL(preview);
            toast.error('動画の解析に失敗しました');
            continue;
          }
        }

        newMediaFiles.push({
          file,
          preview,
          uploading: false,
          uploaded: false,
          mediaType: isImage ? 'image' : 'video',
          width,
          height,
          duration_sec
        });
      }

      // エラーが発生した場合は早期リターン
      if (newMediaFiles.length === 0) {
        return;
      }

      // 既存のファイルと新しいファイルを結合
      const updatedFiles = [...files, ...newMediaFiles];
      
      // 状態を更新し、親コンポーネントに通知
      setFiles(updatedFiles);
      onChange(updatedFiles);
      
    } catch (error) {
      console.error('ファイル処理エラー:', error);
      toast.error('ファイルの処理中にエラーが発生しました');
    }
  }, [files, maxFiles, onChange, mediaSettings]);

  /**
   * メディアファイルをアップロードする関数。
   * この関数は他のコンポーネントから呼び出されるため削除しないでください。
   * @param mediaFile アップロードするメディアファイル
   * @returns アップロード後のメディアファイル情報
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const uploadMedia = async (mediaFile: MediaFile) => {
    if (mediaFile.uploaded || mediaFile.uploading) return mediaFile;

    // アップロード中のフラグをセット
    const updatingFile = { ...mediaFile, uploading: true };
    setFiles(prev => prev.map(f => f.preview === mediaFile.preview ? updatingFile : f));
    onChange(files.map(f => f.preview === mediaFile.preview ? updatingFile : f));

    try {
      // FormDataの作成
      const formData = new FormData();
      formData.append('file', mediaFile.file);

      // API呼び出し
      const response = await fetch('/api/upload/post-media', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'アップロードに失敗しました');
      }

      // レスポンスを取得
      const data = await response.json();

      // ファイルをアップロード
      if (mediaFile.mediaType === 'image') {
        // Cloudinary用のアップロード処理
        const cloudinaryData = new FormData();
        cloudinaryData.append('file', mediaFile.file);
        cloudinaryData.append('api_key', data.apiKey);
        cloudinaryData.append('timestamp', data.timestamp.toString());
        cloudinaryData.append('signature', data.signature);
        cloudinaryData.append('upload_preset', data.uploadPreset);

        const uploadResponse = await fetch(data.uploadUrl, {
          method: 'POST',
          body: cloudinaryData
        });

        if (!uploadResponse.ok) {
          throw new Error('Cloudinaryへのアップロードに失敗しました');
        }
      } else if (mediaFile.mediaType === 'video') {
        // R2用のアップロード処理
        const uploadResponse = await fetch(data.uploadUrl, {
          method: 'PUT',
          body: mediaFile.file,
          headers: {
            'Content-Type': 'video/mp4'
          }
        });

        if (!uploadResponse.ok) {
          throw new Error('Cloudflare R2へのアップロードに失敗しました');
        }
      }

      // アップロード完了
      const uploadedFile: MediaFile = {
        ...mediaFile,
        uploading: false,
        uploaded: true,
        url: data.publicUrl
      };

      setFiles(prev => prev.map(f => f.preview === mediaFile.preview ? uploadedFile : f));
      onChange(files.map(f => f.preview === mediaFile.preview ? uploadedFile : f));

      return uploadedFile;
    } catch (error) {
      console.error('メディアアップロードエラー:', error);
      
      // エラー状態を設定
      const errorFile: MediaFile = {
        ...mediaFile,
        uploading: false,
        uploaded: false,
        error: error instanceof Error ? error.message : '予期せぬエラーが発生しました'
      };

      setFiles(prev => prev.map(f => f.preview === mediaFile.preview ? errorFile : f));
      onChange(files.map(f => f.preview === mediaFile.preview ? errorFile : f));
      
      toast.error(errorFile.error || 'アップロードに失敗しました');
      return errorFile;
    }
  };

  // ファイルを削除する
  const removeFile = (index: number) => {
    const newFiles = [...files];
    // ブラウザのメモリリーク防止のためにObjectURLを解放
    URL.revokeObjectURL(newFiles[index].preview);
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onChange(newFiles);
  };

  // プレビューの表示
  const renderPreview = () => {
    if (files.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {files.map((file, index) => {
          // URLがある場合は既にアップロード済みのファイル
          const fileUrl = file.url || file.preview;
          
          return (
            <div key={index} className="relative">
              <div className="relative rounded border overflow-hidden bg-gray-100" style={{ width: '100px', height: '100px' }}>
                {file.mediaType === 'image' ? (
                  <div className="w-full h-full relative">
                    <Image
                      src={fileUrl}
                      alt="Preview"
                      className="object-cover"
                      fill
                      sizes="100px"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full relative">
                    <video
                      src={fileUrl}
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaVideo className="text-2xl text-white drop-shadow-lg" />
                    </div>
                  </div>
                )}
                
                {/* ファイルのステータス表示 */}
                {file.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
                
                {file.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-xs text-center p-1">エラー</div>
                  </div>
                )}

                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-0 right-0 bg-black bg-opacity-50 rounded-full p-1 m-1 text-white"
                >
                  <FaTimes />
                </button>
              </div>
              
              {/* 既にアップロード済みの表示 */}
              {file.uploaded && (
                <div className="text-xs text-green-600 mt-1 flex items-center justify-center">
                  <span>アップロード済</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      'video/*': ['.mp4', '.mov', '.webm', '.avi'],
      'application/octet-stream': ['.mov', '.mp4', '.webm', '.avi']
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: maxFiles
  });

  return (
    <div className="w-full">
      {/* プレビュー表示 */}
      {renderPreview()}
      
      {/* ドロップゾーン */}
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`mt-3 border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${isDragActive ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-400'}`}
        >
          <input {...getInputProps()} />
          
          <div className="flex space-x-3">
            <FaImage className="text-blue-500" size={24} />
            <FaVideo className="text-blue-500" size={24} />
          </div>
          
          <p className="mt-2 text-sm text-gray-500 text-center">
            {isDragActive
              ? 'ファイルをここにドロップ...'
              : '画像や動画をドラッグ＆ドロップするか、クリックして選択'}
          </p>
          
          <p className="mt-1 text-xs text-gray-400 text-center">
            最大20MB・最大{MAX_MEDIA_ATTACHMENTS}つまで・動画は{MAX_VIDEO_DURATION}秒以内
          </p>
        </div>
      )}
    </div>
  );
};

// 画像のサイズを取得する関数
const getImageDimensions = (file: File): Promise<{ width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error('画像の読み込みに失敗しました'));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
};

// 動画の長さを取得する関数
const getVideoLength = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    // ファイルデータからBlobURLを作成
    const objectUrl = URL.createObjectURL(file);
    
    console.log('動画の長さを取得しています:', { 
      name: file.name, 
      size: file.size, 
      type: file.type 
    });
    
    // video要素を作成
    const video = document.createElement('video');
    video.style.display = 'none'; // 画面に表示しない
    video.muted = true; // 音を消す
    video.preload = 'metadata';
    
    // イベントリスナー設定前にエラーハンドリングを追加
    video.onerror = (e) => {
      console.error('【動画処理】エラー発生:', {
        error: e,
        videoElement: video,
        errorCode: video.error ? video.error.code : 'unknown',
        errorMessage: video.error ? video.error.message : 'unknown'
      });
      clearTimeout(timeoutId); // タイムアウトをクリア
      URL.revokeObjectURL(objectUrl);
      document.body.removeChild(video); // DOM から削除
      reject(new Error(`動画の読み込みに失敗しました: ${video.error?.message || 'unknown error'}`));
    };
    
    // メタデータが読み込まれたときの処理
    video.onloadedmetadata = () => {
      clearTimeout(timeoutId); // タイムアウトをクリア
      URL.revokeObjectURL(objectUrl);
      document.body.removeChild(video); // DOM から削除
      resolve(video.duration);
    };
    
    // タイムアウト設定
    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      if (document.body.contains(video)) {
        document.body.removeChild(video);
      }
      reject(new Error('動画メタデータの読み込みがタイムアウトしました'));
    }, 10000); // 10秒でタイムアウト
    
    // DOM に追加（非表示）
    document.body.appendChild(video);
    
    // src 属性を設定（最後に行う）
    video.src = objectUrl;
    // video.load() を明示的に呼び出し
    video.load();
  });
};

export default MediaDropzone; 