import { pool } from "./config/db.js";

async function initFocusTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS focus_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
        minutes_focused INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("⚡ focus_sessions table verified successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error initializing focus_sessions table:", err);
    process.exit(1);
  }
}

initFocusTable();
