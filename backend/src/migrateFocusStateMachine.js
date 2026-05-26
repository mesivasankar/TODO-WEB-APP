import { pool } from "./config/db.js";

async function migrateFocusStateMachine() {
  try {
    // 1. Drop old table
    await pool.query("DROP TABLE IF EXISTS focus_sessions CASCADE;");
    console.log("🗑️ Dropped old focus_sessions table successfully.");

    // 2. Re-create table with state machine structure
    await pool.query(`
      CREATE TABLE IF NOT EXISTS focus_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expected_end_time TIMESTAMPTZ NOT NULL,
        actual_end_time TIMESTAMPTZ,
        minutes_focused INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("⚡ focus_sessions state machine table created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error migrating database:", err);
    process.exit(1);
  }
}

migrateFocusStateMachine();
