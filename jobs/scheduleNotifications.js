const cron = require('node-cron');
const { Expo } = require('expo-server-sdk');
const { getAllActiveBeacons } = require('../utils/beaconUtils');
const prisma = require('../misc/prisma-client');

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

async function sendMorningEveningNotifications(isMorning) {
  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      notifyMorningAndEveningOnly: true,
      expoPushToken: { not: null },
    },
  });

  const activeBeacons = await getAllActiveBeacons();
  if (activeBeacons.length === 0)
    return;

  const messages = [];
  const tokensToPush = [];

  for (const user of users) {
    const body = `${isMorning ? 'Good morning!' : 'Good evening!'} There are ${activeBeacons.length} active beacons to pray for.`;

    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      console.error(`Invalid Expo token for user ${user.id}`);
      continue;
    } else if (tokensToPush.includes(user.expoPushToken)) {
      console.error(`Token has already been added for this device.`);
      continue;
    }

    messages.push({
      to: user.expoPushToken,
      sound: 'default',
      vibrate: false,
      body,
      data: { count: activeBeacons.length, morningEveningNotifications: true },
      _userId: user.id, // include so we can update lastNotificationSent after
    });

    tokensToPush.push(user.expoPushToken);
  }

  if (messages.length === 0)
    return;

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
        } else if (receipt.status === 'error') {
          const err = receipt.details?.error;

          console.error(`❌ Push failed for user ${message._userId}:`, err);

          if (err === 'DeviceNotRegistered') {
            await prisma.user.update({
              where: { id: message._userId },
              data: { expoPushToken: null },
            });

            console.log(`🧹 Cleared invalid Expo token for user ${message._userId}`);
          }
        } else {
          console.error(`❌ Push failed for user ${message._userId}:`, receipt.message || receipt.details?.error);
        }
      }
    } catch (err) {
      console.error('❌ Error sending chunk:', err);
    }
  }

  console.log(`✅ Sent ${messages.length} notifications`);
}

// Runs every day at 10:00 AM
cron.schedule('0 10 * * *', async () => {
  console.log(`[Cron] 🔔 10AM Notification Run: ${new Date().toISOString()}`);
  try {
    await sendMorningEveningNotifications(true);
  } catch (err) {
    console.error('Error during 10AM notification run:', err);
  }
}, { timezone: 'America/Los_Angeles' });

// Runs every day at 7:00 PM
cron.schedule('0 19 * * *', async () => {
  console.log(`[Cron] 🔔 7PM Notification Run: ${new Date().toISOString()}`);
  try {
    await sendMorningEveningNotifications(false);
  } catch (err) {
    console.error('Error during 7PM notification run:', err);
  }
}, { timezone: 'America/Los_Angeles' });