import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logger.js';

const MULTER_ERROR_MESSAGES: Partial<Record<MulterError['code'], string>> = {
  LIMIT_FILE_SIZE: 'File is too large.',
  LIMIT_FILE_COUNT: 'Too many files in one upload.',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field in upload.',
};

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

  if (err instanceof MulterError) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: MULTER_ERROR_MESSAGES[err.code] ?? 'Invalid file upload.' },
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
