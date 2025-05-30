'use client';

import React, { useState } from 'react';
import { FaTimes, FaSave, FaSpinner } from 'react-icons/fa';

interface ScoreSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  score: number;
  gameTime: number;
  itemsCollected: number;
  stageId: string;
}

export default function ScoreSaveModal({
  isOpen,
  onClose,
  onSave,
  score,
  gameTime,
  itemsCollected,
  stageId
}: ScoreSaveModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // スコア保存処理
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave();
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'スコアの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 時間をフォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ステージ名を表示用に変換
  const getStageDisplayName = (stageId: string) => {
    const stageMap: Record<string, string> = {
      'cyber-city': 'サイバーシティ',
      'forest': '森林',
      'volcano': '火山'
    };
    return stageMap[stageId] || stageId;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto" style={{ pointerEvents: 'auto' }}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">スコアを保存</h2>
            <p className="text-sm text-gray-600 mt-1">
              ランキングに記録しますか？
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          {/* スコア詳細 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-blue-600">{score.toLocaleString()}</p>
              <p className="text-sm text-gray-600">ポイント</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium text-gray-900">プレイ時間</p>
                <p className="text-gray-600">{formatTime(gameTime)}</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">収集アイテム</p>
                <p className="text-gray-600">{itemsCollected}個</p>
              </div>
              <div className="text-center col-span-2">
                <p className="font-medium text-gray-900">ステージ</p>
                <p className="text-gray-600">{getStageDisplayName(stageId)}</p>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{saveError}</p>
            </div>
          )}

          {/* 説明文 */}
          <p className="text-sm text-gray-600 mb-6">
            スコアを保存すると、ランキングに表示され、他のプレイヤーと競うことができます。
            保存しない場合でも、ゲームを続けることができます。
          </p>

          {/* ボタン */}
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSaving ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  保存する
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              スキップ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 