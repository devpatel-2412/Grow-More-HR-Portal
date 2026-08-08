import { Router } from 'express';
import { authenticateAccessToken } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { loginLimiter, refreshLimiter, passwordResetLimiter, twoFaVerifyLimiter } from '../../shared/middleware/rate-limit.middleware.js';
import {
  loginSchema,
  twoFactorVerifySchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  passwordChangeSchema,
  twoFactorEnableSchema,
  twoFactorDisableSchema,
  loginHistoryQuerySchema,
} from './auth.validators.js';
import {
  login,
  verifyTwoFactor,
  refresh,
  logout,
  logoutAll,
  me,
  loginHistory,
  requestPasswordReset,
  confirmPasswordReset,
  changePassword,
  beginTwoFactorEnrollment,
  enableTwoFactor,
  disableTwoFactor,
} from './auth.controller.js';

export const authRouter = Router();

// Public registration is intentionally not exposed anywhere: every user is provisioned
// internally (Super Admin creates a company + invites its first Admin; that Admin/HR invites
// everyone else) — see TenantService.create() and UserService.invite().
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(login));
authRouter.post('/2fa/verify', twoFaVerifyLimiter, validate({ body: twoFactorVerifySchema }), asyncHandler(verifyTwoFactor));
authRouter.post('/refresh', refreshLimiter, asyncHandler(refresh));
authRouter.post('/logout', authenticateAccessToken, asyncHandler(logout));
authRouter.post('/logout-all', authenticateAccessToken, asyncHandler(logoutAll));
authRouter.get('/me', authenticateAccessToken, asyncHandler(me));
authRouter.get('/login-history', authenticateAccessToken, validate({ query: loginHistoryQuerySchema }), asyncHandler(loginHistory));

authRouter.post(
  '/password-reset/request',
  passwordResetLimiter,
  validate({ body: passwordResetRequestSchema }),
  asyncHandler(requestPasswordReset),
);
authRouter.post(
  '/password-reset/confirm',
  passwordResetLimiter,
  validate({ body: passwordResetConfirmSchema }),
  asyncHandler(confirmPasswordReset),
);
authRouter.post(
  '/password/change',
  authenticateAccessToken,
  validate({ body: passwordChangeSchema }),
  asyncHandler(changePassword),
);

authRouter.post('/2fa/enroll', authenticateAccessToken, asyncHandler(beginTwoFactorEnrollment));
authRouter.post(
  '/2fa/enable',
  authenticateAccessToken,
  validate({ body: twoFactorEnableSchema }),
  asyncHandler(enableTwoFactor),
);
authRouter.post(
  '/2fa/disable',
  authenticateAccessToken,
  validate({ body: twoFactorDisableSchema }),
  asyncHandler(disableTwoFactor),
);
