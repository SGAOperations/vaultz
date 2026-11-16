-- DropForeignKey
ALTER TABLE "PurchaseRequest" DROP CONSTRAINT "PurchaseRequest_categoryId_fkey";

-- AlterTable
ALTER TABLE "PurchaseRequest" DROP COLUMN "categoryId";

