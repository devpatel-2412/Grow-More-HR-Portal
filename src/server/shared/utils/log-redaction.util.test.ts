import { describe, it, expect } from 'vitest';
import { redactSensitiveHeaders, redactedReqSerializer, redactedResSerializer } from './log-redaction.util.js';
import type { SerializedRequest, SerializedResponse } from 'pino-std-serializers';

describe('log-redaction.util', () => {
  describe('redactSensitiveHeaders', () => {
    it('redacts an authorization header so the access token never appears', () => {
      const headers = { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.secret.payload' };
      expect(redactSensitiveHeaders(headers)).toEqual({ authorization: '[REDACTED]' });
    });

    it('redacts a cookie header so the refresh token never appears', () => {
      const headers = { cookie: 'refresh_token=abc123def456; other=1' };
      expect(redactSensitiveHeaders(headers)).toEqual({ cookie: '[REDACTED]' });
    });

    it('redacts set-cookie on response headers', () => {
      const headers = { 'set-cookie': 'refresh_token=abc123; HttpOnly; Secure' };
      expect(redactSensitiveHeaders(headers)).toEqual({ 'set-cookie': '[REDACTED]' });
    });

    it('is case-insensitive about which header names it redacts', () => {
      const headers = { Authorization: 'Bearer secret', Cookie: 'refresh_token=secret' };
      const result = redactSensitiveHeaders(headers);
      expect(result.Authorization).toBe('[REDACTED]');
      expect(result.Cookie).toBe('[REDACTED]');
    });

    it('leaves non-sensitive headers untouched', () => {
      const headers = {
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0',
        'x-request-id': 'req-123',
        host: 'grow-more-hr-portal.vercel.app',
      };
      expect(redactSensitiveHeaders(headers)).toEqual(headers);
    });

    it('redacts sensitive headers while preserving everything else in the same object', () => {
      const headers = {
        authorization: 'Bearer secret-token',
        cookie: 'refresh_token=secret-cookie',
        'content-type': 'application/json',
        'user-agent': 'test-agent',
      };
      expect(redactSensitiveHeaders(headers)).toEqual({
        authorization: '[REDACTED]',
        cookie: '[REDACTED]',
        'content-type': 'application/json',
        'user-agent': 'test-agent',
      });
    });

    it('does not mutate the original headers object', () => {
      const headers = { authorization: 'Bearer secret-token', cookie: 'refresh_token=secret' };
      const original = { ...headers };
      redactSensitiveHeaders(headers);
      expect(headers).toEqual(original);
    });

    it('handles an undefined headers object without throwing', () => {
      expect(redactSensitiveHeaders(undefined)).toEqual({});
    });
  });

  describe('redactedReqSerializer', () => {
    const baseReq: SerializedRequest = {
      id: 'req-1',
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: 'Bearer secret-access-token', 'user-agent': 'test-agent' },
      remoteAddress: '127.0.0.1',
      remotePort: 54321,
      params: {},
      query: {},
      raw: {} as SerializedRequest['raw'],
    };

    it('redacts the authorization header while preserving other request fields', () => {
      const result = redactedReqSerializer(baseReq);
      expect(result.headers.authorization).toBe('[REDACTED]');
      expect(result.headers['user-agent']).toBe('test-agent');
      expect(result.method).toBe('GET');
      expect(result.url).toBe('/api/v1/auth/me');
      expect(result.remoteAddress).toBe('127.0.0.1');
      expect(result.id).toBe('req-1');
    });

    it('does not mutate the headers object referenced by the original request', () => {
      // pino-std-serializers assigns `_req.headers = req.headers` directly (a live reference, not a
      // copy) — auth.middleware.ts reads req.headers.authorization later in the same request's
      // middleware chain, so mutating this in place would break authentication for every logged request.
      const result = redactedReqSerializer(baseReq);
      expect(baseReq.headers.authorization).toBe('Bearer secret-access-token');
      expect(result).not.toBe(baseReq);
      expect(result.headers).not.toBe(baseReq.headers);
    });

    it('redacts the cookie header carrying the refresh token', () => {
      const reqWithCookie: SerializedRequest = {
        ...baseReq,
        headers: { ...baseReq.headers, cookie: 'refresh_token=super-secret-refresh-token' },
      };
      const result = redactedReqSerializer(reqWithCookie);
      expect(result.headers.cookie).toBe('[REDACTED]');
    });
  });

  describe('redactedResSerializer', () => {
    const baseRes: SerializedResponse = {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'set-cookie': 'refresh_token=super-secret; HttpOnly' },
      raw: {} as SerializedResponse['raw'],
    };

    it('redacts set-cookie while preserving statusCode and other response headers', () => {
      const result = redactedResSerializer(baseRes);
      expect(result.headers['set-cookie']).toBe('[REDACTED]');
      expect(result.headers['content-type']).toBe('application/json');
      expect(result.statusCode).toBe(200);
    });

    it('does not mutate the original response headers object', () => {
      const result = redactedResSerializer(baseRes);
      expect(baseRes.headers['set-cookie']).toBe('refresh_token=super-secret; HttpOnly');
      expect(result.headers).not.toBe(baseRes.headers);
    });

    it('passes through a response with no cookies unchanged aside from cloning', () => {
      const plainRes: SerializedResponse = { statusCode: 404, headers: { 'content-type': 'application/json' }, raw: {} as SerializedResponse['raw'] };
      expect(redactedResSerializer(plainRes)).toEqual(plainRes);
    });
  });
});
