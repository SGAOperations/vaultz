-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_processId_fkey";

-- DropIndex
DROP INDEX "Purchase_processId_key";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "processId";

-- AlterTable
ALTER TABLE "PurchaseStepCompletion" RENAME COLUMN "actualCompletionDate" TO "completionDate";
