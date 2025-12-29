import { pool } from '../config/db.js';

export async function getTasksForList(userId, listId) {
  const query = `
    SELECT
      id,
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      sort_order,
      deleted_at,
      completed_at,
      created_at,
      updated_at
    FROM tasks
    WHERE user_id = $1
      AND list_id = $2
      AND deleted_at IS NULL
    ORDER BY sort_order ASC, created_at ASC
  `;

  const values = [userId, listId];

  const { rows } = await pool.query(query, values);

  return rows;
}




export async function createTaskInList(userId, listId, { title, description, dueDate, parentTaskId }) {
  const query = `
    INSERT INTO tasks (
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      sort_order
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      FALSE,
      FALSE,
      $6,
      COALESCE(
        (SELECT MAX(sort_order) + 1 FROM tasks WHERE user_id = $1 AND list_id = $2),
         -1
      ) + 1
    )
    RETURNING
      id,
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      sort_order,
      deleted_at,
      completed_at,
      created_at,
      updated_at
  `;

  const values = [
    userId,
    listId,
    parentTaskId ?? null,
    title,
    description ?? null,
    dueDate ?? null,
  ];

  const { rows } = await pool.query(query, values);

  return rows[0];
}



export async function updateTaskForUser(
  userId,
  taskId,
  {
    title,
    description,
    dueDate,
    isCompleted,
    isStarred,
    listId,
  }
) {
  const fields = [];
  const values = [];
  let index = 1;


  if (title !== undefined) {
    fields.push(`title = $${index}`);
    values.push(title);
    index += 1;
  }

  if (description !== undefined) {
    fields.push(`description = $${index}`);
    values.push(description);
    index += 1;
  }

  if (dueDate !== undefined) {
    fields.push(`due_date = $${index}`);
    values.push(dueDate);
    index += 1;
  }

  if (isCompleted !== undefined) {
    fields.push(`is_completed = $${index}`);
    fields.push(`completed_at = CASE WHEN $${index} = TRUE THEN NOW() ELSE NULL END`);
    values.push(isCompleted);
    index += 1;
  }

  if (isStarred !== undefined) {
    fields.push(`is_starred = $${index}`);
    values.push(isStarred);
    index += 1;
  }

  if (listId !== undefined) {
    fields.push(`list_id = $${index}`);
    values.push(listId);
    index += 1;
  }

 

  
  fields.push('updated_at = NOW()');

  if (fields.length === 1) {
    return null;
  }

  const query = `
    UPDATE tasks
    SET ${fields.join(', ')}
    WHERE id = $${index}
      AND user_id = $${index + 1}
      AND deleted_at IS NULL
    RETURNING
      id,
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      sort_order,
      deleted_at,
      completed_at,
      created_at,
      updated_at
  `;

  values.push(taskId, userId);

  const { rows } = await pool.query(query, values);

  return rows[0] || null;
}



export async function softDeleteTaskForUser(userId, taskId) {
  const query = `
    UPDATE tasks
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
      AND user_id = $2
      AND deleted_at IS NULL
    RETURNING
      id,
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      sort_order,
      deleted_at,
      completed_at,
      created_at,
      updated_at
  `;

  const values = [taskId, userId];

  const { rows } = await pool.query(query, values);

  return rows[0] || null;
}


export async function restoreTaskForUser(userId, taskId) {
  const query = `
    UPDATE tasks
    SET
      deleted_at = NULL,
      updated_at = NOW()
    WHERE id = $1
      AND user_id = $2
      AND deleted_at IS NOT NULL
    RETURNING
      id,
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      sort_order,
      deleted_at,
      completed_at,
      created_at,
      updated_at
  `;
  const values = [taskId, userId];
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}




export async function reorderTasksInList(userId, listId, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new Error('orderedIds must be a non-empty array of task IDs.');
  }

  const verifyQuery = `
    SELECT id
    FROM tasks
    WHERE id = ANY($1::uuid[])
      AND user_id = $2
      AND list_id = $3
      AND deleted_at IS NULL
  `;
  const verifyValues = [orderedIds, userId, listId];
  const verifyRes = await pool.query(verifyQuery, verifyValues);

  if (verifyRes.rows.length !== orderedIds.length) {
    throw new Error('One or more tasks were not found or do not belong to this list.');
  }

  const k = orderedIds.length;
  const whenClauses = orderedIds.map((_, i) => `WHEN id = $${i + 1} THEN ${i + 1}`).join(' ');
  const inListPlaceholders = orderedIds.map((_, i) => `$${i + 1}`).join(', ');

  const updateQuery = `
    UPDATE tasks
    SET
      sort_order = CASE ${whenClauses} ELSE sort_order END,
      updated_at = NOW()
    WHERE id IN (${inListPlaceholders})
      AND user_id = $${k + 1}
      AND list_id = $${k + 2}
      AND deleted_at IS NULL
    RETURNING
      id,
      user_id,
      list_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      sort_order,
      created_at,
      updated_at
  `;

  const updateValues = [...orderedIds, userId, listId];


  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(updateQuery, updateValues);
    await client.query('COMMIT');
    return rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}



export async function getTaskByIdForUser(userId, taskId) {
  const query = `
    SELECT
      id,
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      sort_order,
      deleted_at,
      completed_at,
      created_at,
      updated_at
    FROM tasks
    WHERE id = $1
      AND user_id = $2
      AND deleted_at IS NULL
    LIMIT 1
  `;
  const values = [taskId, userId];
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}



export async function getSubtasksForTask(userId, parentTaskId) {
  const query = `
    SELECT
      id,
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      sort_order,
      deleted_at,
      completed_at,
      created_at,
      updated_at
    FROM tasks
    WHERE parent_task_id = $1
      AND user_id = $2
      AND deleted_at IS NULL
    ORDER BY sort_order ASC, created_at ASC
  `;
  const values = [parentTaskId, userId];
  const { rows } = await pool.query(query, values);
  return rows;
}



export async function getTasksForListByView(userId, listId, view = 'my') {
  const baseParams = [userId, listId];

  let whereExtra = 'AND deleted_at IS NULL';

  if (view === 'my') {
    whereExtra += ' AND is_completed = FALSE';
  } else if (view === 'completed') {
    whereExtra += ' AND is_completed = TRUE';
  } else if (view === 'starred') {
    whereExtra += ' AND is_starred = TRUE';
  }

  const { rows } = await pool.query(
    `
    SELECT
      id,
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      reminder_at,
      sort_order,
      deleted_at,
      completed_at,
      created_at,
      updated_at
    FROM tasks
    WHERE user_id = $1
      AND list_id = $2
      ${whereExtra}
    ORDER BY sort_order ASC, created_at ASC
    `,
    baseParams
  );

  return rows;
}



export async function getAllStarredTasksForUser(userId) {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      user_id,
      list_id,
      parent_task_id,
      title,
      description,
      is_completed,
      is_starred,
      due_date,
      reminder_at,
      sort_order,
      deleted_at,
      completed_at,
      created_at,
      updated_at
    FROM tasks
    WHERE user_id = $1
      AND deleted_at IS NULL
      AND is_starred = TRUE
    ORDER BY sort_order ASC, created_at ASC
    `,
    [userId]
  );

  return rows;
}
