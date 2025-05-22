import { create } from 'zustand';
import { Vector3 } from 'three';
import { CameraState, PlayerState, GameSettingsState } from './types';
import { AVATAR_MODELS, GAME_STAGES } from './config';
import { persist, PersistStorage, StorageValue } from 'zustand/middleware';

// カメラ状態管理
export const useCameraStore = create<CameraState>((set) => ({
  rotation: { x: 0, y: 0 },
  zoom: 1,
  pointerLocked: false,
  cameraMode: 'thirdPerson',
  
  setRotation: (x, y) => set({ rotation: { x, y } }),
  setZoom: (zoom) => set({ zoom }),
  setPointerLocked: (locked) => set({ pointerLocked: locked }),
  setCameraMode: (mode) => set({ cameraMode: mode })
}));

// プレイヤー状態管理
export const usePlayerStore = create<PlayerState>((set) => ({
  position: new Vector3(0, 1, 0),
  velocity: new Vector3(0, 0, 0),
  onGround: true,
  animationState: 'idle',
  inputs: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  },
  
  setPosition: (position) => set({ position }),
  setVelocity: (velocity) => set({ velocity }),
  setOnGround: (onGround) => set({ onGround }),
  setAnimationState: (animationState) => set({ animationState }),
  setInput: (input, value) => set((state) => ({
    inputs: { ...state.inputs, [input]: value }
  }))
}));

// ローカルストレージのカスタムストレージオブジェクト
const safeJsonStorage: PersistStorage<unknown> = {
  getItem: (name: string) => {
    try {
      const value = localStorage.getItem(name);
      if (!value) return null;
      
      const parsed = JSON.parse(value);
      
      // バリデーション - 保存されたデータが有効かチェック
      if (typeof parsed !== 'object' || parsed === null) {
        console.warn('無効なストレージデータ:', parsed);
        return null;
      }
      
      // アバターIDがまだ存在するか確認
      if (parsed.state && parsed.state.selectedAvatarId) {
        const avatarExists = AVATAR_MODELS.some(model => model.id === parsed.state.selectedAvatarId);
        if (!avatarExists) {
          console.warn('保存されたアバターIDが見つかりません:', parsed.state.selectedAvatarId);
          parsed.state.selectedAvatarId = AVATAR_MODELS[0].id;
        }
      }
      
      // ステージIDがまだ存在するか確認
      if (parsed.state && parsed.state.selectedStageId) {
        const stageExists = GAME_STAGES.some(stage => stage.id === parsed.state.selectedStageId);
        if (!stageExists) {
          console.warn('保存されたステージIDが見つかりません:', parsed.state.selectedStageId);
          parsed.state.selectedStageId = GAME_STAGES[0].id;
        }
      }
      
      return parsed;
    } catch (error) {
      console.error('ゲーム設定のロード中にエラー:', error);
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<unknown>) => {
    try {
      const valueToStore = typeof value === 'object' ? JSON.stringify(value) : String(value);
      localStorage.setItem(name, valueToStore);
      console.log(`ストアに設定を保存: ${name}`);
    } catch (error) {
      console.error('設定保存中にエラー:', error);
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
      console.log(`ストアから設定を削除: ${name}`);
    } catch (error) {
      console.error('設定削除中にエラー:', error);
    }
  }
};

// ゲーム設定状態管理（ローカルストレージに永続化）
export const useGameSettingsStore = create<GameSettingsState>()(
  persist(
    (set) => ({
      selectedAvatarId: AVATAR_MODELS[0].id,
      selectedStageId: GAME_STAGES[0].id,
      
      setSelectedAvatar: (avatarId: string) => {
        console.log(`アバター選択: ${avatarId}`);
        set({ selectedAvatarId: avatarId });
      },
      setSelectedStage: (stageId: string) => {
        console.log(`ステージ選択: ${stageId}`);
        set({ selectedStageId: stageId });
      },
    }),
    {
      name: 'nag-won-game-settings', // ローカルストレージのキー名
      storage: safeJsonStorage, // カスタムストレージを使用
      version: 1, // バージョン管理
      onRehydrateStorage: () => () => {
        // 再水和処理完了後に呼ばれるコールバック
        // console.log('ゲーム設定の復元完了:', state?.selectedAvatarId);
      },
    }
  )
);

// ストア外部に定義したセレクター関数
// ストアの状態を引数で受け取り、純粋関数として動作させることで循環参照を回避
export const getSelectedAvatar = (state: GameSettingsState) => {
  const avatar = AVATAR_MODELS.find(avatar => avatar.id === state.selectedAvatarId);
  return avatar || AVATAR_MODELS[0];
};

export const getSelectedStage = (state: GameSettingsState) => {
  const stage = GAME_STAGES.find(stage => stage.id === state.selectedStageId);
  return stage || GAME_STAGES[0];
}; 