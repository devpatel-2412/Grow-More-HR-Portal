-- CreateEnum
CREATE TYPE "SopStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SOP_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SOP_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SOP_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'SOP_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'SOP_DELETED';

-- CreateTable
CREATE TABLE "Sop" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "department" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "SopStatus" NOT NULL DEFAULT 'DRAFT',
    "body" TEXT NOT NULL,
    "fileUrl" TEXT,
    "ownerId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sopId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SopRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sop_tenantId_status_idx" ON "Sop"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Sop_tenantId_title_key" ON "Sop"("tenantId", "title");

-- CreateIndex
CREATE INDEX "SopRevision_sopId_version_idx" ON "SopRevision"("sopId", "version");

-- AddForeignKey
ALTER TABLE "Sop" ADD CONSTRAINT "Sop_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sop" ADD CONSTRAINT "Sop_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopRevision" ADD CONSTRAINT "SopRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopRevision" ADD CONSTRAINT "SopRevision_sopId_fkey" FOREIGN KEY ("sopId") REFERENCES "Sop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopRevision" ADD CONSTRAINT "SopRevision_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

