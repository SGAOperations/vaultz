-- AlterTable
ALTER TABLE "ProcessStep" ADD COLUMN     "parentStepId" TEXT;

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_parentStepId_fkey" FOREIGN KEY ("parentStepId") REFERENCES "ProcessStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
