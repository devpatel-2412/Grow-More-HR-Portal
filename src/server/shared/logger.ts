import pino from 'pino';
import { env, isProduction } from './config/env.js';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
      'req.headers["x-api-key"]',
      'res.headers["set-cookie"]',
      'headers.authorization',
      'headers.cookie',
      'headers["set-cookie"]',
      'authorization',
      'cookie',
      'set-cookie',
    ],
    censor: '[REDACTED]',
  },
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
  base: { env: env.NODE_ENV },
});
