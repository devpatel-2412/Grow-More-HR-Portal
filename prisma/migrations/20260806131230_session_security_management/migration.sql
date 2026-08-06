-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SESSION_TIMEOUT';
ALTER TYPE "AuditAction" ADD VALUE 'SESSION_FORCE_LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'SESSION_FORCE_LOGOUT_ALL';
ALTER TYPE "AuditAction" ADD VALUE 'SECURITY_SETTINGS_UPDATED';

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "forceLogoutAllAt" TIMESTAMP(3),
ADD COLUMN     "maxConcurrentSessions" INTEGER,
ADD COLUMN     "rememberMeDurationDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "sessionTimeoutMinutes" INTEGER DEFAULT 60,
ADD COLUMN     "sessionWarningMinutes" INTEGER NOT NULL DEFAULT 2;

