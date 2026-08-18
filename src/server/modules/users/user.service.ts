import { UserRepository } from './user.repository.js';
import { InviteRepository } from './invite.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { TenantRepository } from '../tenants/tenant.repository.js';
import { hashPassword, sha256, generateOpaqueToken } from '../../shared/utils/hash.util.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { emailService } from '../../shared/email/email.service.js';
import { inviteEmailTemplate, welcomeEmailTemplate } from '../../shared/email/email.templates.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/logger.js';
import { buildPaginationMeta, toPrismaOrderBy, toPrismaSkipTake, type PaginationQuery } from '../../shared/utils/pagination.util.js';
import { INVITABLE_ROLES } from '../../shared/permissions/permissions.js';
import { storageService, type UploadedFileInput } from '../../shared/storage/storage.service.js';
import { processAvatarImage } from '../../shared/utils/avatar-image.util.js';
import { resolveAvatarUrl, invalidateAvatarUrlCache } from '../../shared/utils/avatar-url.util.js';
import type { RequestContext } from '../tenants/tenant.service.js';
import type { UserRole, UserStatus } from '@prisma/client';
import type { z } from 'zod';
import type { inviteUserSchema, acceptInviteSchema, listUsersQuerySchema } from './user.validators.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SORTABLE_FIELDS = ['email', 'createdAt', 'lastLoginAt'] as const;

export class UserService {
  constructor(
    private readonly repository: UserRepository = new UserRepository(),
    private readonly inviteRepository: InviteRepository = new InviteRepository(),
    private readonly employeeRepository: EmployeeRepository = new EmployeeRepository(),
    private readonly tenantRepository: TenantRepository = new TenantRepository(),
  ) {}

