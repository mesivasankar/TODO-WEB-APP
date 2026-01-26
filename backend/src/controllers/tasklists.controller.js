import { pool } from '../config/db.js';
import { 
  getTaskListsForUser, 
  createTaskListForUser, 
  renameTaskListForUser,
  reorderTaskListsForUser // Import new service
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
    
    const newList = await createTaskListForUser(userId, trimmedName);
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

// 🔥 NEW: Reorder Controller
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

    await pool.query(
      `DELETE FROM task_lists WHERE id = $1 AND user_id = $2`,
      [listId, userId]
    );

    return res.json({ message: 'List deleted successfully.' });
  } catch (err) {
    return next(err);
  }
}