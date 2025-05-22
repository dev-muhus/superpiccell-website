import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore, useCameraStore } from '../Utils/stores';
import { InputKeyMap } from '../Utils/types';

interface InputManagerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const InputManager: React.FC<InputManagerProps> = ({ canvasRef }) => {
  const { setInput } = usePlayerStore();
  const { rotation, setRotation, pointerLocked, setPointerLocked } = useCameraStore();
  
  // ESCキーを押した時間を追跡するための参照
  const escKeyPressTimeRef = useRef<number>(0);
  
  // 前回のポインターロック状態
  const prevPointerLockedRef = useRef<boolean>(false);
  
  // ポインターロックリクエスト中フラグ
  const pointerLockRequestPendingRef = useRef<boolean>(false);
  
  // タッチ操作追跡用
  const [isMobile, setIsMobile] = useState(false);
  const touchStartPosition = useRef<{ x: number, y: number } | null>(null);
  const lastTouchPosition = useRef<{ x: number, y: number } | null>(null);

  // モバイルデバイス検出
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileDevices = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i;
      setIsMobile(mobileDevices.test(userAgent) || window.innerWidth < 768);
    };
    
    // 初期チェック
    checkIfMobile();
    
    // リサイズイベントでチェック
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // マウス操作の処理 - 感度設定と異常値の検出を追加
  useEffect(() => {
    // マウス移動時の処理
    const handleMouseMove = (e: MouseEvent) => {
      // ポインターがロックされていない場合は何もしない
      if (!pointerLocked) return;
      
      // 前回のポインターロック状態と現在の状態を比較
      if (pointerLocked && !prevPointerLockedRef.current) {
        // ポインターロックを取得した直後の場合、初回のマウス移動イベントをスキップ
        prevPointerLockedRef.current = true;
        return;
      }
      
      // マウス感度設定
      const sensitivity = 0.003; // 感度を少し上げる
      
      // 異常な移動量を検出（大きすぎる値）
      const isAbnormalMovement = Math.abs(e.movementX) > 100 || Math.abs(e.movementY) > 100;
      
      // 異常な移動量の場合はスキップ
      if (isAbnormalMovement) return;
      
      // 新しい回転角度を計算（垂直方向を正しく設定）
      let newX = rotation.x - e.movementY * sensitivity; // 上下方向は逆（-）
      const newY = rotation.y + e.movementX * sensitivity; // 左右方向は正しい
      
      // 垂直方向の制限 (-85° ~ 85°) 
      newX = Math.max(-Math.PI * 0.47, Math.min(Math.PI * 0.47, newX));
      
      setRotation(newX, newY);
    };

    // タッチによるカメラ回転の処理
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // 仮想ジョイスティックエリア外のタッチのみ処理
        const touch = e.touches[0];
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        
        // 画面の左側は仮想ジョイスティック領域なのでスキップ
        if (touchX < window.innerWidth * 0.3 && touchY > window.innerHeight * 0.5) {
          return;
        }
        
        // 画面右下はジャンプとダッシュボタン領域なのでスキップ
        if (touchX > window.innerWidth * 0.7 && touchY > window.innerHeight * 0.7) {
          return;
        }
        
        // タッチ開始位置を記録
        touchStartPosition.current = { x: touchX, y: touchY };
        lastTouchPosition.current = { x: touchX, y: touchY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && touchStartPosition.current && lastTouchPosition.current) {
        const touch = e.touches[0];
        
        // 移動量を計算
        const movementX = touch.clientX - lastTouchPosition.current.x;
        const movementY = touch.clientY - lastTouchPosition.current.y;
        
        // 最後のタッチ位置を更新
        lastTouchPosition.current = { x: touch.clientX, y: touch.clientY };
        
        // マウス感度より高い感度でタッチ操作
        const touchSensitivity = 0.005;
        
        // 新しい回転角度を計算
        let newX = rotation.x - movementY * touchSensitivity;
        const newY = rotation.y + movementX * touchSensitivity;
        
        // 垂直方向の制限
        newX = Math.max(-Math.PI * 0.47, Math.min(Math.PI * 0.47, newX));
        
        setRotation(newX, newY);
      }
    };

    const handleTouchEnd = () => {
      touchStartPosition.current = null;
      lastTouchPosition.current = null;
    };

    // PC向けイベントリスナー
    if (!isMobile) {
      document.addEventListener('mousemove', handleMouseMove);
    }
    
    // モバイル向けイベントリスナー
    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [pointerLocked, rotation, setRotation, isMobile]);

  // ポインターロックの処理とマウスクリック操作の処理
  useEffect(() => {
    // 現在のcanvasRefを変数に保存
    const currentCanvas = canvasRef.current;
    
    // ポインターロック状態変更の検出
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === currentCanvas;
      setPointerLocked(isLocked);
      prevPointerLockedRef.current = isLocked;
      pointerLockRequestPendingRef.current = false;
      
      // ロック解除された場合にESCキープレス時間をリセット
      if (!isLocked) {
        escKeyPressTimeRef.current = 0;
      }
    };
    
    // ポインターロックエラーの処理
    const handlePointerLockError = () => {
      setPointerLocked(false);
      prevPointerLockedRef.current = false;
      pointerLockRequestPendingRef.current = false;
    };
    
    // キャンバスクリック時の処理
    const handleCanvasClick = () => {
      // モバイルの場合はポインターロックを使用しない
      if (isMobile) return;
      
      if (!pointerLocked && currentCanvas && !pointerLockRequestPendingRef.current) {
        try {
          // ポインターロックリクエスト中フラグを立てる
          pointerLockRequestPendingRef.current = true;
          
          // 短い遅延を入れてポインターロックをリクエスト（ブラウザの制限回避）
          setTimeout(() => {
            if (currentCanvas && !document.pointerLockElement) {
              currentCanvas.requestPointerLock();
            }
          }, 50);
        } catch {
          pointerLockRequestPendingRef.current = false;
        }
      }
    };
    
    // イベントリスナーの登録
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    if (currentCanvas) {
      currentCanvas.addEventListener('click', handleCanvasClick);
    }
    
    // クリーンアップ
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      if (currentCanvas) {
        currentCanvas.removeEventListener('click', handleCanvasClick);
      }
    };
  }, [canvasRef, pointerLocked, setPointerLocked, isMobile]);

  // 右クリックメニューの無効化
  useEffect(() => {
    // 現在のcanvasRefを変数に保存
    const currentCanvas = canvasRef.current;
    
    const handleContextMenu = (event: MouseEvent) => {
      // ゲーム内での右クリックメニューを防止
      if (pointerLocked || (currentCanvas && currentCanvas.contains(event.target as Node))) {
        event.preventDefault();
      }
    };
    
    // イベントリスナーの登録
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [pointerLocked, canvasRef]);

  // キーボード入力の処理
  useEffect(() => {
    // キーコードとアクションのマッピング
    const keyMap: InputKeyMap = {
      'KeyW': 'forward',
      'ArrowUp': 'forward',
      'KeyS': 'backward',
      'ArrowDown': 'backward',
      'KeyA': 'left',
      'ArrowLeft': 'left',
      'KeyD': 'right',
      'ArrowRight': 'right',
      'Space': 'jump',
      'ShiftLeft': 'sprint',
      'ShiftRight': 'sprint'
    };
    
    // キー押下時の処理
    const handleKeyDown = (event: KeyboardEvent) => {
      // キーがマッピングに含まれる場合
      if (event.code in keyMap) {
        const action = keyMap[event.code];
        setInput(action, true);
        
        // spaceキーのブラウザデフォルト動作をキャンセル
        if (event.code === 'Space') {
          event.preventDefault();
        }
      }
      
      // ESCキーの処理を改善
      if (event.code === 'Escape') {
        // ポインターロックが有効な場合は、まずロックを解除
        if (pointerLocked) {
          document.exitPointerLock();
          // 現在時刻を記録
          escKeyPressTimeRef.current = Date.now();
        } else {
          // ポインターロックが解除されている場合
          const timeSinceLastEsc = Date.now() - escKeyPressTimeRef.current;
          
          // 直前のESCキー押下から500ms以上経過している場合、またはESCが初めて押された場合
          if (timeSinceLastEsc > 500 || escKeyPressTimeRef.current === 0) {
            // メニュー表示イベントを発火
            window.dispatchEvent(new CustomEvent('game-escape'));
          }
          // 時間をリセット
          escKeyPressTimeRef.current = 0;
        }
      }
    };
    
    // キー解放時の処理
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code in keyMap) {
        const action = keyMap[event.code];
        setInput(action, false);
      }
    };
    
    // キャプチャフェーズで処理（他のイベントよりも優先）
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    
    // クリーンアップ
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [setInput, pointerLocked]);

  return null; // このコンポーネントは視覚的要素を持たない
}; 