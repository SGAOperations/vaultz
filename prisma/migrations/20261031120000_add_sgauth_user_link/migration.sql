-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ADD COLUMN     "sgauthUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_sgauthUserId_key" ON "User"("sgauthUserId");

