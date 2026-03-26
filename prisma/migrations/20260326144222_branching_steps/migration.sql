-- AlterTable
ALTER TABLE "ProcessStep" ADD COLUMN     "parentStepId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseProcess" ADD COLUMN     "currentStepId" TEXT;

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_parentStepId_fkey" FOREIGN KEY ("parentStepId") REFERENCES "ProcessStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProcess" ADD CONSTRAINT "PurchaseProcess_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "ProcessStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
