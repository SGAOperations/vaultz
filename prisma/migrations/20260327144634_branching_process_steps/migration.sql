/*
  Warnings:

  - You are about to drop the column `order` on the `ProcessStep` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[previousStepId]` on the table `ProcessStep` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable: add new columns first, before dropping order
ALTER TABLE "ProcessStep" ADD COLUMN "parentStepId" TEXT,
ADD COLUMN     "previousStepId" TEXT;

-- DataMigration: convert order-based steps to linked list
-- For each group of siblings (same templateId + parentStepId), set previousStepId
-- to the id of the step with the next lower order value
UPDATE "ProcessStep" s
SET "previousStepId" = ranked.prev_id
FROM (
  SELECT
    id,
    LAG(id) OVER (
      PARTITION BY "templateId", "parentStepId"
      ORDER BY "order" ASC
    ) AS prev_id
  FROM "ProcessStep"
  WHERE "deletedAt" IS NULL
) ranked
WHERE s.id = ranked.id AND ranked.prev_id IS NOT NULL;

-- AlterTable: now safe to drop order
ALTER TABLE "ProcessStep" DROP COLUMN "order";

-- CreateIndex
CREATE UNIQUE INDEX "ProcessStep_previousStepId_key" ON "ProcessStep"("previousStepId");

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_parentStepId_fkey" FOREIGN KEY ("parentStepId") REFERENCES "ProcessStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_previousStepId_fkey" FOREIGN KEY ("previousStepId") REFERENCES "ProcessStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
