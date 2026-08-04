import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { sendCreated, sendOk, sendPaginated } from '../../shared/utils/response.util.js';
import { UnauthorizedError } from '../../shared/errors/app-error.js';
import { env, isProduction } from '../../shared/config/env.js';
import type { z } from 'zod';
import type {
  signupSchema,
  loginSchema,
  twoFactorVerifySchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  passwordChangeSchema,
  twoFactorEnableSchema,
  twoFactorDisableSchema,
  loginHistoryQuerySchema,
} from './auth.validators.js';

function requestMeta(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(env.REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    domain: env.REFRESH_COOKIE_DOMAIN || undefined,
    expires: expiresAt,
    path: '/api/v1/auth',
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(env.REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

function readRefreshCookie(req: Request): string | undefined {
  return req.cookies?.[env.REFRESH_COOKIE_NAME];
}

export async function signup(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof signupSchema>;
  const result = await authService.signup(body, requestMeta(req));
  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  sendCreated(res, { accessToken: result.accessToken, user: result.user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof loginSchema>;
  const result = await authService.login(body, requestMeta(req));

  if (result.requiresTwoFactor) {
    sendOk(res, { requiresTwoFactor: true, challengeToken: result.challengeToken });
    return;
  }

  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  sendOk(res, { requiresTwoFactor: false, accessToken: result.accessToken, user: result.user });
}

export async function verifyTwoFactor(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof twoFactorVerifySchema>;
  const result = await authService.verifyTwoFactorChallenge(body, requestMeta(req));
  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  sendOk(res, { accessToken: result.accessToken, user: result.user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawToken = readRefreshCookie(req);
  if (!rawToken) throw new UnauthorizedError('No session cookie present');

  const result = await authService.refresh(rawToken, requestMeta(req));
  setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
  sendOk(res, { accessToken: result.accessToken, user: result.user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(readRefreshCookie(req), requestMeta(req));
  clearRefreshCookie(res);
  res.status(204).send();
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  await authService.logoutAll(req.user!.sub, requestMeta(req));
  clearRefreshCookie(res);
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  const result = await authService.getMe(req.user!.sub);
  sendOk(res, result);
}

export async function loginHistory(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as z.infer<typeof loginHistoryQuerySchema>;
  const { rows, meta } = await authService.getLoginHistory(req.user!.sub, query.page, query.limit);
  sendPaginated(res, rows, meta);
}

export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof passwordResetRequestSchema>;
  await authService.requestPasswordReset(body, requestMeta(req));
  // Always 200 — never reveal whether the email exists.
  sendOk(res, { message: 'If an account exists for this email, a reset link has been sent.' });
}

export async function confirmPasswordReset(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof passwordResetConfirmSchema>;
  await authService.confirmPasswordReset(body, requestMeta(req));
  sendOk(res, { message: 'Password reset successfully. Please log in again.' });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof passwordChangeSchema>;
  await authService.changePassword(req.user!.sub, body, requestMeta(req));
  sendOk(res, { message: 'Password changed successfully. Please log in again.' });
}

export async function beginTwoFactorEnrollment(req: Request, res: Response): Promise<void> {
  const result = await authService.beginTwoFactorEnrollment(req.user!.sub);
  sendOk(res, result);
}

export async function enableTwoFactor(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof twoFactorEnableSchema>;
  const result = await authService.enableTwoFactor(req.user!.sub, body, requestMeta(req));
  sendOk(res, result);
}

export async function disableTwoFactor(req: Request, res: Response): Promise<void> {
  const body = req.body as z.infer<typeof twoFactorDisableSchema>;
  await authService.disableTwoFactor(req.user!.sub, body, requestMeta(req));
  sendOk(res, { message: 'Two-factor authentication disabled.' });
}
