import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
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

  // Fallback for a unique-constraint violation a service forgot to pre-check with a friendly
  // ConflictError — still a real 409 the client can act on, not an opaque 500. The offending
  // field names are in `err.meta.target`, but that's an internal column list, not user-facing
  // copy, so this stays generic rather than leaking schema details.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    logger.warn({ err, requestId: req.id }, 'Unhandled unique-constraint violation');
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'A record with this value already exists.' },
    });
    return;
  }

  logger.error({ err, requestId: req.id }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
  });
}
