import express from 'express';
import * as focusController from '../controllers/focus.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/start', requireAuth, focusController.startFocusSession);
router.patch('/:id', requireAuth, focusController.patchFocusSession);
router.post('/:id/beacon-abandon', requireAuth, focusController.beaconAbandonFocusSession);
router.get('/stats', requireAuth, focusController.getFocusSessionsStats);

export default router;
