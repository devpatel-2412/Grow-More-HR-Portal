import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Comma-separated list of allowed browser origins, e.g. "http://localhost:3000,http://127.0.0.1:3000".
  // Kept as a list (not a single URL) so dev environments reachable under more than one hostname
  // don't silently break — a mismatched single static value here breaks credentialed cookie
  // requests for every hostname except the one it happens to match.
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  JWT_REFRESH_TTL_REMEMBER_ME: z.string().default('30d'),

  TWO_FA_ENCRYPTION_KEY: z.string().min(1, 'TWO_FA_ENCRYPTION_KEY is required'),
  TWO_FA_ISSUER: z.string().default('Grow More'),

  REFRESH_COOKIE_NAME: z.string().default('refresh_token'),
  REFRESH_COOKIE_DOMAIN: z.string().optional().default(''),

  REDIS_URL: z.string().optional().default(''),

  // SMTP is entirely optional — when SMTP_HOST is unset, EmailService falls back to the
  // dev-console implementation (which throws instead of silently dropping mail in production).
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
