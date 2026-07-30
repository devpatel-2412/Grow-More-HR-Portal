import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * In-memory rate-limit store — correct for a single-instance launch. Flagged in the
 * architecture plan: this MUST move to a Redis-backed store (rate-limit-redis) before the
 * API runs behind more than one process/instance, since counters are per-process otherwise.
 */

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
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Please try again later.' } },
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many token refresh attempts.' } },
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByIpAndEmail,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many password reset requests.' } },
});

export const twoFaVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many verification attempts.' } },
});

/** Loose defense-in-depth limiter applied globally in app.ts. */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
