import express from 'express';
import { suggestSubtasks, getAiUsage } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/ai/usage
router.get('/usage', requireAuth, getAiUsage);

// POST /api/ai/suggest-subtasks
router.post('/suggest-subtasks', requireAuth, suggestSubtasks);

export default router;