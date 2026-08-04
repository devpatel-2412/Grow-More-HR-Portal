import { prisma } from '../../db/prisma.js';
import type { Prisma } from '@prisma/client';

export class FnfRepository {
  findByEmployee(employeeId: string) {
    return prisma.fnfSettlement.findUnique({ where: { employeeId } });
  }

  create(data: Prisma.FnfSettlementCreateInput) {
    return prisma.fnfSettlement.create({ data });
  }

  update(employeeId: string, data: Prisma.FnfSettlementUpdateInput) {
    return prisma.fnfSettlement.update({ where: { employeeId }, data });
  }
}
