// Trigger nodemon restart
import dotenv from 'dotenv';
import { pool } from './config/db.js';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 3000;

pool.query('SELECT NOW()')
  .then(res => console.log("Database connected:", res.rows[0]))
  .catch(err => console.error("DB connection error", err));

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
