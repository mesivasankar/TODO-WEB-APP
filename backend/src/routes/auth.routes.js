import express from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import {
  register,
  verifyEmail,
  login,
  getCurrentUser,
  logout,
  googleAuthStart,
  googleAuthCallback,
  resendVerificationEmail,
  updateProfile, // Import the new controller function
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    message: 'Too many login or signup attempts from this IP, please try again later.',
  },
});

router.post('/register', register);
router.post('/resend-verification', resendVerificationEmail);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', logout);
router.get('/google', googleAuthStart);
router.get('/google/callback', googleAuthCallback);

// 🔥 NEW ROUTE: Update Profile
router.put('/profile', requireAuth, updateProfile);

export default router;