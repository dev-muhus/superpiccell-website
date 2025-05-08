import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';

// カスタムDB型を定義（endメソッドを含む）
type CustomDB = 
  | (NodePgDatabase<typeof schema> & { end: () => Promise<void> })
  | (NeonHttpDatabase<typeof schema> & { end: () => Promise<void> });

let db: CustomDB;

// テスト環境では通常のPostgreSQLクライアントを使用
if (process.env.TEST_MODE === 'true') {
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  });
  
  // 接続終了用メソッドを追加
  const pgDb = pgDrizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
  (pgDb as CustomDB).end = async () => {
    await pool.end();
  };
  db = pgDb as CustomDB;
} else {
  // 本番環境ではNeonクライアントを使用
  const sql = neon(process.env.DATABASE_URL!);
  const neonDb = drizzle(sql, { schema }) as NeonHttpDatabase<typeof schema>;
  (neonDb as CustomDB).end = async () => { /* Neonは明示的な終了が不要 */ };
  db = neonDb as CustomDB;
}

export { db }; 