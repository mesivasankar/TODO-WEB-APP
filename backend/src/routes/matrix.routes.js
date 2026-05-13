import express from 'express';
import * as matrixController from '../controllers/matrix.controller.js';

const router = express.Router();

router.get('/', matrixController.getMatrixTasks);
router.post('/', matrixController.createMatrixTask);
router.patch('/:id', matrixController.updateMatrixTask); // 🔥 NEW: For Edit/Toggle
router.delete('/:id', matrixController.deleteMatrixTask);

export default router;