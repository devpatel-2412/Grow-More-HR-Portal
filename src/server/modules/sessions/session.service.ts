import { RefreshTokenRepository } from '../auth/refresh-token.repository.js';
import { UserRepository } from '../users/user.repository.js';
import { TenantRepository } from '../tenants/tenant.repository.js';
import { auditLogService } from '../audit/audit.service.js';
import { NotFoundError } from '../../shared/errors/app-error.js';
import type { RequestMeta } from '../auth/auth.types.js';

interface ActorContext extends RequestMeta {
  actorUserId: string;
}

/** Coarse UA sniffing for the dashboard's Browser/Device columns — display-only, not a fingerprinting mechanism. */
function parseUserAgent(ua: string | null): { browser: string; device: string } {
  if (!ua) return { browser: 'Unknown', device: 'Unknown' };

  let browser = 'Unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome\//i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua)) browser = 'Safari';

  let device = 'Desktop';
  if (/ipad/i.test(ua)) device = 'iPad';
  else if (/iphone/i.test(ua)) device = 'iPhone';
  else if (/android/i.test(ua)) device = /mobile/i.test(ua) ? 'Android Phone' : 'Android Tablet';
  else if (/windows/i.test(ua)) device = 'Windows PC';
  else if (/macintosh|mac os/i.test(ua)) device = 'Mac';
  else if (/linux/i.test(ua)) device = 'Linux PC';

  return { browser, device };
}

export class SessionService {
  constructor(
    private readonly refreshTokenRepository = new RefreshTokenRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly tenantRepository = new TenantRepository(),
  ) {}

  /** The Session Management Dashboard's data — every currently-live session across the tenant. */
  async listActiveSessions(tenantId: string) {
    const [tokens, tenant] = await Promise.all([
      this.refreshTokenRepository.findActiveByTenant(tenantId),
      this.tenantRepository.findById(tenantId),
    ]);

    // A tenant-wide force-logout only bumps forceLogoutAllAt (see auth.service.refresh()) rather
    // than bulk-revoking every row, so the dashboard filters those tokens out client-of-the-DB-side
    // to stay accurate immediately, without paying for a bulk write.
    const visible = tenant?.forceLogoutAllAt
      ? tokens.filter((token) => token.createdAt >= tenant.forceLogoutAllAt!)
      : tokens;

    return visible.map((token) => {
      const { browser, device } = parseUserAgent(token.userAgent);
      const profile = token.user.profile;
      return {
        id: token.id,
        userId: token.user.id,
        userName: profile ? `${profile.firstName} ${profile.lastName}` : token.user.email,
        userEmail: token.user.email,
        role: token.user.role,
        loginTime: token.createdAt,
        lastActivity: token.lastUsedAt,
        browser,
        device,
        ipAddress: token.ipAddress,
        rememberMe: token.rememberMe,
      };
    });
  }

  /** Ends every session belonging to one user — the dashboard's per-row "Force Logout" action. */
  async forceLogoutUser(tenantId: string, targetUserId: string, ctx: ActorContext) {
    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser || targetUser.tenantId !== tenantId) throw new NotFoundError('User not found');

    await this.refreshTokenRepository.revokeAllForUser(targetUserId, 'admin_force_logout');
    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'SESSION_FORCE_LOGOUT',
      targetType: 'User',
      targetId: targetUserId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  /** Ends every session tenant-wide. O(1): bumps a timestamp instead of touching every token row — see auth.service.refresh(). */
  async forceLogoutAll(tenantId: string, ctx: ActorContext) {
    await this.tenantRepository.update(tenantId, { forceLogoutAllAt: new Date() });
    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'SESSION_FORCE_LOGOUT_ALL',
      targetType: 'Tenant',
      targetId: tenantId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }
}

export const sessionService = new SessionService();
