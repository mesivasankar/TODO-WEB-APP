import { 
  getTasksForList, 
  createTaskInList, 
  updateTaskForUser, 
  reorderTasksInList, 
  softDeleteTaskForUser, 
  permanentlyDeleteTaskForUser, 
  getTaskByIdForUser, 
  restoreTaskForUser, 
  getSubtasksForTask, 
  getAllStarredTasksForUser,
  searchTasksForUser,
  cleanupOldTasks,
  deleteCompletedTasksForListUser,
  bulkRestoreTasksForUser,
  bulkPermanentlyDeleteTasksForUser
} from '../services/tasks.service.js';
import { pool } from '../config/db.js';

// 🔥 Helper to ensure dates are always YYYY-MM-DD
const formatDateOnly = (dateInput) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  return d.toISOString().split('T')[0];
};

function serializeTask(task) {
  if (!task) return null;
  const { user_id, ...publicFields } = task;
  // Ensure the due_date sent to frontend is just the date string
  if (publicFields.due_date) {
    publicFields.due_date = formatDateOnly(publicFields.due_date);
  }
  return publicFields;
}

function serializeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(serializeTask);
}

// --- STANDARD CONTROLLERS ---

export async function getTodayTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const query = `
      SELECT * FROM tasks 
      WHERE user_id = $1 
      AND due_date = CURRENT_DATE 
      AND is_completed = false 
      AND deleted_at IS NULL 
      ORDER BY is_starred DESC, created_at ASC`;
    const { rows } = await pool.query(query, [userId]);
    return res.json({ tasks: serializeTasks(rows) });
  } catch (err) { next(err); }
}

export async function getOverdueTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const query = `
      SELECT * FROM tasks 
      WHERE user_id = $1 
      AND due_date < CURRENT_DATE 
      AND is_completed = false 
      AND deleted_at IS NULL 
      ORDER BY due_date ASC, created_at ASC`;
    const { rows } = await pool.query(query, [userId]);
    return res.json({ tasks: serializeTasks(rows) });
  } catch (err) { next(err); }
}

export async function getUpcomingTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const query = `
      SELECT * FROM tasks 
      WHERE user_id = $1 
      AND due_date > CURRENT_DATE 
      AND due_date <= CURRENT_DATE + INTERVAL '7 days' 
      AND is_completed = false 
      AND deleted_at IS NULL 
      ORDER BY due_date ASC`;
    const { rows } = await pool.query(query, [userId]);
    return res.json({ tasks: serializeTasks(rows) });
  } catch (err) { next(err); }
}

