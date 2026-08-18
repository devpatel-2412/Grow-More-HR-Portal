import rateLimit, { ipKeyGenerator, type Store } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Request } from 'express';
import { getRedisClient } from '../redis.client.js';

/**
 * In-memory store (the previous, and still-default, behavior of this file) is correct for a
 * single-instance deployment. The moment this app runs behind more than one server process,
 * that silently weakens every limiter below — each instance would enforce its own separate "10
 * attempts" instead of 10 total across the fleet — without anything erroring to say so. Once
 * REDIS_URL is configured (see env.ts / .env.example), every limiter here switches to a
 * Redis-backed store instead, so counters are shared across every instance. Falls back to
 * undefined (express-rate-limit's own in-memory MemoryStore) when Redis isn't configured or
 * isn't reachable — this file's behavior is unchanged for any deployment that hasn't set
 * REDIS_URL, which today is all of them.
 */
function redisStore(prefix: string): Store | undefined {
  const redis = getRedisClient();
  if (!redis) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...(args as [string, ...string[]])) as Promise<RedisReply>,
    prefix,
  });
}

function keyByIpAndEmail(req: Request): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : 'unknown';
  // ipKeyGenerator normalizes IPv6 addresses to their /64 subnet so limits can't be bypassed
  // by cycling through the (attacker-controlled) tail bits of an IPv6 address.
  return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIpAndEmail,
  store: redisStore('rl:login:'),
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Please try again later.' } },
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:refresh:'),
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many token refresh attempts.' } },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIpAndEmail,
  store: redisStore('rl:pwreset:'),
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many password reset requests.' } },
});

export const twoFaVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:2fa:'),
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many verification attempts.' } },
});

/** Loose defense-in-depth limiter applied globally in app.ts. */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:global:'),
});
