import express from 'express';
import { 
  getTasksInList, 
  createTask, 
  updateTask, 
  sortTasksInList, 
  deleteTask, 
  permanentDeleteTask, 
  getTask, 
  restoreTask, 
  getSubtasks, 
  getAllStarredTasks,
  searchTasks,
  getTodayTasks,
  getUpcomingTasks,
  getOverdueTasks, // 🔥 Now this export exists!
  getSpecialTaskCounts,
  getAnalytics,
  clearCompletedTasks,
  bulkRestoreTasks,
  bulkPermanentDeleteTasks,
  getHistoryTasks
} from '../controllers/tasks.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router({ mergeParams: true });

// 1. Starred & Search & History
router.get('/starred', requireAuth, getAllStarredTasks);
router.get('/search', requireAuth, searchTasks);
router.get('/history', requireAuth, getHistoryTasks);

// 2. 🔥 Smart Views & Analytics (MUST come before /:taskId)
router.get('/special-counts', requireAuth, getSpecialTaskCounts);
router.get('/today', requireAuth, getTodayTasks);
router.get('/upcoming', requireAuth, getUpcomingTasks);
router.get('/overdue', requireAuth, getOverdueTasks); 
router.get('/analytics', requireAuth, getAnalytics);

// 3. List Routes
router.get('/', requireAuth, getTasksInList);
router.post('/', requireAuth, createTask);
router.patch('/reorder', requireAuth, sortTasksInList); 

// 4. Task Specific Routes
router.patch('/restore-bulk', requireAuth, bulkRestoreTasks);
router.patch('/:taskId/restore', requireAuth, restoreTask);
router.get('/:taskId/subtasks', requireAuth, getSubtasks);
router.get('/:taskId', requireAuth, getTask);
router.patch('/:taskId', requireAuth, updateTask);

// 5. Delete Routes
router.delete('/completed', requireAuth, clearCompletedTasks);
router.delete('/permanent-bulk', requireAuth, bulkPermanentDeleteTasks);
router.delete('/:taskId', requireAuth, deleteTask);
router.delete('/:taskId/permanent', requireAuth, permanentDeleteTask);

export default router;