// utils/notify.js
const { Expo } = require('expo-server-sdk');
const prisma = require('../misc/prisma-client');

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

module.exports.sendBeaconNotification = async function (beacon) {
  const users = await prisma.user.findMany({
    where: {
      expoPushToken: { not: null },
      notifyOnEveryBeacon: true,
      notifyMorningAndEveningOnly: false,
      id: { not: beacon.userId }, // Don't send to the creator
    },
  });

  const messages = users
    .filter(user => Expo.isExpoPushToken(user.expoPushToken))
    .map(user => ({
      to: user.expoPushToken,
      sound: 'default',
      body: `New Beacon: ${beacon.name}`,
      data: { beaconId: beacon.id },
      _userId: user.id, // for later updating `lastNotificationSent`
    }));

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);

      // Optionally update lastNotificationSent for success cases
      for (let i = 0; i < chunk.length; i++) {
        const receipt = receipts[i];
        const msg = chunk[i];

        if (receipt.status === 'ok') {
          await prisma.user.update({
            where: { id: msg._userId },
            data: { lastNotificationSent: new Date() },
          });
        } else {
          console.warn(`Failed for user ${msg._userId}:`, receipt.message || receipt.details?.error);
        }
      }

    } catch (err) {
      console.error('Error sending push batch:', err);
    }
  }
};