/*
  Warnings:

  - You are about to drop the column `isAutoBeacon` on the `Beacon` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Beacon" DROP COLUMN "isAutoBeacon";

-- AlterTable
ALTER TABLE "GlobalBeacon" ADD COLUMN     "isAutoBeacon" BOOLEAN NOT NULL DEFAULT false;
