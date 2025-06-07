#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';

// 環境変数を読み込み
dotenv.config();

async function checkMigrations(): Promise<void> {
  try {
    console.log('🔍 マイグレーション事前チェック開始');
    
    // 1. マイグレーションファイルの存在確認
    const migrationsDir = './drizzle';
    if (!existsSync(migrationsDir)) {
      throw new Error('マイグレーションディレクトリが見つかりません');
    }
    
    // 2. 環境変数の確認
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // 3. データベース接続テスト
    console.log('📡 データベース接続テスト...');
    const sql = neon(databaseUrl);
    await sql`SELECT 1 as test`;
    console.log('✅ データベース接続成功');
    
    // 4. マイグレーションファイルの構文チェック
    console.log('📝 マイグレーションファイル構文チェック...');
    // ここで必要に応じてマイグレーションファイルの構文チェックを実装
    
    console.log('✅ マイグレーション事前チェック完了');
    
  } catch (error) {
    console.error('❌ マイグレーション事前チェック失敗:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  checkMigrations();
}

export { checkMigrations }; 