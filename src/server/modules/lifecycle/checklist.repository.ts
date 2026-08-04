import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class ChecklistRepository {
  create(data: Prisma.OnboardingChecklistItemCreateInput) {
    return prisma.onboardingChecklistItem.create({ data });
  }

  findById(id: string) {
    return prisma.onboardingChecklistItem.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.OnboardingChecklistItemUpdateInput) {
    return prisma.onboardingChecklistItem.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.onboardingChecklistItem.delete({ where: { id } });
  }

  findByEmployee(employeeId: string) {
    return prisma.onboardingChecklistItem.findMany({ where: { employeeId }, orderBy: { createdAt: 'asc' } });
  }
}
