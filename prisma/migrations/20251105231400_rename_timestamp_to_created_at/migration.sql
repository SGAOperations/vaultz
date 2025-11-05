-- AlterTable: Rename timestamp to createdAt
ALTER TABLE "public"."Purchase" RENAME COLUMN "timestamp" TO "createdAt";

-- AlterTable: Remove default from purchasedAt
ALTER TABLE "public"."Purchase" ALTER COLUMN "purchasedAt" DROP DEFAULT;
