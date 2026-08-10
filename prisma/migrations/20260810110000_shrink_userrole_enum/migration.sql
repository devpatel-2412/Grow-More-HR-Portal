-- Defensive reassignment before the type swap below: the cast a few lines down fails outright if
-- any existing row still holds one of the six removed values. There is no way to know from this
-- migration file alone whether such a row currently exists in production — EMPLOYEE is the
-- safest neutral fallback (least additional access of any staff role) rather than silently
-- guessing at 1:1 replacements for roles that no longer have an equivalent.
UPDATE "User" SET "role" = 'EMPLOYEE' WHERE "role" IN ('CLIENT', 'CANDIDATE', 'RECRUITER', 'FINANCE', 'HR_EXECUTIVE', 'ACCOUNTS');
UPDATE "Invite" SET "role" = 'EMPLOYEE' WHERE "role" IN ('CLIENT', 'CANDIDATE', 'RECRUITER', 'FINANCE', 'HR_EXECUTIVE', 'ACCOUNTS');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TABLE "Invite" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';
COMMIT;
