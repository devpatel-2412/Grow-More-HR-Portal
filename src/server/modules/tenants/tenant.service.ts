import { TenantRepository } from './tenant.repository.js';
import { UserRepository } from '../users/user.repository.js';
import { InviteRepository } from '../users/invite.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import { hashPassword, sha256, generateOpaqueToken } from '../../shared/utils/hash.util.js';
import { emailService } from '../../shared/email/email.service.js';
import { companyAdminInviteTemplate } from '../../shared/email/email.templates.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/logger.js';

const TENANT_SORTABLE_FIELDS = ['name', 'domain', 'createdAt'] as const;
const ADMIN_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
import type { z } from 'zod';
import type { createTenantSchema, updateTenantSchema } from './tenant.validators.js';

export interface RequestContext {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class TenantService {
  constructor(
    private readonly repository: TenantRepository = new TenantRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly inviteRepository: InviteRepository = new InviteRepository(),
  ) {}

  /**
   * Creates a company and its first user in one step: a PENDING_INVITE ADMIN who gets an
   * activation email immediately. There is deliberately no separate "invite the first admin"
   * call — a company with zero users is not a usable state, and public registration is
   * permanently closed, so this is the only path that can ever produce a company's first login.
   * Kept as its own small implementation rather than reusing UserService.invite() (which needs an
   * existing tenantId to invite into) — a little duplication beats coupling two already-stable,
   * independently-tested flows together.
   */
  async create(input: z.infer<typeof createTenantSchema>, ctx: RequestContext = {}) {
    const existingTenant = await this.repository.findByDomain(input.domain);
    if (existingTenant) throw new ConflictError('A tenant with this domain already exists');

    const adminEmail = input.adminEmail.toLowerCase();
    const existingUser = await this.userRepository.findByEmail(adminEmail);
    if (existingUser) throw new ConflictError('An account with this email already exists');

    const tenant = await this.repository.create({
      name: input.name,
      domain: input.domain,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      font: input.font,
    });

    // Placeholder credential: unusable until acceptInvite() overwrites it, since passwordHash is NOT NULL.
    const invitedAdmin = await this.userRepository.create({
      email: adminEmail,
      passwordHash: hashPassword(generateOpaqueToken()),
      role: 'ADMIN',
      status: 'PENDING_INVITE',
      tenant: { connect: { id: tenant.id } },
    });

    const rawToken = generateOpaqueToken();
    await this.inviteRepository.create({
      tenantId: tenant.id,
      email: adminEmail,
      role: 'ADMIN',
      tokenHash: sha256(rawToken),
      invitedById: ctx.actorUserId,
      expiresAt: new Date(Date.now() + ADMIN_INVITE_TTL_MS),
    });

    await auditLogService.record({
      tenantId: tenant.id,
      actorUserId: ctx.actorUserId,
      action: 'TENANT_CREATED',
      targetType: 'Tenant',
      targetId: tenant.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    await auditLogService.record({
      tenantId: tenant.id,
      actorUserId: ctx.actorUserId,
      action: 'COMPANY_ADMIN_INVITED',
      targetType: 'User',
      targetId: invitedAdmin.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { email: adminEmail },
    });

    // Best-effort: the tenant and the admin's account both already exist and are committed above
    // — a hiccup sending the email must not fail the request or leave the caller unable to tell
    // whether the company was actually created. retryFailedEmails picks up a failed send separately.
    try {
      const inviteLink = `${env.APP_URL}/invite/accept?token=${rawToken}`;
      const { subject, html, text } = companyAdminInviteTemplate({
        tenantName: tenant.name,
        inviteLink,
        expiresInDays: ADMIN_INVITE_TTL_MS / (24 * 60 * 60 * 1000),
      });
      await emailService.send({ to: adminEmail, subject, html, text, template: 'company_admin_invite', tenantId: tenant.id });
    } catch (err) {
      logger.error({ err, tenantId: tenant.id, email: adminEmail }, 'Failed to send company admin invite email');
    }

    return tenant;
  }

  async getById(id: string) {
    const tenant = await this.repository.findById(id);
    if (!tenant) throw new NotFoundError('Tenant not found');
    return tenant;
  }

  async update(id: string, input: z.infer<typeof updateTenantSchema>, ctx: RequestContext = {}) {
    await this.getById(id);
    const tenant = await this.repository.update(id, input);

    await auditLogService.record({
      tenantId: id,
      actorUserId: ctx.actorUserId,
      action: 'TENANT_UPDATED',
      targetType: 'Tenant',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: input,
    });

    return tenant;
  }

  async list(page: number, limit: number, search?: string, sort?: string) {
    const orderBy = toPrismaOrderBy(sort, TENANT_SORTABLE_FIELDS, { field: 'createdAt', direction: 'desc' });
    const { rows, total } = await this.repository.findMany((page - 1) * limit, limit, orderBy, search);
    return { rows, meta: buildPaginationMeta(page, limit, total) };
  }
}

export const tenantService = new TenantService();
