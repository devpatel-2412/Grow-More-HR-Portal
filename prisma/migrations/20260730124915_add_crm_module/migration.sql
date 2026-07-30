-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CHURNED');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LEAD_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_STAGE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_CONVERTED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'CRM_ACTIVITY_LOGGED';

-- DropIndex
DROP INDEX "ClientPortal_contactEmail_key";

-- AlterTable
ALTER TABLE "ClientPortal" ADD COLUMN     "accountManagerId" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "designation" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "estimatedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "notes" TEXT,
    "lostReason" TEXT,
    "convertedClientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "CrmActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientContact_tenantId_idx" ON "ClientContact"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientContact_clientId_email_key" ON "ClientContact"("clientId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_convertedClientId_key" ON "Lead"("convertedClientId");

-- CreateIndex
CREATE INDEX "Lead_tenantId_status_idx" ON "Lead"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Lead_ownerId_idx" ON "Lead"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tenantId_email_key" ON "Lead"("tenantId", "email");

-- CreateIndex
CREATE INDEX "CrmActivity_tenantId_occurredAt_idx" ON "CrmActivity"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "CrmActivity_leadId_idx" ON "CrmActivity"("leadId");

-- CreateIndex
CREATE INDEX "CrmActivity_clientId_idx" ON "CrmActivity"("clientId");

-- CreateIndex
CREATE INDEX "ClientPortal_tenantId_status_idx" ON "ClientPortal"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortal_tenantId_contactEmail_key" ON "ClientPortal"("tenantId", "contactEmail");

-- AddForeignKey
ALTER TABLE "ClientPortal" ADD CONSTRAINT "ClientPortal_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedClientId_fkey" FOREIGN KEY ("convertedClientId") REFERENCES "ClientPortal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

