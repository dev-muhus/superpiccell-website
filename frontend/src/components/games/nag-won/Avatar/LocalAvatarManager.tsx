'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LocalAvatarConfig, AvatarValidationResult } from '../Utils/avatarTypes';
import { localAvatarStorage } from '../Utils/localAvatarStorage';
import { AvatarUploader } from './AvatarUploader';
import { ANIMATION_CONFIG } from '../Utils/gltfValidator';

interface LocalAvatarManagerProps {
  selectedAvatarId?: string;
  onAvatarSelect?: (avatarId: string) => void;
  showUploaderProp?: boolean;
}

interface StorageInfo {
  avatarCount: number;
  totalSize: number;
  averageSize: number;
}

export const LocalAvatarManager: React.FC<LocalAvatarManagerProps> = ({
  selectedAvatarId,
  onAvatarSelect,
  showUploaderProp = true
}) => {
  const [localAvatars, setLocalAvatars] = useState<LocalAvatarConfig[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    avatarCount: 0,
    totalSize: 0,
    averageSize: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, boolean>>(new Map());

  // ローカルアバターをロード
  const loadLocalAvatars = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [avatars, usage] = await Promise.all([
        localAvatarStorage.getAvatars(),
        localAvatarStorage.getStorageUsage()
      ]);

      // 重複除去処理（IDベースでユニーク化）
      const uniqueAvatars = avatars.reduce((acc: LocalAvatarConfig[], current) => {
        const existingIndex = acc.findIndex(avatar => avatar.id === current.id);
        if (existingIndex === -1) {
          acc.push(current);
        } else {
          // 既に存在する場合は、より新しい日付のものを保持
          if (current.uploadDate > acc[existingIndex].uploadDate) {
            acc[existingIndex] = current;
          }
        }
        return acc;
      }, []);

      // 名前による重複もチェック（異なるIDで同じ名前）
      const nameUniqueAvatars = uniqueAvatars.reduce((acc: LocalAvatarConfig[], current) => {
        const existingIndex = acc.findIndex(avatar => avatar.name === current.name);
        if (existingIndex === -1) {
          acc.push(current);
        } else {
          // 同じ名前が存在する場合は、より新しい日付のものを保持
          if (current.uploadDate > acc[existingIndex].uploadDate) {
            console.log(`重複する名前のアバターを検出し、新しいものを保持: ${current.name}`);
            acc[existingIndex] = current;
          } else {
            console.log(`重複する名前のアバターを検出し、古いものを削除: ${current.name}`);
          }
        }
        return acc;
      }, []);

      // 既存アバターのスケール修正（0.5 → 0.1）
      const correctedScaleAvatars = nameUniqueAvatars.map(avatar => {
        if (avatar.scale === 0.5) {
          console.log(`アバター ${avatar.name} のスケールを0.5から0.1に修正中...`);
          return { ...avatar, scale: 0.1 };
        }
        return avatar;
      });

      // スケール修正されたアバターがある場合はIndexedDBに保存し直す
      const scaleCorrectedAvatars = correctedScaleAvatars.filter(
        (corrected, index) => corrected.scale !== nameUniqueAvatars[index].scale
      );
      
      if (scaleCorrectedAvatars.length > 0) {
        console.log(`${scaleCorrectedAvatars.length}個のアバターのスケール修正をIndexedDBに保存中...`);
        for (const avatar of scaleCorrectedAvatars) {
          try {
            await localAvatarStorage.saveAvatar(avatar);
          } catch (error) {
            console.warn(`アバター ${avatar.name} のスケール修正保存に失敗:`, error);
          }
        }
      }

      setLocalAvatars(correctedScaleAvatars);
      setStorageInfo(usage);

      const removedCount = avatars.length - correctedScaleAvatars.length;
      if (removedCount > 0) {
        console.log(`${removedCount}個の重複アバターを除去しました`);
      }
      console.log(`${correctedScaleAvatars.length}個のローカルアバターを読み込みました（重複除去・スケール修正済み）`);
    } catch (err) {
      console.error('ローカルアバターの読み込みに失敗:', err);
      setError('ローカルアバターの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期化
  useEffect(() => {
    loadLocalAvatars();
  }, [loadLocalAvatars]);

  // アバターアップロード成功ハンドラー
  const handleAvatarUploaded = useCallback(async (newAvatar: LocalAvatarConfig) => {
    try {
      // リストを更新
      await loadLocalAvatars();
      
      // アップローダーを閉じる
      setShowUploader(false);
      
      // 新しいアバターを自動選択
      if (onAvatarSelect) {
        onAvatarSelect(`local:${newAvatar.id}`);
      }

      console.log('アバターアップロード完了、リスト更新済み');
    } catch (err) {
      console.error('アバターリスト更新に失敗:', err);
      setError('アバターリストの更新に失敗しました');
    }
  }, [loadLocalAvatars, onAvatarSelect]);

  // アバター削除ハンドラー
  const handleDeleteAvatar = useCallback(async (avatarId: string) => {
    try {
      await localAvatarStorage.deleteAvatar(avatarId);
      await loadLocalAvatars();
      
      // 削除されたアバターが選択されていた場合は選択を解除
      if (selectedAvatarId === `local:${avatarId}`) {
        onAvatarSelect?.('');
      }

      setSelectedForDeletion(null);
      console.log(`アバターが削除されました: ${avatarId}`);
    } catch (err) {
      console.error('アバター削除に失敗:', err);
      setError('アバターの削除に失敗しました');
    }
  }, [loadLocalAvatars, selectedAvatarId, onAvatarSelect]);

  // アバター選択ハンドラー
  const handleAvatarClick = useCallback((avatar: LocalAvatarConfig) => {
    if (onAvatarSelect) {
      const avatarId = `local:${avatar.id}`;
      onAvatarSelect(avatarId);
    }
  }, [onAvatarSelect]);

  // 既存アバターの検証
  const validateExistingAvatars = useCallback(async () => {
    if (localAvatars.length === 0) return;
    
    setIsValidating(true);
    const newValidationResults = new Map<string, boolean>();
    
    try {
      for (const avatar of localAvatars) {
        try {
          // ANIMATION_CONFIGを使用した正確な検証
          const requiredTypes = Object.keys(ANIMATION_CONFIG.mappings);
          const missingAnimations: string[] = [];
          
          for (const requiredType of requiredTypes) {
            const expectedNames = ANIMATION_CONFIG.mappings[requiredType as keyof typeof ANIMATION_CONFIG.mappings];
            const hasCompatibleAnimation = expectedNames?.some(expectedName => 
              avatar.validAnimations.some(available => {
                const isMatch = available.toLowerCase().includes(expectedName.toLowerCase());
                const isAvoidPattern = ANIMATION_CONFIG.avoidPatterns.some(avoid => 
                  available.toLowerCase().includes(avoid.toLowerCase())
                );
                return isMatch && !isAvoidPattern;
              })
            );
            
            if (!hasCompatibleAnimation) {
              missingAnimations.push(requiredType);
            }
          }
          
          const hasRequiredAnimations = missingAnimations.length === 0;
          
          const validationResult: AvatarValidationResult = {
            isValid: hasRequiredAnimations,
            hasRequiredAnimations,
            availableAnimations: avatar.validAnimations,
            missingAnimations,
            errors: hasRequiredAnimations ? [] : [`必須アニメーションが不足しています: ${missingAnimations.join(', ')}`],
            fileSize: avatar.fileSize
          };
          
          newValidationResults.set(avatar.id, validationResult.isValid && validationResult.hasRequiredAnimations);
        } catch (error) {
          console.error(`アバター ${avatar.name} の検証に失敗:`, error);
          newValidationResults.set(avatar.id, false);
        }
      }
      
      setValidationResults(newValidationResults);
    } catch (error) {
      console.error('アバター検証中にエラー:', error);
      setError('アバターの検証中にエラーが発生しました');
    } finally {
      setIsValidating(false);
    }
  }, [localAvatars]);

  // 無効なアバターを自動削除
  const removeInvalidAvatars = useCallback(async () => {
    const invalidAvatars = localAvatars.filter(avatar => 
      validationResults.get(avatar.id) === false
    );
    
    if (invalidAvatars.length === 0) return;
    
    try {
      for (const avatar of invalidAvatars) {
        await localAvatarStorage.deleteAvatar(avatar.id);
        console.log(`無効なアバターを削除しました: ${avatar.name}`);
      }
      
      await loadLocalAvatars();
      setValidationResults(new Map());
      
      console.log(`${invalidAvatars.length}個の無効なアバターを削除しました`);
    } catch (error) {
      console.error('無効なアバターの削除に失敗:', error);
      setError('無効なアバターの削除に失敗しました');
    }
  }, [localAvatars, validationResults, loadLocalAvatars]);

  // エラーハンドラー
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    console.error('LocalAvatarManager エラー:', errorMessage);
  }, []);

  // ファイルサイズのフォーマット
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ストレージ使用率の計算
  const getStorageUsagePercentage = (): number => {
    const maxStorage = 300 * 1024 * 1024; // 300MB
    return Math.round((storageInfo.totalSize / maxStorage) * 100);
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h3 className="text-white text-lg font-bold">ローカルアバター</h3>
        
        <div className="flex space-x-2">
          {/* 検証ボタン */}
          {localAvatars.length > 0 && (
            <button
              onClick={validateExistingAvatars}
              disabled={isValidating}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
            >
              {isValidating ? '検証中...' : 'アバター検証'}
            </button>
          )}
          
          {/* 無効なアバター削除ボタン */}
          {validationResults.size > 0 && Array.from(validationResults.values()).some(valid => !valid) && (
            <button
              onClick={removeInvalidAvatars}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors"
            >
              無効なアバターを削除
            </button>
          )}
          
          {showUploaderProp && (
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
            >
              {showUploader ? 'アップローダーを閉じる' : 'アバターを追加'}
            </button>
          )}
        </div>
      </div>

      {/* ストレージ情報 */}
      <div className="bg-gray-900 bg-opacity-50 rounded p-3 text-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">ストレージ使用量</span>
          <span className="text-gray-300">
            {storageInfo.avatarCount}/15 アバター
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all ${
              getStorageUsagePercentage() > 90 ? 'bg-red-500' :
              getStorageUsagePercentage() > 70 ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(getStorageUsagePercentage(), 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatFileSize(storageInfo.totalSize)} / 300MB</span>
          <span>{getStorageUsagePercentage()}% 使用</span>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded p-3">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-red-200 text-xs mt-1 underline"
          >
            閉じる
          </button>
        </div>
      )}

      {/* アップローダー */}
      {showUploader && (
        <div className="border-t border-gray-700 pt-4">
          <AvatarUploader
            onAvatarUploaded={handleAvatarUploaded}
            onError={handleError}
          />
        </div>
      )}

      {/* ローディング状態 */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 mt-2">ローカルアバターを読み込み中...</p>
        </div>
      )}

      {/* アバターリスト */}
      {!isLoading && (
        <div>
          {localAvatars.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🎭</div>
              <p>ローカルアバターはまだありません</p>
              <p className="text-sm">上のボタンからアバターを追加してください</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localAvatars.map((avatar) => {
                const isSelected = selectedAvatarId === `local:${avatar.id}`;
                const isDeletionCandidate = selectedForDeletion === avatar.id;
                const validationStatus = validationResults.get(avatar.id);
                const isInvalid = validationStatus === false;
                
                return (
                  <div
                    key={avatar.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-900 bg-opacity-30' 
                        : isInvalid
                        ? 'border-red-500 bg-red-900 bg-opacity-20'
                        : 'border-gray-700 hover:border-gray-500'
                    } ${isDeletionCandidate ? 'ring-2 ring-red-500' : ''}`}
                    onClick={() => !isDeletionCandidate && !isInvalid && handleAvatarClick(avatar)}
                  >
                    {/* アバター情報 */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center flex-1">
                        <h4 className="text-white font-bold truncate">
                          {avatar.name}
                        </h4>
                        {/* 検証ステータス */}
                        {validationStatus !== undefined && (
                          <span className={`ml-2 text-xs px-1 py-0.5 rounded ${
                            validationStatus 
                              ? 'bg-green-900 bg-opacity-50 text-green-400' 
                              : 'bg-red-900 bg-opacity-50 text-red-400'
                          }`}>
                            {validationStatus ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-1 ml-2">
                        {/* 削除ボタン */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedForDeletion(
                              isDeletionCandidate ? null : avatar.id
                            );
                          }}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            isDeletionCandidate
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                          }`}
                        >
                          {isDeletionCandidate ? 'キャンセル' : '削除'}
                        </button>
                      </div>
                    </div>

                    {/* 削除確認 */}
                    {isDeletionCandidate && (
                      <div className="bg-red-900 bg-opacity-50 rounded p-2 mb-2">
                        <p className="text-red-300 text-xs mb-2">
                          このアバターを削除しますか？
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAvatar(avatar.id);
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded"
                          >
                            削除
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedForDeletion(null);
                            }}
                            className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1 rounded"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 無効アバター警告 */}
                    {isInvalid && !isDeletionCandidate && (
                      <div className="bg-red-900 bg-opacity-50 border border-red-600 rounded p-2 mb-2">
                        <p className="text-red-300 text-xs font-bold mb-1">⚠️ 無効なアバター</p>
                        <p className="text-red-400 text-xs">
                          このアバターは必須アニメーション（idle, walking, running, jumping）が不足しているため使用できません。
                        </p>
                      </div>
                    )}

                    {/* アバター詳細 */}
                    {!isDeletionCandidate && (
                      <>
                        <div className="text-sm text-gray-400 space-y-1">
                          <p>サイズ: {formatFileSize(avatar.fileSize)}</p>
                          <p>アニメーション: {avatar.validAnimations.length}個</p>
                          <p>追加日: {avatar.uploadDate.toLocaleDateString()}</p>
                        </div>

                        {/* アニメーションタグ */}
                        {avatar.validAnimations.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {avatar.validAnimations.slice(0, 3).map(anim => (
                                <span
                                  key={anim}
                                  className="px-1 py-0.5 bg-blue-900 bg-opacity-50 text-blue-300 text-xs rounded"
                                >
                                  {anim}
                                </span>
                              ))}
                              {avatar.validAnimations.length > 3 && (
                                <span className="px-1 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                                  +{avatar.validAnimations.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 選択状態インジケーター */}
                        {isSelected && (
                          <div className="mt-2 flex items-center text-blue-400 text-sm">
                            <span className="mr-1">✓</span>
                            選択中
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 使用方法のヒント */}
      {!isLoading && localAvatars.length === 0 && !showUploader && (
        <div className="mt-4 p-3 bg-gray-900 bg-opacity-50 rounded text-xs text-gray-400">
          <p className="font-bold mb-1">💡 ヒント:</p>
          <ul className="space-y-1">
            <li>• 「アバターを追加」ボタンでカスタムアバターをアップロード</li>
            <li>• GLTFファイルに必要なアニメーション（idle, walking, running, jumping）が含まれている必要があります</li>
            <li>• 最大15個のアバター、合計300MBまで保存可能</li>
            <li>• アップロードしたアバターはブラウザに保存され、ページをリロードしても使用できます</li>
          </ul>
        </div>
      )}
    </div>
  );
};