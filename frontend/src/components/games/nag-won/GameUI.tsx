'use client';

import React, { useState, useEffect } from 'react';
import GameSettings from './GameSettings';
import GameRankingModal from './UI/GameRankingModal';
import { FaTimes, FaPlay, FaRedo, FaGamepad, FaHome } from 'react-icons/fa';

interface GameUIProps {
  score: number;
  timeRemaining: number;
  isGameActive: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  error: Error | null;
  onStart: () => void;
  onRestart: () => void;
  onBackToDashboard: () => void;
  onBackToTop: () => void;
  selectedStageId: string;
  onGameRestart?: () => void; // ゲーム中のリスタート用
  onModalChange?: (isVisible: boolean) => void; // モーダル表示状態変更通知用
}

export default function GameUI({
  score,
  timeRemaining,
  isGameActive,
  isGameOver,
  isPaused,
  error,
  onStart,
  onRestart,
  onBackToDashboard,
  onBackToTop,
  selectedStageId,
  onGameRestart,
  onModalChange
}: GameUIProps) {
  // 設定モーダルの表示状態
  const [showSettings, setShowSettings] = useState(false);
  // ランキングモーダルの表示状態
  const [showRanking, setShowRanking] = useState(false);
  // モバイルデバイスかどうかを判定
  const [isMobile, setIsMobile] = useState(false);
  
  // 画面サイズ変更時にモバイルかどうかを判定
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileDevices = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i;
      setIsMobile(mobileDevices.test(userAgent) || window.innerWidth < 768);
    };
    
    // 初期チェック
    checkIfMobile();
    
    // リサイズイベントとorientationchangeイベントでチェック
    window.addEventListener('resize', checkIfMobile);
    window.addEventListener('orientationchange', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
      window.removeEventListener('orientationchange', checkIfMobile);
    };
  }, []);
  
  // ゲーム状態を切り替える関数（ESCキーと同じ動作）
  const toggleGamePause = () => {
    console.log('toggleGamePause called from GameUI button');
    // game-escapeイベントを発火してInputManagerと同じ処理を実行
    window.dispatchEvent(new CustomEvent('game-escape'));
    console.log('game-escape event dispatched from GameUI');
  };
  
  // モーダル表示状態が変更されたときに親コンポーネントに通知
  useEffect(() => {
    const isModalVisible = showSettings || showRanking;
    onModalChange?.(isModalVisible);
  }, [showSettings, showRanking, onModalChange]);
  
  // エラー表示
  if (error) {
    return (
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black bg-opacity-80">
        <div className="bg-red-900 p-6 rounded-lg max-w-md mx-auto text-white text-center">
          <h3 className="text-xl font-bold mb-3">エラーが発生しました</h3>
          <p className="mb-4 bg-red-950 p-3 rounded overflow-auto max-h-40">{error.message}</p>
          <div className="flex space-x-3 justify-center">
            <button
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-6 rounded transition-colors"
              onClick={onRestart}
            >
              再試行
            </button>
            <button
              className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-6 rounded transition-colors"
              onClick={onBackToDashboard}
            >
              ゲーム選択に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ゲーム開始前の画面（またはESCキーで一時停止した場合）
  if ((!isGameActive && !isGameOver) || (isGameActive && isPaused)) {
    return (
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-40">
        {/* 設定モーダル（showSettingsがtrueの場合のみ表示） */}
        {showSettings && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75" style={{ pointerEvents: 'auto' }}>
            <div className="relative bg-black bg-opacity-80 p-4 sm:p-6 rounded-lg max-w-md mx-auto text-white">
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
                aria-label="閉じる"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <GameSettings onClose={() => setShowSettings(false)} />
            </div>
          </div>
        )}
        
        <div className="bg-black bg-opacity-70 p-4 sm:p-8 rounded-lg max-w-md mx-auto text-white text-center overflow-y-auto max-h-[80vh]">
          <div className="relative">
            <button 
              onClick={toggleGamePause}
              className="absolute top-0 right-0 bg-gray-700 hover:bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
              aria-label="閉じる"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Nag-Won メタバースゲーム</h2>
            <p className="mb-3 sm:mb-6 text-sm sm:text-base">
              サイバーシティを探索して、光るアイテムを集めよう！<br />
              制限時間内により多くのポイントを獲得しましょう。
            </p>
            <div className="mb-3 sm:mb-6 text-left">
              <h3 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base">操作方法:</h3>
              {isMobile ? (
                <ul className="list-disc pl-5 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                  <li>移動: 画面左下のジョイスティック</li>
                  <li>視点移動: 画面をスワイプ</li>
                  <li>ジャンプ: 画面右下の青いボタン</li>
                  <li>ダッシュ: 画面右下の赤いボタン</li>
                  <li>ズーム: 画面左上のボタンまたはピンチ操作</li>
                  <li>アイテム収集: 接近で自動収集</li>
                  <li>メニュー表示: 画面左上のメニューボタン</li>
                </ul>
              ) : (
                <ul className="list-disc pl-5 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                  <li>移動: WASD または 矢印キー</li>
                  <li>ジャンプ: スペースキー</li>
                  <li>加速: Shiftキー</li>
                  <li>アイテム収集: 接近で自動収集</li>
                  <li>カメラ回転: マウス移動</li>
                  <li>メニュー表示: ESCキー</li>
                </ul>
              )}
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={onStart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-8 rounded-lg transition-colors text-sm sm:text-lg"
              >
                {isPaused ? "ゲーム再開" : isGameActive ? "ゲーム再開" : "ゲームスタート"}
              </button>
              
              {/* ゲーム中のリスタートボタン（ゲームが一時停止中の場合のみ表示） */}
              {(isGameActive || isPaused) && onGameRestart && (
                <button
                  onClick={onGameRestart}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-8 rounded-lg transition-colors text-sm sm:text-lg"
                >
                  🔄 完全リスタート（スコア・時間リセット）
                </button>
              )}
              
              {/* 設定ボタン */}
              <button
                onClick={() => setShowSettings(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 sm:py-2 px-4 sm:px-8 rounded transition-colors text-sm sm:text-base"
              >
                ゲーム設定
              </button>

              {/* ランキングボタン */}
              <button
                onClick={() => setShowRanking(true)}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1.5 sm:py-2 px-4 sm:px-8 rounded transition-colors text-sm sm:text-base"
              >
                🏆 ランキング
              </button>
              
              <div className="grid grid-cols-2 gap-2 mt-2 sm:mt-4">
                <button
                  onClick={onBackToDashboard}
                  className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-1.5 sm:py-2 px-2 sm:px-4 rounded transition-colors text-xs sm:text-sm"
                >
                  ゲーム選択に戻る
                </button>
                <button
                  onClick={onBackToTop}
                  className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 sm:py-2 px-2 sm:px-4 rounded transition-colors text-xs sm:text-sm"
                >
                  トップページに戻る
                </button>
              </div>
            </div>
            
            {/* モバイル横向き表示用のヒント */}
            {isMobile && (
              <div className="mt-3 text-xs text-gray-300">
                <p>※ スマートフォンの場合は横向きにすると遊びやすいです</p>
              </div>
            )}
          </div>
        </div>

        {/* ランキングモーダル */}
        <GameRankingModal
          isOpen={showRanking}
          onClose={() => setShowRanking(false)}
          gameId="nag-won"
          stageId={selectedStageId}
        />
      </div>
    );
  }

  // ゲーム終了画面
  if (isGameOver) {
    return (
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-40">
        <div className="bg-black bg-opacity-70 p-4 sm:p-8 rounded-lg max-w-md mx-auto text-white text-center">
          <div className="relative">
            <button 
              onClick={toggleGamePause}
              className="absolute top-0 right-0 bg-gray-700 hover:bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
              aria-label="閉じる"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">ゲーム終了！</h2>
            <p className="text-2xl sm:text-4xl font-bold text-yellow-400 mb-3 sm:mb-6">{score} ポイント</p>
            <p className="mb-3 sm:mb-6 text-sm sm:text-base">
              おつかれさまでした！<br />
              もう一度プレイして、より高いスコアに挑戦しましょう！
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={onRestart}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 sm:py-2 px-2 sm:px-4 rounded transition-colors text-xs sm:text-sm"
              >
                もう一度プレイ
              </button>
              <button
                onClick={() => setShowRanking(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1.5 sm:py-2 px-2 sm:px-4 rounded transition-colors text-xs sm:text-sm"
              >
                🏆 ランキング
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onBackToDashboard}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1.5 sm:py-2 px-2 sm:px-4 rounded transition-colors text-xs sm:text-sm"
              >
                ゲーム選択
              </button>
              <button
                onClick={onBackToTop}
                className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 sm:py-2 px-2 sm:px-4 rounded transition-colors text-xs sm:text-sm"
              >
                トップへ
              </button>
            </div>
          </div>
        </div>

        {/* ランキングモーダル */}
        <GameRankingModal
          isOpen={showRanking}
          onClose={() => setShowRanking(false)}
          gameId="nag-won"
          stageId={selectedStageId}
        />
      </div>
    );
  }

  // ゲームプレイ中のUI
  return (
    <>
      {/* スコア表示 - 右上 */}
      <div className="absolute top-4 right-4 z-30">
        <div className="bg-black bg-opacity-70 p-2 sm:p-3 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-lg mr-2 sm:mr-3">スコア:</span>
            <span className="text-base sm:text-2xl font-bold text-yellow-400">{score}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm sm:text-lg mr-2 sm:mr-3">残り時間:</span>
            <span className={`text-base sm:text-xl font-bold ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {timeRemaining}
            </span>
          </div>
        </div>
      </div>
      
      {/* メニューボタン - 左上 (モバイル向け) */}
      {isMobile && (
        <button 
          onClick={toggleGamePause}
          className="absolute top-2 left-2 z-30 bg-gray-800 bg-opacity-80 p-2 rounded-full w-10 h-10 flex items-center justify-center touch-manipulation"
          aria-label="メニュー"
          data-ui-element="menu-button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      
      {/* タイトルバー - 中央に表示 */}
      {isGameActive && (
        <div className="absolute top-2 left-0 right-0 p-2 z-10 flex justify-center items-center pointer-events-none">
          <div className="bg-black bg-opacity-80 text-white px-3 py-1.5 rounded text-xs shadow-md mx-auto">
            <span className="font-bold">Nag-Won メタバースゲーム</span>
            <span className="ml-2 text-xs opacity-80">{selectedStageId === 'forest' ? '森林' : selectedStageId === 'volcano' ? '火山' : 'サイバーシティ'}</span>
          </div>
        </div>
      )}
      
      {/* ESCキーヒント - PCのみ表示 */}
      {!isMobile && (
        <div className="absolute bottom-4 right-4 z-30">
          <div className="bg-gray-800 bg-opacity-70 px-3 py-1 rounded text-xs sm:text-sm text-gray-300">
            ESCでメニュー表示
          </div>
        </div>
      )}
      
      {/* モバイル操作ボタンのヒント - 最初の数秒間だけ表示 */}
      {isMobile && isGameActive && (
        <ControlHint />
      )}
    </>
  );
}

// モバイル用操作ヒントコンポーネント（一時的に表示）
const ControlHint = () => {
  const [show, setShow] = useState(true);
  
  useEffect(() => {
    // 5秒後にヒントを非表示
    const timer = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  
  if (!show) return null;
  
  return (
    <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-black bg-opacity-90 p-3 rounded-lg text-white text-xs max-w-[300px] border border-white border-opacity-20">
      <div className="text-center mb-2 font-bold text-yellow-400">操作ガイド</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-blue-600 mr-2 flex-shrink-0"></span>
          <span>移動（左下）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-green-600 mr-2 flex-shrink-0"></span>
          <span>視点（スワイプ）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-blue-600 mr-2 flex-shrink-0"></span>
          <span>ジャンプ（右下）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-red-600 mr-2 flex-shrink-0"></span>
          <span>ダッシュ（右下）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-gray-600 mr-2 flex-shrink-0"></span>
          <span>ズーム（左上）</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-gray-800 mr-2 flex-shrink-0"></span>
          <span>ピンチズーム</span>
        </div>
      </div>
    </div>
  );
}; 