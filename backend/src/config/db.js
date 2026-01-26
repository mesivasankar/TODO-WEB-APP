import pkg from 'pg';
import { env } from './env.js';

const { Pool } = pkg;

const isLocal = env.dbUrl.includes('localhost');

export const pool = new Pool({
  connectionString: env.dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});


export async function testDbConnection() {
  const result = await pool.query('SELECT NOW()');
  console.log('DB connected at:', result.rows[0].now);
}
