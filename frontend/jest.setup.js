/**
 * Jest global setup - DBマイグレーション実行
 */
module.exports = async () => {
  console.log('Jest global setup - Running DB migrations...');
  
  try {
    // 環境変数設定
    process.env.TEST_MODE = 'true';
    process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://test_user:test_pass@test-db:5432/test_db';
    
    // migrate.tsを実行してマイグレーションを行う
    const { main } = require('./src/db/migrate');
    await main();
    
    console.log('DB migration completed successfully');
  } catch (error) {
    console.error('Failed to run database migrations:', error);
    process.exit(1);
  }
}; 