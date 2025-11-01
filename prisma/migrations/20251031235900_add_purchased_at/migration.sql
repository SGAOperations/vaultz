-- AlterTable
ALTER TABLE "public"."Purchase" ADD COLUMN "purchasedAt" DATE;

-- Update existing records to use timestamp date
UPDATE "public"."Purchase" SET "purchasedAt" = "timestamp"::date WHERE "purchasedAt" IS NULL;

-- Make column NOT NULL with default
ALTER TABLE "public"."Purchase" ALTER COLUMN "purchasedAt" SET NOT NULL;
ALTER TABLE "public"."Purchase" ALTER COLUMN "purchasedAt" SET DEFAULT CURRENT_TIMESTAMP;
