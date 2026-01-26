-- CreateTable: StepList for global step templates
CREATE TABLE "StepList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepList_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StepTemplate for steps in a step list
CREATE TABLE "StepTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stepListId" TEXT NOT NULL,

    CONSTRAINT "StepTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PurchaseStep for purchase-specific step instances
CREATE TABLE "PurchaseStep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchaseId" TEXT NOT NULL,

    CONSTRAINT "PurchaseStep_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add stepListId to Purchase
ALTER TABLE "Purchase" ADD COLUMN "stepListId" TEXT;

-- CreateIndex: Unique constraint on stepListId and order for StepTemplate
CREATE UNIQUE INDEX "StepTemplate_stepListId_order_key" ON "StepTemplate"("stepListId", "order");

-- CreateIndex: Index on stepListId and order for StepTemplate
CREATE INDEX "StepTemplate_stepListId_order_idx" ON "StepTemplate"("stepListId", "order");

-- CreateIndex: Unique constraint on purchaseId and order for PurchaseStep
CREATE UNIQUE INDEX "PurchaseStep_purchaseId_order_key" ON "PurchaseStep"("purchaseId", "order");

-- CreateIndex: Index on purchaseId and order for PurchaseStep
CREATE INDEX "PurchaseStep_purchaseId_order_idx" ON "PurchaseStep"("purchaseId", "order");

-- AddForeignKey: StepTemplate references StepList
ALTER TABLE "StepTemplate" ADD CONSTRAINT "StepTemplate_stepListId_fkey" FOREIGN KEY ("stepListId") REFERENCES "StepList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PurchaseStep references Purchase
ALTER TABLE "PurchaseStep" ADD CONSTRAINT "PurchaseStep_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Purchase references StepList
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_stepListId_fkey" FOREIGN KEY ("stepListId") REFERENCES "StepList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default step list
INSERT INTO "StepList" ("id", "name", "isDefault", "createdAt")
VALUES (gen_random_uuid(), 'Default', true, CURRENT_TIMESTAMP);

-- Insert default steps
WITH default_list AS (
    SELECT "id" FROM "StepList" WHERE "isDefault" = true LIMIT 1
)
INSERT INTO "StepTemplate" ("id", "name", "order", "stepListId", "createdAt")
SELECT 
    gen_random_uuid(),
    name,
    "order",
    (SELECT "id" FROM default_list),
    CURRENT_TIMESTAMP
FROM (
    VALUES 
        ('Purchased', 1),
        ('Reimbursed', 2),
        ('Confirmed Reimbursement', 3)
) AS steps(name, "order");