export async function getSpecialTaskCounts(req, res, next) {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND is_completed = false) as overdue,
        COUNT(*) FILTER (WHERE due_date = CURRENT_DATE AND is_completed = false) as today,
        COUNT(*) FILTER (WHERE due_date > CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days' AND is_completed = false) as upcoming,
        COUNT(*) FILTER (WHERE is_starred = true AND is_completed = false) as starred
      FROM tasks
      WHERE user_id = $1 AND deleted_at IS NULL;
    `;
    const { rows } = await pool.query(query, [userId]);
    return res.json({ 
      counts: {
        overdue: parseInt(rows[0].overdue || 0),
        today: parseInt(rows[0].today || 0),
        upcoming: parseInt(rows[0].upcoming || 0),
        starred: parseInt(rows[0].starred || 0)
      }
    });
  } catch (err) { next(err); }
}

export async function getTasksInList(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.listId;
    const tasks = await getTasksForList(userId, listId);
    return res.json({ tasks: serializeTasks(tasks) });
  } catch (err) { return next(err); }
}

export async function createTask(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.listId;
    const { title, description, dueDate, parentTaskId, recurrenceType, category } = req.body;
    
    if (!title || !title.trim()) return res.status(400).json({ message: 'Title is required.' });

    // 🔥 FIX: Standardize incoming date string
    const sanitizedDueDate = formatDateOnly(dueDate);

    const task = await createTaskInList(userId, listId, {
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: sanitizedDueDate,
      parentTaskId: parentTaskId || null,
      recurrenceType,
      category 
    });
    return res.status(201).json({ task: serializeTask(task) });
  } catch (err) { return next(err); }
}

export async function updateTask(req, res, next) {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;
    const updates = req.body;

    // 🔥 FIX: Sanitize date if it's being updated
    if (updates.dueDate) {
      updates.dueDate = formatDateOnly(updates.dueDate);
    }

    const task = await updateTaskForUser(userId, taskId, updates);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    if (updates.isCompleted === true && task.recurrence_type) {
      let nextDate = new Date(task.due_date);
      
      if (task.recurrence_type === 'DAILY') nextDate.setDate(nextDate.getDate() + 1);
      if (task.recurrence_type === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
      if (task.recurrence_type === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);
      if (task.recurrence_type === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);

      await createTaskInList(userId, task.list_id, {
        title: task.title,
        description: task.description,
        dueDate: formatDateOnly(nextDate), // 🔥 FIX: Format here too
        recurrenceType: task.recurrence_type,
        category: task.category
      });
    }

    if (updates.isCompleted !== undefined) {
      await pool.query('UPDATE tasks SET is_completed = $1 WHERE parent_task_id = $2', [updates.isCompleted, taskId]);
    }

    return res.json({ task: serializeTask(task) });
  } catch (err) { return next(err); }
}

export async function sortTasksInList(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.listId;
    const orderedIds = req.body;
    const updatedTasks = await reorderTasksInList(userId, listId, orderedIds);
    return res.json({ tasks: serializeTasks(updatedTasks) });
  } catch (err) { return next(err); }
}

export async function getTask(req, res, next) {
  try {
    const task = await getTaskByIdForUser(req.user.id, req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    return res.json({ task: serializeTask(task) });
  } catch (err) { return next(err); }
}

export async function getSubtasks(req, res, next) {
  try {
    const subtasks = await getSubtasksForTask(req.user.id, req.params.taskId);
    return res.json({ tasks: serializeTasks(subtasks) });
  } catch (err) { return next(err); }
}

export async function restoreTask(req, res, next) {
  try {
    const task = await restoreTaskForUser(req.user.id, req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    return res.json({ task: serializeTask(task) });
  } catch (err) { return next(err); }
}

export async function bulkRestoreTasks(req, res, next) {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds)) return res.status(400).json({ message: 'taskIds must be an array' });
    const restoredTasks = await bulkRestoreTasksForUser(req.user.id, taskIds);
    return res.json({ message: 'Tasks restored successfully.', count: restoredTasks.length });
  } catch (err) { return next(err); }
}

export async function getAllStarredTasks(req, res, next) {
  try {
    const tasks = await getAllStarredTasksForUser(req.user.id);
    return res.json({ tasks: serializeTasks(tasks) });
  } catch (err) { next(err); }
}

export async function deleteTask(req, res, next) {
  try {
    const task = await softDeleteTaskForUser(req.user.id, req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    return res.json({ message: 'Task archived successfully.', task: serializeTask(task) });
  } catch (err) { return next(err); }
}

export async function permanentDeleteTask(req, res, next) {
  try {
    await permanentlyDeleteTaskForUser(req.user.id, req.params.taskId);
    return res.status(204).send(); 
  } catch (err) { return next(err); }
}

export async function bulkPermanentDeleteTasks(req, res, next) {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds)) return res.status(400).json({ message: 'taskIds must be an array' });
    const deletedTasks = await bulkPermanentlyDeleteTasksForUser(req.user.id, taskIds);
    return res.json({ message: 'Tasks permanently deleted.', count: deletedTasks.length });
  } catch (err) { return next(err); }
}

export async function clearCompletedTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.listId;
    if (!listId) return res.status(400).json({ message: 'List ID is required.' });
    const deletedTasks = await deleteCompletedTasksForListUser(userId, listId);
    return res.json({ message: 'Completed tasks cleared successfully.', count: deletedTasks.length });
  } catch (err) { return next(err); }
}

export async function searchTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const { q } = req.query; 
    if (!q || !q.trim()) return res.json({ tasks: [] });
    const tasks = await searchTasksForUser(userId, q.trim());
    return res.json({ tasks: serializeTasks(tasks) });
  } catch (err) { return next(err); }
}

export async function getAnalytics(req, res, next) {
  try {
    const userId = req.user.id;
    cleanupOldTasks(userId).catch(err => console.error("Background cleanup error:", err));

    const tasksQuery = `
      SELECT completed_at, category
      FROM tasks
      WHERE user_id = $1 AND is_completed = true AND completed_at >= NOW() - INTERVAL '1 year'
      ORDER BY completed_at DESC
    `;
    const { rows: completedTasks } = await pool.query(tasksQuery, [userId]);

    return res.json({
        completedTasks: completedTasks.map(t => ({
          completedAt: t.completed_at,
          category: t.category ? t.category.trim().toUpperCase() : 'OTHERS'
        }))
    });
  } catch (err) { 
      console.error("❌ ANALYTICS ERROR:", err);
      return next(err); 
  }
}

export async function getHistoryTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const { date } = req.query; // optional 'YYYY-MM-DD'
    
    let query = `
      SELECT t.*, tl.name as list_name 
      FROM tasks t
      LEFT JOIN task_lists tl ON t.list_id = tl.id
      WHERE t.user_id = $1 
        AND t.due_date >= CURRENT_DATE - INTERVAL '365 days'
        AND t.due_date <= CURRENT_DATE
        AND t.deleted_at IS NULL
    `;
    const params = [userId];
    
    if (date) {
      query += ` AND t.due_date = $2`;
      params.push(date);
    }
    
    query += ` ORDER BY t.due_date DESC, t.created_at DESC`;
    
    const { rows } = await pool.query(query, params);
    return res.json({ tasks: serializeTasks(rows) });
  } catch (err) { 
    console.error("Error in getHistoryTasks:", err);
    return next(err); 
  }
}