-- AlterEnum
ALTER TYPE "PurchaseRequestStatus" ADD VALUE 'REVOKED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PurchaseRequestEventType" ADD VALUE 'RECODED';
ALTER TYPE "PurchaseRequestEventType" ADD VALUE 'SIGNED_OFF';
ALTER TYPE "PurchaseRequestEventType" ADD VALUE 'REVOKED';

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "signedOffAt" TIMESTAMP(3),
ADD COLUMN     "signedOffById" TEXT;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_signedOffById_fkey" FOREIGN KEY ("signedOffById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Requests approved before VPOA sign-off existed don't need it.
UPDATE "PurchaseRequest" SET "signedOffAt" = "decidedAt" WHERE "status" = 'APPROVED';
