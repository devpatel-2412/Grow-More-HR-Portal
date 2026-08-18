-- Performance pass: composite indexes backing real, existing query patterns that had no index
-- support (status filters and a default sort each hit on every page load of their respective
-- list). Not speculative — see the comments beside each @@index in schema.prisma for the exact
-- query each one backs.

-- CreateIndex
CREATE INDEX "Project_tenantId_status_idx" ON "Project"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EmployeeProfile_tenantId_status_idx" ON "EmployeeProfile"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_tenantId_createdAt_idx" ON "LeaveRequest"("tenantId", "createdAt");
