import { pinoHttp } from 'pino-http';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '../logger.js';
import { redactedReqSerializer, redactedResSerializer } from '../utils/log-redaction.util.js';

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
  // pino-http's default req/res serializers copy headers straight through, which would put
  // Authorization (access token) and Cookie/Set-Cookie (refresh token) into every request log
  // line. These wrap the already-serialized object (see wrapRequestSerializer/wrapResponseSerializer
  // in pino-std-serializers) and redact just the sensitive header values before Pino writes anything.
  serializers: {
    req: redactedReqSerializer,
    res: redactedResSerializer,
  },
});
