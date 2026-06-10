import { pool } from '../config/db.js';

export async function getTaskListsForUser(userId) {
  const query = `
    SELECT
      tl.id,
      tl.name,
      tl.sort_order,
      tl.is_default,
      tl.category,
      tl.task_sort_option,
      tl.created_at,
      tl.updated_at,
      COALESCE(tc.count, 0)::INTEGER as incomplete_task_count
    FROM task_lists tl
    LEFT JOIN (
      SELECT list_id, COUNT(*) as count
      FROM tasks
      WHERE user_id = $1 AND deleted_at IS NULL AND is_completed = false
      GROUP BY list_id
    ) tc ON tl.id = tc.list_id
    WHERE tl.user_id = $1 AND tl.deleted_at IS NULL
    ORDER BY tl.sort_order ASC, tl.created_at ASC
  `;

  const values = [userId];
  const { rows } = await pool.query(query, values);

  return rows;
}

export async function createTaskListForUser(userId, name, category = 'OTHERS') {
  const insertResult = await pool.query(
    `
      INSERT INTO task_lists (user_id, name, sort_order, is_default, category)
      VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM task_lists WHERE user_id = $1), 0), FALSE, $3)
      RETURNING
        id,
        user_id,
        name,
        sort_order,
        is_default,
        category,
        task_sort_option,
        created_at,
        updated_at,
        0::INTEGER as incomplete_task_count
    `,
    [userId, name, category]
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
        task_sort_option,
        created_at,
        updated_at,
        (SELECT COALESCE(COUNT(*), 0)::INTEGER FROM tasks WHERE list_id = $2 AND user_id = $3 AND deleted_at IS NULL AND is_completed = false) as incomplete_task_count
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
  const query = `
    WITH deleted_list AS (
      UPDATE task_lists 
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING deleted_at
    )
    UPDATE tasks 
    SET deleted_at = (SELECT deleted_at FROM deleted_list), updated_at = NOW()
    WHERE list_id = $1 AND user_id = $2 AND deleted_at IS NULL
  `;
  await pool.query(query, [listId, userId]);
}

// 🔥 NEW: RESTORE FUNCTION FOR UNDO OPERATIONS
export async function restoreTaskListForUser(userId, listId) {
  const query = `
    WITH old_list AS (
      SELECT deleted_at FROM task_lists WHERE id = $1 AND user_id = $2
    ),
    update_list AS (
      UPDATE task_lists
      SET deleted_at = NULL, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
    )
    UPDATE tasks
    SET deleted_at = NULL, updated_at = NOW()
    WHERE list_id = $1 AND user_id = $2 AND deleted_at = (SELECT deleted_at FROM old_list)
  `;
  await pool.query(query, [listId, userId]);
}

export async function updateTaskListSortOption(userId, listId, sortOption) {
  const updateResult = await pool.query(
    `
      UPDATE task_lists
      SET task_sort_option = $1,
          updated_at = NOW()
      WHERE id = $2
        AND user_id = $3
      RETURNING
        id,
        task_sort_option,
        updated_at,
        (SELECT COALESCE(COUNT(*), 0)::INTEGER FROM tasks WHERE list_id = $2 AND user_id = $3 AND deleted_at IS NULL AND is_completed = false) as incomplete_task_count
    `,
    [sortOption, listId, userId]
  );

  return updateResult.rows[0] || null;
}