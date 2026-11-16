-- AlterTable
ALTER TABLE "User" ADD COLUMN     "positionKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "positionsChangedAt" TIMESTAMP(3);

