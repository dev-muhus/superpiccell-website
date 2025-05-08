'use client';

import Image from 'next/image';
import { useState } from 'react';
import { FaUser } from 'react-icons/fa';

interface UserAvatarProps {
  imageUrl?: string | null;
  username?: string;
  size?: number;
  className?: string;
}

/**
 * ユーザーアバターを表示するための共通コンポーネント
 * 画像読み込みエラー時はデフォルトアイコンを表示
 */
export default function UserAvatar({
  imageUrl,
  username = 'ユーザー',
  size = 40,
  className = ''
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // 有効なURLかチェック
  const isValidUrl = imageUrl && (
    imageUrl.startsWith('http://') || 
    imageUrl.startsWith('https://') || 
    imageUrl.startsWith('/')
  );
  
  // 画像がない、またはエラーの場合はデフォルトアイコンを表示
  const showDefaultIcon = !isValidUrl || imageError;
  
  return (
    <div 
      className={`relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {showDefaultIcon ? (
        <FaUser 
          className="text-gray-400" 
          size={size * 0.6} 
          aria-label={username} 
        />
      ) : (
        <Image
          src={imageUrl!}
          alt={username}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      )}
    </div>
  );
} 