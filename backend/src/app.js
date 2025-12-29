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
import { errorHandler } from './middleware/error.middleware.js';
import  googleLimiter  from './middleware/googleLimiter.middleware.js'

const app = express();


const corsOptions = {
  origin: env.clientUrl,
  credentials: true,
};


const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,     
});



const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20,                  
  message: {
    message: 'Too many login or signup attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet(
  {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));


app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' })); 
app.use(cookieParser());


app.use(express.json());


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

app.use('/api', apiLimiter);


app.use("/api/auth/google", googleLimiter);

app.use('/api/auth',authLimiter, authRoutes);

app.use('/api/lists', taskListRoutes);

app.use('/api/lists/:listId/tasks', tasksRoutes);

app.use('/api/tasks', tasksRoutes);

app.use('/api/lists/:listId/tasks', tasksRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Something went wrong',
  });
});


app.use(errorHandler);


export default app;
