import { pool } from '../config/db.js';
import { 
  getTaskListsForUser, 
  createTaskListForUser, 
  renameTaskListForUser,
  reorderTaskListsForUser,
  softDeleteTaskListForUser,
  restoreTaskListForUser,
  updateTaskListSortOption
} from '../services/tasklists.service.js';

export async function getTaskLists(req, res, next) {
  try {
    const userId = req.user.id;
    const lists = await getTaskListsForUser(userId);
    return res.json({ lists });
  } catch (err) {
    return next(err);
  }
}

export async function createTaskList(req, res, next) {
  try {
    const userId = req.user.id;
    
    // 🔥 FIX: Read 'category' from the request
    const { name, category } = req.body || {};

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'List name is required.' });
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return res.status(400).json({ message: 'List name cannot be empty.' });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({ message: 'List name is too long (max 100 characters).' });
    }
    
    // 🔥 FIX: Pass the category to the database
    const newList = await createTaskListForUser(userId, trimmedName, category || 'OTHERS');
    
    return res.status(201).json({ list: newList });
  } catch (err) {
    return next(err);
  }
}


export async function renameTaskList(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.id;
    const { name } = req.body || {};
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'List name is required.' });
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return res.status(400).json({ message: 'List name cannot be empty.' });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({ message: 'List name is too long (max 100 characters).' });
    }
    
    const updatedList = await renameTaskListForUser(userId, listId, trimmedName);

    if (!updatedList) {
      return res.status(404).json({ message: 'List not found.' });
    }

    return res.json({ list: updatedList });
  } catch (err) {
    return next(err);
  }
}

export async function reorderTaskLists(req, res, next) {
  try {
    const userId = req.user.id;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds must be an array.' });
    }

    await reorderTaskListsForUser(userId, orderedIds);
    return res.status(200).json({ message: 'Lists reordered successfully.' });
  } catch (err) {
    return next(err);
  }
}

export async function deleteTaskList(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.id;
    
    // Check if list exists and is default
    const { rows } = await pool.query(
      `SELECT id, is_default FROM task_lists WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [listId, userId]
    );

    const list = rows[0];

    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    
    if (list.is_default) {
      return res.status(400).json({ message: 'Default list cannot be deleted.' });
    }

    await softDeleteTaskListForUser(userId, listId);

    return res.json({ message: 'List archived successfully.' });
  } catch (err) {
    return next(err);
  }
}

export async function restoreTaskList(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.id;
    await restoreTaskListForUser(userId, listId);
    return res.json({ message: 'List restored successfully' });
  } catch (err) {
    return next(err);
  }
}

export async function updateTaskListSort(req, res, next) {
  try {
    const userId = req.user.id;
    const listId = req.params.id;
    const { sortOption } = req.body || {};

    if (!sortOption || typeof sortOption !== 'string') {
      return res.status(400).json({ message: 'sortOption is required.' });
    }

    const updatedList = await updateTaskListSortOption(userId, listId, sortOption);

    if (!updatedList) {
      return res.status(404).json({ message: 'List not found.' });
    }

    return res.json({ list: updatedList });
  } catch (err) {
    return next(err);
  }
}