-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromCategoryId" TEXT,
    "toCategoryId" TEXT,
    "fromAllocationId" TEXT,
    "toAllocationId" TEXT,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transfer_fromCategoryId_idx" ON "Transfer"("fromCategoryId");

-- CreateIndex
CREATE INDEX "Transfer_toCategoryId_idx" ON "Transfer"("toCategoryId");

-- CreateIndex
CREATE INDEX "Transfer_fromAllocationId_idx" ON "Transfer"("fromAllocationId");

-- CreateIndex
CREATE INDEX "Transfer_toAllocationId_idx" ON "Transfer"("toAllocationId");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromCategoryId_fkey" FOREIGN KEY ("fromCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toCategoryId_fkey" FOREIGN KEY ("toCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromAllocationId_fkey" FOREIGN KEY ("fromAllocationId") REFERENCES "Allocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toAllocationId_fkey" FOREIGN KEY ("toAllocationId") REFERENCES "Allocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