  async invite(tenantId: string, input: z.infer<typeof inviteUserSchema>, actorRole: UserRole, ctx: RequestContext = {}) {
    if (!(INVITABLE_ROLES[actorRole] ?? []).includes(input.role)) {
      throw new ForbiddenError(`Your role cannot invite a user as ${input.role.replace(/_/g, ' ')}`);
    }

    const existingUser = await this.repository.findByEmail(input.email);
    if (existingUser) throw new ConflictError('An account with this email already exists');

    const pendingInvite = await this.inviteRepository.findPendingByTenantAndEmail(tenantId, input.email);
    if (pendingInvite) throw new ConflictError('An invite is already pending for this email');

    // Placeholder credential: unusable until acceptInvite() overwrites it, since passwordHash is NOT NULL.
    const placeholderPasswordHash = hashPassword(generateOpaqueToken());
    const invitedUser = await this.repository.create({
      email: input.email.toLowerCase(),
      passwordHash: placeholderPasswordHash,
      role: input.role,
      status: 'PENDING_INVITE',
      tenant: { connect: { id: tenantId } },
    });

    const rawToken = generateOpaqueToken();
    await this.inviteRepository.create({
      tenantId,
      email: input.email.toLowerCase(),
      role: input.role,
      tokenHash: sha256(rawToken),
      invitedById: ctx.actorUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });

    // Best-effort: the invite record is already committed above — a hiccup looking up the
    // tenant name or sending the email must not fail the request (the admin would see a
    // confusing 500 despite the invite existing, and a retry would then 409 as "already
    // pending"). retryFailedEmails picks up a failed send separately.
    try {
      const inviteLink = `${env.APP_URL}/invite/accept?token=${rawToken}`;
      const inviteTenant = await this.tenantRepository.findById(tenantId);
      const { subject, html, text } = inviteEmailTemplate({
        tenantName: inviteTenant?.name ?? 'Grow More',
        role: input.role,
        inviteLink,
        expiresInDays: INVITE_TTL_MS / (24 * 60 * 60 * 1000),
      });
      await emailService.send({ to: input.email, subject, html, text, template: 'invite', tenantId });
    } catch (err) {
      logger.error({ err, tenantId, email: input.email }, 'Failed to send invite email');
    }

    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'USER_INVITED',
      targetType: 'User',
      targetId: invitedUser.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { email: input.email, role: input.role },
    });

    return invitedUser;
  }

  async acceptInvite(input: z.infer<typeof acceptInviteSchema>) {
    const tokenHash = sha256(input.token);
    const invite = await this.inviteRepository.findByTokenHash(tokenHash);
    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired invite');
    }

    const user = await this.repository.findByEmail(invite.email);
    if (!user) throw new NotFoundError('Invited account no longer exists');

    const activatedUser = await this.repository.update(user.id, {
      passwordHash: hashPassword(input.password),
      status: 'ACTIVE',
    });

    // An admin may have already filled in a real department/designation/employee ID for this
    // person via the Employees module while their invite was still pending — check first so
    // acceptance doesn't clobber that with placeholder values (and doesn't hit the DB's
    // one-profile-per-user constraint).
    const existingProfile = await this.employeeRepository.findByUserId(user.id);
    if (!existingProfile) {
      await this.employeeRepository.create({
        user: { connect: { id: user.id } },
        tenant: { connect: { id: invite.tenantId } },
        employeeId: `EMP-${new Date().getFullYear()}-${user.id.slice(0, 6).toUpperCase()}`,
        firstName: input.firstName,
        lastName: input.lastName,
        department: 'Unassigned',
        designation: 'Team Member',
        dateOfJoining: new Date(),
        status: 'ACTIVE',
      });
    }

    await this.inviteRepository.markAccepted(invite.id);
    await auditLogService.record({
      tenantId: invite.tenantId,
      actorUserId: user.id,
      action: 'USER_INVITE_ACCEPTED',
      targetType: 'User',
      targetId: user.id,
      metadata: { acceptedTerms: input.acceptedTerms },
    });

    // Best-effort: account activation has already succeeded and committed above — a hiccup
    // looking up the tenant name or sending the welcome email must never turn a successful
    // activation into a failed request.
    try {
      const tenant = await this.tenantRepository.findById(invite.tenantId);
      const { subject, html, text } = welcomeEmailTemplate({
        firstName: input.firstName,
        tenantName: tenant?.name ?? 'Grow More',
        loginLink: `${env.APP_URL}/login`,
      });
      await emailService.send({ to: invite.email, subject, html, text, template: 'welcome', tenantId: invite.tenantId });
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Failed to send welcome email');
    }

    return activatedUser;
  }

  async list(tenantId: string, query: z.infer<typeof listUsersQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, SORTABLE_FIELDS, 'createdAt');
    const { rows, total } = await this.repository.findManyByTenant(
      tenantId,
      { role: query.role, status: query.status, search: query.search },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async getById(tenantId: string, id: string) {
    const user = await this.repository.findById(id);
    if (!user || user.tenantId !== tenantId) throw new NotFoundError('User not found');
    return user;
  }

  async updateRole(tenantId: string, id: string, role: UserRole, ctx: RequestContext = {}) {
    await this.getById(tenantId, id);
    const user = await this.repository.update(id, { role });

    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'USER_ROLE_CHANGED',
      targetType: 'User',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { newRole: role },
    });

    return user;
  }

  async updateStatus(tenantId: string, id: string, status: UserStatus, ctx: RequestContext = {}) {
    await this.getById(tenantId, id);
    const user = await this.repository.update(id, { status });

    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'USER_STATUS_CHANGED',
      targetType: 'User',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { newStatus: status },
    });

    return user;
  }

  /**
   * Replaces this user's profile picture. `processAvatarImage` is the authoritative validation —
   * it decodes and re-encodes the file content itself, so the earlier multer fileFilter (which
   * only trusts the client-declared MIME type + filename extension) is a fast rejection, not the
   * real gate. The old file (if any) is deleted only after the new one is safely stored and the
   * User row updated, and only best-effort — a stale orphaned object in storage is harmless; a
   * user stuck with no avatar because cleanup 500'd would not be.
   */
  async updateAvatar(tenantId: string, id: string, file: UploadedFileInput, ctx: RequestContext = {}) {
    const existing = await this.getById(tenantId, id);
    const processed = await processAvatarImage(file.buffer);

    const { storageKey } = await storageService.upload(tenantId, 'avatars', {
      buffer: processed.buffer,
      mimeType: processed.mimeType,
      fileName: processed.fileName,
    });

    const user = await this.repository.update(id, { avatarStorageKey: storageKey });

    if (existing.avatarStorageKey) {
      invalidateAvatarUrlCache(existing.avatarStorageKey);
      await storageService.delete(existing.avatarStorageKey).catch((err) => {
        logger.warn({ err, tenantId, userId: id }, 'Failed to delete previous avatar file');
      });
    }

    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'USER_AVATAR_UPDATED',
      targetType: 'User',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { ...user, avatarUrl: await resolveAvatarUrl(user.avatarStorageKey) };
  }

  /** Idempotent — removing an already-absent avatar is a no-op, not an error (handles a slow
   * double-click on "Remove" or a stale UI state gracefully instead of surfacing a 404/409). */
  async removeAvatar(tenantId: string, id: string, ctx: RequestContext = {}) {
    const existing = await this.getById(tenantId, id);
    if (!existing.avatarStorageKey) return { ...existing, avatarUrl: null as string | null };

    const user = await this.repository.update(id, { avatarStorageKey: null });
    invalidateAvatarUrlCache(existing.avatarStorageKey);
    await storageService.delete(existing.avatarStorageKey).catch((err) => {
      logger.warn({ err, tenantId, userId: id }, 'Failed to delete avatar file');
    });

    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'USER_AVATAR_REMOVED',
      targetType: 'User',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { ...user, avatarUrl: null as string | null };
  }

  /** The caller's own allowed invite-target roles — drives the invite dialog's role dropdown so a role without USER_INVITE granted simply sees an empty list rather than a 403 on submit. */
  invitableRoles(actorRole: UserRole): UserRole[] {
    return INVITABLE_ROLES[actorRole] ?? [];
  }

  async listInvites(tenantId: string, query: PaginationQuery) {
    const { skip, take } = toPrismaSkipTake(query);
    const { rows, total } = await this.inviteRepository.findManyByTenant(tenantId, skip, take);
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }

  async resendInvite(tenantId: string, inviteId: string, ctx: RequestContext = {}) {
    const invite = await this.inviteRepository.findById(inviteId);
    if (!invite || invite.tenantId !== tenantId) throw new NotFoundError('Invite not found');
    if (invite.status !== 'PENDING') throw new ConflictError('Only a pending invite can be resent');

    const rawToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await this.inviteRepository.updateToken(invite.id, sha256(rawToken), expiresAt);

    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'USER_INVITE_RESENT',
      targetType: 'Invite',
      targetId: invite.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { email: invite.email },
    });

    // Best-effort: the new token is already committed above — a hiccup sending the email must
    // not fail the request. retryFailedEmails picks up a failed send separately.
    try {
      const inviteLink = `${env.APP_URL}/invite/accept?token=${rawToken}`;
      const inviteTenant = await this.tenantRepository.findById(tenantId);
      const { subject, html, text } = inviteEmailTemplate({
        tenantName: inviteTenant?.name ?? 'Grow More',
        role: invite.role,
        inviteLink,
        expiresInDays: INVITE_TTL_MS / (24 * 60 * 60 * 1000),
      });
      await emailService.send({ to: invite.email, subject, html, text, template: 'invite', tenantId });
    } catch (err) {
      logger.error({ err, tenantId, email: invite.email }, 'Failed to send invite resend email');
    }

    return invite;
  }

  async revokeInvite(tenantId: string, inviteId: string, ctx: RequestContext = {}) {
    const invite = await this.inviteRepository.findById(inviteId);
    if (!invite || invite.tenantId !== tenantId) throw new NotFoundError('Invite not found');
    if (invite.status !== 'PENDING') throw new ConflictError('Only a pending invite can be revoked');

    await this.inviteRepository.markRevoked(invite.id);

    // The PENDING_INVITE placeholder account created alongside the invite (see invite() above)
    // must go too — its still-unique email would otherwise block ever re-inviting this address.
    const pendingUser = await this.repository.findByEmail(invite.email);
    if (pendingUser && pendingUser.status === 'PENDING_INVITE' && pendingUser.tenantId === tenantId) {
      await this.repository.delete(pendingUser.id);
    }

    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'USER_INVITE_REVOKED',
      targetType: 'Invite',
      targetId: invite.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { email: invite.email },
    });

    return invite;
  }
}

export const userService = new UserService();
