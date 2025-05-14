'use client';

import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPaperPlane, FaReply, FaSave } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';
import UserAvatar from './UserAvatar';
import Link from 'next/link';
import MediaDropzone, { MediaFile } from './MediaDropzone';
import { MAX_MEDIA_ATTACHMENTS } from '@/constants/media';

// 環境変数からメディアアップロード設定を取得する関数
const getMediaUploadSettings = () => {
  const enableMediaUpload = process.env.NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD !== 'false';
  
  return {
    isMediaEnabled: enableMediaUpload
  };
};

// 投稿データの型定義
interface PostData {
  id: number;
  content: string;
  user?: {
    username?: string;
  };
}

// 型定義を更新
// null型も受け入れるようにする
interface DraftMedia {
  id?: number;
  url: string;
  media_type?: 'image' | 'video';
  mediaType?: 'image' | 'video';
  width?: number | null;
  height?: number | null;
  duration_sec?: number | null;
}

interface PostModalProps {
  isOpen: boolean;
  onClose: (postSubmitted?: boolean) => void;
  initialType?: 'post' | 'reply' | 'quote' | 'original';
  replyToPost?: PostData;
  quotePost?: PostData;
  initialContent?: string;
  replyToPostId?: number | null;
  showDraftButton?: boolean;
  draftId?: number | null;
  initialMedia?: DraftMedia[];
}

