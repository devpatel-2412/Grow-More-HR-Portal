-- CreateEnum
CREATE TYPE "DocumentScanStatus" AS ENUM ('PENDING', 'CLEAN', 'FLAGGED', 'SKIPPED');

-- AlterTable
ALTER TABLE "DocumentVersion" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "fileUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SecureDocument" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "relatedEntityId" TEXT,
ADD COLUMN     "relatedEntityType" TEXT,
ADD COLUMN     "scanStatus" "DocumentScanStatus" NOT NULL DEFAULT 'SKIPPED',
ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "fileUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskAttachment" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "fileUrl" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "SecureDocument_tenantId_relatedEntityType_relatedEntityId_idx" ON "SecureDocument"("tenantId", "relatedEntityType", "relatedEntityId");

