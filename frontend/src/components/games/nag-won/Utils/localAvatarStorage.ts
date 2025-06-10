import { LocalAvatarConfig, LocalAvatarDB } from './avatarTypes';

export class LocalAvatarStorage {
  private dbName = 'nag-won-local-avatars';
  private version = 1;
  private storeName = 'avatars';
  private db: IDBDatabase | null = null;

  // IndexedDBを初期化
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDBの初期化に失敗:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDBが正常に初期化されました');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // オブジェクトストアが存在しない場合は作成
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // インデックスを作成
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('uploadDate', 'uploadDate', { unique: false });
          store.createIndex('fileSize', 'fileSize', { unique: false });
          
          console.log('オブジェクトストアが作成されました');
        }
      };
    });
  }

  // アバターを保存
  async saveAvatar(avatar: LocalAvatarConfig): Promise<void> {
    try {
      const db = await this.initDB();
      
      // LocalAvatarConfigからIndexedDB用のデータを作成
      const dbData: LocalAvatarDB = {
        id: avatar.id,
        name: avatar.name,
        fileBlob: avatar.fileBlob,
        validAnimations: avatar.validAnimations,
        uploadDate: avatar.uploadDate,
        fileSize: avatar.fileSize,
        thumbnail: avatar.thumbnail,
        scale: avatar.scale,
        heightOffset: avatar.heightOffset
      };

      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put(dbData);
        
        request.onsuccess = () => {
          console.log(`アバターが保存されました: ${avatar.name}`);
          resolve();
        };
        
        request.onerror = () => {
          console.error('アバター保存に失敗:', request.error);
          reject(request.error);
        };
      });

      // ストレージサイズの確認と最適化
      await this.optimizeStorage();
      
    } catch (error) {
      console.error('アバター保存中にエラーが発生:', error);
      throw new Error(`アバターの保存に失敗しました: ${error}`);
    }
  }

  // 保存済みアバターを取得
  async getAvatars(): Promise<LocalAvatarConfig[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = async () => {
          const avatarsData: LocalAvatarDB[] = request.result;
          const avatars: LocalAvatarConfig[] = [];

          for (const data of avatarsData) {
            try {
              // Blob URLを生成
              const blobUrl = await this.generateBlobUrl(data.fileBlob);
              
              const avatar: LocalAvatarConfig = {
                id: data.id,
                name: data.name,
                type: 'local',
                fileBlob: data.fileBlob,
                blobUrl: blobUrl,
                fileSize: data.fileSize,
                uploadDate: data.uploadDate,
                validAnimations: data.validAnimations,
                thumbnail: data.thumbnail,
                scale: data.scale,
                heightOffset: data.heightOffset
              };
              
              avatars.push(avatar);
            } catch (error) {
              console.warn(`アバターの復元に失敗 (${data.id}):`, error);
              // 破損したデータは除外
            }
          }

          console.log(`${avatars.length}個のローカルアバターを読み込みました`);
          resolve(avatars);
        };
        
        request.onerror = () => {
          console.error('アバター取得に失敗:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('アバター取得中にエラーが発生:', error);
      return [];
    }
  }

  // 特定のアバターを取得
  async getAvatar(id: string): Promise<LocalAvatarConfig | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = async () => {
          const data: LocalAvatarDB | undefined = request.result;
          
          if (!data) {
            resolve(null);
            return;
          }

          try {
            const blobUrl = await this.generateBlobUrl(data.fileBlob);
            
            const avatar: LocalAvatarConfig = {
              id: data.id,
              name: data.name,
              type: 'local',
              fileBlob: data.fileBlob,
              blobUrl: blobUrl,
              fileSize: data.fileSize,
              uploadDate: data.uploadDate,
              validAnimations: data.validAnimations,
              thumbnail: data.thumbnail,
              scale: data.scale,
              heightOffset: data.heightOffset
            };
            
            resolve(avatar);
          } catch (error) {
            console.warn(`アバターの復元に失敗 (${id}):`, error);
            resolve(null);
          }
        };
        
        request.onerror = () => {
          console.error('アバター取得に失敗:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('アバター取得中にエラーが発生:', error);
      return null;
    }
  }

  // アバターを削除
  async deleteAvatar(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      
      // まず該当アバターを取得してBlob URLをクリーンアップ
      const avatar = await this.getAvatar(id);
      if (avatar) {
        this.revokeBlobUrl(avatar.blobUrl);
      }

      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        
        request.onsuccess = () => {
          console.log(`アバターが削除されました: ${id}`);
          resolve();
        };
        
        request.onerror = () => {
          console.error('アバター削除に失敗:', request.error);
          reject(request.error);
        };
      });

    } catch (error) {
      console.error('アバター削除中にエラーが発生:', error);
      throw new Error(`アバターの削除に失敗しました: ${error}`);
    }
  }

  // Blob URLを生成（適切なクリーンアップ付き）
  async generateBlobUrl(blob: Blob): Promise<string> {
    try {
      // BlobをvalidateしてからURL生成
      if (!blob || blob.size === 0) {
        throw new Error('無効なBlobデータです');
      }

      const blobUrl = URL.createObjectURL(blob);
      
      // メモリリークを防ぐため、一定時間後に自動クリーンアップ
      // ただし、ゲーム中は保持する必要があるため長めに設定
      setTimeout(() => {
        this.revokeBlobUrl(blobUrl);
      }, 30 * 60 * 1000); // 30分

      return blobUrl;
    } catch (error) {
      console.error('Blob URL生成に失敗:', error);
      throw new Error('Blob URLの生成に失敗しました');
    }
  }

  // Blob URLをクリーンアップ
  revokeBlobUrl(blobUrl: string): void {
    try {
      URL.revokeObjectURL(blobUrl);
      console.log('Blob URLがクリーンアップされました');
    } catch (error) {
      console.warn('Blob URLクリーンアップに失敗:', error);
    }
  }

  // ストレージ最適化（サイズ制限と古いデータの削除）
  private async optimizeStorage(): Promise<void> {
    try {
      const maxAvatars = 15; // 最大15個のアバター
      const maxTotalSize = 300 * 1024 * 1024; // 300MB制限

      const avatars = await this.getAvatars();
      
      // サイズ順でソート（大きいものから）
      avatars.sort((a, b) => b.fileSize - a.fileSize);
      
      let totalSize = avatars.reduce((sum, avatar) => sum + avatar.fileSize, 0);
      const avatarsToDelete: string[] = [];

      // 数量制限チェック
      if (avatars.length > maxAvatars) {
        const excess = avatars.slice(maxAvatars);
        avatarsToDelete.push(...excess.map(avatar => avatar.id));
      }

      // サイズ制限チェック
      if (totalSize > maxTotalSize) {
        for (let i = avatars.length - 1; i >= 0 && totalSize > maxTotalSize; i--) {
          const avatar = avatars[i];
          if (!avatarsToDelete.includes(avatar.id)) {
            avatarsToDelete.push(avatar.id);
            totalSize -= avatar.fileSize;
          }
        }
      }

      // 削除実行
      for (const id of avatarsToDelete) {
        await this.deleteAvatar(id);
        console.log(`ストレージ最適化により削除: ${id}`);
      }

      if (avatarsToDelete.length > 0) {
        console.log(`ストレージ最適化完了: ${avatarsToDelete.length}個のアバターを削除`);
      }

    } catch (error) {
      console.error('ストレージ最適化中にエラー:', error);
      // 最適化の失敗は致命的ではないので継続
    }
  }

  // ストレージ使用量を取得
  async getStorageUsage(): Promise<{
    avatarCount: number;
    totalSize: number;
    averageSize: number;
  }> {
    try {
      const avatars = await this.getAvatars();
      const totalSize = avatars.reduce((sum, avatar) => sum + avatar.fileSize, 0);
      
      return {
        avatarCount: avatars.length,
        totalSize: totalSize,
        averageSize: avatars.length > 0 ? totalSize / avatars.length : 0
      };
    } catch (error) {
      console.error('ストレージ使用量取得に失敗:', error);
      return {
        avatarCount: 0,
        totalSize: 0,
        averageSize: 0
      };
    }
  }

  // IndexedDBをクリア（開発・テスト用）
  async clearAll(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('すべてのローカルアバターが削除されました');
          resolve();
        };
        
        request.onerror = () => {
          console.error('アバタークリアに失敗:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('アバタークリア中にエラーが発生:', error);
      throw new Error('アバターのクリアに失敗しました');
    }
  }

  // データベース接続をクローズ
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('IndexedDB接続がクローズされました');
    }
  }
}

// シングルトンインスタンス
export const localAvatarStorage = new LocalAvatarStorage();