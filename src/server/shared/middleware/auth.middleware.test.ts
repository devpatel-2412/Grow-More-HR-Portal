import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authenticateAccessToken } from './auth.middleware.js';
import { signAccessToken } from '../utils/jwt.util.js';
import { UnauthorizedError } from '../errors/app-error.js';

function mockReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

const payload = { sub: 'user-1', email: 'a@b.com', role: 'ADMIN' as const, tenantId: 'tenant-1', profileId: null };

describe('authenticateAccessToken', () => {
  it('attaches decoded payload to req.user and calls next() for a valid Bearer token', () => {
    const token = signAccessToken(payload);
    const req = mockReq(`Bearer ${token}`);
    const next = vi.fn();

    authenticateAccessToken(req, {} as Response, next);

    expect(req.user).toMatchObject({ sub: 'user-1', tenantId: 'tenant-1' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws UnauthorizedError when no Authorization header is present', () => {
    const next = vi.fn();
    expect(() => authenticateAccessToken(mockReq(undefined), {} as Response, next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedError for a malformed header without the Bearer prefix', () => {
    const next = vi.fn();
    expect(() => authenticateAccessToken(mockReq('Basic abc123'), {} as Response, next)).toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for an invalid/tampered token', () => {
    const token = signAccessToken(payload);
    const next = vi.fn();
    expect(() => authenticateAccessToken(mockReq(`Bearer ${token}x`), {} as Response, next)).toThrow(UnauthorizedError);
  });
});
