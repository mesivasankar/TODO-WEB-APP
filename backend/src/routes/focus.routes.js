import express from 'express';
import { startFocus, stopFocus, getFocusStatus } from '../controllers/focus.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/start', requireAuth, startFocus);
router.post('/stop', requireAuth, stopFocus);
router.get('/status', requireAuth, getFocusStatus);

export default router;