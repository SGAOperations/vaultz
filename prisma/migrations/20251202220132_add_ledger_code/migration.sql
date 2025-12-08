-- AlterTable: Add ledgerCode column and migrate existing code values
-- First, add the new column
ALTER TABLE "Category" ADD COLUMN "ledgerCode" TEXT;

-- Migrate existing code values to ledgerCode
UPDATE "Category" SET "ledgerCode" = "code";

-- Make ledgerCode NOT NULL after data migration
ALTER TABLE "Category" ALTER COLUMN "ledgerCode" SET NOT NULL;

-- Update code column to default placeholder value (existing records need manual update)
-- Note: All existing records will be set to '000' and require manual cleanup
UPDATE "Category" SET "code" = '000' WHERE "code" IS NOT NULL;
