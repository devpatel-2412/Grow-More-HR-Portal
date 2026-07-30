-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'MILESTONE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MILESTONE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MILESTONE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'WORK_REPORT_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'WORK_REPORT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'WORK_REPORT_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'WORK_REPORT_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'TIME_TIMER_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'TIME_TIMER_STOPPED';
ALTER TYPE "AuditAction" ADD VALUE 'TIME_LOG_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TIME_LOG_DELETED';

