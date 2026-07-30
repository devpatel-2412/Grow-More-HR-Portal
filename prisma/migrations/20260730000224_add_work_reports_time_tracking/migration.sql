-- CreateEnum
CREATE TYPE "TimeLogSource" AS ENUM ('TIMER', 'MANUAL');

-- AlterTable
ALTER TABLE "DailyWorkReport" DROP COLUMN "approvedById",
DROP COLUMN "completedTasksJson",
DROP COLUMN "pendingTasksJson",
DROP COLUMN "tomorrowPlanJson",
ADD COLUMN     "completedTasks" TEXT[],
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pendingTasks" TEXT[],
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "tomorrowPlan" TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "date" SET DATA TYPE DATE;

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "taskId" TEXT,
    "description" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "source" "TimeLogSource" NOT NULL DEFAULT 'TIMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeLog_tenantId_startedAt_idx" ON "TimeLog"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "TimeLog_employeeId_startedAt_idx" ON "TimeLog"("employeeId", "startedAt");

-- CreateIndex
CREATE INDEX "TimeLog_taskId_idx" ON "TimeLog"("taskId");

-- CreateIndex
CREATE INDEX "DailyWorkReport_tenantId_date_idx" ON "DailyWorkReport"("tenantId", "date");

-- CreateIndex
CREATE INDEX "DailyWorkReport_tenantId_status_idx" ON "DailyWorkReport"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DailyWorkReport_employeeId_date_key" ON "DailyWorkReport"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "DailyWorkReport" ADD CONSTRAINT "DailyWorkReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyWorkReport" ADD CONSTRAINT "DailyWorkReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

