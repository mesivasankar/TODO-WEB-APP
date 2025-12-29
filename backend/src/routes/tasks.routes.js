import express from 'express';
import { getTasksInList, createTask, updateTask, sortTasksInList , deleteTask, getTask, restoreTask, getSubtasks, getAllStarredTasks   } from '../controllers/tasks.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router({ mergeParams: true });

router.get('/starred', requireAuth, getAllStarredTasks);

router.get('/', requireAuth, getTasksInList);

router.patch('/:taskId/restore', requireAuth, restoreTask);

router.get('/:taskId/subtasks', requireAuth, getSubtasks);

router.get('/:taskId', requireAuth, getTask);

router.post('/', requireAuth, createTask);

router.patch('/sort', requireAuth, sortTasksInList);

router.patch('/:taskId', requireAuth, updateTask);



router.delete('/:taskId', requireAuth, deleteTask);


export default router;
