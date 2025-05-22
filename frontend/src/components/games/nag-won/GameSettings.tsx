'use client';

import React, { useState } from 'react';
import { useGameSettingsStore } from './Utils/stores';
import { AVATAR_MODELS, GAME_STAGES } from './Utils/config';

interface GameSettingsProps {
  onClose: () => void;
}

const GameSettings: React.FC<GameSettingsProps> = ({ onClose }) => {
  const { 
    selectedAvatarId, 
    selectedStageId, 
    setSelectedAvatar, 
    setSelectedStage 
  } = useGameSettingsStore();
  
  // 新しい選択を保存（モーダルを閉じるときに適用）
  const [tempAvatarId, setTempAvatarId] = useState(selectedAvatarId);
  const [tempStageId, setTempStageId] = useState(selectedStageId);
  
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
          {/* アバター選択セクション */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">アバター選択</h3>
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
                </div>
              ))}
            </div>
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