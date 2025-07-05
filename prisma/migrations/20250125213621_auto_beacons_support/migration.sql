-- AlterTable
ALTER TABLE "Beacon" ADD COLUMN     "isAutoBeacon" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoBeaconTags" TEXT,
ADD COLUMN     "autoBeaconType" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "enableAutoBeacons" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasAutoBeaconBeenCreatedThisCycle" BOOLEAN NOT NULL DEFAULT true;
