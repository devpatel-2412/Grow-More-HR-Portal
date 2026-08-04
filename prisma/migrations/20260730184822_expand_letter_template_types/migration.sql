-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TemplateType" ADD VALUE 'LETTER_APPOINTMENT';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_JOINING';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_CONFIRMATION';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_PROMOTION';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_SALARY_REVISION';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_WARNING';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_APPRECIATION';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_INTERNSHIP_CERTIFICATE';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_SALARY_CERTIFICATE';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_NOC';
ALTER TYPE "TemplateType" ADD VALUE 'LETTER_FNF_SETTLEMENT';

