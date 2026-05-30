import pkg from 'pg';
import { env } from './src/config/env.js';

const { Pool } = pkg;

const indexes = [
  // Tasks Table Performance Indexes
  { name: 'idx_tasks_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);' },
  { name: 'idx_tasks_list_id', sql: 'CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);' },
  { name: 'idx_tasks_parent_task_id', sql: 'CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);' },
  { name: 'idx_tasks_deleted_at', sql: 'CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;' },
  
  // Task Lists Table Performance Indexes
  { name: 'idx_task_lists_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_task_lists_user_id ON task_lists(user_id);' },
  { name: 'idx_task_lists_deleted_at', sql: 'CREATE INDEX IF NOT EXISTS idx_task_lists_deleted_at ON task_lists(deleted_at) WHERE deleted_at IS NULL;' },
  
  // Priority Matrix Table Performance Indexes
  { name: 'idx_matrix_tasks_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_matrix_tasks_user_id ON matrix_tasks(user_id);' },
  
  // Focus Mode Performance Indexes
  { name: 'idx_focus_sessions_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);' },
  
  // Email verification tokens Index
  { name: 'idx_email_verification_tokens_user_id', sql: 'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);' }
];

async function runIndexMigration(dbName, connectionString) {
  if (!connectionString) {
    console.log(`⚠️ Skip indexing for ${dbName}: Connection string is empty.`);
    return;
  }
  
  console.log(`\n========================================`);
  console.log(`🚀 RUNNING PERFORMANCE MIGRATION FOR: ${dbName}`);
  console.log(`========================================`);
  
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
  
  let client;
  try {
    client = await pool.connect();
    for (const index of indexes) {
      console.log(`⚙️ Creating index: ${index.name}...`);
      await client.query(index.sql);
    }
    console.log(`✅ Database optimization complete for ${dbName}!`);
  } catch (err) {
    console.error(`❌ ERROR creating indexes on ${dbName}:`, err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

async function main() {
  const localUrl = "postgres://postgres:7826940949@localhost:5432/actdone_local";
  const neonUrl = "postgresql://neondb_owner:npg_DHgcFpI3W8fV@ep-divine-mud-a48myvyt-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

  // 1. Run local
  try {
    await runIndexMigration("Local Development Database", localUrl);
  } catch (e) {
    console.error(e);
  }

  // 2. Run production Neon
  try {
    await runIndexMigration("Neon Production Database", neonUrl);
  } catch (e) {
    console.error(e);
  }
  
  console.log("\n⚡ Migration runner finished!");
}

main();
