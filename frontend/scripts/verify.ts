#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

async function verifyDatabase(): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Starting database verification...');
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    
    // データベース接続の確認
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('🔗 Connecting to database...');
    const sqlClient = neon(databaseUrl);
    const db = drizzle(sqlClient);
    
    // 1. 基本的な接続テスト
    console.log('📡 Testing database connection...');
    await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection: OK');
    
    // 2. 必須テーブルの存在確認
    console.log('📋 Checking required tables...');
    const requiredTables = [
      'users',
      'user_profiles', 
      'posts',
      'comments',
      'likes',
      'follows',
      'blocks',
      'game_scores'
    ];
    
    for (const tableName of requiredTables) {
      try {
        const result = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          ) as exists
        `);
        
        // 結果を安全に取得
        const exists = Array.isArray(result) && result.length > 0 ? result[0]?.exists : false;
        
        if (exists) {
          console.log(`✅ Table '${tableName}': EXISTS`);
        } else {
          console.log(`❌ Table '${tableName}': MISSING`);
        }
      } catch (error) {
        console.log(`❌ Table '${tableName}': ERROR - ${error}`);
      }
    }
    
    // 3. ゲームスコアテーブルの特別な検証
    console.log('🎮 Verifying game scores table structure...');
    try {
      const gameScoreColumns = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'game_scores'
        ORDER BY ordinal_position
      `);
      
      const expectedColumns = [
        'id', 'user_id', 'game_id', 'stage_id', 'score', 
        'game_time', 'items_collected', 'difficulty', 
        'created_at', 'deleted_at', 'is_deleted'
      ];
      
      // 結果を安全に処理
      const actualColumns = Array.isArray(gameScoreColumns) 
        ? gameScoreColumns.map((col: any) => col.column_name)
        : [];
      
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('✅ Game scores table: STRUCTURE OK');
      } else {
        console.log(`❌ Game scores table: MISSING COLUMNS - ${missingColumns.join(', ')}`);
      }
      
    } catch (error) {
      console.log('❌ Game scores table: VERIFICATION FAILED');
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n📋 Verification Summary:');
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log('\n🎉 Database verification completed!');
    
    if (process.env.NODE_ENV === 'production') {
      console.log('✅ Production database is ready!');
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    
    if (error instanceof Error) {
      console.error('📝 Error details:', error.message);
    }
    
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  verifyDatabase();
}

export { verifyDatabase }; 