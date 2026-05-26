import express from 'express';
import { 
  getTaskLists, 
  deleteTaskList, 
  createTaskList, 
  renameTaskList, 
  reorderTaskLists,
  restoreTaskList
} from '../controllers/tasklists.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', requireAuth, getTaskLists);

router.post('/', requireAuth, createTaskList);

// 🔥 NEW: Reorder Route (Must come before /:id)
router.patch('/reorder', requireAuth, reorderTaskLists);

router.patch('/:id', requireAuth, renameTaskList);

router.delete('/:id', requireAuth, deleteTaskList);

// 🔥 NEW: Restore Route for Undo functionality
router.post('/:id/restore', requireAuth, restoreTaskList);

export default router;