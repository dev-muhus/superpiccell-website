'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { FaUser, FaEdit, FaUserPlus, FaUserCheck, FaBan, FaUnlock, FaTimes, FaSave, FaCloudUploadAlt, FaImage, FaTrash, FaCheck } from 'react-icons/fa';
import Loading from '@/components/Loading';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import PostCard from '@/components/PostCard';
import InfiniteScroll from '@/components/InfiniteScroll';
import { ITEMS_PER_PAGE } from '@/constants/pagination';
import { toast } from 'sonner';
import Modal from '@/components/Modal';
import ContentRenderer from '@/components/ContentRenderer';
import { generateProfileBackgroundStyle } from '@/lib/utils';

interface User {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  cover_image_url?: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  follower_count?: number;
  following_count?: number;
}

// メディアのインターフェース定義
interface Media {
  id?: number;
  url: string;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
  duration_sec?: number;
}

interface Post {
  id: number;
  content: string;
  created_at: string;
  post_type: 'original' | 'reply' | 'quote' | 'repost';
  user_id: number;
  in_reply_to_post_id?: number;
  quote_of_post_id?: number;
  repost_of_post_id?: number;
  media?: Media[];
  user: {
    id: number;
    username: string;
    profile_image_url?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  reply_count?: number;
  like_count?: number;
  is_liked?: boolean;
  repost_count?: number;
  is_reposted?: boolean;
  bookmark_count?: number;
  is_bookmarked?: boolean;
  // リポスト関連の情報
  repost_of_post?: Post;
  quote_of_post?: Post;
  in_reply_to_post?: Post;
}

interface Pagination {
  hasNextPage: boolean;
  nextCursor: string | null;
}

// プロフィール編集モーダルコンポーネント
interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: (updated?: boolean) => void;
  user: User;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, user }) => {
  const [bio, setBio] = useState(user.bio || '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBio(user.bio || '');
      setCoverImageUrl(user.cover_image_url || null);
      setSelectedFile(null);
      setError(null);
      setIsDragOver(false);
      
      // 既存のカバー画像がある場合は、それをプレビューとして表示
      if (user.cover_image_url) {
        setPreviewUrl(user.cover_image_url);
      } else {
        setPreviewUrl(null);
      }
    }
  }, [isOpen, user]);

  // プレビュー画像のクリーンアップ（新しくアップロードされたファイルのプレビューのみ）
  useEffect(() => {
    return () => {
      if (previewUrl && selectedFile) {
        // selectedFileがある場合のみクリーンアップ（新しいアップロードファイルの場合）
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, selectedFile]);

  // ファイル検証とプレビュー生成
  const validateAndSetFile = (file: File) => {
    // ファイルサイズチェック（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください');
      return false;
    }
    
    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('JPG、PNG、WEBP形式の画像ファイルを選択してください');
      return false;
    }
    
    // 既存のプレビューURLをクリーンアップ（新しいアップロードファイルの場合のみ）
    if (previewUrl && selectedFile) {
      URL.revokeObjectURL(previewUrl);
    }
    
    // 新しいプレビューURLを生成
    const newPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(newPreviewUrl);
    setSelectedFile(file);
    setError(null);
    return true;
  };

  // カバー画像ファイル選択処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      validateAndSetFile(file);
    }
  };

  // ファイル削除処理
  const handleRemoveFile = () => {
    // 新しくアップロードされたファイルの場合のみクリーンアップ
    if (previewUrl && selectedFile) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setPreviewUrl(null);
    setSelectedFile(null);
    setCoverImageUrl(null); // 既存のカバー画像も削除することを示す
    setError(null);
  };

  // カバー画像アップロード処理
  const uploadCoverImage = async (): Promise<string | null> => {
    if (!selectedFile) return null;
    
    setIsUploading(true);
    try {
      // 署名付きURL取得
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const signResponse = await fetch('/api/upload/cover-images', {
        method: 'POST',
        body: formData
      });
      
      if (!signResponse.ok) {
        const errorData = await signResponse.json();
        throw new Error(errorData.error || 'アップロード準備に失敗しました');
      }
      
      const signData = await signResponse.json();
      
      // Cloudinaryにアップロード
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('api_key', signData.apiKey);
      uploadFormData.append('timestamp', signData.timestamp.toString());
      uploadFormData.append('signature', signData.signature);
      uploadFormData.append('public_id', signData.publicId);
      uploadFormData.append('upload_preset', signData.uploadPreset);
      
      // フォルダパラメータが提供されている場合は追加
      if (signData.folder) {
        uploadFormData.append('folder', signData.folder);
      }
      
      const uploadResponse = await fetch(signData.uploadUrl, {
        method: 'POST',
        body: uploadFormData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('画像のアップロードに失敗しました');
      }
      
      await uploadResponse.json(); // Cloudinaryからのレスポンス（現在は使用しないが、将来的な拡張のため保持）
      return signData.publicUrl; // 変換済みのURL
      
    } catch (error) {
      console.error('カバー画像アップロードエラー:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let finalCoverImageUrl = coverImageUrl;
      
      // 新しいカバー画像が選択されている場合はアップロード
      if (selectedFile) {
        finalCoverImageUrl = await uploadCoverImage();
      }
      
      const requestBody: { bio: string; cover_image_url?: string | null } = { bio };
      
      // カバー画像の処理
      if (finalCoverImageUrl !== null) {
        // 新しい画像がアップロードされた場合
        requestBody.cover_image_url = finalCoverImageUrl;
      } else if (coverImageUrl === null && user.cover_image_url) {
        // 既存の画像を削除する場合（coverImageUrlがnullに設定されている場合）
        requestBody.cover_image_url = null;
      }
      // それ以外の場合（変更なし）はcover_image_urlを含めない
      
      const response = await fetch('/api/profile/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'プロフィールの更新に失敗しました');
      }

      toast.success('プロフィールを更新しました');
      onClose(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新中にエラーが発生しました';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => onClose(false)} 
      title="Profile Edit" 
      className="w-full max-w-2xl profile-edit-modal"
    >
      <div className="w-full max-w-full overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 p-4 rounded-md text-red-600 mb-4">
              {error}
            </div>
          )}
          
          {/* 高級ドラッグ&ドロップカバー画像アップロード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              カバー画像
            </label>
            
            {/* メインドロップゾーン */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out hover-elevate w-full drag-drop-area ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50 sm:scale-[1.02] shadow-lg drag-glow pulse-on-drag' 
                  : selectedFile 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
              } ${isUploading ? 'pointer-events-none opacity-75' : 'cursor-pointer'}`}
              style={{ aspectRatio: '3/1', minHeight: '120px', maxWidth: '100%' }}
            >
              {/* プレビュー画像表示 */}
              {previewUrl && (
                <div className="absolute inset-0 fade-in">
                  <Image
                    src={previewUrl}
                    alt="カバー画像プレビュー"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center justify-center space-x-8 cover-buttons-container">
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="w-10 h-10 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg cover-edit-button"
                        disabled={isUploading}
                        title="画像を削除"
                        style={{ minWidth: '2.5rem', minHeight: '2.5rem' }}
                      >
                        <FaTrash className="text-sm fa-trash" />
                      </button>
                      <label 
                        className="w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg cursor-pointer cover-edit-button" 
                        title="画像を変更"
                        style={{ minWidth: '2.5rem', minHeight: '2.5rem' }}
                      >
                        <FaEdit className="text-sm fa-edit" />
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileSelect}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ドロップゾーンコンテンツ */}
              {!previewUrl && (
                <div className="flex flex-col items-center justify-center h-full p-3 sm:p-6 text-center">
                  <div className={`
                    transition-all duration-300 ease-in-out
                    ${isDragOver ? 'scale-110 text-blue-500' : 'text-gray-400'}
                  `}>
                    <FaCloudUploadAlt className="text-3xl sm:text-5xl mb-2 sm:mb-4 mx-auto" />
                    <div className={`
                      transition-colors duration-300
                      ${isDragOver ? 'text-blue-600' : 'text-gray-600'}
                    `}>
                      <p className="text-sm sm:text-lg font-medium mb-1 sm:mb-2">
                        {isDragOver ? '画像をここにドロップ' : 'カバー画像をドラッグ&ドロップ'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        または <span className="text-blue-500 font-medium">クリックして選択</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* 隠しファイル入力 */}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                </div>
              )}

              {/* アップロード中のオーバーレイ */}
              {isUploading && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm font-medium text-blue-600">アップロード中...</p>
                  </div>
                </div>
              )}
            </div>

            {/* ファイル情報とガイドライン */}
            <div className="mt-3 space-y-2 w-full file-info-area">
              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg w-full">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <FaCheck className="text-green-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-green-700 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-green-600">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="w-6 h-6 text-green-400 hover:text-green-600 transition-colors flex items-center justify-center flex-shrink-0 ml-2"
                    disabled={isUploading}
                    title="ファイルを削除"
                  >
                    <FaTimes className="text-sm" />
                  </button>
                </div>
              )}
              
              <div className="flex items-start space-x-2 text-xs text-gray-500 w-full">
                <FaImage className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p><span className="font-medium">推奨:</span> 1200×400px (3:1比率)</p>
                  <p><span className="font-medium">形式:</span> JPG, PNG, WEBP</p>
                  <p><span className="font-medium">最大:</span> 10MB</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 洗練された自己紹介セクション */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-3">
              自己紹介
            </label>
            <div className="relative">
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none bg-gray-50 hover:bg-white focus:bg-white"
                placeholder="あなたについて教えてください..."
                maxLength={200}
              />
              <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                  bio.length > 180 
                    ? 'bg-red-100 text-red-600' 
                    : bio.length > 150 
                      ? 'bg-yellow-100 text-yellow-600' 
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {bio.length}/200
                </div>
              </div>
            </div>
          </div>
          
          {/* 洗練されたアクションボタン */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full pt-4 profile-edit-buttons">
            <button
              type="button"
              onClick={() => onClose(false)}
              className={`
                group relative px-6 py-3 rounded-xl text-gray-700 flex items-center justify-center font-medium transition-all duration-200 transform mobile-button
                ${isSubmitting || isUploading
                  ? 'bg-gray-200 cursor-not-allowed opacity-60'
                  : 'bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md'
                } sm:flex-1
              `}
              disabled={isSubmitting || isUploading}
            >
              <FaTimes className="mr-2 transition-transform group-hover:rotate-90" />
              <span>キャンセル</span>
            </button>
            <button
              type="submit"
              className={`
                group relative px-6 py-3 rounded-xl text-white flex items-center justify-center font-medium transition-all duration-200 transform overflow-hidden mobile-button
                ${isSubmitting || isUploading
                  ? 'bg-blue-400 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
                } sm:flex-1
              `}
              disabled={isSubmitting || isUploading}
            >
              {/* アニメーション背景 */}
              {!isSubmitting && !isUploading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 group-hover:animate-pulse"></div>
              )}
              
              {/* ローディングアニメーション */}
              {(isSubmitting || isUploading) && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 animate-gradient-x"></div>
              )}
              
              <div className="relative flex items-center">
                {isUploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                ) : isSubmitting ? (
                  <div className="animate-pulse mr-2">
                    <FaSave />
                  </div>
                ) : (
                  <FaSave className="mr-2 transition-transform group-hover:scale-110" />
                )}
                <span>
                  {isUploading ? 'アップロード中...' : isSubmitting ? '更新中...' : '保存する'}
                </span>
              </div>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: currentUser, isLoaded, isSignedIn } = useUser();
  
  // 状態管理
  const [profile, setProfile] = useState<User | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    hasNextPage: false,
    nextCursor: null
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followActionLoading, setFollowActionLoading] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  
  // ユーザープロフィールを取得する関数
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // ユーザー名でプロフィールを取得
      const response = await fetch(`/api/profile/${username}`);
      
      if (!response.ok) {
        // エラーレスポンスを取得
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profile');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      
      // フォロー状態を設定
      setIsFollowing(data.isFollowing || false);
      
      // ブロック状態を設定
      setIsBlocked(data.isBlocked || false);
      
      // フォロワー数とフォロー中の数を設定
      setFollowerCount(data.profile.follower_count || 0);
      setFollowingCount(data.profile.following_count || 0);
      
      // 自分のプロフィールかどうかを判断
      if (currentUser?.username === username) {
        setIsOwnProfile(true);
      }
      
    } catch (err) {
      console.error('プロフィール取得エラー:', err);
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.username, username]);
  
  // ユーザーの投稿を取得する関数
  const fetchUserPosts = useCallback(async (cursor?: string | null, append: boolean = false) => {
    try {
      if (!profile) return;
      
      setIsLoadingPosts(true);
      
      // APIリクエストのパラメータを構築
      const params = new URLSearchParams({
        userId: profile.id.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        include_related: 'true' // リポスト元の投稿情報を含める
      });
      
      if (cursor) {
        params.append('cursor', cursor);
      }
      
      // 投稿を取得
      const response = await fetch(`/api/posts?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch posts');
      }
      
      const data = await response.json();
      
      // APIレスポンスをPostCardコンポーネントの形式に合わせる
      // 元のpost情報をすべて保持し、必要に応じてユーザー情報のみを補完する
      const formattedPosts = data.posts.map((post: Post) => ({
        ...post, // エンゲージメント情報を含むすべての情報を保持
        // ユーザー情報が取得できなければプロフィール情報を使用
        user: post.user || {
          id: profile.id,
          username: profile.username,
          profile_image_url: profile.profile_image_url || '',
          first_name: profile.first_name || '',
          last_name: profile.last_name || ''
        }
      }));
      
      if (append) {
        // 既存の投稿リストに追加
        setPosts(prevPosts => [...prevPosts, ...formattedPosts]);
      } else {
        // 初期ロード時は置き換え
        setPosts(formattedPosts);
      }
      
      // ページネーション情報を更新
      setPagination({
        hasNextPage: data.pagination.hasNextPage,
        nextCursor: data.pagination.nextCursor
      });
      
    } catch (err) {
      console.error('投稿取得エラー:', err);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [profile]);
  
  // ページロード時にプロフィールを取得
  useEffect(() => {
    if (isLoaded) {
      fetchProfile();
    }
  }, [isLoaded, username, fetchProfile]);
  
  // プロフィール情報が取得できたら投稿を取得
  useEffect(() => {
    if (profile) {
      fetchUserPosts();
    }
  }, [profile, fetchUserPosts]);
  
  // 次のページを読み込む
  const loadMorePosts = () => {
    if (pagination.hasNextPage && pagination.nextCursor && !isLoadingPosts) {
      fetchUserPosts(pagination.nextCursor, true);
    }
  };

  // フォロー/フォロー解除の処理
  const handleFollowToggle = async () => {
    if (!profile || !currentUser) return;
    
    // 現在の状態を保存
    const currentIsFollowing = isFollowing;
    const currentFollowerCount = followerCount;
    
    try {
      // 先にUIを更新（Optimistic UI）
      setFollowActionLoading(true);
      setIsFollowing(!currentIsFollowing);
      
      // フォロワー数を更新
      setFollowerCount(prev => currentIsFollowing ? prev - 1 : prev + 1);
      
      // プロフィール情報を更新
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          follower_count: currentIsFollowing 
            ? (prev.follower_count || 0) - 1 
            : (prev.follower_count || 0) + 1
        };
      });
      
      toast.success(`${profile.username}さんを${isFollowing ? 'フォロー解除' : 'フォロー'}しました`);
      
      // APIコールは並行して行う
      const endpoint = `/api/users/${profile.id}/follow`;
      const method = currentIsFollowing ? 'DELETE' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`フォロー${currentIsFollowing ? '解除' : ''}に失敗しました`);
      }
      
    } catch (error) {
      console.error('フォロー操作エラー:', error);
      toast.error(`エラーが発生しました: ${error instanceof Error ? error.message : 'フォロー操作に失敗しました'}`);
      
      // エラーが発生した場合、状態を元に戻す（ロールバック）
      setIsFollowing(currentIsFollowing);
      setFollowerCount(currentFollowerCount);
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          follower_count: currentFollowerCount
        };
      });
    } finally {
      setFollowActionLoading(false);
    }
  };

  // いいね状態が変更された時のコールバック
  const handleLikeStateChange = (postId: number, isLiked: boolean, likeCount: number) => {
    // 投稿一覧の該当投稿の状態を更新
    setPosts(prev => 
      prev.map(post => 
        post.id === postId 
          ? { ...post, is_liked: isLiked, like_count: likeCount } 
          : post
      )
    );
  };

  // リポスト状態が変更された時のコールバック
  const handleRepostStateChange = (postId: number, isReposted: boolean) => {
    // 投稿一覧の該当投稿の状態を更新
    setPosts(prev => 
      prev.map(post => 
        post.id === postId 
          ? { ...post, is_reposted: isReposted, repost_count: (post.repost_count || 0) + (isReposted ? 1 : -1) } 
          : post
      )
    );
  };

  // ブックマーク状態が変更された時のコールバック
  const handleBookmarkStateChange = (postId: number, isBookmarked: boolean) => {
    // 投稿一覧の該当投稿の状態を更新
    setPosts(prev => 
      prev.map(post => 
        post.id === postId 
          ? { ...post, is_bookmarked: isBookmarked } 
          : post
      )
    );
  };

  // 引用処理
  const handleQuote = (postId: number) => {
    console.log('引用:', postId);
  };

  // 返信成功時の処理
  const handleReplySuccess = () => {
    fetchUserPosts();
  };

  // 投稿削除時の処理
  const handleDeletePost = (postId: number) => {
    // 削除された投稿を状態から除外
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  // ブロック/ブロック解除の処理
  const handleBlockToggle = async () => {
    if (!profile || !currentUser) return;
    
    // 現在の状態を保存
    const currentIsBlocked = isBlocked;
    
    try {
      // 先にUIを更新（Optimistic UI）
      setBlockActionLoading(true);
      setIsBlocked(!isBlocked);
      toast.success(`${profile.username}さんを${isBlocked ? 'ブロック解除' : 'ブロック'}しました`);
      
      // APIコールは並行して行う
      const endpoint = `/api/users/${profile.id}/block`;
      const method = currentIsBlocked ? 'DELETE' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`ブロック${currentIsBlocked ? '解除' : ''}に失敗しました`);
      }
      
    } catch (error) {
      console.error('ブロック操作エラー:', error);
      toast.error(`エラーが発生しました: ${error instanceof Error ? error.message : 'ブロック操作に失敗しました'}`);
      
      // エラーが発生した場合、状態を元に戻す
      setIsBlocked(currentIsBlocked);
    } finally {
      setBlockActionLoading(false);
    }
  };

  // プロフィール編集モーダルを開く
  const handleOpenProfileEditModal = () => {
    setShowEditModal(true);
  };

  // プロフィール編集モーダルを閉じる
  const handleCloseProfileEditModal = (updated: boolean = false) => {
    setShowEditModal(false);
    
    // 更新された場合、プロフィール情報を再取得
    if (updated) {
      fetchProfile();
    }
  };

  return (
    <PageLayout>
      <ContentLayout
        title="PROFILE"
        subtitle={`@${username}`}
        backUrl="/dashboard"
        backText="ダッシュボードに戻る"
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loading message="読み込み中..." />
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
            <span className="block sm:inline">{error}</span>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* プロフィールヘッダー */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* ヘッダー背景またはカバー画像 */}
              <div className="h-32 relative profile-header">
                {profile.cover_image_url ? (
                  <Image
                    src={profile.cover_image_url}
                    alt="カバー画像"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-full"
                    style={profile ? generateProfileBackgroundStyle(profile.username) : {}}
                  />
                )}
                {/* オーバーレイ */}
                <div className="absolute inset-0 bg-black bg-opacity-20" />
                {/* プロフィール画像 */}
                <div className="absolute -bottom-16 left-8 z-10">
                  <div className="relative w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden">
                    {profile.profile_image_url ? (
                      <Image
                        src={profile.profile_image_url}
                        alt={profile.username}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        <FaUser className="text-4xl" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* アクションボタン */}
                <div className="absolute bottom-4 right-6 flex space-x-2 z-10">
                  {isOwnProfile ? (
                    <button
                      onClick={handleOpenProfileEditModal}
                      className="px-4 py-1.5 bg-white text-gray-800 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors text-sm font-medium shadow-sm md:ml-auto sm:static edit-button"
                    >
                      <FaEdit /> <span className="hidden sm:inline">プロフィール編集</span>
                    </button>
                  ) : isLoaded && isSignedIn ? (
                    <>
                      <button
                        onClick={handleFollowToggle}
                        disabled={followActionLoading}
                        className={`px-4 py-1.5 rounded-full transition-colors text-sm font-medium flex items-center shadow-sm ${
                          isFollowing
                            ? 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {followActionLoading ? (
                          '処理中...'
                        ) : isFollowing ? (
                          <>
                            <FaUserCheck className="mr-1.5" /> フォロー中
                          </>
                        ) : (
                          <>
                            <FaUserPlus className="mr-1.5" /> フォローする
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleBlockToggle}
                        disabled={blockActionLoading}
                        className="bg-white text-gray-600 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors text-sm font-medium shadow-sm block-button"
                        title={isBlocked ? 'ブロック解除' : 'ブロックする'}
                      >
                        {blockActionLoading ? (
                          '...'
                        ) : isBlocked ? (
                          <FaUnlock />
                        ) : (
                          <FaBan />
                        )}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              
              {/* プロフィール情報 */}
              <div className="pt-20 px-8 pb-6">
                <h1 className="text-2xl font-bold mb-1">
                  {profile.first_name || profile.last_name 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
                    : profile.username
                  }
                </h1>
                <p className="text-gray-600 mb-4">@{profile.username}</p>
                
                {profile.bio && (
                  <div className="mb-4">
                    <ContentRenderer text={profile.bio} />
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-600 space-x-6">
                  <span className="text-gray-600">
                    <span className="font-bold">{followerCount}</span> フォロワー
                  </span>
                  <span className="text-gray-600">
                    <span className="font-bold">{followingCount}</span> フォロー中
                  </span>
                </div>
              </div>
            </div>
            
            {/* 投稿一覧 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <h2 className="text-lg font-semibold p-4 border-b border-gray-100">
                投稿
              </h2>
              
              {posts.length === 0 && !isLoadingPosts ? (
                <div className="p-8 text-center text-gray-500">
                  {isOwnProfile 
                    ? '投稿がありません。最初の投稿を作成しましょう！'
                    : `${profile.username}さんはまだ投稿していません`
                  }
                </div>
              ) : (
                <InfiniteScroll
                  hasNextPage={pagination.hasNextPage}
                  isLoading={isLoadingPosts}
                  onLoadMore={loadMorePosts}
                >
                  <div className="divide-y divide-gray-100">
                    {posts.map(post => {
                      // デバッグ: プロフィールページで投稿データを確認
                      if (process.env.NODE_ENV === 'development') {
                        console.log(`📄 [Profile Page] Post ${post.id} data:`, {
                          id: post.id,
                          like_count: post.like_count,
                          repost_count: post.repost_count,
                          bookmark_count: post.bookmark_count,
                          is_liked: post.is_liked,
                          is_reposted: post.is_reposted,
                          is_bookmarked: post.is_bookmarked,
                          fullPost: post
                        });
                      }
                      
                      return (
                        <PostCard
                          key={post.id}
                          post={post}
                          onLikeStateChange={handleLikeStateChange}
                          onRepostStateChange={handleRepostStateChange}
                          onBookmarkStateChange={handleBookmarkStateChange}
                          onQuote={handleQuote}
                          onReplySuccess={handleReplySuccess}
                          onDeletePost={handleDeletePost}
                          // エンゲージメント情報を明示的に渡す
                          likeCount={post.like_count || 0}
                          isLiked={post.is_liked || false}
                          replyCount={post.reply_count || 0}
                          isBookmarked={post.is_bookmarked || false}
                        />
                      );
                    })}
                  </div>
                  
                  {isLoadingPosts && (
                    <div className="p-4 flex justify-center">
                      <Loading message="投稿を読み込み中..." size="sm" />
                    </div>
                  )}
                </InfiniteScroll>
              )}
            </div>
          </div>
        ) : null}
      </ContentLayout>
      
      {/* プロフィール編集モーダル */}
      {profile && (
        <ProfileEditModal
          isOpen={showEditModal}
          onClose={handleCloseProfileEditModal}
          user={profile}
        />
      )}

      <style jsx global>{`
        /* 高級アニメーション */
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 2s ease infinite;
        }
        
        /* ドラッグ&ドロップのグロー効果 */
        .drag-glow {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
        
        /* ホバー時のエレベーション */
        .hover-elevate:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        /* プレビュー画像のフェードイン */
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        /* ドロップゾーンのパルス効果 */
        .pulse-on-drag {
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        /* スマホ対応のためのスタイル */
        @media (max-width: 640px) {
          .profile-header {
            position: relative;
          }
          
          .profile-header .edit-button {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 10;
            padding: 0.5rem !important;
            border-radius: 9999px !important;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
          
          .profile-header .edit-button svg {
            margin-right: 0 !important;
            font-size: 16px;
          }
        }
      `}</style>
    </PageLayout>
  );
} 