import express from 'express';
import { suggestSubtasks, getAiUsage, getDailyBriefing } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/ai/usage
router.get('/usage', requireAuth, getAiUsage);

// GET /api/ai/briefing
router.get('/briefing', requireAuth, getDailyBriefing);

// POST /api/ai/suggest-subtasks
router.post('/suggest-subtasks', requireAuth, suggestSubtasks);

export default router;