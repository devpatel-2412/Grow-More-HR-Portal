-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('ONSITE', 'PHONE', 'VIDEO');

-- CreateEnum
CREATE TYPE "InterviewOutcome" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'JOB_POSTING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_POSTING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_POSTING_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'CANDIDATE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CANDIDATE_STAGE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'CANDIDATE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CANDIDATE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'INTERVIEW_SCHEDULED';
ALTER TYPE "AuditAction" ADD VALUE 'INTERVIEW_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'INTERVIEW_CANCELLED';

-- AlterEnum
ALTER TYPE "CandidateStatus" ADD VALUE 'HIRED';

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "closingDate" TIMESTAMP(3),
ADD COLUMN     "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
ADD COLUMN     "minExperience" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openings" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "salaryMax" DOUBLE PRECISION,
ADD COLUMN     "salaryMin" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "JobPostingStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "interviewerId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "mode" "InterviewMode" NOT NULL DEFAULT 'VIDEO',
    "round" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "feedback" TEXT,
    "rating" INTEGER,
    "outcome" "InterviewOutcome" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interview_tenantId_scheduledAt_idx" ON "Interview"("tenantId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Interview_candidateId_idx" ON "Interview"("candidateId");

-- CreateIndex
CREATE INDEX "Interview_interviewerId_idx" ON "Interview"("interviewerId");

-- CreateIndex
CREATE INDEX "Candidate_tenantId_status_idx" ON "Candidate"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Candidate_jobPostingId_idx" ON "Candidate"("jobPostingId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_jobPostingId_email_key" ON "Candidate"("jobPostingId", "email");

-- CreateIndex
CREATE INDEX "JobPosting_tenantId_status_idx" ON "JobPosting"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

