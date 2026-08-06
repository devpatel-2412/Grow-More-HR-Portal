import { prisma } from '../../db/prisma.js';
import { UserRepository } from '../users/user.repository.js';
import { TenantRepository } from '../tenants/tenant.repository.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { hashPassword, verifyPassword, sha256, generateOpaqueToken } from '../../shared/utils/hash.util.js';
import { signAccessToken, signTwoFactorChallengeToken, verifyTwoFactorChallengeToken } from '../../shared/utils/jwt.util.js';
import { parseDurationMs } from '../../shared/utils/duration.util.js';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { twoFactorService } from '../two-factor/two-factor.service.js';
import { emailService } from '../../shared/email/email.service.js';
import { env } from '../../shared/config/env.js';
import type { RequestMeta } from './auth.types.js';
import type { UserRole } from '@prisma/client';
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
} from './auth.validators.js';

const FAILED_LOGIN_LOCK_THRESHOLD = 5;
const FAILED_LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function toPublicUser(user: { id: string; email: string; role: string; status: string }) {
  return { id: user.id, email: user.email, role: user.role, status: user.status };
}

export class AuthService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly tenantRepository = new TenantRepository(),
    private readonly refreshTokenRepository = new RefreshTokenRepository(),
  ) {}

  async signup(input: z.infer<typeof signupSchema>, meta: RequestMeta) {
    const [existingTenant, existingUser] = await Promise.all([
      this.tenantRepository.findByDomain(input.tenantDomain),
      this.userRepository.findByEmail(input.email),
    ]);
    if (existingTenant) throw new ConflictError('A tenant with this domain already exists');
    if (existingUser) throw new ConflictError('An account with this email already exists');

    const passwordHash = hashPassword(input.password);

    const { tenant, user } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: input.tenantName, domain: input.tenantDomain } });
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          tenantId: tenant.id,
        },
      });
      await tx.employeeProfile.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          employeeId: `EMP-${new Date().getFullYear()}-${user.id.slice(0, 6).toUpperCase()}`,
          firstName: input.firstName,
          lastName: input.lastName,
          department: 'Executive',
          designation: 'Administrator',
          dateOfJoining: new Date(),
          status: 'ACTIVE',
        },
      });
      return { tenant, user };
    });

    await auditLogService.record({
      tenantId: tenant.id,
      actorUserId: user.id,
      action: 'TENANT_CREATED',
      targetType: 'Tenant',
      targetId: tenant.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await auditLogService.record({
      tenantId: tenant.id,
      actorUserId: user.id,
      action: 'USER_SIGNUP',
      targetType: 'User',
      targetId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return this.issueSession(user, meta);
  }

  async login(input: z.infer<typeof loginSchema>, meta: RequestMeta) {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      await auditLogService.record({ action: 'USER_LOGIN_FAILURE', targetType: 'User', metadata: { email: input.email }, ...meta });
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account temporarily locked due to repeated failed logins. Try again later.');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('This account is not active. Contact your administrator.');
    }

    const passwordValid = verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      await this.userRepository.recordLoginFailure(user.id, FAILED_LOGIN_LOCK_THRESHOLD, FAILED_LOGIN_LOCK_DURATION_MS);
      await auditLogService.record({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: 'USER_LOGIN_FAILURE',
        targetType: 'User',
        targetId: user.id,
        ...meta,
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.is2FAEnabled) {
      return {
        requiresTwoFactor: true as const,
        challengeToken: signTwoFactorChallengeToken(user.id, input.rememberMe),
      };
    }

    await this.userRepository.recordLoginSuccess(user.id);
    await auditLogService.record({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      targetType: 'User',
      targetId: user.id,
      ...meta,
    });

    return this.issueSession(user, meta, input.rememberMe);
  }

  async verifyTwoFactorChallenge(input: z.infer<typeof twoFactorVerifySchema>, meta: RequestMeta) {
    let userId: string;
    let rememberMe: boolean;
    try {
      const decoded = verifyTwoFactorChallengeToken(input.challengeToken);
      userId = decoded.sub;
      rememberMe = decoded.rememberMe;
    } catch {
      throw new UnauthorizedError('Invalid or expired two-factor challenge');
    }

    const user = await this.userRepository.findById(userId);
    if (!user || !user.is2FAEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedError('Two-factor authentication is not set up for this account');
    }

    const isValidCode = twoFactorService.verifyCode(user.twoFactorSecret, input.code);
    if (!isValidCode) {
      await auditLogService.record({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: 'TWO_FA_CHALLENGE_FAILURE',
        targetType: 'User',
        targetId: user.id,
        ...meta,
      });
      throw new UnauthorizedError('Invalid verification code');
    }

    await this.userRepository.recordLoginSuccess(user.id);
    await auditLogService.record({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: 'TWO_FA_CHALLENGE_SUCCESS',
      targetType: 'User',
      targetId: user.id,
      ...meta,
    });
    await auditLogService.record({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      targetType: 'User',
      targetId: user.id,
      ...meta,
    });

    return this.issueSession(user, meta, rememberMe);
  }

  async refresh(rawRefreshToken: string, meta: RequestMeta) {
    const tokenHash = sha256(rawRefreshToken);
    const existing = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!existing) throw new UnauthorizedError('Invalid session. Please log in again.');

    if (existing.revokedAt) {
      // Token was already rotated (or explicitly revoked) — presenting it again means theft/reuse.
      // Nuke the whole family so a stolen token can't keep producing new sessions.
      await this.refreshTokenRepository.revokeFamily(existing.familyId, 'reuse_detected');
      await auditLogService.record({
        actorUserId: existing.userId,
        action: 'TOKEN_REUSE_DETECTED',
        targetType: 'RefreshToken',
        targetId: existing.id,
        ...meta,
      });
      throw new UnauthorizedError('Session revoked for security reasons. Please log in again.');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired. Please log in again.');
    }

    const user = await this.userRepository.findById(existing.userId);
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedError('Account is not active');

    const tenant = await this.tenantRepository.findById(user.tenantId);

    // A tenant-wide "force logout all" bumps forceLogoutAllAt — any token issued before that
    // instant is treated as invalid on its next use, without having to touch every row up front.
    if (tenant?.forceLogoutAllAt && existing.createdAt < tenant.forceLogoutAllAt) {
      await this.refreshTokenRepository.revokeFamily(existing.familyId, 'force_logout_all');
      throw new UnauthorizedError('Your session was ended by an administrator. Please log in again.');
    }

    // Inactivity backstop: this fires whenever the client's own idle timer couldn't (a laptop put
    // to sleep, a suspended background tab) — the very next attempt to refresh after the
    // configured idle window has elapsed since this token was last used is rejected server-side.
    // null sessionTimeoutMinutes means the tenant opted into "never expire".
    if (tenant?.sessionTimeoutMinutes != null) {
      const idleMs = Date.now() - existing.lastUsedAt.getTime();
      if (idleMs > tenant.sessionTimeoutMinutes * 60_000) {
        await this.refreshTokenRepository.revokeFamily(existing.familyId, 'inactivity_timeout');
        await auditLogService.record({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: 'SESSION_TIMEOUT',
          targetType: 'RefreshToken',
          targetId: existing.id,
          ...meta,
        });
        throw new UnauthorizedError('Session expired due to inactivity. Please log in again.');
      }
    }

    const rawNewToken = generateOpaqueToken();
    const newTokenHash = sha256(rawNewToken);
    const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL));

    const newToken = await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: newTokenHash,
      familyId: existing.familyId,
      deviceInfo: existing.deviceInfo,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt,
      rememberMe: existing.rememberMe,
    });
    await this.refreshTokenRepository.revoke(existing.id, 'rotated', newToken.id);

    await auditLogService.record({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: 'TOKEN_REFRESH',
      targetType: 'RefreshToken',
      targetId: newToken.id,
      ...meta,
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      profileId: null,
    });

    return {
      accessToken,
      refreshToken: rawNewToken,
      refreshTokenExpiresAt: expiresAt,
      rememberMe: existing.rememberMe,
      user: toPublicUser(user),
    };
  }

  async logout(rawRefreshToken: string | undefined, meta: RequestMeta) {
    if (!rawRefreshToken) return;
    const tokenHash = sha256(rawRefreshToken);
    const existing = await this.refreshTokenRepository.findByTokenHash(tokenHash);
    if (!existing || existing.revokedAt) return;

    await this.refreshTokenRepository.revoke(existing.id, 'logout');
    await auditLogService.record({
      actorUserId: existing.userId,
      action: 'USER_LOGOUT',
      targetType: 'RefreshToken',
      targetId: existing.id,
      ...meta,
    });
  }

  async logoutAll(userId: string, meta: RequestMeta) {
    await this.refreshTokenRepository.revokeAllForUser(userId, 'logout_all');
    await auditLogService.record({ actorUserId: userId, action: 'TOKEN_REVOKE', targetType: 'User', targetId: userId, ...meta });
  }

  /** Self-service — the caller's own recent sign-in attempts (success and failure), not the tenant-wide admin audit log. */
  async getLoginHistory(userId: string, page: number, limit: number) {
    return auditLogService.list(
      { actorUserId: userId, action: ['USER_LOGIN_SUCCESS', 'USER_LOGIN_FAILURE'] },
      page,
      limit,
    );
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findByIdWithProfile(userId);
    if (!user) throw new NotFoundError('User not found');
    return {
      user: toPublicUser(user),
      profile: user.profile,
      tenant: user.tenant,
    };
  }

  async requestPasswordReset(input: z.infer<typeof passwordResetRequestSchema>, meta: RequestMeta) {
    const user = await this.userRepository.findByEmail(input.email);
    // Deliberately do not reveal whether the account exists — respond identically either way.
    if (!user) return;

    const rawToken = generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(rawToken), expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS) },
    });

    const resetLink = `${env.APP_URL}/reset-password?token=${rawToken}`;
    await emailService.send({
      to: user.email,
      subject: 'Reset your Grow More password',
      text: `Click the link below to reset your password. This link is valid for 1 hour:\n\n${resetLink}`,
    });

    await auditLogService.record({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      targetType: 'User',
      targetId: user.id,
      ...meta,
    });
  }

  async confirmPasswordReset(input: z.infer<typeof passwordResetConfirmSchema>, meta: RequestMeta) {
    const tokenHash = sha256(input.token);
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const passwordHash = hashPassword(input.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);
    await this.refreshTokenRepository.revokeAllForUser(resetToken.userId, 'password_reset');

    await auditLogService.record({
      actorUserId: resetToken.userId,
      action: 'PASSWORD_RESET_COMPLETE',
      targetType: 'User',
      targetId: resetToken.userId,
      ...meta,
    });
  }

  async changePassword(userId: string, input: z.infer<typeof passwordChangeSchema>, meta: RequestMeta) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    if (!verifyPassword(input.currentPassword, user.passwordHash)) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    await this.userRepository.update(userId, { passwordHash: hashPassword(input.newPassword) });
    await this.refreshTokenRepository.revokeAllForUser(userId, 'password_change');

    await auditLogService.record({
      tenantId: user.tenantId,
      actorUserId: userId,
      action: 'PASSWORD_CHANGE',
      targetType: 'User',
      targetId: userId,
      ...meta,
    });
  }

  async beginTwoFactorEnrollment(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    const enrollment = await twoFactorService.beginEnrollment(user.email);
    await this.userRepository.update(userId, { twoFactorSecret: enrollment.encryptedSecret });
    return { secret: enrollment.secret, qrCodeDataUrl: enrollment.qrCodeDataUrl };
  }

  async enableTwoFactor(userId: string, input: z.infer<typeof twoFactorEnableSchema>, meta: RequestMeta) {
    const user = await this.userRepository.findById(userId);
    if (!user?.twoFactorSecret) throw new ConflictError('Start two-factor enrollment first');

    const isValid = twoFactorService.verifyCode(user.twoFactorSecret, input.code);
    if (!isValid) throw new UnauthorizedError('Invalid verification code');

    const { plain, hashed } = twoFactorService.generateRecoveryCodes();
    await this.userRepository.update(userId, { is2FAEnabled: true, twoFactorRecoveryCodesHash: hashed });

    await auditLogService.record({
      tenantId: user.tenantId,
      actorUserId: userId,
      action: 'TWO_FA_ENABLED',
      targetType: 'User',
      targetId: userId,
      ...meta,
    });

    return { recoveryCodes: plain };
  }

  async disableTwoFactor(userId: string, input: z.infer<typeof twoFactorDisableSchema>, meta: RequestMeta) {
    const user = await this.userRepository.findById(userId);
    if (!user?.is2FAEnabled || !user.twoFactorSecret) throw new ConflictError('Two-factor authentication is not enabled');
    if (!verifyPassword(input.password, user.passwordHash)) throw new UnauthorizedError('Incorrect password');
    if (!twoFactorService.verifyCode(user.twoFactorSecret, input.code)) throw new UnauthorizedError('Invalid verification code');

    await this.userRepository.update(userId, { is2FAEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodesHash: [] });

    await auditLogService.record({
      tenantId: user.tenantId,
      actorUserId: userId,
      action: 'TWO_FA_DISABLED',
      targetType: 'User',
      targetId: userId,
      ...meta,
    });
  }

  private async issueSession(
    user: { id: string; email: string; role: UserRole; status: string; tenantId: string },
    meta: RequestMeta,
    rememberMe = false,
  ) {
    const rawRefreshToken = generateOpaqueToken();
    let ttlMs: number;
    if (rememberMe) {
      const tenant = await this.tenantRepository.findById(user.tenantId);
      const days = tenant?.rememberMeDurationDays ?? parseDurationMs(env.JWT_REFRESH_TTL_REMEMBER_ME) / (24 * 60 * 60 * 1000);
      ttlMs = days * 24 * 60 * 60 * 1000;
    } else {
      // Without "remember me" the token itself is still valid for JWT_REFRESH_TTL server-side —
      // that's just a ceiling. What actually ends the session day-to-day is the cookie having no
      // persistent expiry (see setRefreshCookie in the controller: a true browser-session cookie,
      // gone the moment the browser closes) plus the inactivity timeout enforced in refresh().
      ttlMs = parseDurationMs(env.JWT_REFRESH_TTL);
    }
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: sha256(rawRefreshToken),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt,
      rememberMe,
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      profileId: null,
    });

    return {
      requiresTwoFactor: false as const,
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt: expiresAt,
      rememberMe,
      user: toPublicUser(user),
    };
  }
}

export const authService = new AuthService();
