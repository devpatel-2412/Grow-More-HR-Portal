-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'HR_EXECUTIVE';
ALTER TYPE "UserRole" ADD VALUE 'TEAM_LEADER';
ALTER TYPE "UserRole" ADD VALUE 'ACCOUNTS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_INVITE_RESENT';
ALTER TYPE "AuditAction" ADD VALUE 'USER_INVITE_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_ADMIN_INVITED';
ALTER TYPE "AuditAction" ADD VALUE 'SUPER_ADMIN_BOOTSTRAPPED';
