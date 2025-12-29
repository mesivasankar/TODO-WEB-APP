import { getTasksForList, createTaskInList, updateTaskForUser, reorderTasksInList, softDeleteTaskForUser, getTaskByIdForUser, restoreTaskForUser, getSubtasksForTask, getAllStarredTasksForUser  } from '../services/tasks.service.js';
import { pool } from '../config/db.js';



function serializeTask(task) {
  if (!task) return null;
  const {
    user_id,
    ...publicFields
  } = task;
  return publicFields;
}


function serializeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(serializeTask);
}


export async function getTasksInList(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.listId;

    if (!listId) {
      return res.status(400).json({ message: 'List ID is required.' });
    }

    const tasks = await getTasksForList(userId, listId);
    return res.json({ tasks: serializeTasks(tasks) });
  } catch (err) {
    return next(err);
  }
}



export async function createTask(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.listId;

    if (!listId) {
      return res.status(400).json({ message: 'List ID is required.' });
    }

    const {
      title,
      description,
      dueDate,
      parentTaskId,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    const cleanTitle = title.trim();
    const cleanDescription = description?.trim() || null;
    const cleanDueDate = dueDate || null;
    const cleanParentTaskId =
      typeof parentTaskId === 'string' && parentTaskId.trim()
        ? parentTaskId.trim()
        : null;


    if (cleanParentTaskId) {
      const parentRes = await pool.query(
        `SELECT id FROM tasks WHERE id = $1 AND user_id = $2 AND list_id = $3 AND deleted_at IS NULL LIMIT 1`,
        [cleanParentTaskId, userId, listId]
      );
      if (parentRes.rows.length === 0) {
        return res.status(400).json({ message: 'Parent task not found in this list.' });
      }
    }


    const task = await createTaskInList(userId, listId, {
      title: cleanTitle,
      description: cleanDescription,
      dueDate: cleanDueDate,
      parentTaskId: cleanParentTaskId,
    });

    return res.status(201).json({ task: serializeTask(task) });
  } catch (err) {
    return next(err);
  }
}



export async function updateTask(req, res, next) {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }

    const {
      title,
      description,
      dueDate,
      isCompleted,
      isStarred,
      listId,
    } = req.body;

    const updates = {};


    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Title, if provided, cannot be empty.' });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (description === null) {
        updates.description = null;
      } else {
        const trimmed = description.trim();
        updates.description = trimmed.length > 0 ? trimmed : null;
      }
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate;
    }

    if (isCompleted !== undefined) {
      if (typeof isCompleted === 'string') {
        updates.isCompleted = isCompleted === 'true';
      } else {
        updates.isCompleted = Boolean(isCompleted);
      }
    }

    if (isStarred !== undefined) {
      if (typeof isStarred === 'string') {
        updates.isStarred = isStarred === 'true';
      } else {
        updates.isStarred = Boolean(isStarred);
      }
    }

    if (listId !== undefined) {
      if (typeof listId !== 'string' || !listId.trim()) {
        return res.status(400).json({ message: 'listId, if provided, must be a non-empty string.' });
      }
      updates.listId = listId.trim();
    }


    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    const task = await updateTaskForUser(userId, taskId, updates);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    return res.json({ task: serializeTask(task) });
  } catch (err) {
    return next(err);
  }
}


export async function sortTasksInList(req, res, next) {
  try {

    const userId = req.user.id;
    const listId = req.params.listId;

    if (!listId) {
      return res.status(400).json({ message: 'List ID is required.' });
    }

    const orderedIds = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ message: 'Request body must be a non-empty array of task IDs.' });
    }

    for (const id of orderedIds) {
      if (typeof id !== 'string' || !id.trim()) {
        return res.status(400).json({ message: 'All task IDs must be non-empty strings.' });
      }
    }

    const updatedTasks = await reorderTasksInList(userId, listId, orderedIds.map((s) => s.trim()));

    return res.json({ tasks: serializeTasks(updatedTasks) });
  } catch (err) {
    return next(err);
  }
}


export async function getTask(req, res, next) {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }

    const task = await getTaskByIdForUser(userId, taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    return res.json({ task: serializeTask(task) });
  } catch (err) {
    return next(err);
  }
}



export async function getSubtasks(req, res, next) {
  try {
    const userId = req.user.id;
    const parentTaskId = req.params.taskId;

    if (!parentTaskId) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }

    const subtasks = await getSubtasksForTask(userId, parentTaskId);

    return res.json({ tasks: serializeTasks(subtasks) });
  } catch (err) {
    return next(err);
  }
}


export async function restoreTask(req, res, next) {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }

    const task = await restoreTaskForUser(userId, taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found or not deleted.' });
    }

    return res.json({ task: serializeTask(task) });
  } catch (err) {
    return next(err);
  }
}



export async function getAllStarredTasks(req, res, next) {
  try {
    const userId = req.user.id;

    const tasks = await getAllStarredTasksForUser(userId);

    return res.json({ tasks: serializeTasks(tasks) });
  } catch (err) {
    next(err);
  }
}




export async function deleteTask(req, res, next) {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }

    const task = await softDeleteTaskForUser(userId, taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }


    return res.json({ task: serializeTask(task) });
  } catch (err) {
    return next(err);
  }
}
