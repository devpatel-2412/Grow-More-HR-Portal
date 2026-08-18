import { describe, it, expect, vi, beforeEach } from 'vitest';

const envMock = { REDIS_URL: '', NODE_ENV: 'test' };
vi.mock('./config/env.js', () => ({ env: envMock, isProduction: false }));

const { redisConstructorMock, redisInstanceMock } = vi.hoisted(() => ({
  redisConstructorMock: vi.fn(),
  redisInstanceMock: { on: vi.fn() },
}));
vi.mock('ioredis', () => ({
  Redis: class {
    constructor(...args: unknown[]) {
      redisConstructorMock(...args);
      return redisInstanceMock as never;
    }
  },
}));

describe('redis.client — getRedisClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.REDIS_URL = '';
  });

  it('returns null, and never constructs a client, when REDIS_URL is not configured', async () => {
    vi.resetModules();
    const { getRedisClient } = await import('./redis.client.js');

    expect(getRedisClient()).toBeNull();
    expect(getRedisClient()).toBeNull(); // repeat call — still null, still no construction attempt
    expect(redisConstructorMock).not.toHaveBeenCalled();
  });

  it('constructs exactly one client (a singleton) when REDIS_URL is configured, reused on later calls', async () => {
    envMock.REDIS_URL = 'redis://localhost:6379';
    vi.resetModules();
    const { getRedisClient } = await import('./redis.client.js');

    const first = getRedisClient();
    const second = getRedisClient();

    expect(first).toBe(redisInstanceMock);
    expect(second).toBe(first);
    expect(redisConstructorMock).toHaveBeenCalledOnce();
    expect(redisConstructorMock).toHaveBeenCalledWith('redis://localhost:6379', expect.objectContaining({ maxRetriesPerRequest: 1 }));
  });

  it('registers an error handler so a connection failure never becomes an uncaught exception', async () => {
    envMock.REDIS_URL = 'redis://localhost:6379';
    vi.resetModules();
    const { getRedisClient } = await import('./redis.client.js');

    getRedisClient();

    expect(redisInstanceMock.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
