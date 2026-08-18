import type { PaginatedResponse } from '../types/pagination.types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// In-memory only — never localStorage/sessionStorage, to reduce the blast radius of an XSS
// bug (a malicious script cannot read this module-level variable from another tab/context
// the way it could read persisted storage). The refresh token lives in an httpOnly cookie
// the JS layer never touches directly.
let accessToken: string | null = null;
let onAuthExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Registered once by AuthContext — called when a session cannot be silently restored. */
export function registerAuthExpiredHandler(handler: () => void): void {
  onAuthExpired = handler;
}

// Registered by useIdleTimer — an authenticated API call counts as user activity for the
// inactivity timeout, same as a mouse/keyboard/scroll event.
let onActivity: (() => void) | null = null;

export function registerActivitySignal(handler: (() => void) | null): void {
  onActivity = handler;
}

let refreshPromise: Promise<boolean> | null = null;

async function attemptSilentRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (!res.ok) return false;
        const body = await res.json();
        setAccessToken(body.data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Internal: prevents infinite refresh loops when retrying after a 401. */
  _isRetry?: boolean;
}

// Endpoints that must never go through the silent-refresh-and-retry cycle: /auth/refresh 401ing
// and triggering another refresh would be a literal infinite loop, and /auth/login/-logout 401ing
// means "no session to refresh" or "already logging out" — refreshing there is meaningless at
// best. Exact match, not startsWith — a prefix check would also swallow the unrelated
// /auth/login-history endpoint (a real bug this exact-match fixes).
const AUTH_REFRESH_EXCLUDED_PATHS = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

async function rawRequest(path: string, options: RequestOptions = {}): Promise<{ status: number; payload: unknown }> {
  const { body, _isRetry, headers, ...rest } = options;
  const isAuthEndpoint = AUTH_REFRESH_EXCLUDED_PATHS.has(path);
  // A FormData body (file uploads) must NOT be JSON-stringified or given an explicit Content-Type
  // — the browser sets `multipart/form-data; boundary=...` itself, and overriding it breaks parsing.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  onActivity?.();

  if (res.status === 401 && !_isRetry && !isAuthEndpoint) {
    const refreshed = await attemptSilentRefresh();
    if (refreshed) {
      return rawRequest(path, { ...options, _isRetry: true });
    }
    setAccessToken(null);
    onAuthExpired?.();
  }

  if (res.status === 204) {
    return { status: res.status, payload: null };
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error = (payload as { error?: { code: string; message: string; details?: unknown } })?.error ?? {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred.',
    };
    throw new ApiError(res.status, error.code, error.message, error.details);
  }

  return { status: res.status, payload };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { payload } = await rawRequest(path, options);
  return (payload as { data?: T } | null)?.data as T;
}

/** For paginated list endpoints — returns both `data` and `meta`, instead of discarding `meta` like apiRequest does. */
export async function apiRequestPaginated<T>(path: string, options: RequestOptions = {}): Promise<PaginatedResponse<T>> {
  const { payload } = await rawRequest(path, options);
  return payload as PaginatedResponse<T>;
}

/** For binary file endpoints (PDF export, etc.) — bypasses the JSON envelope and returns a Blob plus the server-supplied filename. */
export async function apiDownload(path: string, _isRetry = false): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (res.status === 401 && !_isRetry) {
    const refreshed = await attemptSilentRefresh();
    if (refreshed) return apiDownload(path, true);
    setAccessToken(null);
    onAuthExpired?.();
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const error = (payload as { error?: { code: string; message: string; details?: unknown } })?.error ?? {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred.',
    };
    throw new ApiError(res.status, error.code, error.message, error.details);
  }

  const disposition = res.headers.get('content-disposition') ?? '';
  const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? 'download';
  const blob = await res.blob();
  return { blob, filename };
}

export function toQueryString(params?: object): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== '') searchParams.set(key, String(value));
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: 'GET' }),
  getPaginated: <T>(path: string, query?: object, options?: RequestOptions) =>
    apiRequestPaginated<T>(`${path}${toQueryString(query)}`, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
