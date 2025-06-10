'use client';

import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { LocalAvatarConfig, AvatarValidationResult } from '../Utils/avatarTypes';
import { gltfValidator } from '../Utils/gltfValidator';
import { localAvatarStorage } from '../Utils/localAvatarStorage';
import { GLTFRuntimeValidator } from './GLTFRuntimeValidator';
import { logger } from '@/utils/logger';

interface AvatarUploaderProps {
  onAvatarUploaded: (avatar: LocalAvatarConfig) => void;
  onError: (error: string) => void;
  onValidationProgress?: (progress: number) => void;
}

interface UploadState {
  isDragging: boolean;
  isValidating: boolean;
  isUploading: boolean;
  progress: number;
  validationResult: AvatarValidationResult | null;
  currentFile: File | null;
  fileUrl: string | null;
  runtimeValidationComplete: boolean;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  onAvatarUploaded,
  onError,
  onValidationProgress
}) => {
  const [state, setState] = useState<UploadState>({
    isDragging: false,
    isValidating: false,
    isUploading: false,
    progress: 0,
    validationResult: null,
    currentFile: null,
    fileUrl: null,
    runtimeValidationComplete: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Blob URL のクリーンアップ
  React.useEffect(() => {
    return () => {
      if (state.fileUrl) {
        URL.revokeObjectURL(state.fileUrl);
      }
    };
  }, [state.fileUrl]);

  // 重複チェック関数
  const checkForDuplicate = useCallback(async (file: File): Promise<boolean> => {
    try {
      const existingAvatars = await localAvatarStorage.getAvatars();
      const fileName = file.name.replace(/\.(gltf|glb)$/i, '');
      
      // 同じ名前のアバターが既に存在するかチェック
      return existingAvatars.some(avatar => avatar.name === fileName);
    } catch (error) {
      logger.error('重複チェック中にエラー:', error);
      return false;
    }
  }, []);

  // アップロード確定処理
  const handleConfirmUpload = useCallback(async (file: File, validationResult: AvatarValidationResult) => {
    setState(prev => ({ ...prev, isUploading: true }));

    try {
      // アバター名の生成（ファイル名から拡張子を除去）
      const avatarName = file.name.replace(/\.(gltf|glb)$/i, '');
      
      // ユニークIDの生成
      const avatarId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Blobから永続化可能な形式でBlobURLを生成
      const blobUrl = await localAvatarStorage.generateBlobUrl(file);

      // LocalAvatarConfig作成
      const avatarConfig: LocalAvatarConfig = {
        id: avatarId,
        name: avatarName,
        type: 'local',
        fileBlob: file,
        blobUrl: blobUrl,
        fileSize: file.size,
        uploadDate: new Date(),
        validAnimations: validationResult.availableAnimations,
        scale: 0.1, // ローカルアバターのデフォルトスケール（デフォルトアバターと同じ）
        heightOffset: 0.0
      };

      // IndexedDBに保存
      await localAvatarStorage.saveAvatar(avatarConfig);

      // 成功コールバック
      onAvatarUploaded(avatarConfig);

      // 状態リセット
      setState(prev => ({ 
        ...prev, 
        isUploading: false,
        currentFile: null,
        validationResult: null,
        progress: 0,
        fileUrl: null,
        runtimeValidationComplete: false
      }));
      
      // Blob URLのクリーンアップ
      if (state.fileUrl) {
        URL.revokeObjectURL(state.fileUrl);
      }

      logger.info(`アバターアップロード完了: ${avatarName}`);

    } catch (error) {
      logger.error('アバターアップロード中にエラー:', error);
      setState(prev => ({ ...prev, isUploading: false }));
      onError(`アバターのアップロードに失敗しました: ${error}`);
    }
  }, [onAvatarUploaded, onError, state.fileUrl]);

  // ランタイム検証完了ハンドラー
  const handleRuntimeValidationComplete = useCallback((validationResult: AvatarValidationResult) => {
    setState(prev => ({ 
      ...prev, 
      validationResult,
      runtimeValidationComplete: true,
      isValidating: false,
      progress: 100
    }));
    
    onValidationProgress?.(100);

    if (!validationResult.isValid || !validationResult.hasRequiredAnimations) {
      onError(`アバターの検証に失敗しました: ${validationResult.errors.join(', ')}`);
      return;
    }

    // 成功時は後続の処理をuseEffectに委ねる
  }, [onError, onValidationProgress]);

  // 検証成功時の後続処理（重複チェック → アップロード）
  useEffect(() => {
    if (state.validationResult?.isValid && state.runtimeValidationComplete && state.currentFile) {
      const performUpload = async () => {
        try {
          // 重複チェック
          const isDuplicate = await checkForDuplicate(state.currentFile!);
          if (isDuplicate) {
            onError('同じ名前のアバターが既に存在します。既存のアバターを削除してから再度アップロードしてください。');
            setState(prev => ({
              ...prev,
              currentFile: null,
              fileUrl: null,
              validationResult: null,
              runtimeValidationComplete: false
            }));
            return;
          }
          
          await handleConfirmUpload(state.currentFile!, state.validationResult!);
        } catch (error) {
          logger.error('アップロード処理中にエラー:', error);
          onError('アバターのアップロード中にエラーが発生しました。');
        }
      };
      
      performUpload();
    }
  }, [state.validationResult, state.runtimeValidationComplete, state.currentFile, checkForDuplicate, handleConfirmUpload, onError]);

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // 古いBlob URLをクリーンアップ
    if (state.fileUrl) {
      URL.revokeObjectURL(state.fileUrl);
    }
    
    const fileUrl = URL.createObjectURL(file);
    
    setState(prev => ({ 
      ...prev, 
      currentFile: file, 
      validationResult: null,
      isValidating: true,
      progress: 0,
      fileUrl,
      runtimeValidationComplete: false
    }));

    try {
      // 基本的なファイル検証（ファイル形式、サイズなど）
      onValidationProgress?.(10);
      const basicValidation = await gltfValidator.validateFile(file);
      
      if (!basicValidation.isValid) {
        setState(prev => ({ 
          ...prev, 
          isValidating: false,
          validationResult: basicValidation
        }));
        onError(`基本的な検証に失敗しました: ${basicValidation.errors.join(', ')}`);
        URL.revokeObjectURL(fileUrl);
        return;
      }
      
      onValidationProgress?.(30);
      
      // ランタイム検証は GLTFRuntimeValidator コンポーネントが実行
      // handleRuntimeValidationComplete で結果を受け取る
      
    } catch (error) {
      logger.error('ファイル検証中にエラー:', error);
      setState(prev => ({ 
        ...prev, 
        isValidating: false,
        validationResult: null,
        fileUrl: null
      }));
      URL.revokeObjectURL(fileUrl);
      onError(`ファイル検証中にエラーが発生しました: ${error}`);
    }
  }, [onError, onValidationProgress, state.fileUrl]);

  // ドラッグ&ドロップイベントハンドラー
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isDragging: false }));
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // ファイル選択ボタンクリック
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  // ファイル入力変更
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  // アップロードキャンセル
  const handleCancel = () => {
    // Blob URLをクリーンアップ
    if (state.fileUrl) {
      URL.revokeObjectURL(state.fileUrl);
    }
    
    setState({
      isDragging: false,
      isValidating: false,
      isUploading: false,
      progress: 0,
      validationResult: null,
      currentFile: null,
      fileUrl: null,
      runtimeValidationComplete: false
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-white text-lg font-bold mb-4">
        カスタムアバターアップロード
      </h3>

      {/* ファイル選択・ドラッグ&ドロップエリア */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
          state.isDragging
            ? 'border-blue-500 bg-blue-900 bg-opacity-20'
            : 'border-gray-600 hover:border-gray-500'
        } ${state.isValidating || state.isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleFileInputClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".gltf,.glb"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {state.isDragging ? (
          <div className="text-blue-400">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-lg">ファイルをドロップしてください</p>
          </div>
        ) : (
          <div className="text-gray-400">
            <div className="text-4xl mb-2">🎭</div>
            <p className="text-lg mb-2">GLTFアバターファイルを選択</p>
            <p className="text-sm">ドラッグ&ドロップまたはクリックして選択</p>
            <p className="text-xs mt-2 text-gray-500">
              対応形式: .gltf, .glb (最大20MB)
            </p>
          </div>
        )}
      </div>

      {/* プログレスバー */}
      {(state.isValidating || state.isUploading) && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>
              {state.isValidating ? 'アバターを検証中...' : 'アップロード中...'}
            </span>
            <span>{state.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 検証結果表示 */}
      {state.validationResult && (
        <div className="mt-4">
          <div className={`p-4 rounded-lg ${
            state.validationResult.isValid 
              ? 'bg-green-900 bg-opacity-30 border border-green-500'
              : 'bg-red-900 bg-opacity-30 border border-red-500'
          }`}>
            <h4 className={`font-bold mb-2 ${
              state.validationResult.isValid ? 'text-green-400' : 'text-red-400'
            }`}>
              {state.validationResult.isValid ? '✅ 検証成功' : '❌ 検証失敗'}
            </h4>

            {/* ファイル情報 */}
            <div className="text-sm text-gray-300 mb-3">
              <p>ファイルサイズ: {(state.validationResult.fileSize / 1024 / 1024).toFixed(2)}MB</p>
              <p>利用可能なアニメーション: {state.validationResult.availableAnimations.length}個</p>
            </div>

            {/* アニメーション情報 */}
            {state.validationResult.availableAnimations.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-400 mb-1">検出されたアニメーション:</p>
                <div className="flex flex-wrap gap-1">
                  {state.validationResult.availableAnimations.map(anim => (
                    <span
                      key={anim}
                      className="px-2 py-1 bg-blue-900 bg-opacity-50 text-blue-300 text-xs rounded"
                    >
                      {anim}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 不足アニメーション */}
            {state.validationResult.missingAnimations.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-red-400 mb-1">不足している必須アニメーション:</p>
                <div className="flex flex-wrap gap-1">
                  {state.validationResult.missingAnimations.map(anim => (
                    <span
                      key={anim}
                      className="px-2 py-1 bg-red-900 bg-opacity-50 text-red-300 text-xs rounded"
                    >
                      {anim}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* エラーメッセージ */}
            {state.validationResult.errors.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-red-400 mb-1">エラー:</p>
                <ul className="text-xs text-red-300">
                  {state.validationResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 警告メッセージ */}
            {state.validationResult.warnings && state.validationResult.warnings.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-yellow-400 mb-1">警告:</p>
                <ul className="text-xs text-yellow-300">
                  {state.validationResult.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 品質スコア */}
            {state.validationResult.qualityScore !== undefined && (
              <div className="mb-3">
                <p className="text-sm text-gray-400">
                  品質スコア: 
                  <span className={`ml-1 font-bold ${
                    state.validationResult.qualityScore >= 80 ? 'text-green-400' :
                    state.validationResult.qualityScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {state.validationResult.qualityScore}/100
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      {(state.isValidating || state.isUploading || state.currentFile) && (
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            disabled={state.isValidating || state.isUploading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* ランタイムGLTF検証 */}
      {state.fileUrl && state.currentFile && state.isValidating && !state.runtimeValidationComplete && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1000 }}>
          <Canvas>
            <Suspense fallback={null}>
              <GLTFRuntimeValidator
                fileUrl={state.fileUrl}
                onValidationComplete={handleRuntimeValidationComplete}
              />
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* 使用方法のヒント */}
      <div className="mt-4 p-3 bg-gray-900 bg-opacity-50 rounded text-xs text-gray-400">
        <p className="font-bold mb-1">📝 使用方法:</p>
        <ul className="space-y-1">
          <li>• GLTFまたはGLBファイルをアップロードしてください</li>
          <li>• 必須アニメーション: idle, walking, running, jumping</li>
          <li>• ファイルサイズ制限: 20MB以下</li>
          <li>• アップロード後、ゲーム設定でアバターを選択できます</li>
        </ul>
      </div>
    </div>
  );
};