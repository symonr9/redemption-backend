-- AlterTable
ALTER TABLE "GlobalBeacon" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "GlobalBeacon" ADD CONSTRAINT "GlobalBeacon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
