-- AlterTable
ALTER TABLE "public"."Purchase" ADD COLUMN     "purchasedAt" DATE NOT NULL DEFAULT (timestamp::date);
