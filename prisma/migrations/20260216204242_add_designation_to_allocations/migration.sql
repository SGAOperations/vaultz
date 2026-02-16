-- AlterTable: Add designationId to AllocationGroup (nullable first)
ALTER TABLE "AllocationGroup" ADD COLUMN "designationId" TEXT;

-- AlterTable: Add designationId to Allocation (nullable first)
ALTER TABLE "Allocation" ADD COLUMN "designationId" TEXT;

-- Data Migration: Assign existing records to first designation
-- Get the first designation ID and update all existing records
DO $$
DECLARE
    first_designation_id TEXT;
BEGIN
    -- Get the first designation ID (ordered by creation/id)
    SELECT id INTO first_designation_id FROM "Designation" ORDER BY id LIMIT 1;
    
    -- Only update if we found a designation
    IF first_designation_id IS NOT NULL THEN
        -- Update AllocationGroup records
        UPDATE "AllocationGroup" SET "designationId" = first_designation_id WHERE "designationId" IS NULL;
        
        -- Update Allocation records
        UPDATE "Allocation" SET "designationId" = first_designation_id WHERE "designationId" IS NULL;
    END IF;
END $$;

-- AlterTable: Make designationId NOT NULL
ALTER TABLE "AllocationGroup" ALTER COLUMN "designationId" SET NOT NULL;
ALTER TABLE "Allocation" ALTER COLUMN "designationId" SET NOT NULL;

-- AddForeignKey: Add foreign key constraint for AllocationGroup
ALTER TABLE "AllocationGroup" ADD CONSTRAINT "AllocationGroup_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Add foreign key constraint for Allocation
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
