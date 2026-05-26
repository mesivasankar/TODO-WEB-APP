import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  console.error('Global Error Handler:', err);

  
  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: env.isDevelopment ? err.stack : undefined,
  });
}
