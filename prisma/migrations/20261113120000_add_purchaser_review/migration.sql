-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PurchaseRequestStatus" ADD VALUE 'PURCHASER_REVIEW';
ALTER TYPE "PurchaseRequestStatus" ADD VALUE 'NEEDS_REVISION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PurchaseRequestEventType" ADD VALUE 'PURCHASER_APPROVED';
ALTER TYPE "PurchaseRequestEventType" ADD VALUE 'SENT_BACK';

