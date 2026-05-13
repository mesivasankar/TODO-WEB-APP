const pool = require("../config/db"); // Assuming you use a pool connection for Postgres

class MatrixService {
  async getAllTasks() {
    const result = await pool.query(
      "SELECT * FROM matrix_tasks ORDER BY created_at DESC"
    );
    return result.rows;
  }

  async createTask(text, quadrant) {
    const result = await pool.query(
      "INSERT INTO matrix_tasks (text, quadrant) VALUES ($1, $2) RETURNING *",
      [text, quadrant]
    );
    return result.rows[0];
  }

  async deleteTask(id) {
    await pool.query("DELETE FROM matrix_tasks WHERE id = $1", [id]);
    return { success: true };
  }
}

module.exports = new MatrixService();