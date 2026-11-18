-- CreateEnum
CREATE TYPE "IndexRequestAccess" AS ENUM ('ALLOCATIONS_ONLY', 'BUDGET_REQUESTERS', 'LISTED_POSITIONS');

-- DropForeignKey
ALTER TABLE "PurchaseRequest" DROP CONSTRAINT "PurchaseRequest_allocationId_fkey";

-- AlterTable
ALTER TABLE "Designation" ADD COLUMN     "headPositionKey" TEXT,
ADD COLUMN     "isBudgetIndex" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestAccess" "IndexRequestAccess" NOT NULL DEFAULT 'ALLOCATIONS_ONLY';

-- AlterTable: existing requests are charged to their allocation's index.
ALTER TABLE "PurchaseRequest" ADD COLUMN     "designationId" TEXT,
ALTER COLUMN "allocationId" DROP NOT NULL;

UPDATE "PurchaseRequest" r
SET "designationId" = a."designationId"
FROM "Allocation" a
WHERE a."id" = r."allocationId";

ALTER TABLE "PurchaseRequest" ALTER COLUMN "designationId" SET NOT NULL;

-- CreateTable
CREATE TABLE "IndexRequesterPosition" (
    "id" TEXT NOT NULL,
    "positionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "designationId" TEXT NOT NULL,

    CONSTRAINT "IndexRequesterPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndexRequesterPosition_positionKey_idx" ON "IndexRequesterPosition"("positionKey");

-- CreateIndex
CREATE UNIQUE INDEX "IndexRequesterPosition_designationId_positionKey_key" ON "IndexRequesterPosition"("designationId", "positionKey");

-- CreateIndex
CREATE INDEX "PurchaseRequest_designationId_idx" ON "PurchaseRequest"("designationId");

-- AddForeignKey
ALTER TABLE "IndexRequesterPosition" ADD CONSTRAINT "IndexRequesterPosition_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DN3770 is the budget index.
UPDATE "Designation" SET "isBudgetIndex" = true WHERE "code" = '3770';
