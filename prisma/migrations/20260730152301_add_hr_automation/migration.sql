-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'DEPARTMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TEMPLATE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEMPLATE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEMPLATE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'ANNOUNCEMENT_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'ANNOUNCEMENT_DELETED';

-- AlterTable
ALTER TABLE "CanvaTemplate" DROP COLUMN "bgImage",
DROP COLUMN "layoutJson",
ADD COLUMN     "backgroundUrl" TEXT,
ADD COLUMN     "bodyTemplate" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "layoutFields" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "variablesJson" JSONB NOT NULL,
    "renderedContent" TEXT NOT NULL,
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "department" TEXT,
    "publishedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedDocument_tenantId_employeeId_idx" ON "GeneratedDocument"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_templateId_idx" ON "GeneratedDocument"("templateId");

-- CreateIndex
CREATE INDEX "Announcement_tenantId_createdAt_idx" ON "Announcement"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CanvaTemplate_tenantId_type_idx" ON "CanvaTemplate"("tenantId", "type");

-- AddForeignKey
ALTER TABLE "CanvaTemplate" ADD CONSTRAINT "CanvaTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CanvaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

