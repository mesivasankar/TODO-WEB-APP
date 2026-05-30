import { pool } from '../config/db.js';

export async function getTasksForList(userId, listId) {
  // First, retrieve the task_sort_option for this list to ensure correct ordering
  const listResult = await pool.query(
    `SELECT task_sort_option FROM task_lists WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [listId, userId]
  );
  
  const sortOption = listResult.rows[0]?.task_sort_option || 'MY_ORDER';
  
  let orderByClause = 'ORDER BY sort_order ASC, created_at ASC';
  if (sortOption === 'DATE_CREATED') {
    orderByClause = 'ORDER BY created_at DESC';
  } else if (sortOption === 'TITLE') {
    orderByClause = 'ORDER BY LOWER(title) ASC';
  } else if (sortOption === 'DUE_DATE') {
    orderByClause = 'ORDER BY due_date ASC NULLS LAST, created_at ASC';
  }

  const query = `
    SELECT
      id, user_id, list_id, parent_task_id, title, description,
      is_completed, is_starred, due_date, sort_order, recurrence_type,
      category, deleted_at, completed_at, created_at, updated_at
    FROM tasks
    WHERE user_id = $1 AND list_id = $2 AND deleted_at IS NULL
    ${orderByClause}
  `;
  const { rows } = await pool.query(query, [userId, listId]);
  return rows;
}

export async function createTaskInList(userId, listId, { title, description, dueDate, parentTaskId, recurrenceType, category }) {
  const query = `
    INSERT INTO tasks (
      user_id, list_id, parent_task_id, title, description,
      is_completed, is_starred, due_date, sort_order, recurrence_type, category
    )
    VALUES (
      $1, $2, $3, $4, $5, FALSE, FALSE, $6,
      COALESCE((SELECT MAX(sort_order) + 1 FROM tasks WHERE user_id = $1 AND list_id = $2), 1),
      $7,
      COALESCE(
        (SELECT CASE WHEN category = 'OTHERS' THEN $8 ELSE category END FROM task_lists WHERE id = $2),
        $8
      )
    )
    RETURNING *
  `;
  const values = [
    userId, listId, parentTaskId ?? null, title, description ?? null, 
    dueDate ?? null, recurrenceType ?? null, category || 'OTHERS'
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function updateTaskForUser(userId, taskId, { title, description, dueDate, isCompleted, isStarred, listId, recurrence_type, category }) {
  const fields = [];
  const values = [];
  let index = 1;

  if (title !== undefined) { fields.push(`title = $${index++}`); values.push(title); }
  if (description !== undefined) { fields.push(`description = $${index++}`); values.push(description); }
  if (dueDate !== undefined) { fields.push(`due_date = $${index++}`); values.push(dueDate); }
  
  if (isCompleted !== undefined) { 
    fields.push(`is_completed = $${index}`);
    fields.push(`completed_at = CASE WHEN $${index} = TRUE THEN NOW() ELSE NULL END`);
    values.push(isCompleted); 
    index++; 
  }
  
  if (isStarred !== undefined) { fields.push(`is_starred = $${index++}`); values.push(isStarred); }
  if (listId !== undefined) { fields.push(`list_id = $${index++}`); values.push(listId); }
  if (recurrence_type !== undefined) { fields.push(`recurrence_type = $${index++}`); values.push(recurrence_type); }
  if (category !== undefined) { fields.push(`category = $${index++}`); values.push(category); }

  fields.push('updated_at = NOW()');

  if (fields.length === 1) return null; 

  const query = `
    UPDATE tasks SET ${fields.join(', ')}
    WHERE id = $${index} AND user_id = $${index + 1} AND deleted_at IS NULL
    RETURNING *
  `;
  values.push(taskId, userId);
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

export async function restoreTaskForUser(userId, taskId) {
  const query = `
    WITH restored_parent AS (
      UPDATE tasks 
      SET deleted_at = NULL, updated_at = NOW() 
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL 
      RETURNING id
    ),
    restored_subtasks AS (
      UPDATE tasks 
      SET deleted_at = NULL, updated_at = NOW() 
      WHERE parent_task_id = $1 AND user_id = $2 AND deleted_at IS NOT NULL
    )
    SELECT id FROM restored_parent;
  `;
  const { rows } = await pool.query(query, [taskId, userId]);
  return rows[0] || null;
}

export async function bulkRestoreTasksForUser(userId, taskIds) {
  if (!taskIds || !taskIds.length) return [];
  const query = `
    WITH restored_parents AS (
      UPDATE tasks 
      SET deleted_at = NULL, updated_at = NOW() 
      WHERE user_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NOT NULL 
      RETURNING id
    ),
    restored_subtasks AS (
      UPDATE tasks 
      SET deleted_at = NULL, updated_at = NOW() 
      WHERE user_id = $1 AND parent_task_id = ANY($2::uuid[]) AND deleted_at IS NOT NULL
    )
    SELECT id FROM restored_parents;
  `;
  const { rows } = await pool.query(query, [userId, taskIds]);
  return rows;
}

export async function reorderTasksInList(userId, listId, orderedIds) {
  if (!orderedIds.length) return [];
  const cases = orderedIds.map((id, index) => `WHEN id = '${id}' THEN ${index}`).join(' ');
  const idList = orderedIds.map(id => `'${id}'`).join(',');
  const query = `UPDATE tasks SET sort_order = CASE ${cases} END, updated_at = NOW() WHERE id IN (${idList}) AND user_id = $1 AND list_id = $2 RETURNING id, sort_order`;
  const { rows } = await pool.query(query, [userId, listId]);
  return rows;
}

export async function getTaskByIdForUser(userId, taskId) {
  const { rows } = await pool.query(`SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, [taskId, userId]);
  return rows[0] || null;
}

