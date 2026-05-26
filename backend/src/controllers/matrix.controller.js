import { pool } from '../config/db.js';

export const getMatrixTasks = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM matrix_tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createMatrixTask = async (req, res, next) => {
  try {
    const { text, quadrant } = req.body;
    const result = await pool.query(
      'INSERT INTO matrix_tasks (task_text, quadrant, user_id) VALUES ($1, $2, $3) RETURNING *',
      [text, quadrant, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateMatrixTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, is_completed, quadrant } = req.body;
    const result = await pool.query(
      'UPDATE matrix_tasks SET task_text = COALESCE($1, task_text), is_completed = COALESCE($2, is_completed), quadrant = COALESCE($3, quadrant) WHERE id = $4 AND user_id = $5 RETURNING *',
      [text, is_completed, quadrant, id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteMatrixTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM matrix_tasks WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};