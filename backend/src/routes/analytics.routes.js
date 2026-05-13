import express from 'express';
import { getAnalytics } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js'; // Ensure correct path

const router = express.Router();

router.get('/', requireAuth, getAnalytics);

export default router;