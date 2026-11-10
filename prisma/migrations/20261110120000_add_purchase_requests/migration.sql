-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('PENDING', 'ESCALATED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseRequestEventType" AS ENUM ('SUBMITTED', 'EDITED', 'CANCELLED', 'APPROVED', 'REJECTED', 'ESCALATED', 'RETURNED', 'NOTIFIED', 'NOTIFY_FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isEBoardPurchaser" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "attachments" TEXT[],
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalationNotifiedAt" TIMESTAMP(3),
    "escalationNotifyError" TEXT,
    "requesterId" TEXT NOT NULL,
    "purchaserId" TEXT NOT NULL,
    "decidedById" TEXT,
    "categoryId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "purchaseId" TEXT,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestEvent" (
    "id" TEXT NOT NULL,
    "type" "PurchaseRequestEventType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT,

    CONSTRAINT "PurchaseRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequesterPosition" (
    "id" TEXT NOT NULL,
    "positionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequesterPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_purchaseId_key" ON "PurchaseRequest"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");

-- CreateIndex
CREATE INDEX "PurchaseRequest_requesterId_idx" ON "PurchaseRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_allocationId_idx" ON "PurchaseRequest"("allocationId");

-- CreateIndex
CREATE INDEX "PurchaseRequestEvent_requestId_idx" ON "PurchaseRequestEvent"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "RequesterPosition_positionKey_key" ON "RequesterPosition"("positionKey");

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_purchaserId_fkey" FOREIGN KEY ("purchaserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "Year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestEvent" ADD CONSTRAINT "PurchaseRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestEvent" ADD CONSTRAINT "PurchaseRequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Seed the leadership positions that previously had view-only access, so they
-- can reach the request page. Editors manage this list in the app.
INSERT INTO "RequesterPosition" ("id", "positionKey") VALUES
    (gen_random_uuid()::text, 'student-body-president'),
    (gen_random_uuid()::text, 'vice-president-of-academic-affairs'),
    (gen_random_uuid()::text, 'vice-president-of-campus-affairs'),
    (gen_random_uuid()::text, 'vice-president-of-diversity-equity-and-inclusion'),
    (gen_random_uuid()::text, 'vice-president-of-external-affairs'),
    (gen_random_uuid()::text, 'vice-president-of-student-involvement'),
    (gen_random_uuid()::text, 'vice-president-of-student-success');
