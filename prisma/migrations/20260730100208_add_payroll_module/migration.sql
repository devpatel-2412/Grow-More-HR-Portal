-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SALARY_STRUCTURE_SET';
ALTER TYPE "AuditAction" ADD VALUE 'PAYROLL_RUN_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYROLL_RUN_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYROLL_RUN_PAID';
ALTER TYPE "AuditAction" ADD VALUE 'PAYROLL_RUN_CANCELLED';

-- AlterEnum
BEGIN;
CREATE TYPE "PayrollStatus_new" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');
ALTER TABLE "public"."PayrollItem" ALTER COLUMN "status" DROP DEFAULT;
-- "PayrollRun" is created further down in this same migration, already using the new enum, so it
-- must not be converted here (prisma migrate diff emitted the AlterEnum ahead of the CreateTable).
ALTER TABLE "PayrollItem" ALTER COLUMN "status" TYPE "PayrollStatus_new" USING ("status"::text::"PayrollStatus_new");
ALTER TYPE "PayrollStatus" RENAME TO "PayrollStatus_old";
ALTER TYPE "PayrollStatus_new" RENAME TO "PayrollStatus";
DROP TYPE "public"."PayrollStatus_old";
ALTER TABLE "PayrollItem" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "PayrollItem" ADD COLUMN     "grossSalary" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "payrollRunId" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "totalDeductions" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "unpaidLeaveDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unpaidLeaveDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "payrollEsicEmployeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0075,
ADD COLUMN     "payrollEsicWageCeiling" DOUBLE PRECISION NOT NULL DEFAULT 21000,
ADD COLUMN     "payrollOvertimeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
ADD COLUMN     "payrollPfEmployeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
ADD COLUMN     "payrollPfWageCeiling" DOUBLE PRECISION NOT NULL DEFAULT 15000,
ADD COLUMN     "payrollProfessionalTax" DOUBLE PRECISION NOT NULL DEFAULT 200,
ADD COLUMN     "payrollTdsRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "payrollWorkingDaysPerMonth" INTEGER NOT NULL DEFAULT 26;

-- CreateTable
CREATE TABLE "SalaryStructure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalNet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryStructure_tenantId_idx" ON "SalaryStructure"("tenantId");

-- CreateIndex
CREATE INDEX "SalaryStructure_employeeId_effectiveFrom_idx" ON "SalaryStructure"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryStructure_employeeId_effectiveFrom_key" ON "SalaryStructure"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_year_month_idx" ON "PayrollRun"("tenantId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_tenantId_month_year_key" ON "PayrollRun"("tenantId", "month", "year");

-- CreateIndex
CREATE INDEX "PayrollItem_tenantId_year_month_idx" ON "PayrollItem"("tenantId", "year", "month");

-- CreateIndex
CREATE INDEX "PayrollItem_payrollRunId_idx" ON "PayrollItem"("payrollRunId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_employeeId_month_year_key" ON "PayrollItem"("employeeId", "month", "year");

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

