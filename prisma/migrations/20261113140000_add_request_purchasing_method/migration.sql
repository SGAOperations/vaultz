-- AlterTable
ALTER TABLE "ProcessTemplate" ADD COLUMN     "isPurchasingMethod" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PurchaseRequest" ADD COLUMN     "processTemplateId" TEXT;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_processTemplateId_fkey" FOREIGN KEY ("processTemplateId") REFERENCES "ProcessTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

