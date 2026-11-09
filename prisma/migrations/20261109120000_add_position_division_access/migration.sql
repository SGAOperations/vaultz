-- CreateTable
CREATE TABLE "PositionDivisionAccess" (
    "id" TEXT NOT NULL,
    "positionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocationGroupId" TEXT NOT NULL,

    CONSTRAINT "PositionDivisionAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PositionDivisionAccess_positionKey_idx" ON "PositionDivisionAccess"("positionKey");

-- CreateIndex
CREATE UNIQUE INDEX "PositionDivisionAccess_positionKey_allocationGroupId_key" ON "PositionDivisionAccess"("positionKey", "allocationGroupId");

-- AddForeignKey
ALTER TABLE "PositionDivisionAccess" ADD CONSTRAINT "PositionDivisionAccess_allocationGroupId_fkey" FOREIGN KEY ("allocationGroupId") REFERENCES "AllocationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

