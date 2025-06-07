#!/usr/bin/env tsx

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: '.env.production' });

async function checkSchemas(): Promise<void> {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('🔍 データベーススキーマとテーブル確認中...');
    const sql = neon(databaseUrl);
    
    // 全スキーマを確認
    console.log('\n📋 利用可能なスキーマ:');
    const schemas = await sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `;
    
    schemas.forEach((schema: any) => {
      console.log(`  - ${schema.schema_name}`);
    });
    
    // publicスキーマのテーブル確認
    console.log('\n📊 publicスキーマのテーブル:');
    const publicTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    publicTables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });
    
    // _drizzle_migrationsテーブルを全スキーマで検索
    console.log('\n🔍 _drizzle_migrationsテーブルの検索:');
    const migrationTables = await sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = '_drizzle_migrations'
    `;
    
    if (migrationTables.length > 0) {
      migrationTables.forEach((table: any) => {
        console.log(`  ✅ 発見: ${table.table_schema}.${table.table_name}`);
      });
    } else {
      console.log('  ❌ _drizzle_migrationsテーブルが見つかりません');
    }
    
    // もし見つからない場合、類似テーブルを検索
    if (migrationTables.length === 0) {
      console.log('\n🔎 類似テーブル名を検索:');
      const similarTables = await sql`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE '%migration%' OR table_name LIKE '%drizzle%'
      `;
      
      if (similarTables.length > 0) {
        similarTables.forEach((table: any) => {
          console.log(`  📋 類似: ${table.table_schema}.${table.table_name}`);
        });
      } else {
        console.log('  📋 類似テーブルも見つかりません');
      }
    }
    
  } catch (error) {
    console.error('❌ スキーマ確認エラー:', error);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  checkSchemas();
}

export { checkSchemas };