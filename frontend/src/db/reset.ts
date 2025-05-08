import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

async function main() {
  console.log('Resetting database...');
  
  try {
    // Drop all existing tables
    console.log('Dropping all tables...');
    await sql`DROP TABLE IF EXISTS blocks CASCADE`;
    await sql`DROP TABLE IF EXISTS bookmarks CASCADE`;
    await sql`DROP TABLE IF EXISTS communities CASCADE`;
    await sql`DROP TABLE IF EXISTS community_members CASCADE`;
    await sql`DROP TABLE IF EXISTS community_posts CASCADE`;
    await sql`DROP TABLE IF EXISTS drafts CASCADE`;
    await sql`DROP TABLE IF EXISTS follows CASCADE`;
    await sql`DROP TABLE IF EXISTS likes CASCADE`;
    await sql`DROP TABLE IF EXISTS posts CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP TABLE IF EXISTS drizzle_migrations CASCADE`;
    console.log('Dropped all existing tables');

    // Remove migration files
    const { rm } = await import('fs/promises');
    await rm(path.resolve(process.cwd(), 'drizzle'), { recursive: true, force: true });
    console.log('Removed migration files');

    // Generate new migration files
    const { exec } = await import('child_process');
    await new Promise((resolve, reject) => {
      exec('npm run db:generate', (error, stdout, stderr) => {
        if (error) {
          console.error('Error generating migrations:', stderr);
          reject(error);
          return;
        }
        console.log(stdout);
        resolve(stdout);
      });
    });

    // Run migrations
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during database reset:', error);
    process.exit(1);
  }
}

main(); 