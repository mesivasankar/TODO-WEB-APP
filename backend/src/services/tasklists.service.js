import { pool } from '../config/db.js';

export async function getTaskListsForUser(userId) {
  const query = `
    SELECT
      id,
      name,
      sort_order,
      is_default,
      category,
      created_at,
      updated_at
    FROM task_lists
    WHERE user_id = $1 AND deleted_at IS NULL -- 🔥 HIDE DELETED LISTS
    ORDER BY sort_order ASC, created_at ASC
  `;

  const values = [userId];
  const { rows } = await pool.query(query, values);

  return rows;
}

export async function createTaskListForUser(userId, name, category = 'OTHERS') {
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
      INSERT INTO task_lists (user_id, name, sort_order, is_default, category)
      VALUES ($1, $2, $3, FALSE, $4)
      RETURNING
        id,
        user_id,
        name,
        sort_order,
        is_default,
        category,
        created_at,
        updated_at
    `,
    [userId, name, nextOrder, category]
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
        category,
        created_at,
        updated_at
    `,
    [newName, listId, userId]
  );

  return updateResult.rows[0] || null;
}

export async function reorderTaskListsForUser(userId, orderedIds) {
  if (!orderedIds || orderedIds.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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

// 🔥 NEW: SOFT DELETE FUNCTION
export async function softDeleteTaskListForUser(userId, listId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Mark the LIST as deleted
    const listQuery = `
      UPDATE task_lists 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2
    `;
    await client.query(listQuery, [listId, userId]);

    // 2. Mark all TASKS in that list as deleted (so they disappear from "All Tasks")
    // Note: We do NOT delete them permanently, so analytics still work!
    const tasksQuery = `
      UPDATE tasks 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE list_id = $1 AND user_id = $2
    `;
    await client.query(tasksQuery, [listId, userId]);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}