export async function getSubtasksForTask(userId, parentTaskId) {
  const { rows } = await pool.query(`SELECT * FROM tasks WHERE parent_task_id = $1 AND user_id = $2 AND deleted_at IS NULL ORDER BY sort_order ASC`, [parentTaskId, userId]);
  return rows;
}

export async function getAllStarredTasksForUser(userId) {
  const { rows } = await pool.query(`SELECT * FROM tasks WHERE user_id = $1 AND deleted_at IS NULL AND is_starred = TRUE ORDER BY sort_order ASC`, [userId]);
  return rows;
}

export async function searchTasksForUser(userId, query) {
  const values = [userId, `%${query}%`];
  const { rows } = await pool.query(`SELECT t.*, l.name as list_name FROM tasks t LEFT JOIN task_lists l ON t.list_id = l.id WHERE t.user_id = $1 AND t.deleted_at IS NULL AND t.title ILIKE $2 ORDER BY t.updated_at DESC LIMIT 10`, values);
  return rows;
}

export async function softDeleteTaskForUser(userId, taskId) {
  const query = `
    WITH deleted_parent AS (
      UPDATE tasks 
      SET deleted_at = NOW(), updated_at = NOW() 
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL 
      RETURNING id
    ),
    deleted_subtasks AS (
      UPDATE tasks 
      SET deleted_at = NOW(), updated_at = NOW() 
      WHERE parent_task_id = $1 AND user_id = $2
    )
    SELECT id FROM deleted_parent;
  `;
  const { rows } = await pool.query(query, [taskId, userId]);
  return rows[0];
}

export async function permanentlyDeleteTaskForUser(userId, taskId) {
  const query = `
    WITH RECURSIVE task_tree AS (
      SELECT id FROM tasks WHERE id = $1 AND user_id = $2
      UNION ALL
      SELECT t.id FROM tasks t INNER JOIN task_tree tt ON t.parent_task_id = tt.id
    )
    DELETE FROM tasks WHERE id IN (SELECT id FROM task_tree) RETURNING id
  `;
  const { rows } = await pool.query(query, [taskId, userId]);
  return rows[0] || { id: taskId };
}

export async function bulkPermanentlyDeleteTasksForUser(userId, taskIds) {
  if (!taskIds || !taskIds.length) return [];
  const query = `
    WITH RECURSIVE task_tree AS (
      SELECT id FROM tasks WHERE id = ANY($2::uuid[]) AND user_id = $1
      UNION ALL
      SELECT t.id FROM tasks t INNER JOIN task_tree tt ON t.parent_task_id = tt.id
    )
    DELETE FROM tasks WHERE id IN (SELECT id FROM task_tree) RETURNING id
  `;
  const { rows } = await pool.query(query, [userId, taskIds]);
  return rows;
}

export async function deleteCompletedTasksForListUser(userId, listId) {
  const query = `
    UPDATE tasks 
    SET deleted_at = NOW(), updated_at = NOW() 
    WHERE user_id = $1 AND list_id = $2 AND is_completed = true AND deleted_at IS NULL 
    RETURNING id
  `;
  const { rows } = await pool.query(query, [userId, listId]);
  return rows;
}

export async function cleanupOldTasks(userId) {
  await pool.query(`DELETE FROM tasks WHERE user_id = $1 AND deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '1 year'`, [userId]);
}