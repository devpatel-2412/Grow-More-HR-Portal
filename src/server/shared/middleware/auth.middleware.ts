import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt.util.js';
import { UnauthorizedError } from '../errors/app-error.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function authenticateAccessToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    throw new UnauthorizedError('Access token required');
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}
