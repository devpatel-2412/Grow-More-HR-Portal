import { prisma } from '../../db/prisma.js';
import type { Prisma, PayrollStatus } from '@prisma/client';

export class SalaryStructureRepository {
  upsert(employeeId: string, effectiveFrom: Date, data: Prisma.SalaryStructureCreateInput) {
    return prisma.salaryStructure.upsert({
      where: { employeeId_effectiveFrom: { employeeId, effectiveFrom } },
      create: data,
      update: { basicSalary: data.basicSalary, hra: data.hra, allowance: data.allowance },
    });
  }

  /** The structure in force on a given date: the latest one effective on or before it. */
  findEffective(employeeId: string, on: Date) {
    return prisma.salaryStructure.findFirst({
      where: { employeeId, effectiveFrom: { lte: on } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  findEffectiveForTenant(tenantId: string, on: Date) {
    return prisma.salaryStructure.findMany({
      where: { tenantId, effectiveFrom: { lte: on } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async findMany(
    tenantId: string,
    employeeId: string | undefined,
    orderBy: Record<string, 'asc' | 'desc'>,
    skip: number,
    take: number,
  ) {
    const where: Prisma.SalaryStructureWhereInput = { tenantId, employeeId };
    const [rows, total] = await Promise.all([
      prisma.salaryStructure.findMany({ where, orderBy, skip, take }),
      prisma.salaryStructure.count({ where }),
    ]);
    return { rows, total };
  }
}

export class PayrollRunRepository {
  findById(id: string) {
    return prisma.payrollRun.findUnique({ where: { id } });
  }

  findByPeriod(tenantId: string, month: number, year: number) {
    return prisma.payrollRun.findUnique({ where: { tenantId_month_year: { tenantId, month, year } } });
  }

  findWithItems(id: string) {
    return prisma.payrollRun.findUnique({ where: { id }, include: { items: true } });
  }

  update(id: string, data: Prisma.PayrollRunUpdateInput) {
    return prisma.payrollRun.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.payrollRun.delete({ where: { id } });
  }

  async findMany(
    tenantId: string,
    filter: { year?: number; status?: PayrollStatus },
    orderBy: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[],
    skip: number,
    take: number,
  ) {
    const where: Prisma.PayrollRunWhereInput = { tenantId, year: filter.year, status: filter.status };
    const [rows, total] = await Promise.all([
      prisma.payrollRun.findMany({ where, orderBy, skip, take }),
      prisma.payrollRun.count({ where }),
    ]);
    return { rows, total };
  }

  /**
   * A run and all of its payslips are written together — a half-generated run would silently
   * under-report the month's payroll and be indistinguishable from a complete one.
   */
  createWithItems(run: Prisma.PayrollRunCreateInput, items: Omit<Prisma.PayrollItemCreateManyInput, 'payrollRunId'>[]) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.payrollRun.create({ data: run });
      if (items.length > 0) {
        await tx.payrollItem.createMany({ data: items.map((item) => ({ ...item, payrollRunId: created.id })) });
      }
      return tx.payrollRun.findUniqueOrThrow({ where: { id: created.id }, include: { items: true } });
    });
  }

  /** Propagates a run-level status change to every payslip in it. */
  setStatus(id: string, status: PayrollStatus, processedById?: string) {
    return prisma.$transaction(async (tx) => {
      await tx.payrollItem.updateMany({ where: { payrollRunId: id }, data: { status } });
      return tx.payrollRun.update({
        where: { id },
        data: { status, processedById, processedAt: new Date() },
      });
    });
  }
}

export class PayrollItemRepository {
  findById(id: string) {
    return prisma.payrollItem.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.PayrollItemUpdateInput) {
    return prisma.payrollItem.update({ where: { id }, data });
  }

  async findMany(
    tenantId: string,
    filter: { employeeId?: string; month?: number; year?: number },
    orderBy: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[],
    skip: number,
    take: number,
  ) {
    const where: Prisma.PayrollItemWhereInput = {
      tenantId,
      employeeId: filter.employeeId,
      month: filter.month,
      year: filter.year,
    };
    const [rows, total] = await Promise.all([
      prisma.payrollItem.findMany({ where, orderBy, skip, take }),
      prisma.payrollItem.count({ where }),
    ]);
    return { rows, total };
  }

  async sumRunTotals(payrollRunId: string) {
    const result = await prisma.payrollItem.aggregate({
      where: { payrollRunId },
      _sum: { netSalary: true },
      _count: true,
    });
    return { totalNet: result._sum.netSalary ?? 0, itemCount: result._count };
  }
}
