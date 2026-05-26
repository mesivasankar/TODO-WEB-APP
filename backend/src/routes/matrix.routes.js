import express from 'express';
import * as matrixController from '../controllers/matrix.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', requireAuth, matrixController.getMatrixTasks);
router.post('/', requireAuth, matrixController.createMatrixTask);
router.patch('/:id', requireAuth, matrixController.updateMatrixTask); // 🔥 NEW: For Edit/Toggle
router.delete('/:id', requireAuth, matrixController.deleteMatrixTask);

export default router;