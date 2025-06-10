'use client';

import React, { useState, useEffect } from 'react';
import { useGameSettingsStore } from './Utils/stores';
import { AVATAR_MODELS, GAME_STAGES } from './Utils/config';
import { LocalAvatarManager } from './Avatar/LocalAvatarManager';

interface GameSettingsProps {
  onClose: () => void;
}

const GameSettings: React.FC<GameSettingsProps> = ({ onClose }) => {
  const { 
    selectedAvatarId, 
    selectedStageId, 
    localAvatars,
    setSelectedAvatar, 
    setSelectedStage,
    loadLocalAvatars
  } = useGameSettingsStore();
  
  // 新しい選択を保存（モーダルを閉じるときに適用）
  const [tempAvatarId, setTempAvatarId] = useState(selectedAvatarId);
  const [tempStageId, setTempStageId] = useState(selectedStageId);
  const [showLocalAvatarManager, setShowLocalAvatarManager] = useState(false);

  // ローカルアバターを初期化時にロード
  useEffect(() => {
    loadLocalAvatars();
  }, [loadLocalAvatars]);
  
  // 設定を適用して閉じる
  const handleApply = () => {
    setSelectedAvatar(tempAvatarId);
    setSelectedStage(tempStageId);
    onClose();
  };
  
  // キャンセルして閉じる
  const handleCancel = () => {
    // 変更を破棄
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
      <div className="bg-black bg-opacity-90 text-white rounded-lg w-full max-w-3xl mx-auto flex flex-col max-h-[90vh] overflow-hidden">
        {/* ヘッダー部分 - 固定 */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">ゲーム設定</h2>
            <button 
              onClick={handleCancel} 
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* スクロール可能なコンテンツエリア（ボタンも含む） */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* デフォルトアバター選択セクション */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">デフォルトアバター</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AVATAR_MODELS.map((avatar) => (
                <div 
                  key={avatar.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    tempAvatarId === avatar.id 
                      ? 'border-blue-500 bg-blue-900 bg-opacity-30' 
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                  onClick={() => setTempAvatarId(avatar.id)}
                >
                  <h3 className="font-bold">{avatar.name}</h3>
                  <p className="text-sm text-gray-400">{avatar.description}</p>
                  {tempAvatarId === avatar.id && (
                    <div className="mt-2 flex items-center text-blue-400 text-sm">
                      <span className="mr-1">✓</span>
                      選択中
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ローカルアバター選択セクション */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-green-400">カスタムアバター</h3>
              <button
                onClick={() => setShowLocalAvatarManager(!showLocalAvatarManager)}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors"
              >
                {showLocalAvatarManager ? '管理画面を閉じる' : 'アバター管理'}
              </button>
            </div>

            {/* ローカルアバター管理画面 */}
            {showLocalAvatarManager ? (
              <div className="border border-gray-700 rounded-lg p-4 bg-gray-800 bg-opacity-50">
                <LocalAvatarManager
                  selectedAvatarId={tempAvatarId}
                  onAvatarSelect={setTempAvatarId}
                  showUploaderProp={true}
                />
              </div>
            ) : (
              // ローカルアバター選択グリッド
              <div>
                {localAvatars.length === 0 ? (
                  <div className="border border-gray-700 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-2">🎭</div>
                    <p className="text-gray-400 mb-2">カスタムアバターはまだありません</p>
                    <p className="text-sm text-gray-500">「アバター管理」ボタンからアバターを追加してください</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {localAvatars.map((avatar) => {
                      const avatarId = `local:${avatar.id}`;
                      const isSelected = tempAvatarId === avatarId;
                      
                      return (
                        <div 
                          key={avatar.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-green-500 bg-green-900 bg-opacity-30' 
                              : 'border-gray-700 hover:border-gray-500'
                          }`}
                          onClick={() => setTempAvatarId(avatarId)}
                        >
                          <h3 className="font-bold text-white">{avatar.name}</h3>
                          <div className="text-sm text-gray-400 space-y-1 mt-2">
                            <p>サイズ: {(avatar.fileSize / 1024 / 1024).toFixed(2)}MB</p>
                            <p>アニメーション: {avatar.validAnimations.length}個</p>
                          </div>
                          
                          {/* アニメーションタグ */}
                          {avatar.validAnimations.length > 0 && (
                            <div className="mt-2">
                              <div className="flex flex-wrap gap-1">
                                {avatar.validAnimations.slice(0, 2).map(anim => (
                                  <span
                                    key={anim}
                                    className="px-1 py-0.5 bg-green-900 bg-opacity-50 text-green-300 text-xs rounded"
                                  >
                                    {anim}
                                  </span>
                                ))}
                                {avatar.validAnimations.length > 2 && (
                                  <span className="px-1 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                                    +{avatar.validAnimations.length - 2}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 選択状態インジケーター */}
                          {isSelected && (
                            <div className="mt-2 flex items-center text-green-400 text-sm">
                              <span className="mr-1">✓</span>
                              選択中
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* ステージ選択セクション */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-purple-400">ステージ選択</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {GAME_STAGES.map((stage) => (
                <div 
                  key={stage.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    tempStageId === stage.id 
                      ? 'border-purple-500 bg-purple-900 bg-opacity-30' 
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                  onClick={() => setTempStageId(stage.id)}
                >
                  <h3 className="font-bold">{stage.name}</h3>
                  <p className="text-sm text-gray-400">{stage.description}</p>
                  <div className="flex items-center mt-2 text-xs">
                    <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: stage.skyColor }}></span>
                    <span>{stage.envPreset}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* ボタン - 固定せずコンテンツ内に配置 */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
              >
                キャンセル
              </button>
              <button
                onClick={handleApply}
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
              >
                設定を保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSettings; 