#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// 環境変数を読み込み
dotenv.config();

interface MigrationInfo {
  file: string;
  version: string;
  description: string;
}

async function getMigrationFiles(): Promise<MigrationInfo[]> {
  try {
    const migrationsDir = join(process.cwd(), 'drizzle');
    const files = await readdir(migrationsDir);
    
    const migrations: MigrationInfo[] = [];
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const content = await readFile(join(migrationsDir, file), 'utf-8');
        const match = file.match(/^(\d+)_(.+)\.sql$/);
        
        if (match) {
          migrations.push({
            file,
            version: match[1],
            description: match[2].replace(/_/g, ' ')
          });
        }
      }
    }
    
    return migrations.sort((a, b) => a.version.localeCompare(b.version));
  } catch (error) {
    console.error('❌ Failed to read migration files:', error);
    return [];
  }
}

async function runMigrations() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting database migration process...');
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // データベース接続の確認
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('🔗 Connecting to database...');
    const sql = neon(databaseUrl);
    const db = drizzle(sql);
    
    // 利用可能なマイグレーションファイルを取得
    const migrations = await getMigrationFiles();
    console.log(`📁 Found ${migrations.length} migration files:`);
    
    migrations.forEach((migration, index) => {
      console.log(`  ${index + 1}. ${migration.file} - ${migration.description}`);
    });
    
    // マイグレーション実行前の確認
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Running in PRODUCTION mode');
      console.log('🔄 Executing migrations...');
    }
    
    // マイグレーション実行
    await migrate(db, { migrationsFolder: './drizzle' });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('✅ Database migration completed successfully!');
    console.log(`⏱️  Total time: ${duration} seconds`);
    
    // 成功時の追加情報
    if (process.env.NODE_ENV === 'production') {
      console.log('🎉 Production database is now up to date!');
      
      // Neon APIを使用してブランチ情報を取得（オプション）
      if (process.env.NEON_API_KEY && process.env.NEON_PROJECT_ID) {
        try {
          const response = await fetch(
            `https://console.neon.tech/api/v2/projects/${process.env.NEON_PROJECT_ID}/branches`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
                'Accept': 'application/json'
              }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const mainBranch = data.branches?.find((b: any) => b.name === 'main');
            if (mainBranch) {
              console.log(`📊 Database branch: ${mainBranch.name} (${mainBranch.id})`);
            }
          }
        } catch (error) {
          console.warn('⚠️  Could not fetch branch info:', error);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    if (error instanceof Error) {
      console.error('📝 Error details:', error.message);
      console.error('🔍 Stack trace:', error.stack);
    }
    
    // 本番環境でのエラーは特に重要
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: Production database migration failed!');
      console.error('🛠️  Please check the error above and take immediate action.');
    }
    
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  runMigrations();
}

export { runMigrations }; 