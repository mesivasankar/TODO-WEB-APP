import { pool } from '../config/db.js';

export const getMatrixTasks = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM matrix_tasks ORDER BY created_at DESC'
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
      'INSERT INTO matrix_tasks (task_text, quadrant) VALUES ($1, $2) RETURNING *',
      [text, quadrant]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateMatrixTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, is_completed } = req.body;
    const result = await pool.query(
      'UPDATE matrix_tasks SET task_text = COALESCE($1, task_text), is_completed = COALESCE($2, is_completed) WHERE id = $3 RETURNING *',
      [text, is_completed, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteMatrixTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM matrix_tasks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};