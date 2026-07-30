import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logger.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.id }, err.message);
    }
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error({ err, requestId: req.id }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
  });
}
