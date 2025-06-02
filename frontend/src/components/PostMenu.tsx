'use client';

import { FaEllipsisH, FaTrash, FaEdit, FaBellSlash, FaBan } from 'react-icons/fa';
import { RefObject } from 'react';

interface PostMenuProps {
  isOwnPost: boolean;
  showMenu: boolean;
  username: string;
  userId: number;
  actionInProgress: boolean;
  menuRef: RefObject<HTMLDivElement>;
  onToggleMenu: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onBlockUser: (userId: number, username: string) => void;
}

/**
 * 投稿メニューコンポーネント
 */
export default function PostMenu({
  isOwnPost,
  showMenu,
  username,
  userId,
  actionInProgress,
  menuRef,
  onToggleMenu,
  onDelete,
  onBlockUser
}: PostMenuProps) {
  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={onToggleMenu}
        className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
        aria-label="投稿メニュー"
      >
        <FaEllipsisH />
      </button>
      
      {showMenu && (
        <div className="absolute right-0 mt-1 w-56 bg-white shadow-lg rounded-md overflow-hidden z-10 border border-gray-200">
          {/* 自分の投稿の場合の操作 */}
          {isOwnPost ? (
            <>
              {/* 削除ボタン */}
              <button 
                onClick={onDelete}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-red-500"
              >
                <FaTrash className="mr-2" />
                <span>削除</span>
              </button>
              
              {/* 編集ボタン - 常に非活性 */}
              <button 
                disabled
                className="w-full text-left px-4 py-2 flex items-center text-gray-300 cursor-not-allowed bg-gray-50"
              >
                <FaEdit className="mr-2" />
                <span>編集</span>
              </button>
            </>
          ) : (
            <>
              {/* 他人の投稿の場合の操作 */}
              {/* ミュート機能 - 非活性 */}
              <button 
                disabled
                className="w-full text-left px-4 py-2 flex items-center text-gray-300 cursor-not-allowed bg-gray-50"
              >
                <FaBellSlash className="mr-2" />
                <span>{username}さんをミュート</span>
              </button>
              
              {/* ブロック機能 - 有効化 */}
              <button 
                onClick={() => onBlockUser(userId, username)}
                disabled={actionInProgress}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center text-red-500"
              >
                <FaBan className="mr-2" />
                <span>{username}さんをブロック</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
} 