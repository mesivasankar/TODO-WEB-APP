import express from 'express';
import { suggestSubtasks } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/ai/suggest-subtasks
router.post('/suggest-subtasks', requireAuth, suggestSubtasks);

export default router;