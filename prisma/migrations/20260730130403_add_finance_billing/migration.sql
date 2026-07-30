-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_DOC_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_DOC_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_DOC_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_DOC_VOIDED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_PAYMENT_RECORDED';

-- DropIndex
DROP INDEX "FinanceDocument_number_key";

-- AlterTable
ALTER TABLE "FinanceDocument" ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "FinanceLineItem" (
    "id" TEXT NOT NULL,
    "financeDocumentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FinanceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancePayment" (
    "id" TEXT NOT NULL,
    "financeDocumentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceLineItem_financeDocumentId_idx" ON "FinanceLineItem"("financeDocumentId");

-- CreateIndex
CREATE INDEX "FinancePayment_financeDocumentId_idx" ON "FinancePayment"("financeDocumentId");

-- CreateIndex
CREATE INDEX "FinanceDocument_tenantId_type_status_idx" ON "FinanceDocument"("tenantId", "type", "status");

-- CreateIndex
CREATE INDEX "FinanceDocument_clientPortalId_idx" ON "FinanceDocument"("clientPortalId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceDocument_tenantId_type_number_key" ON "FinanceDocument"("tenantId", "type", "number");

-- AddForeignKey
ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLineItem" ADD CONSTRAINT "FinanceLineItem_financeDocumentId_fkey" FOREIGN KEY ("financeDocumentId") REFERENCES "FinanceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_financeDocumentId_fkey" FOREIGN KEY ("financeDocumentId") REFERENCES "FinanceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

