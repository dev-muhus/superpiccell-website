'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { FaTimes, FaTrophy, FaMedal, FaAward, FaUser, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface GameScore {
  id: number;
  score: number;
  game_time: number;
  items_collected: number;
  difficulty: string;
  stage_id: string;
  created_at: string;
  user: {
    id: number;
    username: string;
    profile_image_url?: string;
    first_name?: string;
    last_name?: string;
    is_current_user: boolean;
  };
}

interface RankingResponse {
  success: boolean;
  data: GameScore[];
  pagination: {
    hasMore: boolean;
    nextCursor: number | null;
    totalCount: number;
  };
}

interface GameRankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  stageId?: string;
}

export default function GameRankingModal({ isOpen, onClose, gameId, stageId }: GameRankingModalProps) {
  const [rankings, setRankings] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ランキングデータを取得する関数（useCallbackで依存関係を明確化）
  const fetchRankings = useCallback(async (cursor?: number) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        game_id: gameId,
        limit: itemsPerPage.toString()
      });

      if (stageId) {
        params.append('stage_id', stageId);
      }

      if (cursor) {
        params.append('cursor', cursor.toString());
      }

      const response = await fetch(`/api/games/scores?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('ランキングの取得に失敗しました');
      }

      const data: RankingResponse = await response.json();

      if (cursor) {
        // ページネーション時は追加
        setRankings(prev => [...prev, ...data.data]);
      } else {
        // 初回読み込み時は置換
        setRankings(data.data);
      }

      setHasMore(data.pagination.hasMore);
      setNextCursor(data.pagination.nextCursor);
      setTotalCount(data.pagination.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [gameId, stageId, itemsPerPage]);

  // モーダルが開かれた時にランキングを取得
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      fetchRankings();
    }
  }, [isOpen, fetchRankings]);

  // 次のページを読み込む
  const loadNextPage = useCallback(() => {
    if (hasMore && nextCursor && !loading) {
      setCurrentPage(prev => prev + 1);
      fetchRankings(nextCursor);
    }
  }, [hasMore, nextCursor, loading, fetchRankings]);

  // 前のページに戻る（簡易実装）
  const loadPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      // 簡易実装：最初から再読み込み
      fetchRankings();
    }
  }, [currentPage, fetchRankings]);

  // ランクアイコンを取得
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <FaTrophy className="text-yellow-500 text-xl" />;
      case 2:
        return <FaMedal className="text-gray-400 text-xl" />;
      case 3:
        return <FaAward className="text-amber-600 text-xl" />;
      default:
        return <span className="text-gray-600 font-bold text-lg">#{rank}</span>;
    }
  };

  // ユーザー名を表示
  const getUserDisplayName = (user: GameScore['user']) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username;
  };

  // 時間をフォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 難易度の表示
  const getDifficultyDisplay = (difficulty: string) => {
    const difficultyMap = {
      easy: { label: 'イージー', color: 'text-green-600' },
      normal: { label: 'ノーマル', color: 'text-blue-600' },
      hard: { label: 'ハード', color: 'text-red-600' }
    };
    return difficultyMap[difficulty as keyof typeof difficultyMap] || { label: difficulty, color: 'text-gray-600' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto" style={{ pointerEvents: 'auto' }}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">ランキング</h2>
            <p className="text-sm text-gray-600 mt-1">
              {stageId ? `ステージ: ${stageId}` : '全ステージ'} | 総参加者: {totalCount}人
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading && rankings.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">ランキングを読み込み中...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => fetchRankings()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                再試行
              </button>
            </div>
          ) : rankings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">まだランキングデータがありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rankings.map((score, index) => {
                const rank = index + 1 + (currentPage - 1) * itemsPerPage;
                const difficultyInfo = getDifficultyDisplay(score.difficulty);
                
                return (
                  <div
                    key={score.id}
                    className={`flex items-center p-4 rounded-lg border transition-colors ${
                      score.user.is_current_user
                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {/* ランク */}
                    <div className="flex items-center justify-center w-12 h-12 mr-4">
                      {getRankIcon(rank)}
                    </div>

                    {/* ユーザー情報 */}
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 mr-3">
                        {score.user.profile_image_url ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            <Image
                              src={score.user.profile_image_url}
                              alt={getUserDisplayName(score.user)}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <FaUser className="text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium truncate ${
                          score.user.is_current_user ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {getUserDisplayName(score.user)}
                          {score.user.is_current_user && (
                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                              あなた
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          @{score.user.username}
                        </p>
                      </div>
                    </div>

                    {/* スコア情報 */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {score.score.toLocaleString()}
                      </p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>アイテム: {score.items_collected}個</p>
                        <p>時間: {formatTime(score.game_time)}</p>
                        <p className={difficultyInfo.color}>
                          {difficultyInfo.label}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ページネーション */}
          {rankings.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={loadPreviousPage}
                disabled={currentPage === 1 || loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaChevronLeft className="mr-2" />
                前のページ
              </button>

              <span className="text-sm text-gray-600">
                ページ {currentPage} / {Math.ceil(totalCount / itemsPerPage)}
              </span>

              <button
                onClick={loadNextPage}
                disabled={!hasMore || loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次のページ
                <FaChevronRight className="ml-2" />
              </button>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
} 