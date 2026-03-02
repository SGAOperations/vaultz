-- CreateEnum
CREATE TYPE "BudgetResetBehavior" AS ENUM ('RESET', 'ROLLOVER');

-- CreateTable
CREATE TABLE "Year" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "yearId" TEXT NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryYear" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "categoryId" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,

    CONSTRAINT "CategoryYear_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add budgetResetBehavior to Designation
ALTER TABLE "Designation" ADD COLUMN "budgetResetBehavior" "BudgetResetBehavior" NOT NULL DEFAULT 'RESET';

-- AlterTable: Add yearId to Purchase (nullable first)
ALTER TABLE "Purchase" ADD COLUMN "yearId" TEXT;

-- AlterTable: Add yearId to Transfer (nullable first)
ALTER TABLE "Transfer" ADD COLUMN "yearId" TEXT;

-- AlterTable: Add periodId to Allocation (nullable first)
ALTER TABLE "Allocation" ADD COLUMN "periodId" TEXT;

-- Data Migration: only needed when existing records require a default year/period
DO $$
DECLARE
    default_year_id TEXT := gen_random_uuid()::TEXT;
    default_period_id TEXT := gen_random_uuid()::TEXT;
    has_existing_data BOOLEAN;
BEGIN
    -- Check if there is any existing data that needs to be assigned to a default year/period
    SELECT EXISTS(
        SELECT 1 FROM "Category"
        UNION ALL
        SELECT 1 FROM "Purchase" WHERE "yearId" IS NULL
        UNION ALL
        SELECT 1 FROM "Transfer" WHERE "yearId" IS NULL
        UNION ALL
        SELECT 1 FROM "Allocation" WHERE "periodId" IS NULL
    ) INTO has_existing_data;

    IF has_existing_data THEN
        -- Create default Year (Jan 1 2000 - Jan 1 2020) to cover pre-existing records
        INSERT INTO "Year" ("id", "name", "startDate", "endDate", "updatedAt")
        VALUES (default_year_id, 'Default', '2000-01-01', '2020-01-01', CURRENT_TIMESTAMP);

        -- Create default Period spanning the full year
        INSERT INTO "Period" ("id", "name", "startDate", "endDate", "yearId", "updatedAt")
        VALUES (default_period_id, 'Default Period', '2000-01-01', '2020-01-01', default_year_id, CURRENT_TIMESTAMP);

        -- Migrate Category.amount to CategoryYear records
        INSERT INTO "CategoryYear" ("id", "amount", "categoryId", "yearId", "updatedAt")
        SELECT gen_random_uuid()::TEXT, "amount", "id", default_year_id, CURRENT_TIMESTAMP
        FROM "Category";

        -- Assign all existing purchases to default year
        UPDATE "Purchase" SET "yearId" = default_year_id WHERE "yearId" IS NULL;

        -- Assign all existing transfers to default year
        UPDATE "Transfer" SET "yearId" = default_year_id WHERE "yearId" IS NULL;

        -- Assign all existing allocations to default period
        UPDATE "Allocation" SET "periodId" = default_period_id WHERE "periodId" IS NULL;
    END IF;
END $$;

-- AlterTable: Make yearId NOT NULL on Purchase
ALTER TABLE "Purchase" ALTER COLUMN "yearId" SET NOT NULL;

-- AlterTable: Make yearId NOT NULL on Transfer
ALTER TABLE "Transfer" ALTER COLUMN "yearId" SET NOT NULL;

-- AlterTable: Make periodId NOT NULL on Allocation
ALTER TABLE "Allocation" ALTER COLUMN "periodId" SET NOT NULL;

-- AlterTable: Remove amount from Category
ALTER TABLE "Category" DROP COLUMN "amount";

-- AddForeignKey
ALTER TABLE "Period" ADD CONSTRAINT "Period_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "Year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryYear" ADD CONSTRAINT "CategoryYear_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryYear" ADD CONSTRAINT "CategoryYear_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "Year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "Year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "Year"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
