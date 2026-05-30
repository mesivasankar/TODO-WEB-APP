import { sendVerificationEmail } from '../utils/email.js';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import axios from 'axios';
import crypto from 'crypto';

import {
  validateEmail,
  validatePassword,
  validateName,
} from '../utils/validators.js';
import {
  findUserByEmail,
  createUser,
  createEmailVerificationToken,
  authenticateUser,
  signAuthToken,
} from '../services/auth.service.js';

const AUTH_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days
const AUTH_JWT_EXPIRES_IN = '7d';

export async function googleAuthStart(req, res, next) {
  try {
    const params = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: env.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return res.redirect(googleAuthUrl);
  } catch (err) {
    next(err);
  }
}

export async function googleAuthCallback(req, res, next) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: 'Missing "code" in callback URL' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: env.googleRedirectUri,
        grant_type: 'authorization_code',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ message: 'Failed to get access token from Google' });
    }

    const userInfoResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const googleUser = userInfoResponse.data;

    const googleId = googleUser.sub;
    const email = googleUser.email;
    const name = googleUser.name || '';

    if (!email) {
      return res.status(400).json({ message: 'Google account has no email' });
    }

    const client = await pool.connect();
    let user;
    try {
      await client.query('BEGIN');

      let result = await client.query(
        'SELECT id, email, name, is_email_verified FROM users WHERE google_id = $1',
        [googleId]
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
      } else {
        result = await client.query(
          'SELECT id, email, name, is_email_verified FROM users WHERE email = $1',
          [email]
        );

        if (result.rows.length > 0) {
          user = result.rows[0];
          await client.query(
            `UPDATE users
             SET google_id = $1,
                 is_email_verified = TRUE,
                 updated_at = NOW()
             WHERE id = $2`,
            [googleId, user.id]
          );
        } else {
          const insertUser = await client.query(
            `INSERT INTO users (email, name, google_id, is_email_verified)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, name, is_email_verified`,
            [email, name, googleId, true]
          );

          user = insertUser.rows[0];

          await client.query(
            `INSERT INTO task_lists (user_id, name, sort_order, is_default)
             VALUES ($1, $2, 0, TRUE)`,
            [user.id, 'My List']
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const token = jwt.sign(
      { userId: user.id },
      env.jwtSecret,
      { expiresIn: AUTH_JWT_EXPIRES_IN }
    );

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.isProduction ? 'none' : 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE
    });

    return res.redirect(`${env.clientUrl}/app`);
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    console.log('--- /api/auth/register called ---');
    console.log('Headers:', req.headers);
    console.log('Body received:', req.body);

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        message:
          'Request body is missing or not parsed. Make sure you send JSON with Content-Type: application/json.',
      });
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: 'Please provide a valid email address.',
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one symbol.',
      });
    }

    if (!validateName(name)) {
      return res.status(400).json({
        message: 'Name is invalid. Please provide a shorter valid name.',
      });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        message: 'Email already in use. Please login instead.',
      });
    }

    const user = await createUser({ email, name, password });
    const verificationToken = await createEmailVerificationToken(user.id);
    console.log('Email verification token (DEV ONLY):', verificationToken.token);

    const verificationUrl =
      `${env.serverBaseUrl}/api/auth/verify-email?token=${verificationToken.token}`;

    try {
      await sendVerificationEmail(user.email, verificationUrl);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        message:
          'Registration failed while sending verification email. Please try again later.',
      });
    }

    return res.status(201).json({
      message:
        'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_email_verified: user.is_email_verified,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function resendVerificationEmail(req, res, next) {
  try {
    const token = req.body?.token;

    if (!token) {
      return res.status(400).json({ message: "Missing token" });
    }

    const result = await pool.query(
      `
      SELECT u.id AS user_id, u.email
      FROM email_verification_tokens evt
      JOIN users u ON u.id = evt.user_id
      WHERE evt.token = $1
      LIMIT 1
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const { user_id, email } = result.rows[0];
    const newToken = crypto.randomBytes(32).toString("hex");

    await pool.query(
      `
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '24 hours')
      `,
      [user_id, newToken]
    );

    const verificationUrl =
      `${env.serverBaseUrl}/api/auth/verify-email?token=${newToken}`;

    await sendVerificationEmail(email, verificationUrl);

    return res.json({ message: "Verification email resent" });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    console.log('--- /api/auth/login called ---');
    console.log('Body received:', req.body);

    const { email, password } = req.body || {};

    if (!email && !password) {
      return res.status(400).json({
        message: 'Email and password are both required.',
      });
    } else if (!email) {
      return res.status(400).json({
        message: 'Email is required.',
      });
    } else if (!password) {
      return res.status(400).json({
        message: 'Password is required.',
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: 'Please provide a valid email address.',
      });
    }

    const user = await authenticateUser(email, password);

    if (user && user.googleOnly) {
      return res.status(400).json({
        message: 'This account uses Google Sign-In. Please log in using Google instead.',
      });
    }

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
      });
    }

    const token = signAuthToken(user);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.isProduction ? 'none' : 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE,
      expiresIn: '7d'
    });

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_email_verified: user.is_email_verified,
      },
    });
  } catch (err) {
    console.error('Error in login:', err);
    next(err);
  }
}

export function logout(req, res) {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
  });
  return res.json({ message: 'Logged out successfully' });
}

export async function verifyEmail(req, res, next) {
  const clientUrl = env.clientUrl;
  try {
    const { token } = req.query;
    if (!token) {
      return res.redirect(`${clientUrl}/verify-email/error?reason=invalid`);
    }

    const result = await pool.query(
      `
        SELECT
          evt.id,
          evt.user_id,
          evt.expires_at,
          evt.used_at,
          u.is_email_verified
        FROM email_verification_tokens AS evt
        JOIN users AS u
          ON u.id = evt.user_id
        WHERE evt.token = $1
      `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.redirect(`${clientUrl}/verify-email/error?reason=invalid`);
    }

    const record = result.rows[0];

    if (record.used_at) {
      return res.redirect(`${clientUrl}/verify-email/error?reason=used&token=${token}`);
    }

    if (new Date(record.expires_at) <= new Date()) {
      return res.redirect(`${clientUrl}/verify-email/error?reason=expired&token=${token}`);
    }

    if (record.is_email_verified) {
      return res.redirect(`${clientUrl}/verify-email/error?reason=already-verified&token=${token}`);
    }

    await pool.query(
      `UPDATE users SET is_email_verified = TRUE WHERE id = $1`,
      [record.user_id]
    );

    await pool.query(
      `UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1`,
      [record.id]
    );

    const redirectUrl = `${env.clientUrl}/verify-email/success`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('Error in verifyEmail:', err);
    return next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT id, email, name, is_email_verified, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.is_email_verified,
      createdAt: user.created_at,
    });
  } catch (err) {
    return next(err);
  }
}

// 🔥 NEW FUNCTION: Update Profile (Name)
export async function updateProfile(req, res, next) {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!validateName(name)) {
      return res.status(400).json({ message: 'Invalid name format' });
    }

    const result = await pool.query(
      `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email`,
      [name.trim(), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = result.rows[0];

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}