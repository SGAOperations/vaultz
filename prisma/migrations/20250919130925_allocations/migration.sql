-- AlterTable
ALTER TABLE "public"."Purchase" ADD COLUMN     "allocationId" TEXT;

-- CreateTable
CREATE TABLE "public"."AllocationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AllocationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Allocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "allocationGroupId" TEXT,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Purchase" ADD CONSTRAINT "Purchase_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "public"."Allocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Allocation" ADD CONSTRAINT "Allocation_allocationGroupId_fkey" FOREIGN KEY ("allocationGroupId") REFERENCES "public"."AllocationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
