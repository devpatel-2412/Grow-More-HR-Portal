import { Redis } from 'ioredis';
import { env } from './config/env.js';
import { logger } from './logger.js';

/**
 * Lazily created, module-singleton Redis client — `null` when REDIS_URL isn't configured, in
 * which case every consumer (rate limiting, the RBAC permission cache) falls back to its existing
 * in-memory behavior. Mirrors the same conditional-provider pattern already used elsewhere in
 * this codebase for optional infrastructure (see storage.service.ts choosing between Supabase and
 * local-disk storage, email.service.ts choosing between the Gmail API and a console logger) rather
 * than introducing a new one.
 */
let client: Redis | null | undefined;

export function getRedisClient(): Redis | null {
  if (client !== undefined) return client;

  if (!env.REDIS_URL) {
    client = null;
    return client;
  }

  const redis = new Redis(env.REDIS_URL, {
    // A Redis outage must never hang a request — every caller of this client already has to
    // tolerate a failed/unavailable cache (that's what "falls back to in-memory" means), so this
    // fails fast rather than piling up retries against a down instance.
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number) => Math.min(times * 200, 2000),
  });

  redis.on('error', (err: Error) => {
    logger.warn({ err }, 'Redis connection error — dependent services degrade to their in-memory fallback for affected calls');
  });

  client = redis;
  return client;
}