const PostModal: React.FC<PostModalProps> = ({
  isOpen,
  onClose,
  initialType = 'post',
  replyToPost,
  quotePost,
  initialContent = '',
  replyToPostId,
  showDraftButton = true,
  draftId = null,
  initialMedia = []
}) => {
  const [content, setContent] = useState(initialContent);
  const [isPosting, setIsPosting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useUser();
  const mediaSettings = getMediaUploadSettings();
  
  // モーダルが開いたときに入力欄にフォーカス
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // initialMediaからメディアファイルを読み込む
  useEffect(() => {
    if (isOpen && initialMedia && initialMedia.length > 0) {
      // APIから取得したメディアをMediaFile形式に変換
      const existingMedia: MediaFile[] = initialMedia.map((media: DraftMedia) => ({
        file: new File([], media.url.split('/').pop() || 'file'),
        preview: media.url,
        mediaType: media.media_type || media.mediaType || 'image',
        url: media.url,
        width: media.width,
        height: media.height,
        duration_sec: media.duration_sec,
        uploaded: true, // 既にアップロード済み
        uploading: false
      }));
      
      setMediaFiles(existingMedia);
    }
  }, [isOpen, initialMedia]);
  
  // 下書き編集時に既存のメディアを読み込む（initialMediaがない場合のみ）
  useEffect(() => {
    const fetchDraftMedia = async () => {
      // initialMediaがある場合はAPI呼び出しをスキップ
      if (isOpen && draftId && (!initialMedia || initialMedia.length === 0)) {
        try {
          const response = await fetch(`/api/drafts/${draftId}`);
          
          if (!response.ok) {
            console.error('下書きデータの取得に失敗しました:', response.status);
            return;
          }
          
          const draftData = await response.json();
          
          if (draftData.draft?.media && Array.isArray(draftData.draft.media) && draftData.draft.media.length > 0) {
            // APIから取得したメディアをMediaFile形式に変換
            const existingMedia: MediaFile[] = draftData.draft.media.map((media: DraftMedia) => ({
              file: new File([], media.url.split('/').pop() || 'file'),
              preview: media.url,
              mediaType: media.media_type || 'image',
              url: media.url,
              width: media.width,
              height: media.height,
              duration_sec: media.duration_sec,
              uploaded: true, // 既にアップロード済み
              uploading: false
            }));
            
            setMediaFiles(existingMedia);
          }
        } catch (error) {
          console.error('下書きメディアの読み込みエラー:', error);
        }
      }
    };
    
    fetchDraftMedia();
  }, [isOpen, draftId, initialMedia]);
  
  // initialContentが変更されたときにコンテンツをセット
  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
    }
  }, [initialContent]);
  
  // モーダルが閉じられるときにコンテンツをリセット
  useEffect(() => {
    if (!isOpen) {
      setContent(initialContent || '');
      setIsPosting(false);
      setIsSavingDraft(false);
      setMediaFiles([]);
      setIsUploadingMedia(false);
    }
  }, [isOpen, initialContent]);
  
  // モーダル外のクリックでモーダルを閉じる
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose(false);
    }
  };

  // メディアの状態を更新
  const handleMediaChange = (files: MediaFile[]) => {
    setMediaFiles(files);
  };

  // メディアのアップロード処理
  const uploadAllMedia = async () => {
    if (mediaFiles.length === 0) return { success: true, files: [] };
    
    // メディアアップロードが有効かチェック
    if (!mediaSettings.isMediaEnabled) {
      toast.error('メディアのアップロードは現在無効化されています');
      return { success: false, files: [] };
    }
    
    setIsUploadingMedia(true);
    
    try {
      // まだアップロードされていないメディアをフィルタリング
      const filesToUpload = mediaFiles.filter(file => !file.uploaded);
      
      if (filesToUpload.length === 0) {
        return { success: true, files: mediaFiles };
      }
      
      // 各ファイルのアップロード処理
      const uploadedFiles = await Promise.all(
        filesToUpload.map(async (mediaFile) => {
          if (mediaFile.uploaded) return mediaFile;
          
          try {
            // アップロード中のフラグをセット
            const updatingFile = { ...mediaFile, uploading: true };
            setMediaFiles(prev => prev.map(f => f.preview === mediaFile.preview ? updatingFile : f));
            
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
              console.error('投稿メディアアップロードAPI応答エラー:', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorData 
              });
              throw new Error(errorData.error || 'アップロードに失敗しました');
            }
  
            // レスポンスを取得
            let data = await response.json();
  
            // ファイルをアップロード
            if (mediaFile.mediaType === 'image') {
              // Cloudinary用のアップロード処理
              const cloudinaryData = new FormData();
              cloudinaryData.append('file', mediaFile.file);
              cloudinaryData.append('api_key', data.apiKey);
              cloudinaryData.append('timestamp', data.timestamp.toString());
              cloudinaryData.append('signature', data.signature);
              cloudinaryData.append('upload_preset', data.uploadPreset);
              // public_idパラメータを追加（テストでは必須）
              if (data.publicId) {
                cloudinaryData.append('public_id', data.publicId);
              }
              
              try {
                const uploadResponse = await fetch(data.uploadUrl, {
                  method: 'POST',
                  body: cloudinaryData
                });
  
                if (!uploadResponse.ok) {
                  const errorText = await uploadResponse.text();
                  console.error('Cloudinaryアップロードエラー:', { 
                    status: uploadResponse.status,
                    response: errorText,
                    url: data.uploadUrl,
                    publicId: data.publicId
                  });
                  throw new Error(`Cloudinaryへのアップロードに失敗しました (${uploadResponse.status}): ${errorText.substring(0, 100)}`);
                }
                
              } catch (uploadError) {
                console.error('Cloudinaryアップロード例外:', uploadError);
                throw new Error('画像アップロード中にエラーが発生しました');
              }
            } else if (mediaFile.mediaType === 'video') {
              // 動画アップロード処理
              if (data.directUpload) {
                // 直接R2へのアップロード
                try {
                  // Content-Typeヘッダーを設定
                  const contentType = mediaFile.file.type || 'video/mp4';
                  
                  // R2へ直接アップロード
                  const uploadResponse = await fetch(data.uploadUrl, {
                    method: 'PUT',
                    body: mediaFile.file,
                    headers: {
                      'Content-Type': contentType
                    }
                  });
                  
                  if (!uploadResponse.ok) {
                    let errorText = '';
                    try {
                      errorText = await uploadResponse.text();
                    } catch {
                      errorText = 'レスポンステキストを取得できませんでした';
                    }
                    
                    console.error('【R2直接アップロード】エラー:', {
                      status: uploadResponse.status,
                      statusText: uploadResponse.statusText,
                      errorText
                    });
                    throw new Error(`R2への直接アップロードに失敗しました (${uploadResponse.status}): ${errorText}`);
                  }
                  
                } catch (uploadError) {
                  console.error('【R2直接アップロード】例外発生:', uploadError);
                  throw new Error(`R2への直接アップロードに失敗しました: ${uploadError instanceof Error ? uploadError.message : '不明なエラー'}`);
                }
              } else {
                // サーバー経由アップロード（以前のコード）
                try {
                  // FormDataを作成して動画ファイルを追加
                  const videoFormData = new FormData();
                  videoFormData.append('file', mediaFile.file);
                  videoFormData.append('type', 'post'); // 'post' または 'draft'
                  
                  // APIを呼び出し
                  const uploadResponse = await fetch('/api/upload/post-media', {
                    method: 'POST',
                    body: videoFormData
                  });
                  
                  if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json();
                    console.error('【R2サーバー経由アップロード】APIエラー:', {
                      status: uploadResponse.status,
                      error: errorData
                    });
                    throw new Error(errorData.error || 'アップロードに失敗しました');
                  }
                  
                  // レスポンスを取得
                  const responseData = await uploadResponse.json();
                  
                  // APIからの応答を使用
                  data = {
                    publicUrl: responseData.publicUrl
                  };
                } catch (uploadError) {
                  console.error('【R2サーバー経由アップロード】エラー:', uploadError);
                  throw new Error('動画アップロード中にエラーが発生しました');
                }
              }
            }
  
            // アップロード完了
            return {
              ...mediaFile,
              uploading: false,
              uploaded: true,
              url: data.publicUrl
            };
          } catch (error) {
            console.error('メディアアップロードエラー:', error);
            
            return {
              ...mediaFile,
              uploading: false,
              uploaded: false,
              error: error instanceof Error ? error.message : '予期せぬエラーが発生しました'
            };
          }
        })
      );
      
      // 既存のアップロード済みファイルと新しくアップロードしたファイルを結合
      const allFiles = [
        ...mediaFiles.filter(file => file.uploaded),
        ...uploadedFiles
      ];
      
      // 全てのファイルがアップロードされたかチェック
      const allUploaded = allFiles.every(file => file.uploaded);
      const anyError = allFiles.some(file => !!file.error);
      
      // 状態を更新
      setMediaFiles(allFiles);
      
      if (anyError) {
        const errorFiles = allFiles.filter(file => !!file.error);
        console.error(`アップロード失敗 (${errorFiles.length}/${allFiles.length}):`, 
          errorFiles.map(f => f.error).join(', '));
        return { success: false, files: allFiles };
      }
      
      return { success: allUploaded, files: allFiles };
    } catch (error) {
      console.error('メディアアップロード処理エラー:', error);
      toast.error('メディアのアップロード中にエラーが発生しました');
      return { success: false, files: mediaFiles };
    } finally {
      setIsUploadingMedia(false);
    }
  };
  
  // 投稿を作成する関数
  const createPost = async () => {
    if (isPosting) return;
    
    setIsPosting(true);
    setError('');
    
    try {
      // コンテンツまたはメディアのいずれかが必要
      const hasContent = content.trim().length > 0;
      const hasMedia = mediaFiles.length > 0;
      
      if (!hasContent && !hasMedia) {
        setError('投稿内容またはメディアのいずれかを入力してください');
        setIsPosting(false);
        return;
      }
      
      // 文字数チェック
      if (hasContent && content.length > 500) {
        setError('投稿は500文字以内で入力してください');
        setIsPosting(false);
        return;
      }
      
      // 現在のメディアファイルのみを使用（下書きのメディアは使用しない）
      let mediaList: DraftMedia[] = [];
      
      // 現在の編集状態のメディアファイルをアップロード/使用する
      if (mediaFiles.length > 0) {
        try {
          const uploadResult = await uploadAllMedia();
          
          if (!uploadResult.success) {
            throw new Error('メディアのアップロードに失敗しました');
          }
          
          // アップロードしたメディア情報を整形
          mediaList = uploadResult.files.map(file => ({
            url: file.url as string,
            mediaType: file.mediaType,
            width: file.width || null,
            height: file.height || null,
            duration_sec: file.duration_sec || null
          })) as DraftMedia[];
        } catch (error) {
          console.error('メディアアップロードエラー:', error);
          setError('メディアのアップロードに失敗しました');
          setIsPosting(false);
          return;
        }
      }
      
      const postData = {
        content: content.trim(),
        post_type: initialType === 'post' ? 'original' : initialType,
        in_reply_to_post_id: undefined as number | undefined,
        quote_of_post_id: undefined as number | undefined,
        media: mediaList.length > 0 ? mediaList : undefined
      };
      
      // 返信の場合
      if (initialType === 'reply' && replyToPost) {
        postData.in_reply_to_post_id = replyToPost.id;
      } else if (replyToPostId) {
        postData.in_reply_to_post_id = replyToPostId;
      }
      
      // 引用の場合
      if (initialType === 'quote' && quotePost) {
        postData.quote_of_post_id = quotePost.id;
      }
      
      // 投稿APIを呼び出す
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error('投稿APIからの応答をJSONとして解析できませんでした:', responseText);
        throw new Error('サーバーから無効な応答を受け取りました');
      }
      
      if (!response.ok) {
        console.error('投稿エラー:', {
          status: response.status,
          statusText: response.statusText,
          result
        });
        throw new Error(result.error || result.details || '投稿に失敗しました');
      }
      
      // 下書きがある場合は削除
      if (draftId) {
        try {
          await fetch(`/api/drafts/${draftId}`, {
            method: 'DELETE',
          });
        } catch (deleteError) {
          console.error('下書き削除エラー:', deleteError);
          // 下書き削除に失敗しても投稿は成功しているので、エラーとはしない
        }
      }
      
      // 投稿成功時の処理
      setContent('');
      setMediaFiles([]);
      onClose(true);
      
      toast.success('投稿しました！');
    } catch (error) {
      console.error('投稿処理エラー:', error);
      setError(error instanceof Error ? error.message : '投稿に失敗しました');
    } finally {
      setIsPosting(false);
    }
  };

  // 下書きを保存する関数
  const saveDraft = async () => {
    // コンテンツまたはメディアのいずれかが必要
    const hasContent = content.trim().length > 0;
    const hasMedia = mediaFiles.length > 0;
    
    if (!hasContent && !hasMedia) {
      toast.error('テキストまたはメディアを入力してください');
      return;
    }
    
    if (content.length > 500) {
      toast.error('投稿内容は500文字以内で入力してください');
      return;
    }
    
    try {
      setIsSavingDraft(true);
      
      // メディアのアップロード
      let mediaList: DraftMedia[] = [];
      if (mediaFiles.length > 0) {
        const uploadResult = await uploadAllMedia();
        
        if (!uploadResult.success) {
          toast.error('一部のメディアのアップロードに失敗しました');
          setIsSavingDraft(false);
          return;
        }
        
        // アップロードしたメディア情報を整形
        mediaList = uploadResult.files.map(file => ({
          url: file.url as string,
          mediaType: file.mediaType,
          width: file.width || null,
          height: file.height || null,
          duration_sec: file.duration_sec || null
        })) as DraftMedia[];
      }
      
      // 下書きデータの準備
      const draftData = {
        content: content.trim() || '',
        in_reply_to_post_id: (initialType === 'reply' && replyToPost) ? replyToPost.id : replyToPostId,
        media: mediaList.length > 0 ? mediaList : undefined
      };
      
      // mediaパラメータが空の配列の場合は削除（undefinedにする）
      if (Array.isArray(draftData.media) && draftData.media.length === 0) {
        delete draftData.media;
      }
      
      // 既存の下書きIDがある場合は更新、なければ新規作成
      const url = draftId ? `/api/drafts/${draftId}` : '/api/drafts';
      const method = draftId ? 'PUT' : 'POST';
      
      // APIリクエスト
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(draftData)
      });
      
      // レスポンステキストを取得して解析
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error('下書きAPIからの応答をJSONとして解析できませんでした:', responseText);
        throw new Error('サーバーから無効な応答を受け取りました');
      }
      
      if (!response.ok) {
        console.error('下書き保存エラー:', {
          status: response.status,
          statusText: response.statusText,
          result
        });
        throw new Error(result.error || result.details || '下書きの保存に失敗しました');
      }
      
      toast.success(draftId ? '下書きを更新しました' : '下書きを保存しました');
      
      // 下書き保存後、モーダルを閉じる
      setTimeout(() => {
        onClose(false);
      }, 500);
      
    } catch (error) {
      console.error('下書き保存エラー:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSavingDraft(false);
    }
  };
  
  // モーダルが開いていない場合は何も表示しない
  if (!isOpen) return null;
  
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-start justify-center px-4 pt-20 sm:pt-24 pb-10 sm:pb-16 overflow-auto"
      onClick={handleOutsideClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden max-h-[calc(100vh-144px)] flex flex-col my-4"
      >
        {/* ヘッダー - 固定 */}
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold flex items-center">
            {initialType === 'reply' && <FaReply className="mr-2 text-blue-500" />}
            {initialType === 'reply' 
              ? 'Comment' 
              : initialType === 'quote' 
                ? 'Quote' 
                : 'New Post'}
          </h2>
          <div className="flex items-center">
            <Link 
              href="/drafts" 
              className="mr-3 text-blue-500 hover:text-blue-700 text-sm"
            >
              下書き一覧
            </Link>
            <button
              onClick={() => onClose(false)}
              className="text-gray-500 hover:text-gray-700"
              disabled={isPosting || isSavingDraft}
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>
        
        {/* 投稿者情報 - 固定 */}
        <div className="p-4 flex items-center space-x-3 border-b">
          <UserAvatar
            imageUrl={user?.imageUrl || '/default-avatar.png'}
            username={user?.username || 'ユーザー'}
            size={40}
          />
          <div>
            <p className="font-medium">{user?.username || user?.firstName || 'ユーザー'}</p>
          </div>
        </div>
        
        {/* 引用元/返信先の表示（該当する場合） - 固定 */}
        {initialType === 'reply' && replyToPost && (
          <div className="p-3 bg-gray-50 border-b text-sm">
            <p className="text-gray-500 mb-1">
              Replying to @{replyToPost.user?.username || 'user'}
            </p>
            <p className="line-clamp-2">{replyToPost.content}</p>
          </div>
        )}
        
        {initialType === 'quote' && quotePost && (
          <div className="p-3 bg-gray-50 border-b text-sm">
            <p className="text-gray-500 mb-1">
              Quoting @{quotePost.user?.username || 'user'}
            </p>
            <p className="line-clamp-2">{quotePost.content}</p>
          </div>
        )}
        
        {/* メインコンテンツ - スクロール可能 */}
        <div className="p-4 overflow-y-auto flex-grow">
          <textarea
            ref={textareaRef}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ resize: 'vertical' }}
            placeholder={
              initialType === 'reply' 
                ? 'コメントを入力してください...' 
                : initialType === 'quote' 
                  ? '引用について追加...' 
                  : '何をシェアしたいですか？'
            }
            rows={5}
            value={content}
            onChange={(_) => setContent(_.target.value)}
            disabled={isPosting || isSavingDraft}
          />
          
          {/* メディアドロップゾーン */}
          <div className="mt-3">
            <MediaDropzone
              value={mediaFiles}
              onChange={handleMediaChange}
              maxFiles={MAX_MEDIA_ATTACHMENTS}
            />
          </div>
        </div>

        {/* フッター（ボタンエリア） - 固定 */}
        <div className="border-t p-4 bg-white">
          {/* 文字数カウンターとメディアアイコンを同じ行に配置 */}
          <div className="flex justify-end items-center mb-2">
            {/* 文字数カウンター */}
            <span className={`text-sm ${content.length > 500 ? 'text-red-500' : 'text-gray-500'}`}>
              {content.length}/500
            </span>
          </div>
          
          {/* アクションボタン - スマホでは縦並び、タブレット以上では横並び */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
            {showDraftButton && (
              <button
                onClick={saveDraft}
                disabled={
                  isPosting || 
                  isSavingDraft || 
                  // コンテンツとメディアのどちらも無い場合、または文字数オーバーの場合は無効
                  ((content.trim().length === 0 && mediaFiles.length === 0) || content.length > 500)
                }
                className={`px-4 py-2 rounded-full text-white flex items-center justify-center ${
                  isSavingDraft
                    ? 'bg-gray-500 cursor-not-allowed'
                    : isPosting
                      ? 'bg-gray-300 cursor-not-allowed' // 投稿中は非活性だが色を変える
                      : ((content.trim().length === 0 && mediaFiles.length === 0) || content.length > 500)
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-gray-500 hover:bg-gray-600'
                } ${showDraftButton ? 'sm:flex-1' : ''}`}
              >
                <FaSave className="mr-1" />
                <span>{isSavingDraft ? '保存中...' : '下書き保存'}</span>
              </button>
            )}

            <button
              onClick={createPost}
              disabled={
                isPosting || 
                isSavingDraft || 
                isUploadingMedia || 
                // コンテンツとメディアのどちらも無い場合、または文字数オーバーの場合は無効
                ((content.trim().length === 0 && mediaFiles.length === 0) || content.length > 500)
              }
              className={`px-4 py-2 rounded-full text-white flex items-center justify-center ${
                isPosting
                  ? 'bg-blue-300 cursor-not-allowed'
                  : isSavingDraft
                    ? 'bg-blue-300 cursor-not-allowed' // 下書き保存中は非活性だがローディング表示なし
                    : isUploadingMedia
                      ? 'bg-blue-300 cursor-not-allowed'
                      : ((content.trim().length === 0 && mediaFiles.length === 0) || content.length > 500)
                        ? 'bg-blue-300 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
              } ${showDraftButton ? 'sm:flex-1' : 'w-full'}`}
            >
              <FaPaperPlane className="mr-1" />
              <span>
                {isPosting 
                  ? 'ポスト中...' 
                  : isUploadingMedia && !isSavingDraft // 下書き保存中はアップロード中表示をしない
                    ? 'アップロード中...' 
                    : 'ポストする'}
              </span>
            </button>
          </div>
          
          {/* エラーメッセージ */}
          {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostModal; 