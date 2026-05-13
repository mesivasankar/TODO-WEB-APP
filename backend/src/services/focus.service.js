import { pool } from '../config/db.js';

export async function startSession(userId, taskId) {
  // 1. Stop any existing session first (safety check)
  await stopSession(userId);

  // 2. Start new session
  const query = `
    INSERT INTO focus_sessions (user_id, task_id, start_time)
    VALUES ($1, $2, NOW())
    RETURNING id, start_time, task_id
  `;
  const { rows } = await pool.query(query, [userId, taskId]);
  return rows[0];
}

export async function stopSession(userId) {
  // 1. Find active session
  const findQuery = `
    SELECT id, extract(epoch from (NOW() - start_time)) as duration 
    FROM focus_sessions 
    WHERE user_id = $1 AND end_time IS NULL
  `;
  const { rows } = await pool.query(findQuery, [userId]);
  
  if (rows.length === 0) return null; // No active session

  const session = rows[0];
  const duration = Math.round(session.duration);

  // 2. LOGIC: If less than 60 seconds, discard it (delete from DB)
  if (duration < 60) {
    await pool.query('DELETE FROM focus_sessions WHERE id = $1', [session.id]);
    return { status: 'discarded', message: 'Session too short (< 1 min)', duration: 0 };
  }

  // 3. Otherwise, save it
  const updateQuery = `
    UPDATE focus_sessions 
    SET end_time = NOW(), duration_seconds = $2
    WHERE id = $1
    RETURNING *
  `;
  const res = await pool.query(updateQuery, [session.id, duration]);
  return { status: 'saved', session: res.rows[0], duration };
}

export async function getActiveSession(userId) {
  const query = `
    SELECT s.*, t.title as task_title 
    FROM focus_sessions s
    LEFT JOIN tasks t ON s.task_id = t.id
    WHERE s.user_id = $1 AND s.end_time IS NULL
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}