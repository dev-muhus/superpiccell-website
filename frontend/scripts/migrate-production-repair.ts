#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// 環境変数を読み込み
dotenv.config({ path: '.env.production' });

async function confirmRepair(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n🔧 本番データベース修復ツール 🔧');
  console.log('==========================================');
  console.log('このツールは以下の作業を実行します:');
  console.log('1. 現在のデータベース状態を確認');
  console.log('2. cover_image_urlカラムの存在をチェック');
  console.log('3. 必要に応じてカラムを手動で追加');
  console.log('4. マイグレーション履歴を修正');
  console.log('==========================================\n');

  const answer = await new Promise<string>((resolve) => {
    rl.question('本番データベースの修復を実行しますか？ (yes/no): ', resolve);
  });

  rl.close();

  if (answer.toLowerCase() === 'yes') {
    console.log('✅ 修復実行が確認されました\n');
    return true;
  } else {
    console.log('❌ 修復実行がキャンセルされました\n');
    return false;
  }
}

async function checkColumnExists(sql: any, tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName} 
      AND column_name = ${columnName}
      AND table_schema = 'public'
    `;
    return result.length > 0;
  } catch (error) {
    console.error(`カラム存在確認エラー:`, error);
    return false;
  }
}

async function checkMigrationApplied(sql: any, migrationTag: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT hash 
      FROM drizzle.__drizzle_migrations 
      WHERE hash LIKE ${`%${migrationTag}%`}
    `;
    return result.length > 0;
  } catch (error) {
    console.error(`マイグレーション履歴確認エラー:`, error);
    return false;
  }
}

async function addColumnManually(sql: any): Promise<void> {
  try {
    console.log('🔄 cover_image_urlカラムを手動で追加中...');
    await sql`ALTER TABLE "users" ADD COLUMN "cover_image_url" text`;
    console.log('✅ カラム追加完了');
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️  カラムは既に存在します');
    } else {
      throw error;
    }
  }
}

async function getCurrentMigrationState(sql: any): Promise<void> {
  console.log('📊 現在のマイグレーション状態:');
  try {
    const migrations = await sql`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log('最新のマイグレーション履歴:');
    migrations.forEach((migration: any, index: number) => {
      console.log(`${index + 1}. ID: ${migration.id}, Hash: ${migration.hash.substring(0, 50)}...`);
    });
  } catch (error) {
    console.error('マイグレーション履歴取得エラー:', error);
  }
}

async function verifySchemaConsistency(sql: any): Promise<void> {
  console.log('🔍 スキーマ一貫性チェック中...');
  
  // usersテーブルの全カラムを確認
  const columns = await sql`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  
  console.log('📋 usersテーブルの現在のカラム:');
  columns.forEach((col: any) => {
    console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
  });
  
  // cover_image_urlカラムの存在確認
  const hasCoverImageUrl = columns.some((col: any) => col.column_name === 'cover_image_url');
  console.log(`\n📸 cover_image_urlカラム: ${hasCoverImageUrl ? '✅ 存在' : '❌ 不存在'}`);
  
  return;
}

async function runProductionRepair(): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('🚀 本番データベース修復開始');
    console.log(`📅 開始時刻: ${new Date().toISOString()}`);
    
    // ユーザー確認
    const confirmed = await confirmRepair();
    if (!confirmed) {
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
    
    // 現在の状態確認
    await getCurrentMigrationState(sql);
    await verifySchemaConsistency(sql);
    
    // cover_image_urlカラムの存在確認
    const columnExists = await checkColumnExists(sql, 'users', 'cover_image_url');
    const migrationApplied = await checkMigrationApplied(sql, '0009_add_cover_image_url');
    
    console.log(`\n🔍 状態分析:`);
    console.log(`  - cover_image_urlカラム存在: ${columnExists ? '✅' : '❌'}`);
    console.log(`  - マイグレーション履歴存在: ${migrationApplied ? '✅' : '❌'}`);
    
    if (!columnExists && migrationApplied) {
      console.log('\n⚠️  問題検出: マイグレーション履歴は存在するがカラムが不存在');
      console.log('🔧 カラムを手動で追加します...');
      await addColumnManually(sql);
      
    } else if (!columnExists && !migrationApplied) {
      console.log('\n📝 通常のマイグレーションを実行します...');
      await migrate(db, { migrationsFolder: './drizzle' });
      
    } else if (columnExists && !migrationApplied) {
      console.log('\n⚠️  警告: カラムは存在するがマイグレーション履歴が不存在');
      console.log('ℹ️  手動でマイグレーション履歴を追加する必要がある可能性があります');
      
    } else {
      console.log('\n✅ データベース状態は正常です');
    }
    
    // 最終確認
    console.log('\n🔍 修復後の状態確認...');
    await verifySchemaConsistency(sql);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ 本番データベース修復完了!');
    console.log(`⏱️  実行時間: ${duration} 秒`);
    
    // 修復ログ
    const logEntry = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      operation: 'repair',
      success: true,
      duration: `${duration}s`,
      columnExists: await checkColumnExists(sql, 'users', 'cover_image_url')
    };
    
    console.log('\n📋 修復ログ:');
    console.log(JSON.stringify(logEntry, null, 2));
    
  } catch (error) {
    console.error('❌ 修復失敗:', error);
    
    if (error instanceof Error) {
      console.error('📝 エラー詳細:', error.message);
      console.error('🔍 スタックトレース:', error.stack);
    }
    
    console.error('\n🚨 重要: 本番データベース修復が失敗しました!');
    console.error('🛠️  即座に調査と対応が必要です。');
    
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  runProductionRepair();
}

export { runProductionRepair };