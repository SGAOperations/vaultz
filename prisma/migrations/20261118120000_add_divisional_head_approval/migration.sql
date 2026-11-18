-- AlterEnum
ALTER TYPE "PurchaseRequestStatus" ADD VALUE 'HEAD_REVIEW';

-- AlterEnum
ALTER TYPE "PurchaseRequestEventType" ADD VALUE 'HEAD_APPROVED';
ALTER TYPE "PurchaseRequestEventType" ADD VALUE 'HEAD_SKIPPED';

-- DropForeignKey
ALTER TABLE "PurchaseRequest" DROP CONSTRAINT "PurchaseRequest_purchaserId_fkey";

-- AlterTable
ALTER TABLE "ProcessTemplate" ADD COLUMN     "requiresPurchaser" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AllocationGroup" ADD COLUMN     "headPositionKey" TEXT;

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "headPositionKey" TEXT,
ALTER COLUMN "purchaserId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_purchaserId_fkey" FOREIGN KEY ("purchaserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing reimbursement methods keep their E-Board purchaser step.
UPDATE "ProcessTemplate" SET "requiresPurchaser" = true WHERE "name" ILIKE '%reimburs%';
