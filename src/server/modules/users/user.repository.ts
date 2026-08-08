import { prisma } from '../../db/prisma.js';
import type { Prisma, UserRole, UserStatus } from '@prisma/client';

export class UserRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  findByIdWithProfile(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { profile: true, tenant: true } });
  }

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  async recordLoginSuccess(id: string) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });
  }

  async recordLoginFailure(id: string, lockThreshold: number, lockDurationMs: number) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil = failedLoginCount >= lockThreshold ? new Date(Date.now() + lockDurationMs) : user.lockedUntil;
    return prisma.user.update({ where: { id }, data: { failedLoginCount, lockedUntil } });
  }

  async findManyByTenant(
    tenantId: string,
    filter: { role?: UserRole; status?: UserStatus; search?: string },
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.UserWhereInput = {
      tenantId,
      role: filter.role,
      status: filter.status,
      email: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy, skip, take, include: { profile: true } }),
      prisma.user.count({ where }),
    ]);
    return { rows, total };
  }
}
