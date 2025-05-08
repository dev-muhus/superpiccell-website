import { drizzle } from 'drizzle-orm/neon-http';
import { migrate as neonMigrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { migrate as pgMigrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema';

// 接続文字列の取得（テストモードではTEST_DATABASE_URLを優先）
const connectionString = process.env.TEST_MODE === 'true'
  ? (process.env.TEST_DATABASE_URL || process.env.DATABASE_URL)
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('No database connection string (DATABASE_URL or TEST_DATABASE_URL) is set');
}

export async function main() {
  console.log('Running migrations...');
  
  // テスト環境では通常のPostgreSQLクライアントを使用
  if (process.env.TEST_MODE === 'true') {
    const pool = new Pool({
      connectionString,
    });
    
    const db = pgDrizzle(pool, { schema });
    
    // PostgreSQL用のマイグレーションを実行
    // DrizzleのネイティブマイグレーションAPIのみを使用
    try {
      await pgMigrate(db, { migrationsFolder: './drizzle' });
      console.log('Migration successful');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
    
    // 終了時にプールを閉じる
    await pool.end();
  } else {
    // 本番環境ではNeonクライアントを使用
    const sql = neon(connectionString as string);
    const db = drizzle(sql);
    
    // Neon用のマイグレーションを実行
    await neonMigrate(db, { migrationsFolder: './drizzle' });
  }
  
  console.log('Migrations completed!');
  
  // direct execution (not imported)
  if (require.main === module) {
    process.exit(0);
  }
}

// スクリプト直接実行時の処理
if (require.main === module) {
  main().catch((err) => {
    console.error('Migration failed!');
    console.error(err);
    process.exit(1);
  });
} 