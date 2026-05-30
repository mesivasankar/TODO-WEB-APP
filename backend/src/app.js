import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import taskListRoutes from './routes/tasklists.routes.js';
import tasksRoutes from './routes/tasks.routes.js';

import analyticsRoutes from './routes/analytics.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import googleLimiter from './middleware/googleLimiter.middleware.js';
import aiRoutes from './routes/ai.routes.js';
import matrixRoutes from './routes/matrix.routes.js';
import focusRoutes from './routes/focus.routes.js';

const app = express();

const allowedOrigins = [
  env.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || env.isProduction) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

const isLocalIP = (ip) => {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200,
  skip: (req) => isLocalIP(req.ip),
  standardHeaders: true,
  legacyHeaders: false,     
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: env.isProduction ? 20 : 1000,              
  skip: (req) => isLocalIP(req.ip),
  message: {
    message: 'Too many login or signup attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(express.json({ limit: '1mb' })); 
app.use(cookieParser());

app.get('/health', async (req, res, next) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    return res.json({
      status: 'ok',
      env: env.nodeEnv,
      dbTime: dbResult.rows[0].now,
    });
  } catch (err) {
    return next(err);
  }
});

// --- ROUTES ---

if (env.isProduction) {
  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter, authRoutes);
} else {
  app.use('/api/auth', authRoutes);
}

app.use("/api/auth/google", googleLimiter);

app.use('/api/lists', taskListRoutes);
app.use('/api/lists/:listId/tasks', tasksRoutes); // For task creation inside lists
app.use('/api/tasks', tasksRoutes);               // For direct task actions (update/delete)

app.use('/api/ai', aiRoutes);



app.use('/api/analytics', analyticsRoutes);

app.use('/api/matrix', matrixRoutes);
app.use('/api/focus', focusRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Something went wrong',
  });
});

app.use(errorHandler);

export default app;