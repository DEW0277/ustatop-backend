-- CreateEnum
CREATE TYPE "MasterType" AS ENUM ('MASTER', 'FUEL_STATION', 'PARTS_SHOP');

-- AlterTable
ALTER TABLE "master_profiles" ADD COLUMN     "type" "MasterType" NOT NULL DEFAULT 'MASTER';

-- CreateIndex
CREATE INDEX "master_profiles_type_rating_idx" ON "master_profiles"("type", "rating");
