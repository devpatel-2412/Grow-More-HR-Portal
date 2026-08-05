-- DropIndex
DROP INDEX "EmployeeProfile_employeeId_key";

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_tenantId_employeeId_key" ON "EmployeeProfile"("tenantId", "employeeId");

