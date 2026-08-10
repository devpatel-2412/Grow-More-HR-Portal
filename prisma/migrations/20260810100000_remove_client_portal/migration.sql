-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_clientProfileId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_clientPortalId_fkey";

-- DropForeignKey
ALTER TABLE "FinanceDocument" DROP CONSTRAINT "FinanceDocument_clientPortalId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_convertedClientId_fkey";

-- DropForeignKey
ALTER TABLE "CrmActivity" DROP CONSTRAINT "CrmActivity_clientId_fkey";

-- DropForeignKey
ALTER TABLE "ClientContact" DROP CONSTRAINT "ClientContact_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ClientContact" DROP CONSTRAINT "ClientContact_clientId_fkey";

-- DropForeignKey
ALTER TABLE "ClientPortal" DROP CONSTRAINT "ClientPortal_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ClientPortal" DROP CONSTRAINT "ClientPortal_accountManagerId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "clientProfileId";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "clientPortalId";

-- AlterTable
ALTER TABLE "FinanceDocument" DROP COLUMN "clientPortalId";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "convertedClientId";

-- AlterTable
ALTER TABLE "CrmActivity" DROP COLUMN "clientId";

-- DropTable
DROP TABLE "ClientContact";

-- DropTable
DROP TABLE "ClientPortal";

-- DropEnum
DROP TYPE "ClientStatus";

-- Clean up any stale isSystem Role rows from a prior `npm run rbac:seed` run for roles that no
-- longer exist (RolePermission/UserRoleAssignment cascade-delete automatically). Defensive, not
-- load-bearing — RbacRepository.findRolesByTenant also filters by name at query time regardless.
DELETE FROM "Role" WHERE "isSystem" = true AND "name" NOT IN ('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE');
