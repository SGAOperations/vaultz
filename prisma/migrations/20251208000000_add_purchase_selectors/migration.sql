-- AlterTable: Add purchase selector fields
ALTER TABLE "Purchase" ADD COLUMN "excludeFromTotal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Purchase" ADD COLUMN "expenseReportCreated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Purchase" ADD COLUMN "reimbursed" BOOLEAN NOT NULL DEFAULT false;
