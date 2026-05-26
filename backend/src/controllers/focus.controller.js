import { pool } from '../config/db.js';

export const startFocusSession = async (req, res, next) => {
  try {
    const { taskId, durationSecs } = req.body;
    const userId = req.user.id;

    if (!durationSecs || typeof durationSecs !== 'number') {
      return res.status(400).json({ message: 'Valid focus duration is required.' });
    }

    const expectedEndTime = new Date(Date.now() + durationSecs * 1000);

    const result = await pool.query(
      `INSERT INTO focus_sessions (user_id, task_id, expected_end_time, status) 
       VALUES ($1, $2, $3, 'RUNNING') 
       RETURNING *`,
      [userId, taskId || null, expectedEndTime]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const patchFocusSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, minutesFocused } = req.body;
    const userId = req.user.id;

    if (!['COMPLETED', 'PARTIAL', 'ABANDONED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid focus session status.' });
    }

    const result = await pool.query(
      `UPDATE focus_sessions 
       SET status = $1, 
           actual_end_time = NOW(), 
           minutes_focused = COALESCE($2, minutes_focused)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, minutesFocused || 0, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Focus session not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const beaconAbandonFocusSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Guaranteed tab-closing rollback: sets status to ABANDONED immediately
    await pool.query(
      `UPDATE focus_sessions 
       SET status = 'ABANDONED', 
           actual_end_time = NOW(), 
           minutes_focused = 0
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getFocusSessionsStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // ⚡ STEP 1: Dead-Man Switch Check (Lazy Resolution)
    // Automatically cleans up frozen RUNNING sessions past expected completion time.
    await pool.query(
      `UPDATE focus_sessions 
       SET status = 'ABANDONED', 
           actual_end_time = expected_end_time, 
           minutes_focused = 0
       WHERE user_id = $1 
         AND status = 'RUNNING' 
         AND NOW() > expected_end_time`,
      [userId]
    );

    // ⚡ STEP 2: Aggregate metrics (Time counts COMPLETED + PARTIAL, sessions counts COMPLETED only)
    const aggregatesResult = await pool.query(
      `SELECT COALESCE(SUM(minutes_focused), 0)::int as total_minutes, 
              COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as session_count 
       FROM focus_sessions 
       WHERE user_id = $1 AND status IN ('COMPLETED', 'PARTIAL')`,
      [userId]
    );

    const { total_minutes, session_count } = aggregatesResult.rows[0];

    // ⚡ STEP 3: Daily focus breakdown for the last 7 days (Includes COMPLETED + PARTIAL)
    const dailyResult = await pool.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date,
              SUM(minutes_focused)::int as minutes
       FROM focus_sessions
       WHERE user_id = $1 AND status IN ('COMPLETED', 'PARTIAL') AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      [userId]
    );

    res.json({
      totalMinutes: total_minutes,
      sessionCount: session_count,
      dailyStats: dailyResult.rows
    });
  } catch (error) {
    next(error);
  }
};
