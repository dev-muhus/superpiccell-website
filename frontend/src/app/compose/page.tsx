'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import MainLayout from '@/components/MainLayout';
import PostModal from '@/components/PostModal';

export default function ComposePage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(true);

  // モーダルクローズ時の処理
  const handleCloseModal = (postSubmitted = false) => {
    setIsModalOpen(false);
    
    // 投稿が行われたかどうかに関わらず、タイムラインページに戻る
    if (postSubmitted) {
      router.push('/timeline');
    } else {
      router.push('/timeline');
    }
  };

  // モーダルを常に表示するための副作用
  useEffect(() => {
    setIsModalOpen(true);
  }, []);

  // 認証中の表示
  if (!isLoaded) {
    return (
      <MainLayout title="新規投稿" backUrl="/timeline">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p>読み込み中...</p>
        </div>
      </MainLayout>
    );
  }

  // 未認証の場合
  if (!isSignedIn) {
    return (
      <MainLayout title="新規投稿" backUrl="/">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p>投稿するにはログインが必要です</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="新規投稿" backUrl="/timeline">
      {/* 投稿モーダル */}
      <PostModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialType="post"
      />
    </MainLayout>
  );
} 