import { pool } from '../config/db.js';

export async function softDeleteTaskForUser(userId, taskId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Mark task as deleted
    const taskQuery = `
      UPDATE tasks SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id
    `;
    const { rows } = await client.query(taskQuery, [taskId, userId]);
    
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // 2. Cascade soft delete to subtasks
    const subtaskQuery = `
      UPDATE tasks SET deleted_at = NOW(), updated_at = NOW()
      WHERE parent_task_id = $1 AND user_id = $2 AND deleted_at IS NULL
    `;
    await client.query(subtaskQuery, [taskId, userId]);

    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// 🔥 NEW: Hard delete function for permanent removal
export async function permanentlyDeleteTaskForUser(userId, taskId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Recursive CTE to identify all IDs (parent + all descendants)
    // We target tasks that are ALREADY soft-deleted or active (cleanup)
    const query = `
      WITH RECURSIVE task_tree AS (
        SELECT id FROM tasks 
        WHERE id = $1 AND user_id = $2
        UNION ALL
        SELECT t.id FROM tasks t
        INNER JOIN task_tree tt ON t.parent_task_id = tt.id
      )
      DELETE FROM tasks
      WHERE id IN (SELECT id FROM task_tree)
      RETURNING id
    `;
    
    const { rows } = await client.query(query, [taskId, userId]);
    await client.query('COMMIT');
    return rows[0] || { id: taskId }; 
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getTasksForList(userId, listId) {
  const query = `
    SELECT
      id, user_id, list_id, parent_task_id, title, description,
      is_completed, is_starred, due_date, sort_order,
      deleted_at, completed_at, created_at, updated_at
    FROM tasks
    WHERE user_id = $1 AND list_id = $2 AND deleted_at IS NULL
    ORDER BY sort_order ASC, created_at ASC
  `;
  const { rows } = await pool.query(query, [userId, listId]);
  return rows;
}

export async function createTaskInList(userId, listId, { title, description, dueDate, parentTaskId }) {
  const query = `
    INSERT INTO tasks (
      user_id, list_id, parent_task_id, title, description,
      is_completed, is_starred, due_date, sort_order
    )
    VALUES (
      $1, $2, $3, $4, $5, FALSE, FALSE, $6,
      COALESCE((SELECT MAX(sort_order) + 1 FROM tasks WHERE user_id = $1 AND list_id = $2), 1)
    )
    RETURNING
      id, user_id, list_id, parent_task_id, title, description,
      is_completed, is_starred, due_date, sort_order,
      deleted_at, completed_at, created_at, updated_at
  `;
  const values = [userId, listId, parentTaskId ?? null, title, description ?? null, dueDate ?? null];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function updateTaskForUser(userId, taskId, { title, description, dueDate, isCompleted, isStarred, listId }) {
  const fields = [];
  const values = [];
  let index = 1;

  if (title !== undefined) { fields.push(`title = $${index}`); values.push(title); index++; }
  if (description !== undefined) { fields.push(`description = $${index}`); values.push(description); index++; }
  if (dueDate !== undefined) { fields.push(`due_date = $${index}`); values.push(dueDate); index++; }
  
  if (isCompleted !== undefined) { 
    fields.push(`is_completed = $${index}`);
    fields.push(`completed_at = CASE WHEN $${index} = TRUE THEN NOW() ELSE NULL END`);
    values.push(isCompleted); 
    index++; 
  }
  
  if (isStarred !== undefined) { 
    fields.push(`is_starred = $${index}`); 
    values.push(isStarred); 
    index++; 
  }
  
  if (listId !== undefined) { fields.push(`list_id = $${index}`); values.push(listId); index++; }

  fields.push('updated_at = NOW()');

  if (fields.length === 1) return null; // Only updated_at was pushed

  const query = `
    UPDATE tasks SET ${fields.join(', ')}
    WHERE id = $${index} AND user_id = $${index + 1} AND deleted_at IS NULL
    RETURNING
      id, user_id, list_id, parent_task_id, title, description,
      is_completed, is_starred, due_date, sort_order,
      deleted_at, completed_at, created_at, updated_at
  `;
  values.push(taskId, userId);
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

export async function restoreTaskForUser(userId, taskId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const query = `
      UPDATE tasks SET deleted_at = NULL, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL
      RETURNING id
    `;
    const { rows } = await client.query(query, [taskId, userId]);

    if (rows.length > 0) {
      const subQuery = `
        UPDATE tasks SET deleted_at = NULL, updated_at = NOW()
        WHERE parent_task_id = $1 AND user_id = $2 AND deleted_at IS NOT NULL
      `;
      await client.query(subQuery, [taskId, userId]);
    }

    await client.query('COMMIT');
    return rows[0] || null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function reorderTasksInList(userId, listId, orderedIds) {
  if (!orderedIds.length) throw new Error('No IDs provided');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const cases = orderedIds.map((id, index) => `WHEN id = '${id}' THEN ${index}`).join(' ');
    const idList = orderedIds.map(id => `'${id}'`).join(',');
    
    const query = `
      UPDATE tasks 
      SET sort_order = CASE ${cases} END, updated_at = NOW()
      WHERE id IN (${idList}) AND user_id = $1 AND list_id = $2
      RETURNING id, sort_order
    `;
    
    const { rows } = await client.query(query, [userId, listId]);
    await client.query('COMMIT');
    return rows;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getTaskByIdForUser(userId, taskId) {
  const { rows } = await pool.query(`SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, [taskId, userId]);
  return rows[0] || null;
}

export async function getSubtasksForTask(userId, parentTaskId) {
  const query = `SELECT * FROM tasks WHERE parent_task_id = $1 AND user_id = $2 AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC`;
  const { rows } = await pool.query(query, [parentTaskId, userId]);
  return rows;
}

export async function getAllStarredTasksForUser(userId) {
  const query = `
    SELECT
      id, user_id, list_id, parent_task_id, title, description,
      is_completed, is_starred, due_date, sort_order,
      deleted_at, completed_at, created_at, updated_at
    FROM tasks
    WHERE user_id = $1 AND deleted_at IS NULL AND is_starred = TRUE
    ORDER BY sort_order ASC, created_at ASC
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
}