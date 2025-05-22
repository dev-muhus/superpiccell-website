'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaHome, FaClock, FaHeart, FaUsers, FaBookmark, FaComments, FaBan, FaUser, FaSave, FaGamepad } from 'react-icons/fa';
import PostModal from '@/components/PostModal';
import Loading from '@/components/Loading';
import PageLayout from '@/components/PageLayout';
import ContentLayout from '@/components/ContentLayout';
import { ITEMS_PER_PAGE } from '@/constants/pagination';

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // ヘッダーの高さを測定
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

  // リサイズイベントのリスナーを設定
  useEffect(() => {
    const handleResize = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ユーザーの投稿を取得する関数
  const fetchUserPosts = useCallback(async () => {
    try {
      // ユーザーのDBユーザー情報を取得
      const userResponse = await fetch(`/api/me`);
      if (!userResponse.ok) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }
      
      const userData = await userResponse.json();
      const dbUserId = userData.user?.id;
      
      if (!dbUserId) {
        throw new Error('ユーザーIDが取得できませんでした');
      }

      // URLクエリパラメータを構築
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        sort: 'desc',
        userId: dbUserId.toString(), // DBのユーザーIDを使用
        include_related: 'true' // 関連データを含めて取得
      });
      
      const response = await fetch(`/api/posts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('投稿の取得に失敗しました');
      }
      
      // APIレスポンスの取得成功（データは使用しないため変数に格納しない）
      // ダッシュボードでは投稿を表示しないため、状態更新なし
      
    } catch (error) {
      console.error('投稿取得エラー:', error);
    }
  }, []);

  // ページロード時に投稿を取得
  useEffect(() => {
    if (user) {
      fetchUserPosts();
    }
  }, [user, fetchUserPosts]);

  // 投稿モーダルが閉じられたときに投稿を再取得
  const handleClosePostModal = (postSubmitted = false) => {
    setIsPostModalOpen(false);
    // 投稿が行われた場合のみ投稿一覧を更新
    if (postSubmitted) {
      fetchUserPosts();
    }
  };

  if (!isLoaded) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center py-12">
          <Loading message="Loading..." />
        </div>
      </PageLayout>
    );
  }

  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  if (!user) return null;

  return (
    <PageLayout>
      <ContentLayout
        title="DASHBOARD"
        subtitle="アカウント情報と機能"
        backUrl="/"
        backText="ホームに戻る"
        contentClass="p-4"
      >
        <div className="flex flex-col lg:flex-row gap-8">
          {/* プロフィール情報 */}
          <div className="lg:w-1/4 w-full">
            <div className="bg-white rounded-lg shadow p-6 text-center sticky" style={{ top: `calc(${headerHeight}px + 1rem)` }}>
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 mb-4">
                  <Image
                    src={user.imageUrl}
                    alt={user.username || ''}
                    fill
                    className="rounded-full object-cover border-2 border-gray-200"
                  />
                </div>
                <h2 className="text-xl font-bold mb-2">{user.username || user.firstName || 'User'}</h2>
                <p className="text-gray-600 mb-4 break-words">{user.primaryEmailAddress?.emailAddress}</p>
                <Link
                  href={`/profile/${user.username}`}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors w-full mb-2"
                >
                  <FaUser className="mr-2" /> プロフィールを見る
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors w-full"
                >
                  <FaHome className="mr-2" /> ホームに戻る
                </Link>
              </div>
            </div>
          </div>

          {/* 機能一覧 */}
          <div className="lg:w-3/4 w-full">
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">FEATURES</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* スタートポスト */}
                <button 
                  onClick={() => setIsPostModalOpen(true)}
                  className="bg-blue-500 text-white rounded-lg p-6 hover:bg-blue-600 transition-colors transform hover:-translate-y-1 hover:shadow-lg text-left"
                >
                  <div className="text-center">
                    <span className="text-2xl">✏️</span>
                    <h3 className="text-lg font-semibold mt-2">NEW POST</h3>
                    <p className="text-sm text-blue-100 mt-1">新しい投稿を作成</p>
                  </div>
                </button>

                {/* ゲームセンター */}
                <Link href="/dashboard/games" className="bg-white border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors flex items-center transform hover:-translate-y-1 hover:shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50">
                  <FaGamepad className="text-blue-600 mr-3 text-xl" />
                  <div>
                    <h3 className="font-semibold">GAME CENTRE</h3>
                    <p className="text-sm text-gray-600">ゲームで遊ぶ</p>
                  </div>
                </Link>

                {/* タイムライン */}
                <Link href="/timeline" className="bg-white border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors flex items-center transform hover:-translate-y-1 hover:shadow-lg">
                  <FaClock className="text-gray-600 mr-3 text-xl" />
                  <div>
                    <h3 className="font-semibold">TIMELINE</h3>
                    <p className="text-sm text-gray-600">他のユーザーの投稿をチェック</p>
                  </div>
                </Link>

                {/* エンゲージメント */}
                <Link href="/engagement" className="bg-white border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors flex items-center transform hover:-translate-y-1 hover:shadow-lg">
                  <FaHeart className="text-gray-600 mr-3 text-xl" />
                  <div>
                    <h3 className="font-semibold">ENGAGEMENT</h3>
                    <p className="text-sm text-gray-600">いいね、コメント、リポストの一覧</p>
                  </div>
                </Link>

                {/* コネクション */}
                <Link href="/connections" className="bg-white border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors flex items-center transform hover:-translate-y-1 hover:shadow-lg">
                  <FaUsers className="text-gray-600 mr-3 text-xl" />
                  <div>
                    <h3 className="font-semibold">CONNECTIONS</h3>
                    <p className="text-sm text-gray-600">フォロー・フォロワー管理</p>
                  </div>
                </Link>

                {/* ブックマーク */}
                <Link href="/bookmarks" className="bg-white border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors flex items-center transform hover:-translate-y-1 hover:shadow-lg">
                  <FaBookmark className="text-gray-600 mr-3 text-xl" />
                  <div>
                    <h3 className="font-semibold">BOOKMARKS</h3>
                    <p className="text-sm text-gray-600">保存した投稿を表示</p>
                  </div>
                </Link>

                {/* 下書き */}
                <Link href="/drafts" className="bg-white border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors flex items-center transform hover:-translate-y-1 hover:shadow-lg">
                  <FaSave className="text-gray-600 mr-3 text-xl" />
                  <div>
                    <h3 className="font-semibold">DRAFTS</h3>
                    <p className="text-sm text-gray-600">保存した投稿の続きを書く</p>
                  </div>
                </Link>

                {/* コミュニティ - 非活性化 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center disabled-card">
                  <FaComments className="text-gray-600 mr-3 text-xl" />
                  <div>
                    <h3 className="font-semibold">COMMUNITY</h3>
                    <p className="text-sm text-gray-600">参加中のコミュニティを表示</p>
                  </div>
                </div>

                {/* ブロック管理 */}
                <Link href="/blocks" className="bg-white border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors flex items-center transform hover:-translate-y-1 hover:shadow-lg">
                  <FaBan className="text-gray-600 mr-3 text-xl" />
                  <div>
                    <h3 className="font-semibold">BLOCKS</h3>
                    <p className="text-sm text-gray-600">ブロックしたユーザーの確認と管理</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 投稿モーダル */}
        <PostModal 
          isOpen={isPostModalOpen}
          onClose={handleClosePostModal}
        />
      </ContentLayout>
    </PageLayout>
  );
} 