import { create } from 'zustand';
import { Vector3 } from 'three';
import { CameraState, PlayerState, GameSettingsState } from './types';
import { AVATAR_MODELS, GAME_STAGES } from './config';
import { LocalAvatarConfig } from './avatarTypes';
import { localAvatarStorage } from './localAvatarStorage';
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
    (set, get) => ({
      selectedAvatarId: AVATAR_MODELS[0].id,
      selectedStageId: GAME_STAGES[0].id,
      localAvatars: [], // ローカルアバターリスト初期化
      
      setSelectedAvatar: (avatarId: string) => {
        console.log(`アバター選択: ${avatarId}`);
        set({ selectedAvatarId: avatarId });
      },
      setSelectedStage: (stageId: string) => {
        console.log(`ステージ選択: ${stageId}`);
        set({ selectedStageId: stageId });
      },
      
      // ローカルアバター管理機能
      addLocalAvatar: (avatar: LocalAvatarConfig) => {
        const currentAvatars = get().localAvatars;
        const updatedAvatars = [...currentAvatars, avatar];
        console.log(`ローカルアバター追加: ${avatar.name}`);
        set({ localAvatars: updatedAvatars });
      },
      
      removeLocalAvatar: (avatarId: string) => {
        const currentAvatars = get().localAvatars;
        const updatedAvatars = currentAvatars.filter(avatar => avatar.id !== avatarId);
        console.log(`ローカルアバター削除: ${avatarId}`);
        set({ localAvatars: updatedAvatars });
        
        // 削除されたアバターが選択されていた場合はデフォルトに切り替え
        const currentSelectedId = get().selectedAvatarId;
        if (currentSelectedId === `local:${avatarId}`) {
          console.log('削除されたアバターが選択されていたため、デフォルトアバターに変更');
          set({ selectedAvatarId: AVATAR_MODELS[0].id });
        }
      },
      
      loadLocalAvatars: async () => {
        try {
          console.log('ローカルアバターを読み込み中...');
          const avatars = await localAvatarStorage.getAvatars();
          console.log(`${avatars.length}個のローカルアバターを読み込みました`);
          set({ localAvatars: avatars });
        } catch (error) {
          console.error('ローカルアバターの読み込みに失敗:', error);
          // エラーが発生してもアプリケーションは継続
          set({ localAvatars: [] });
        }
      },
    }),
    {
      name: 'nag-won-game-settings', // ローカルストレージのキー名
      storage: safeJsonStorage, // カスタムストレージを使用
      version: 1, // バージョン管理
      onRehydrateStorage: () => (state) => {
        // 再水和処理完了後に呼ばれるコールバック
        console.log('ゲーム設定の復元完了:', state?.selectedAvatarId);
        
        // ローカルアバターの自動リフレッシュ
        if (state) {
          console.log('ローカルアバターの自動リフレッシュを開始...');
          const refreshLocalAvatars = async () => {
            try {
              const avatars = await localAvatarStorage.getAvatars();
              console.log(`${avatars.length}個のローカルアバターを自動リフレッシュしました`);
              
              // ストア状態を更新
              useGameSettingsStore.setState({ 
                localAvatars: avatars 
              });
              
              // 選択されたローカルアバターが無効になっていないかチェック
              if (state.selectedAvatarId.startsWith('local:')) {
                const localId = state.selectedAvatarId.replace('local:', '');
                const isStillValid = avatars.some(avatar => avatar.id === localId);
                
                if (!isStillValid) {
                  console.warn(`選択されたローカルアバターが無効のため、デフォルトに変更: ${localId}`);
                  useGameSettingsStore.setState({ 
                    selectedAvatarId: AVATAR_MODELS[0].id 
                  });
                }
              }
            } catch (error) {
              console.error('ローカルアバターの自動リフレッシュに失敗:', error);
            }
          };
          
          // 少し遅延させて実行（IndexedDBの初期化を待つ）
          setTimeout(refreshLocalAvatars, 100);
        }
      },
    }
  )
);

// ストア外部に定義したセレクター関数
// ストアの状態を引数で受け取り、純粋関数として動作させることで循環参照を回避
// 選択されたアバターを取得（リアルタイム更新対応）
export const getSelectedAvatar = async (state: GameSettingsState) => {
  // ローカルアバターをチェック（local:プレフィックス付き）
  if (state.selectedAvatarId.startsWith('local:')) {
    const localId = state.selectedAvatarId.replace('local:', '');
    
    // まずストア内から検索
    const localAvatar = state.localAvatars.find(avatar => avatar.id === localId);
    
    // ストア内にない場合は、IndexedDBから直接取得（最新のBlob URLで）
    if (!localAvatar) {
      console.log(`ストア内でローカルアバターが見つからないため、IndexedDBから取得: ${localId}`);
      try {
        const freshAvatar = await localAvatarStorage.getAvatar(localId);
        if (freshAvatar) {
          // ストアを更新
          const updatedAvatars = [...state.localAvatars, freshAvatar];
          useGameSettingsStore.setState({ localAvatars: updatedAvatars });
          return freshAvatar;
        }
      } catch (error) {
        console.error('IndexedDBからのアバター取得に失敗:', error);
      }
    } else {
      // ストア内にある場合も、Blob URLの有効性をチェック
      if (localAvatar.blobUrl && !localAvatar.blobUrl.startsWith('blob:')) {
        console.log(`Blob URLが無効のため、再生成: ${localAvatar.name}`);
        try {
          const refreshedAvatar = await localAvatarStorage.getAvatar(localId);
          if (refreshedAvatar) {
            // ストア内のアバターを更新
            const updatedAvatars = state.localAvatars.map(avatar => 
              avatar.id === localId ? refreshedAvatar : avatar
            );
            useGameSettingsStore.setState({ localAvatars: updatedAvatars });
            return refreshedAvatar;
          }
        } catch (error) {
          console.error('Blob URL再生成に失敗:', error);
        }
      } else {
        return localAvatar;
      }
    }
    
    // ローカルアバターが見つからない場合はデフォルトに戻す
    console.warn(`ローカルアバターが見つかりません: ${localId} - デフォルトアバターにフォールバック`);
    useGameSettingsStore.setState({ selectedAvatarId: AVATAR_MODELS[0].id });
  }
  
  // デフォルトアバターから検索
  const avatar = AVATAR_MODELS.find(avatar => avatar.id === state.selectedAvatarId);
  return avatar || AVATAR_MODELS[0];
};

export const getSelectedStage = (state: GameSettingsState) => {
  const stage = GAME_STAGES.find(stage => stage.id === state.selectedStageId);
  return stage || GAME_STAGES[0];
};

// 全アバター（デフォルト + ローカル）を取得するセレクター
export const getAllAvatars = (state: GameSettingsState) => {
  // デフォルトアバターに type: 'default' を追加
  const defaultAvatars = AVATAR_MODELS.map(avatar => ({
    ...avatar,
    type: 'default' as const
  }));
  
  // ローカルアバターと結合
  return [...defaultAvatars, ...state.localAvatars];
};

// ローカルアバターのみを取得するセレクター
export const getLocalAvatars = (state: GameSettingsState) => {
  return state.localAvatars;
};

// アバターがローカルアバターかどうか判定
export const isLocalAvatarSelected = (state: GameSettingsState): boolean => {
  return state.selectedAvatarId.startsWith('local:');
}; 