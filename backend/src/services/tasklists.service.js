import { pool } from '../config/db.js';

export async function getTaskListsForUser(userId) {
  const query = `
    SELECT
      id,
      name,
      sort_order,
      is_default,
      created_at,
      updated_at
    FROM task_lists
    WHERE user_id = $1
    ORDER BY sort_order ASC, created_at ASC
  `;

  const values = [userId];
  const { rows } = await pool.query(query, values);

  return rows;
}

export async function createTaskListForUser(userId, name) {
  const orderResult = await pool.query(
    `
      SELECT COALESCE(MAX(sort_order), -1) AS max_order
      FROM task_lists
      WHERE user_id = $1
    `,
    [userId]
  );

  const maxOrder = orderResult.rows[0].max_order;
  const nextOrder = maxOrder + 1;

  const insertResult = await pool.query(
    `
      INSERT INTO task_lists (user_id, name, sort_order, is_default)
      VALUES ($1, $2, $3, FALSE)
      RETURNING
        id,
        user_id,
        name,
        sort_order,
        is_default,
        created_at,
        updated_at
    `,
    [userId, name, nextOrder]
  );

  return insertResult.rows[0];
}

export async function renameTaskListForUser(userId, listId, newName) {
  const updateResult = await pool.query(
    `
      UPDATE task_lists
      SET name = $1,
          updated_at = NOW()
      WHERE id = $2
        AND user_id = $3
      RETURNING
        id,
        user_id,
        name,
        sort_order,
        is_default,
        created_at,
        updated_at
    `,
    [newName, listId, userId]
  );

  return updateResult.rows[0] || null;
}

// 🔥 NEW: Reorder function
export async function reorderTaskListsForUser(userId, orderedIds) {
  if (!orderedIds || orderedIds.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create a CASE statement to update all sort_orders in one query
    const cases = orderedIds.map((id, index) => `WHEN id = '${id}' THEN ${index}`).join(' ');
    const idList = orderedIds.map(id => `'${id}'`).join(',');

    const query = `
      UPDATE task_lists
      SET sort_order = CASE ${cases} END,
          updated_at = NOW()
      WHERE id IN (${idList}) AND user_id = $1
    `;

    await client.query(query, [userId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}