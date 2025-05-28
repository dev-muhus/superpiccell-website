import React, { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, MathUtils } from 'three';
import { useCameraStore } from '../Utils/stores';

interface CameraSystemProps {
  target: React.RefObject<THREE.Group>;
}

export const CameraSystem: React.FC<CameraSystemProps> = ({
  target
}) => {
  // カメラ設定
  const config = {
    thirdPerson: {
      distance: 8, // 初期距離をさらに増加（5→8）
      minDistance: 2.0, // 最小距離を増加（1.0→2.0）
      maxDistance: 30.0, // 最大距離を増加（20→30）
      heightOffset: 4.0, // 高さオフセット
      smoothing: 0.9,
      pitchRange: [-Math.PI / 2, Math.PI / 3],
      followSpeed: 25.0,
      centerOffset: new Vector3(0, 0, 0),
    },
    firstPerson: {
      eyeHeight: 0.7,
      smoothing: 0.95,
    },
    drone: {
      height: 20,
      distance: 0,
      smoothing: 0.8,
    }
  };

  // 状態管理
  const { camera } = useThree();
  const {
    rotation,
    zoom,
    cameraMode,
    setCameraMode,
    setZoom
  } = useCameraStore();

  // 初期ズーム値を設定
  useEffect(() => {
    // ゲーム開始時は少しズームアウトした状態にする
    // zoom値は0～1の範囲で、0が最大距離（ズームアウト）、1が最小距離（ズームイン）
    setZoom(0.3); // 初期値を0.3に設定（より遠くからの視点に）
  }, [setZoom]);

  // カメラ操作の実装
  useFrame((_, delta) => {
    if (!target.current) return;

    // ターゲットの位置を取得
    const targetPosition = target.current.position.clone();
    
    // 現在のモードでカメラを更新
    switch (cameraMode) {
      case 'thirdPerson':
        updateThirdPersonCamera(targetPosition, delta);
        break;
      case 'firstPerson':
        updateFirstPersonCamera(targetPosition);
        break;
      case 'drone':
        updateDroneCamera(targetPosition, delta);
        break;
    }
  });

  // サードパーソンカメラ更新
  const updateThirdPersonCamera = (targetPosition: Vector3, delta: number) => {
    const settings = config.thirdPerson;
    
    // 実際の距離をズーム値に基づいて調整（指数関数的にマッピング）
    const actualDistance = settings.minDistance + (settings.maxDistance - settings.minDistance) * (1 - zoom) * (1 - zoom);
    
    // ヘッド位置を計算（アバターの頭部を追従）
    const headPosition = targetPosition.clone().add(
      new Vector3(0, settings.heightOffset, 0)
    ).add(settings.centerOffset);
    
    // 垂直角度を制限
    const clampedPitchX = MathUtils.clamp(
      rotation.x,
      settings.pitchRange[0],
      settings.pitchRange[1]
    );
    
    // カメラの理想位置を計算（数学的に正確な球面座標変換）
    const idealOffset = new Vector3(
      Math.sin(rotation.y) * actualDistance * Math.cos(clampedPitchX),
      Math.sin(clampedPitchX) * actualDistance,
      Math.cos(rotation.y) * actualDistance * Math.cos(clampedPitchX)
    );
    
    // 理想的なカメラ位置
    const idealPosition = headPosition.clone().sub(idealOffset);
    
    // スムージングを適用（より高精度なスムージング計算）
    const smoothFactor = 1.0 - Math.pow(settings.smoothing, delta * 60);
    camera.position.lerp(idealPosition, Math.min(settings.followSpeed * delta, smoothFactor));
    
    // カメラをターゲットに向ける
    camera.lookAt(headPosition);

    // コンソールにカメラ情報を出力（デバッグ用）
    // console.log(`Camera: zoom=${zoom.toFixed(2)}, distance=${actualDistance.toFixed(2)}`);
  };

  // ファーストパーソンカメラ更新
  const updateFirstPersonCamera = (targetPosition: Vector3) => {
    const settings = config.firstPerson;
    
    // 目の高さ位置を計算（より正確な位置決め）
    const eyePosition = targetPosition.clone().add(new Vector3(0, settings.eyeHeight, 0));
    
    // カメラ位置を目の位置に設定
    camera.position.copy(eyePosition);
    
    // 視線方向を設定（オイラー回転順序に注意）
    camera.rotation.set(
      rotation.x,
      rotation.y,
      0,
      'YXZ'
    );
  };

  // ドローンカメラ更新
  const updateDroneCamera = (targetPosition: Vector3, delta: number) => {
    const settings = config.drone;
    
    // 高所からの俯瞰位置を計算
    const dronePosition = targetPosition.clone().add(
      new Vector3(0, settings.height, 0)
    );
    
    // スムージングを適用
    camera.position.lerp(dronePosition, 1.0 - Math.pow(settings.smoothing, delta * 60));
    
    // 真下を向く
    camera.lookAt(targetPosition);
  };

  // モード切替の処理
  useEffect(() => {
    const handleModeToggle = (e: KeyboardEvent) => {
      if (e.code === 'KeyV') {
        const modes: Array<'thirdPerson' | 'firstPerson' | 'drone'> = 
          ['thirdPerson', 'firstPerson', 'drone'];
        const currentIndex = modes.indexOf(cameraMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setCameraMode(modes[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleModeToggle);
    return () => window.removeEventListener('keydown', handleModeToggle);
  }, [cameraMode, setCameraMode]);

  // ズーム処理の実装
  useEffect(() => {
    // マウスホイールでズーム調整
    const handleWheel = (e: WheelEvent) => {
      if (cameraMode !== 'thirdPerson') return;
      
      const zoomSpeed = 0.15; // ズーム速度を上げる
      const delta = e.deltaY < 0 ? zoomSpeed : -zoomSpeed;
      const newZoom = MathUtils.clamp(
        zoom + delta,
        0, // 最小ズーム（最大距離）
        1  // 最大ズーム（最小距離）
      );
      
      setZoom(newZoom);
      // デフォルトのスクロール動作を防止
      e.preventDefault();
    };

    // モバイル用ズーム変更イベント
    const handleZoomChange = (event: CustomEvent) => {
      if (cameraMode !== 'thirdPerson') return;
      
      const { delta } = event.detail;
      const newZoom = MathUtils.clamp(
        zoom + delta,
        0, // 最小ズーム（最大距離）
        1  // 最大ズーム（最小距離）
      );
      
      setZoom(newZoom);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('zoom-change', handleZoomChange as EventListener);
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('zoom-change', handleZoomChange as EventListener);
    };
  }, [zoom, cameraMode, setZoom]);

  return null; // このコンポーネントは視覚的要素を持たない
}; 