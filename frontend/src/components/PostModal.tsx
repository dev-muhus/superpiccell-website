'use client';

import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaImage, FaVideo, FaPaperPlane, FaReply, FaSave } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';
import UserAvatar from './UserAvatar';
import Link from 'next/link';

// 投稿データの型定義
interface PostData {
  id: number;
  content: string;
  user?: {
    username?: string;
  };
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
  draftId = null
}) => {
  const [content, setContent] = useState(initialContent);
  const [isPosting, setIsPosting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useUser();
  
  // モーダルが開いたときに入力欄にフォーカス
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
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
    }
  }, [isOpen, initialContent]);
  
  // モーダル外のクリックでモーダルを閉じる
  const handleOutsideClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose(false);
    }
  };
  
  // 投稿を作成する関数
  const createPost = async () => {
    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }
    
    if (content.length > 500) {
      toast.error('Post content must be less than 500 characters');
      return;
    }
    
    try {
      setIsPosting(true);
      
      // 投稿タイプとデータ準備
      const postData = {
        content: content.trim(),
        post_type: initialType === 'post' ? 'original' : initialType,
        in_reply_to_post_id: undefined as number | undefined,
        quote_of_post_id: undefined as number | undefined
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
      
      // APIリクエスト
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '投稿の作成に失敗しました');
      }
      
      // 投稿が成功した場合、下書きIDがあれば下書きを削除
      if (draftId) {
        try {
          const deleteResponse = await fetch(`/api/drafts?id=${draftId}`, {
            method: 'DELETE'
          });
          
          if (deleteResponse.ok) {
            console.log(`下書き(ID: ${draftId})が正常に削除されました`);
          } else {
            console.error(`下書き(ID: ${draftId})の削除に失敗しました`);
          }
        } catch (deleteError) {
          console.error('下書き削除中にエラーが発生しました:', deleteError);
        }
      }
      
      const successMessage = initialType === 'reply' 
        ? 'Comment posted successfully' 
        : 'Post created successfully!';
      
      toast.success(successMessage);
      
      // 投稿成功後、モーダルを閉じる前に少し待つ
      setTimeout(() => {
        onClose(true);
      }, 500);
      
    } catch (error) {
      console.error('投稿エラー:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsPosting(false);
    }
  };

  // 下書きを保存する関数
  const saveDraft = async () => {
    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }
    
    if (content.length > 500) {
      toast.error('Draft content must be less than 500 characters');
      return;
    }
    
    try {
      setIsSavingDraft(true);
      
      // 下書きデータの準備
      const draftData = {
        content: content.trim(),
        in_reply_to_post_id: (initialType === 'reply' && replyToPost) ? replyToPost.id : replyToPostId
      };
      
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '下書きの保存に失敗しました');
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
      className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center px-4"
      onClick={handleOutsideClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden"
      >
        {/* ヘッダー */}
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
        
        {/* 投稿者情報 */}
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
        
        {/* 引用元/返信先の表示（該当する場合） */}
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
        
        <div className="p-4">
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
            onChange={(e) => setContent(e.target.value)}
            disabled={isPosting || isSavingDraft}
          />
          
          {/* スマホ表示に最適化されたボタンと文字数カウンター */}
          <div className="mt-3">
            {/* 文字数カウンターとメディアアイコンを同じ行に配置 */}
            <div className="flex justify-between items-center mb-2">
              {/* メディアアイコン */}
              <div className="flex space-x-2">
                <span className="text-gray-300 cursor-not-allowed opacity-50">
                  <FaImage size={20} />
                </span>
                <span className="text-gray-300 cursor-not-allowed opacity-50">
                  <FaVideo size={20} />
                </span>
              </div>
              
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
                  disabled={isPosting || isSavingDraft || !content.trim() || content.length > 500}
                  className={`px-4 py-2 rounded-full text-white flex items-center justify-center ${
                    isPosting || isSavingDraft || !content.trim() || content.length > 500
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
                disabled={isPosting || isSavingDraft || !content.trim() || content.length > 500}
                className={`px-4 py-2 rounded-full text-white flex items-center justify-center ${
                  isPosting || isSavingDraft || !content.trim() || content.length > 500
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                } ${showDraftButton ? 'sm:flex-1' : 'w-full'}`}
              >
                <FaPaperPlane className="mr-1" />
                <span>{isPosting ? 'ポスト中...' : 'ポストする'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostModal; 