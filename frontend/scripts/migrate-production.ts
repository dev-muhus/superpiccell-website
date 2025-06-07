#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

// 環境変数を読み込み
dotenv.config({ path: '.env.production' });

interface MigrationConfirmation {
  environment: string;
  timestamp: string;
  actor: string;
  confirmed: boolean;
}

async function confirmMigration(): Promise<MigrationConfirmation> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const confirmation: MigrationConfirmation = {
    environment: 'production',
    timestamp: new Date().toISOString(),
    actor: process.env.USER || 'unknown',
    confirmed: false
  };

  console.log('\n🚨 本番データベースマイグレーション実行確認 🚨');
  console.log('==========================================');
  console.log(`環境: ${confirmation.environment}`);
  console.log(`実行者: ${confirmation.actor}`);
  console.log(`実行時刻: ${confirmation.timestamp}`);
  console.log('==========================================\n');

  const answer = await new Promise<string>((resolve) => {
    rl.question('本番データベースにマイグレーションを実行しますか？ (yes/no): ', resolve);
  });

  rl.close();

  if (answer.toLowerCase() === 'yes') {
    confirmation.confirmed = true;
    console.log('✅ マイグレーション実行が確認されました\n');
  } else {
    console.log('❌ マイグレーション実行がキャンセルされました\n');
  }

  return confirmation;
}

async function validateEnvironment(): Promise<void> {
  console.log('🔍 環境検証を実行中...');
  
  // 必要な環境変数の確認
  const requiredEnvVars = ['DATABASE_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`必要な環境変数が設定されていません: ${missingVars.join(', ')}`);
  }

  // 本番環境のURLパターンを確認
  const dbUrl = process.env.DATABASE_URL!;
  if (!dbUrl.includes('neon.tech') && !dbUrl.includes('aws.neon.tech')) {
    console.warn('⚠️  警告: データベースURLが本番環境のパターンと一致しません');
  }

  console.log('✅ 環境検証完了');
}

async function createMigrationLog(confirmation: MigrationConfirmation, success: boolean, error?: Error): Promise<void> {
  const logEntry = {
    timestamp: confirmation.timestamp,
    environment: confirmation.environment,
    actor: confirmation.actor,
    success,
    error: error?.message,
    commit: process.env.GIT_COMMIT || 'unknown'
  };

  console.log('\n📋 マイグレーションログ:');
  console.log(JSON.stringify(logEntry, null, 2));
}

async function verifyMigrationResult(sql: any, db: any): Promise<void> {
  console.log('🔍 マイグレーション結果検証中...');
  
  try {
    // 最新のマイグレーション履歴を取得
    const migrationHistory = await sql`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY created_at DESC 
      LIMIT 3
    `;
    
    console.log('📋 最新のマイグレーション履歴:');
    migrationHistory.forEach((migration: any, index: number) => {
      console.log(`  ${index + 1}. ${migration.hash.substring(0, 50)}... (${migration.created_at})`);
    });
    
    // usersテーブルのスキーマ確認
    const userColumns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📊 usersテーブルの現在のスキーマ:');
    userColumns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // cover_image_urlカラムの存在確認
    const hasCoverImageUrl = userColumns.some((col: any) => col.column_name === 'cover_image_url');
    if (hasCoverImageUrl) {
      console.log('\n✅ cover_image_urlカラムが正常に追加されました');
    } else {
      throw new Error('cover_image_urlカラムが見つかりません - マイグレーションが正常に完了していない可能性があります');
    }
    
    console.log('✅ マイグレーション結果検証完了');
    
  } catch (error) {
    console.error('❌ マイグレーション結果検証失敗:', error);
    throw error;
  }
}

async function runProductionMigration(): Promise<void> {
  const startTime = Date.now();
  let confirmation: MigrationConfirmation;
  
  try {
    console.log('🚀 本番データベースマイグレーション開始');
    console.log(`📅 開始時刻: ${new Date().toISOString()}`);
    
    // 環境検証
    await validateEnvironment();
    
    // ユーザー確認
    confirmation = await confirmMigration();
    if (!confirmation.confirmed) {
      process.exit(0);
    }
    
    // データベース接続
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('🔗 本番データベースに接続中...');
    const sql = neon(databaseUrl);
    const db = drizzle(sql);
    
    // 接続テスト
    console.log('📡 接続テスト実行中...');
    await sql`SELECT 1 as test`;
    console.log('✅ データベース接続成功');
    
    // マイグレーション前の状態確認
    console.log('📊 マイグレーション前の状態確認...');
    try {
      const preColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
      `;
      console.log(`現在のusersテーブルカラム数: ${preColumns.length}`);
    } catch (error) {
      console.log('状態確認をスキップ（テーブルが存在しない可能性）');
    }
    
    // マイグレーション実行
    console.log('🔄 マイグレーション実行中...');
    await migrate(db, { migrationsFolder: './drizzle' });
    
    // マイグレーション結果検証
    await verifyMigrationResult(sql, db);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('✅ 本番データベースマイグレーション完了!');
    console.log(`⏱️  実行時間: ${duration} 秒`);
    
    // 成功ログ
    await createMigrationLog(confirmation, true);
    
  } catch (error) {
    console.error('❌ マイグレーション失敗:', error);
    
    if (error instanceof Error) {
      console.error('📝 エラー詳細:', error.message);
      console.error('🔍 スタックトレース:', error.stack);
    }
    
    // 失敗ログ
    if (confirmation!) {
      await createMigrationLog(confirmation, false, error as Error);
    }
    
    console.error('\n🚨 重要: 本番データベースマイグレーションが失敗しました!');
    console.error('🛠️  即座に調査と対応が必要です。');
    console.error('🔧 修復が必要な場合は migrate-production-repair.ts スクリプトを実行してください。');
    
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  runProductionMigration();
}

export { runProductionMigration }; 