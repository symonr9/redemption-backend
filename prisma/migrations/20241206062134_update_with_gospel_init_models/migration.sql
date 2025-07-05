/*
  Warnings:

  - You are about to drop the `gospel_initiative` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "gospel_initiative";

-- CreateTable
CREATE TABLE "One" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'User',
    "stage" INTEGER NOT NULL DEFAULT 5,
    "category" INTEGER NOT NULL DEFAULT 2,
    "knownSince" TIMESTAMP(3),
    "gospelChecklist" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "One_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionStep" (
    "id" TEXT NOT NULL,
    "notes" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "targetDate" TIMESTAMP(3),
    "lastModified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 17,
    "oneId" TEXT NOT NULL,

    CONSTRAINT "ActionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneNote" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL,
    "oneId" TEXT NOT NULL,

    CONSTRAINT "OneNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GospelStep" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" INTEGER NOT NULL DEFAULT 1,
    "layoutType" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "nextSteps" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "oneId" TEXT NOT NULL,

    CONSTRAINT "GospelStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Christian" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "oneCategory" INTEGER NOT NULL DEFAULT 21,
    "category" INTEGER NOT NULL DEFAULT 2,
    "icon" TEXT NOT NULL DEFAULT 'User',
    "oneKnownSince" TIMESTAMP(3),
    "knownSince" TIMESTAMP(3),
    "notes" TEXT,
    "mutualInterests" TEXT,
    "lastPrayedFor" TIMESTAMP(3),
    "lastReachedOutTo" TIMESTAMP(3),
    "timesPrayed" INTEGER NOT NULL DEFAULT 0,
    "timesReachedOut" INTEGER NOT NULL DEFAULT 0,
    "oneId" TEXT NOT NULL,

    CONSTRAINT "Christian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beacon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT,
    "userId" TEXT NOT NULL,
    "oneId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "type" INTEGER NOT NULL DEFAULT 1,
    "activeUntil" TIMESTAMP(3),
    "tags" TEXT,
    "shareOwnName" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Beacon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeaconActivity" (
    "id" TEXT NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "beaconId" TEXT NOT NULL,

    CONSTRAINT "BeaconActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalBeaconActivity" (
    "id" TEXT NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "beaconId" TEXT NOT NULL,

    CONSTRAINT "GlobalBeaconActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalBeacon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "type" INTEGER NOT NULL DEFAULT 1,
    "activeUntil" TIMESTAMP(3),
    "tags" TEXT,
    "shareOwnName" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GlobalBeacon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryChapter" (
    "id" TEXT NOT NULL,
    "storyId" TEXT,
    "type" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "originalPrompt" TEXT,
    "questions" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Book',
    "order" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT,
    "names" TEXT NOT NULL,
    "quality" INTEGER NOT NULL DEFAULT 5,
    "userId" TEXT NOT NULL,
    "lastModified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "icon" TEXT NOT NULL DEFAULT 'User',
    "refreshToken" TEXT NOT NULL,
    "lastRefreshDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPartitionDate" TIMESTAMP(3),
    "extraPartitionCount" INTEGER NOT NULL DEFAULT 5,
    "lastExtraPartitionGranted" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,
    "userId" TEXT,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "One" ADD CONSTRAINT "One_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionStep" ADD CONSTRAINT "ActionStep_oneId_fkey" FOREIGN KEY ("oneId") REFERENCES "One"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneNote" ADD CONSTRAINT "OneNote_oneId_fkey" FOREIGN KEY ("oneId") REFERENCES "One"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GospelStep" ADD CONSTRAINT "GospelStep_oneId_fkey" FOREIGN KEY ("oneId") REFERENCES "One"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Christian" ADD CONSTRAINT "Christian_oneId_fkey" FOREIGN KEY ("oneId") REFERENCES "One"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beacon" ADD CONSTRAINT "Beacon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beacon" ADD CONSTRAINT "Beacon_oneId_fkey" FOREIGN KEY ("oneId") REFERENCES "One"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeaconActivity" ADD CONSTRAINT "BeaconActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeaconActivity" ADD CONSTRAINT "BeaconActivity_beaconId_fkey" FOREIGN KEY ("beaconId") REFERENCES "Beacon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalBeaconActivity" ADD CONSTRAINT "GlobalBeaconActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalBeaconActivity" ADD CONSTRAINT "GlobalBeaconActivity_beaconId_fkey" FOREIGN KEY ("beaconId") REFERENCES "GlobalBeacon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryChapter" ADD CONSTRAINT "StoryChapter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
