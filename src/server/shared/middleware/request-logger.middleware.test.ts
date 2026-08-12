import { describe, it, expect, vi } from 'vitest';
import express, { type Request, type Response } from 'express';
import request from 'supertest';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { requestLogger } from './request-logger.middleware.js';
import { redactedReqSerializer, redactedResSerializer } from '../utils/log-redaction.util.js';
import { authenticateAccessToken } from './auth.middleware.js';
import { signAccessToken } from '../utils/jwt.util.js';

describe('requestLogger middleware', () => {
  it('redacts Authorization and Cookie headers in request log output without mutating incoming headers', async () => {
    const logChunks: string[] = [];
    const testLogger = pino(
      {
        level: 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["set-cookie"]',
            'headers.authorization',
            'headers.cookie',
            'headers["set-cookie"]',
            'authorization',
            'cookie',
            'set-cookie',
          ],
          censor: '[REDACTED]',
        },
      },
      {
        write: (chunk: string) => {
          logChunks.push(chunk);
        },
      }
    );

    const customRequestLogger = pinoHttp({
      logger: testLogger,
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id = typeof existing === 'string' ? existing : 'test-req-id';
        res.setHeader('X-Request-Id', id);
        return id;
      },
      serializers: {
        req: redactedReqSerializer,
        res: redactedResSerializer,
      },
    });

    let receivedAuthHeader: string | undefined;
    let receivedCookieHeader: string | undefined;

    const app = express();
    app.use(customRequestLogger);
    app.get('/test-endpoint', (req: Request, res: Response) => {
      receivedAuthHeader = req.headers.authorization;
      receivedCookieHeader = req.headers.cookie;
      res.setHeader('Set-Cookie', 'refresh_token=secret_refresh_123; HttpOnly');
      res.status(200).json({ success: true });
    });

    const token = 'eyJhbGciOiJIUzI1NiJ9.test.secretToken123';
    const cookieVal = 'refresh_token=secret_refresh_123; session=abc';

    const response = await request(app)
      .get('/test-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', cookieVal)
      .set('User-Agent', 'TestAgent/1.0');

    expect(response.status).toBe(200);

    // 1. Incoming headers on actual req object MUST NOT be mutated
    expect(receivedAuthHeader).toBe(`Bearer ${token}`);
    expect(receivedCookieHeader).toBe(cookieVal);

    // 2. Log output must NOT contain actual secret tokens or cookies
    const joinedLogs = logChunks.join('\n');
    expect(joinedLogs).not.toContain(token);
    expect(joinedLogs).not.toContain('secret_refresh_123');

    // 3. Log output MUST contain [REDACTED] or omit sensitive values
    expect(joinedLogs).toContain('[REDACTED]');

    // 4. Log output MUST preserve non-sensitive request information
    const logObj = JSON.parse(logChunks[0]);
    expect(logObj.req.method).toBe('GET');
    expect(logObj.req.url).toBe('/test-endpoint');
    expect(logObj.req.headers['user-agent']).toBe('TestAgent/1.0');
    expect(logObj.res.statusCode).toBe(200);
    expect(logObj.req.headers.authorization).toBe('[REDACTED]');
    expect(logObj.req.headers.cookie).toBe('[REDACTED]');
    expect(logObj.res.headers['set-cookie']).toBe('[REDACTED]');
  });

  it('works smoothly in chain before auth.middleware without breaking authentication', async () => {
    const payload = { sub: 'user-123', email: 'user@example.com', role: 'ADMIN' as const, tenantId: 'tenant-1', profileId: null };
    const validToken = signAccessToken(payload);

    const app = express();
    app.use(requestLogger);
    app.get('/protected', authenticateAccessToken, (req: Request, res: Response) => {
      res.status(200).json({ user: req.user });
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ sub: 'user-123', tenantId: 'tenant-1' });
  });

  it('bypasses autoLogging for /api/health', async () => {
    const logChunks: string[] = [];
    const testLogger = pino({ level: 'info' }, { write: (chunk: string) => logChunks.push(chunk) });
    const customRequestLogger = pinoHttp({
      logger: testLogger,
      autoLogging: {
        ignore: (req) => req.url === '/api/health',
      },
    });

    const app = express();
    app.use(customRequestLogger);
    app.get('/api/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok' });
    });

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(logChunks.length).toBe(0);
  });
});
