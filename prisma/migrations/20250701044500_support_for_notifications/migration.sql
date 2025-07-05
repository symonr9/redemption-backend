-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expoPushToken" TEXT,
ADD COLUMN     "lastNotificationSent" TIMESTAMP(3),
ADD COLUMN     "notifyMorningAndEveningOnly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnEveryBeacon" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredNotificationTimes" TEXT;
