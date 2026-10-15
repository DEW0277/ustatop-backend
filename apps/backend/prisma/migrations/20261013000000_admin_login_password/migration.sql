-- AlterTable
ALTER TABLE "users" ADD COLUMN     "login" TEXT,
ADD COLUMN     "passwordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");
