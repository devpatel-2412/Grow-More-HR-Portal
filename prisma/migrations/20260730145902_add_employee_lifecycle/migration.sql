-- CreateEnum
CREATE TYPE "LifecycleEventType" AS ENUM ('CONFIRMATION', 'PROMOTION', 'TRANSFER', 'EXIT_INITIATED', 'EXIT_COMPLETED');

-- CreateEnum
CREATE TYPE "FnfStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CHECKLIST_ITEM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHECKLIST_ITEM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CHECKLIST_ITEM_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_PROMOTED';
ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_TRANSFERRED';
ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_EXIT_INITIATED';
ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_EXIT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'FNF_SETTLEMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FNF_SETTLEMENT_UPDATED';

-- CreateTable
CREATE TABLE "OnboardingChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LifecycleEventType" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FnfSettlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "lastWorkingDay" TIMESTAMP(3) NOT NULL,
    "pendingSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveEncashment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL,
    "status" "FnfStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FnfSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingChecklistItem_tenantId_idx" ON "OnboardingChecklistItem"("tenantId");

-- CreateIndex
CREATE INDEX "OnboardingChecklistItem_employeeId_idx" ON "OnboardingChecklistItem"("employeeId");

-- CreateIndex
CREATE INDEX "LifecycleEvent_tenantId_idx" ON "LifecycleEvent"("tenantId");

-- CreateIndex
CREATE INDEX "LifecycleEvent_employeeId_createdAt_idx" ON "LifecycleEvent"("employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FnfSettlement_employeeId_key" ON "FnfSettlement"("employeeId");

-- CreateIndex
CREATE INDEX "FnfSettlement_tenantId_idx" ON "FnfSettlement"("tenantId");

-- AddForeignKey
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleEvent" ADD CONSTRAINT "LifecycleEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleEvent" ADD CONSTRAINT "LifecycleEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FnfSettlement" ADD CONSTRAINT "FnfSettlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FnfSettlement" ADD CONSTRAINT "FnfSettlement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

