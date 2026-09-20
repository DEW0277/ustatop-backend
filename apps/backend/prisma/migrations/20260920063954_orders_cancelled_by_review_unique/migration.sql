-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancelledBy" "Role";

-- CreateIndex
CREATE UNIQUE INDEX "reviews_masterId_userId_key" ON "reviews"("masterId", "userId");

