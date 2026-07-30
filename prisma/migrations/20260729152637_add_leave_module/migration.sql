-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_MANAGER_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_MANAGER_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_HR_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_HR_REJECTED';

-- AlterEnum
BEGIN;
CREATE TYPE "LeaveStatus_new" AS ENUM ('PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED');
ALTER TABLE "public"."LeaveRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" TYPE "LeaveStatus_new" USING ("status"::text::"LeaveStatus_new");
ALTER TYPE "LeaveStatus" RENAME TO "LeaveStatus_old";
ALTER TYPE "LeaveStatus_new" RENAME TO "LeaveStatus";
DROP TYPE "public"."LeaveStatus_old";
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING_MANAGER';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeaveType" ADD VALUE 'EARNED';
ALTER TYPE "LeaveType" ADD VALUE 'PAID';
ALTER TYPE "LeaveType" ADD VALUE 'COMP_OFF';
ALTER TYPE "LeaveType" ADD VALUE 'WORK_FROM_HOME';
ALTER TYPE "LeaveType" ADD VALUE 'REMOTE_WORK';

-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "approvedById",
ADD COLUMN     "hrApprovedById" TEXT,
ADD COLUMN     "hrReviewedAt" TIMESTAMP(3),
ADD COLUMN     "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "managerApprovedById" TEXT,
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "totalDays" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING_MANAGER';

-- CreateIndex
CREATE INDEX "LeaveRequest_tenantId_status_idx" ON "LeaveRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveRequest_managerId_status_idx" ON "LeaveRequest"("managerId", "status");

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

