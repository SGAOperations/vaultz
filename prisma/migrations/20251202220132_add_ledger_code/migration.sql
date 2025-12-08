-- AlterTable: Add ledgerCode column and migrate existing code values
-- First, add the new column
ALTER TABLE "Category" ADD COLUMN "ledgerCode" TEXT;

-- Migrate existing code values to ledgerCode
UPDATE "Category" SET "ledgerCode" = "code";

-- Make ledgerCode NOT NULL after data migration
ALTER TABLE "Category" ALTER COLUMN "ledgerCode" SET NOT NULL;

-- Update code column to use numeric format (default to 000 for existing records)
-- Note: Manual data cleanup may be needed for existing records
UPDATE "Category" SET "code" = '000' WHERE "code" IS NOT NULL;
