import { pinoHttp } from 'pino-http';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '../logger.js';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = typeof existing === 'string' ? existing : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  autoLogging: {
    ignore: (req: Request) => req.url === '/api/health',
  },
});
