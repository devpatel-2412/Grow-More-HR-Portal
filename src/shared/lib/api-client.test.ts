import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { api, ApiError, setAccessToken, getAccessToken, registerAuthExpiredHandler } from './api-client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function authHeader(call: unknown[]): string | undefined {
  const init = call[1] as RequestInit;
  return (init.headers as Record<string, string>)?.Authorization;
}

function urlOf(call: unknown[]): string {
  return call[0] as string;
}

describe('api-client — token usage and refresh', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken(null);
    registerAuthExpiredHandler(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- A: valid access token -------------------------------------------------------------------

  it('A: sends the current access token as the Bearer header and never calls refresh when the request succeeds', async () => {
    setAccessToken('valid-token');
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));

    const result = await api.get('/employees');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeader(fetchMock.mock.calls[0])).toBe('Bearer valid-token');
  });

  it('sends no Authorization header at all when there is no access token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));

    await api.get('/public-ish');

    expect(authHeader(fetchMock.mock.calls[0])).toBeUndefined();
  });

  // --- B: expired access token → exactly one refresh → retry once → success --------------------

  it('B: on a 401, refreshes exactly once and retries the original request with the new token', async () => {
    setAccessToken('expired-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } })) // original request
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: 'new-token' } })) // POST /auth/refresh
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } })); // retried request

    const result = await api.get('/employees');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(urlOf(fetchMock.mock.calls[1])).toContain('/auth/refresh');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(authHeader(fetchMock.mock.calls[2])).toBe('Bearer new-token');
    expect(getAccessToken()).toBe('new-token');
  });

  it('the refresh call itself never carries an Authorization header — only the httpOnly cookie', async () => {
    setAccessToken('expired-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: 'new-token' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));

    await api.get('/employees');

    const refreshCall = fetchMock.mock.calls[1];
    expect((refreshCall[1] as RequestInit).headers).toBeUndefined();
  });

  // --- C: concurrent 401s → single-flight refresh --------------------------------------------

  it('C: dedupes concurrent 401s into exactly one refresh call, then retries all of them with the new token', async () => {
    setAccessToken('expired-token');
    let refreshCalls = 0;
    fetchMock.mockImplementation((url: string, init: RequestInit) => {
      if (url.includes('/auth/refresh')) {
        refreshCalls++;
        return Promise.resolve(jsonResponse(200, { data: { accessToken: 'new-token' } }));
      }
      const auth = (init.headers as Record<string, string> | undefined)?.Authorization;
      if (auth === 'Bearer new-token') return Promise.resolve(jsonResponse(200, { data: { ok: true } }));
      return Promise.resolve(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }));
    });

    const [a, b, c] = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(c).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
  });

  // --- D: refresh failure → clear token, notify, no further retry ----------------------------

  it('D: clears the access token and notifies the registered handler when refresh fails, without a second retry', async () => {
    setAccessToken('expired-token');
    const onExpired = vi.fn();
    registerAuthExpiredHandler(onExpired);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } })) // original
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'no session' } })); // refresh fails

    await expect(api.get('/employees')).rejects.toThrow(ApiError);

    // Exactly 2 calls: the original request + one refresh attempt — never a retry of the original,
    // never a second refresh attempt.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getAccessToken()).toBeNull();
    expect(onExpired).toHaveBeenCalledOnce();
  });

  // --- F: anonymous visitor — no token, one refresh attempt at most, no loop ------------------

  it('F: an anonymous request (no token) attempts at most one refresh and does not loop', async () => {
    setAccessToken(null);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'no token' } })) // /auth/me, no Authorization header
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'no session' } })); // refresh fails — no cookie

    await expect(api.get('/auth/me')).rejects.toThrow(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(authHeader(fetchMock.mock.calls[0])).toBeUndefined();
    expect(getAccessToken()).toBeNull();
  });

  // --- 5: excluded endpoints never trigger the refresh interceptor ---------------------------

  it('does not attempt a refresh when /auth/login itself returns 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'bad credentials' } }));

    await expect(api.post('/auth/login', { email: 'x@example.com', password: 'y' })).rejects.toThrow(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh-of-refresh when /auth/refresh itself returns 401 (no infinite loop)', async () => {
    setAccessToken('expired-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } })) // original
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'no session' } })); // refresh itself 401s

    await expect(api.get('/employees')).rejects.toThrow(ApiError);

    // If refresh-of-refresh were attempted, this would be 3+ calls instead of 2.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not attempt a refresh when /auth/logout returns 401', async () => {
    setAccessToken('expired-token');
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }));

    await expect(api.post('/auth/logout')).rejects.toThrow(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not mistake /auth/login-history for the excluded /auth/login endpoint (regression)', async () => {
    setAccessToken('expired-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } })) // original login-history request
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: 'new-token' } })) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } })); // retried request

    await api.getPaginated('/auth/login-history', { page: 1, limit: 20 });

    // Proves the refresh cycle DID run for this endpoint (3 calls: original, refresh, retry) —
    // a startsWith('/auth/login') check would wrongly treat this as excluded and stop at 1 call.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  // --- cross-tab refresh coordination (navigator.locks) ---------------------------------------

  it('acquires the cross-tab refresh lock and broadcasts the new token to sibling tabs on success', async () => {
    setAccessToken('expired-token');
    const lockRequest = vi.fn(async (_name: string, callback: () => Promise<unknown>) => callback());
    vi.stubGlobal('navigator', { locks: { request: lockRequest } });
    const otherTab = new BroadcastChannel('grow-more-session');
    const received = vi.fn();
    otherTab.addEventListener('message', (event) => received(event.data));
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: 'new-token' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));

    await api.get('/employees');

    expect(lockRequest).toHaveBeenCalledWith('grow-more-auth-refresh', expect.any(Function));
    await waitFor(() => expect(received).toHaveBeenCalledWith({ type: 'access-token', token: 'new-token' }));
    otherTab.close();
  });

  it('adopts a token a sibling tab already refreshed, instead of making its own network refresh call', async () => {
    // Simulates: this tab queued behind a sibling tab's lock hold, and by the time it's our turn,
    // the sibling has already rotated the refresh-token cookie and broadcast the new access token.
    // A raw second BroadcastChannel instance stands in for "another tab" — a channel never
    // delivers a message back to the very instance that sent it (see session-broadcast.test.ts),
    // so this can't be simulated via this module's own broadcastAccessToken() call.
    setAccessToken('stale-token');
    const otherTab = new BroadcastChannel('grow-more-session');
    const lockRequest = vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
      otherTab.postMessage({ type: 'access-token', token: 'token-from-sibling-tab' });
      await new Promise((resolve) => setTimeout(resolve, 10)); // let the broadcast's message event land
      return callback();
    });
    vi.stubGlobal('navigator', { locks: { request: lockRequest } });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } })) // original request
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } })); // retried request, with the adopted token

    const result = await api.get('/employees');

    expect(result).toEqual({ ok: true });
    // Exactly 2 calls (original + retry) — no network call to /auth/refresh at all, since the
    // sibling tab's broadcast token was adopted while waiting for the lock.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.some((call) => urlOf(call).includes('/auth/refresh'))).toBe(false);
    expect(authHeader(fetchMock.mock.calls[1])).toBe('Bearer token-from-sibling-tab');
    expect(getAccessToken()).toBe('token-from-sibling-tab');
    otherTab.close();
  });

  it('falls back to a same-tab-only refresh when navigator.locks is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    setAccessToken('expired-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: 'new-token' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));

    const result = await api.get('/employees');

    expect(result).toEqual({ ok: true });
    expect(getAccessToken()).toBe('new-token');
  });
});
