import { EmployeeRepository } from './employee.repository.js';
import { UserRepository } from '../users/user.repository.js';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error.js';
import { auditLogService } from '../audit/audit.service.js';
import { buildPaginationMeta, toPrismaOrderBy } from '../../shared/utils/pagination.util.js';
import type { z } from 'zod';
import type { createEmployeeProfileSchema, updateEmployeeProfileSchema, listEmployeesQuerySchema } from './employee.validators.js';
import type { RequestContext } from '../tenants/tenant.service.js';

const SORTABLE_FIELDS = ['firstName', 'lastName', 'department', 'dateOfJoining', 'createdAt'] as const;

export class EmployeeService {
  constructor(
    private readonly repository: EmployeeRepository = new EmployeeRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
  ) {}

  async create(tenantId: string, input: z.infer<typeof createEmployeeProfileSchema>, ctx: RequestContext = {}) {
    const user = await this.userRepository.findById(input.userId);
    if (!user || user.tenantId !== tenantId) throw new NotFoundError('User not found in this tenant');

    const existingProfile = await this.repository.findByUserId(input.userId);
    if (existingProfile) throw new ConflictError('This user already has an employee profile');

    const profile = await this.repository.create({
      user: { connect: { id: input.userId } },
      tenant: { connect: { id: tenantId } },
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      department: input.department,
      designation: input.designation,
      dateOfJoining: input.dateOfJoining,
      dateOfBirth: input.dateOfBirth,
      manager: input.managerId ? { connect: { id: input.managerId } } : undefined,
    });

    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'EMPLOYEE_PROFILE_CREATED',
      targetType: 'EmployeeProfile',
      targetId: profile.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return profile;
  }

  async getById(tenantId: string, id: string) {
    const profile = await this.repository.findById(id);
    if (!profile || profile.tenantId !== tenantId) throw new NotFoundError('Employee profile not found');
    return profile;
  }

  async getByUserId(userId: string) {
    return this.repository.findByUserId(userId);
  }

  async update(tenantId: string, id: string, input: z.infer<typeof updateEmployeeProfileSchema>, ctx: RequestContext = {}) {
    await this.getById(tenantId, id);
    const profile = await this.repository.update(id, {
      phone: input.phone,
      department: input.department,
      designation: input.designation,
      status: input.status,
      manager:
        input.managerId === undefined
          ? undefined
          : input.managerId === null
            ? { disconnect: true }
            : { connect: { id: input.managerId } },
    });

    await auditLogService.record({
      tenantId,
      actorUserId: ctx.actorUserId,
      action: 'EMPLOYEE_PROFILE_UPDATED',
      targetType: 'EmployeeProfile',
      targetId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: input,
    });

    return profile;
  }

  async list(tenantId: string, query: z.infer<typeof listEmployeesQuerySchema>) {
    const orderBy = toPrismaOrderBy(query.sort, SORTABLE_FIELDS, 'firstName');
    const { rows, total } = await this.repository.findManyByTenant(
      tenantId,
      { department: query.department, status: query.status, managerId: query.managerId, search: query.search },
      orderBy,
      (query.page - 1) * query.limit,
      query.limit,
    );
    return { rows, meta: buildPaginationMeta(query.page, query.limit, total) };
  }
}

export const employeeService = new EmployeeService();
