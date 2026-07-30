-- CreateEnum
CREATE TYPE "RoomBookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TICKET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_COMMENTED';
ALTER TYPE "AuditAction" ADD VALUE 'KB_ARTICLE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'KB_ARTICLE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'KB_ARTICLE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'ASSET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ASSET_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'ASSET_UNASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'ASSET_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'VISITOR_REGISTERED';
ALTER TYPE "AuditAction" ADD VALUE 'VISITOR_CHECKED_IN';
ALTER TYPE "AuditAction" ADD VALUE 'VISITOR_CHECKED_OUT';
ALTER TYPE "AuditAction" ADD VALUE 'ROOM_BOOKING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ROOM_BOOKING_CANCELLED';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "KnowledgeBaseArticle" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "RoomBooking" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "RoomBookingStatus" NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "SecureDocument" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uploadedById" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Visitor" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expectedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "Asset_tenantId_status_idx" ON "Asset"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Asset_employeeId_idx" ON "Asset"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_tenantId_serialNumber_key" ON "Asset"("tenantId", "serialNumber");

-- CreateIndex
CREATE INDEX "KnowledgeBaseArticle_tenantId_category_idx" ON "KnowledgeBaseArticle"("tenantId", "category");

-- CreateIndex
CREATE INDEX "RoomBooking_tenantId_roomName_startTime_idx" ON "RoomBooking"("tenantId", "roomName", "startTime");

-- CreateIndex
CREATE INDEX "RoomBooking_employeeId_idx" ON "RoomBooking"("employeeId");

-- CreateIndex
CREATE INDEX "SecureDocument_tenantId_folderPath_idx" ON "SecureDocument"("tenantId", "folderPath");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_status_idx" ON "Ticket"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Ticket_employeeId_idx" ON "Ticket"("employeeId");

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");

-- CreateIndex
CREATE INDEX "Visitor_tenantId_status_idx" ON "Visitor"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Visitor_tenantId_expectedAt_idx" ON "Visitor"("tenantId", "expectedAt");

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_hostEmployeeId_fkey" FOREIGN KEY ("hostEmployeeId") REFERENCES "EmployeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "EmployeeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecureDocument" ADD CONSTRAINT "SecureDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

