-- AlterTable
ALTER TABLE "FinanceDocument" ADD COLUMN     "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "igstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "placeOfSupplyStateCode" TEXT,
ADD COLUMN     "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FinanceLineItem" ADD COLUMN     "hsnCode" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "gstStateCode" TEXT,
ADD COLUMN     "gstin" TEXT;

