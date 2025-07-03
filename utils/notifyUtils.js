// utils/notify.js
const { Expo } = require('expo-server-sdk');
const prisma = require('../misc/prisma-client');

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

module.exports.sendBeaconNotification = async function (beacon, user) {
  const users = await prisma.user.findMany({
    where: {
      expoPushToken: { not: null },
      notifyOnEveryBeacon: true,
      // TODO: For production, filter out the creator...
      // id: { not: beacon.userId }, // Don't send to the creator
    },
  });

  const body = getBeaconNotificationMessage(beacon, user);

  const messages = users
    .filter(user => Expo.isExpoPushToken(user.expoPushToken))
    .map(user => ({
      to: user.expoPushToken,
      sound: 'default',
      body,
      data: { beaconId: beacon.id },
      _userId: user.id,
    }));

  if (messages.length === 0) 
    return;

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
          console.error(`Failed for user ${msg._userId}:`, receipt.message || receipt.details?.error);
        }
      }
    } catch (err) {
      console.error('Error sending push batch:', err);
    }
  }
};

function getBeaconNotificationMessage(beacon, user) {
    if (beacon.shareOwnName)
      return `${user.name} sent out a beacon. Let's pray!`;

    return `Someone sent out a beacon. Let's pray!`;
}