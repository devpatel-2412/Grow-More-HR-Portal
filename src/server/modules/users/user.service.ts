import { UserRepository } from './user.repository.js';
import { InviteRepository } from './invite.repository.js';
import { EmployeeRepository } from '../employees/employee.repository.js';
import { ClientRepository, ContactRepository } from '../crm/crm.repository.js';
import { hashPassword, sha256, generateOpaqueToken } from '../../shared/utils/hash.util.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { emailService } from '../../shared/email/email.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
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
    private readonly clientRepository: ClientRepository = new ClientRepository(),
    private readonly contactRepository: ContactRepository = new ContactRepository(),
  ) {}

  async invite(tenantId: string, input: z.infer<typeof inviteUserSchema>, ctx: RequestContext = {}) {
    const existingUser = await this.repository.findByEmail(input.email);
    if (existingUser) throw new ConflictError('An account with this email already exists');

    const pendingInvite = await this.inviteRepository.findPendingByTenantAndEmail(tenantId, input.email);
    if (pendingInvite) throw new ConflictError('An invite is already pending for this email');

    if (input.clientPortalId) {
      const client = await this.clientRepository.findById(input.clientPortalId);
      if (!client || client.tenantId !== tenantId) throw new NotFoundError('Client not found');
    }

    // Placeholder credential: unusable until acceptInvite() overwrites it, since passwordHash is NOT NULL.
    const placeholderPasswordHash = hashPassword(generateOpaqueToken());
    const invitedUser = await this.repository.create({
      email: input.email.toLowerCase(),
      passwordHash: placeholderPasswordHash,
      role: input.role,
      status: 'PENDING_INVITE',
      tenant: { connect: { id: tenantId } },
      clientProfile: input.clientPortalId ? { connect: { id: input.clientPortalId } } : undefined,
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

    await emailService.send({
      to: input.email,
      subject: "You've been invited to Grow More",
      text: `You've been invited to join. Use this token to accept and set your password: ${rawToken}`,
    });

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

    // A CLIENT-role invite represents a customer, not staff — it gets a ClientContact record
    // (so their name shows up against the client they belong to), never an EmployeeProfile.
    if (invite.role === 'CLIENT') {
      if (activatedUser.clientProfileId) {
        const existingContact = await this.contactRepository.findByClientAndEmail(activatedUser.clientProfileId, invite.email);
        if (!existingContact) {
          await this.contactRepository.create({
            tenant: { connect: { id: invite.tenantId } },
            client: { connect: { id: activatedUser.clientProfileId } },
            name: `${input.firstName} ${input.lastName}`,
            email: invite.email,
          });
        }
      }
    } else if (invite.role !== 'CANDIDATE') {
      // CANDIDATE has no profile record to create yet either — it isn't exposed in the invite
      // UI (see UserRole.CANDIDATE in schema.prisma), but a raw API call could still set it, so
      // this stays explicit rather than falling through to an EmployeeProfile that's wrong for it.
      //
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
    }

    await this.inviteRepository.markAccepted(invite.id);
    await auditLogService.record({
      tenantId: invite.tenantId,
      actorUserId: user.id,
      action: 'USER_INVITE_ACCEPTED',
      targetType: 'User',
      targetId: user.id,
    });

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
}

export const userService = new UserService();
