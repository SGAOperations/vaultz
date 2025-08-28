
-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "name" TEXT NOT NULL DEFAULT "default";

ALTER TABLE "public"."Account" ALTER COLUMN     "name" DROP DEFAULT;
