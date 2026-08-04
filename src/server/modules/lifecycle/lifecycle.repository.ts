import { prisma } from '../../db/prisma.js';
import type { Prisma, LifecycleEventType } from '@prisma/client';

export class LifecycleRepository {
  findEventsByEmployee(employeeId: string) {
    return prisma.lifecycleEvent.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' } });
  }

  /** Records the event and applies the employee-profile side effect in the same transaction so history and state never drift apart. */
  recordEvent(
    tenantId: string,
    employeeId: string,
    event: {
      type: LifecycleEventType;
      effectiveDate: Date;
      previousValue?: string;
      newValue?: string;
      notes?: string;
      createdById?: string;
    },
    profileUpdate: Prisma.EmployeeProfileUpdateInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const updatedEmployee = await tx.employeeProfile.update({ where: { id: employeeId }, data: profileUpdate });
      const lifecycleEvent = await tx.lifecycleEvent.create({
        data: {
          tenant: { connect: { id: tenantId } },
          employee: { connect: { id: employeeId } },
          type: event.type,
          effectiveDate: event.effectiveDate,
          previousValue: event.previousValue,
          newValue: event.newValue,
          notes: event.notes,
          createdById: event.createdById,
        },
      });
      return { updatedEmployee, lifecycleEvent };
    });
  }
}
