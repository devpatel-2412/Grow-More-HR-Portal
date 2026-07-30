-- CreateEnum
CREATE TYPE "RegularizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "attendanceAllowedBreakMinutes" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN     "attendanceBreakOverageExtendsLogout" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "attendanceRequiredWorkMinutes" INTEGER NOT NULL DEFAULT 540,
ADD COLUMN     "attendanceShiftStartMinutes" INTEGER NOT NULL DEFAULT 570;

-- CreateTable
CREATE TABLE "AttendanceBreak" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "breakIn" TIMESTAMP(3) NOT NULL,
    "breakOut" TIMESTAMP(3),

    CONSTRAINT "AttendanceBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRegularization" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "requestedCheckIn" TIMESTAMP(3),
    "requestedCheckOut" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "RegularizationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRegularization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceBreak_attendanceId_idx" ON "AttendanceBreak"("attendanceId");

-- CreateIndex
CREATE INDEX "AttendanceRegularization_tenantId_status_idx" ON "AttendanceRegularization"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AttendanceRegularization_employeeId_idx" ON "AttendanceRegularization"("employeeId");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_date_idx" ON "Attendance"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceBreak" ADD CONSTRAINT "AttendanceBreak_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

