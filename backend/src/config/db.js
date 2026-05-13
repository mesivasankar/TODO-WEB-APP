import pkg from 'pg';
import { env } from './env.js';

const { Pool, types } = pkg;

// 🔥 FORCE PostgreSQL DATE (OID 1082) to remain a string, not a Date object
types.setTypeParser(1082, (val) => val); 

const isLocal = env.dbUrl.includes('localhost');

export const pool = new Pool({
  connectionString: env.dbUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export async function testDbConnection() {
  const result = await pool.query('SELECT NOW()');
  console.log('DB connected at:', result.rows[0].now);
}