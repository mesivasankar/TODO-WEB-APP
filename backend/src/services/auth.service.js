
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const SALT_ROUNDS = 10;


export async function findUserByEmail(email) {
  const query = `
    SELECT id, email, password_hash, is_email_verified
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
}


export async function createUser({ email, name, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const query = `
    INSERT INTO users (email, name, password_hash, is_email_verified)
    VALUES ($1, $2, $3, FALSE)
    RETURNING id, email, name, is_email_verified, created_at
  `;
  const values = [email, name || null, passwordHash];

  const result = await pool.query(query, values);
  const user = result.rows[0];


  const defaultListQuery = `
    INSERT INTO task_lists (user_id, name, sort_order, is_default)
    VALUES ($1, $2, 0, TRUE)
  `;
  const defaultListValues = [user.id, 'My List'];

  await pool.query(defaultListQuery, defaultListValues);


  return user;

}



export async function createEmailVerificationToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24 hours

  const query = `
    INSERT INTO email_verification_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, token, expires_at
  `;
  const values = [userId, token, expiresAt];

  const result = await pool.query(query, values);
  return result.rows[0];
}



export async function authenticateUser(email, password) {

  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }



  if (!user.password_hash) {
    return { googleOnly: true };
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return null;
  }


  return user;
}

const AUTH_JWT_EXPIRES_IN = '7d';

export function signAuthToken(user) {

  const payload = {
    userId: user.id,
  };

  const options = {
    expiresIn: AUTH_JWT_EXPIRES_IN,
  };

  return jwt.sign(payload, env.jwtSecret, options);
}
