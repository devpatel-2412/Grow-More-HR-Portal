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

  // The single canonical frontend origin — used only to build clickable links in outbound emails
  // (invite, password reset), since the backend has no other way to know where the SPA is hosted.
  // Defaults to the Vite dev server so those flows work locally with zero extra setup.
  APP_URL: z.string().min(1).default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  JWT_REFRESH_TTL_REMEMBER_ME: z.string().default('30d'),

  TWO_FA_ENCRYPTION_KEY: z.string().min(1, 'TWO_FA_ENCRYPTION_KEY is required'),
  TWO_FA_ISSUER: z.string().default('Grow More'),

  REFRESH_COOKIE_NAME: z.string().default('refresh_token'),
  REFRESH_COOKIE_DOMAIN: z.string().optional().default(''),

  // One-time bootstrap for the very first SUPER_ADMIN account, since public registration is
  // permanently closed (see bootstrap-super-admin.ts). Only read on boot when zero SUPER_ADMIN
  // users exist yet — safe to leave set in Render indefinitely, every later boot is a no-op.
  BOOTSTRAP_SUPER_ADMIN_EMAIL: z.string().optional().default(''),
  BOOTSTRAP_SUPER_ADMIN_PASSWORD: z.string().optional().default(''),

  REDIS_URL: z.string().optional().default(''),

  // Gmail API (OAuth 2.0) is the sole production email transport — see gmail-email.service.ts.
  // Entirely optional at the schema level so a bare dev machine can still boot: when unset,
  // EmailService falls back to the dev-console implementation (which throws instead of silently
  // dropping mail in production — see ConsoleEmailService). The cross-field check below makes a
  // *partial* Gmail config (some vars set, not all) fail loudly at startup instead, since that's
  // unambiguously a misconfiguration rather than "not using Gmail."
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_REFRESH_TOKEN: z.string().optional().default(''),
  GOOGLE_REDIRECT_URI: z.string().optional().default(''),
  GOOGLE_SENDER_EMAIL: z.string().optional().default(''),

  // Supabase Storage is entirely optional — when unset, StorageService falls back to a local-disk
  // implementation for development (which throws instead of silently losing uploads in production).
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().default('documents'),
}).superRefine((data, ctx) => {
  const googleVars = {
    GOOGLE_CLIENT_ID: data.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: data.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: data.GOOGLE_REFRESH_TOKEN,
    GOOGLE_REDIRECT_URI: data.GOOGLE_REDIRECT_URI,
    GOOGLE_SENDER_EMAIL: data.GOOGLE_SENDER_EMAIL,
  };
  const setCount = Object.values(googleVars).filter(Boolean).length;
  if (setCount > 0 && setCount < 5) {
    for (const [key, value] of Object.entries(googleVars)) {
      if (!value) ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required once any GOOGLE_* Gmail API variable is set` });
    }
  }
  if (data.GOOGLE_SENDER_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.GOOGLE_SENDER_EMAIL)) {
    ctx.addIssue({ code: 'custom', path: ['GOOGLE_SENDER_EMAIL'], message: 'GOOGLE_SENDER_EMAIL must be a valid email address' });
  }
  if (data.GOOGLE_REDIRECT_URI && !/^https?:\/\//.test(data.GOOGLE_REDIRECT_URI)) {
    ctx.addIssue({ code: 'custom', path: ['GOOGLE_REDIRECT_URI'], message: 'GOOGLE_REDIRECT_URI must be a full URL (e.g. https://developers.google.com/oauthplayground)' });
  }
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
