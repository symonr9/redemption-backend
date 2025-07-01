const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { Expo } = require('expo-server-sdk');

const prisma = new PrismaClient();

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

function timeMatches(now, target) {
  const [targetHour, targetMinute] = target.split(':').map(Number);
  return now.getHours() === targetHour && now.getMinutes() === targetMinute;
}

async function sendScheduledNotifications() {
  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      notifyMorningAndEveningOnly: true,
      expoPushToken: { not: null },
    },
  });

  const messages = [];

  for (const user of users) {
    if (!user.preferredNotificationTimes) continue;

    const preferredTimes = user.preferredNotificationTimes.split(',');
    const shouldNotify = preferredTimes.some(t => timeMatches(now, t));

    if (!shouldNotify) continue;

    const newBeacons = await prisma.beacon.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gt: user.lastNotificationSent ?? new Date(0),
        },
      },
    });

    if (newBeacons.length === 0) continue;

    const body = `You have ${newBeacons.length} new beacons to check`;

    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      console.warn(`Invalid Expo token for user ${user.id}`);
      continue;
    }

    messages.push({
      to: user.expoPushToken,
      sound: 'default',
      body,
      data: { count: newBeacons.length },
      _userId: user.id, // include so we can update lastNotificationSent after
    });
  }

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);

      // Update lastNotificationSent for users in this chunk
      for (let i = 0; i < chunk.length; i++) {
        const receipt = receipts[i];
        const message = chunk[i];

        if (receipt.status === 'ok') {
          await prisma.user.update({
            where: { id: message._userId },
            data: { lastNotificationSent: now },
          });
        } else {
          console.warn(`❌ Push failed for user ${message._userId}:`, receipt.message || receipt.details?.error);
        }
      }
    } catch (err) {
      console.error('❌ Error sending chunk:', err);
    }
  }

  console.log(`✅ Sent ${messages.length} notifications`);
}


// Schedule: run every minute
cron.schedule('* * * * *', async () => {
  console.log(`[Cron] Running notification check at ${new Date().toISOString()}`);
  try {
    await sendScheduledNotifications();
  } catch (err) {
    console.error('Error in scheduled notification job:', err);
  }
});
