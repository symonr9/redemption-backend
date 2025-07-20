// utils/notify.js
const { Expo } = require('expo-server-sdk');
const prisma = require('../misc/prisma-client');

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true,
});

module.exports.sendBeaconNotification = async function (beacon, user) {
  console.log(`Sending beacon notification for beacon ID: ${beacon.id}, user name: ${user.name}`);

  const users = await prisma.user.findMany({
    where: {
      expoPushToken: { not: null },
      notifyOnEveryBeacon: true,
      id: { not: beacon.userId }, // Don't send to the creator
    },
  });

  const body = getBeaconNotificationMessage(beacon, user);

  const messages = [];
  const tokensToPush = [];

  for (const user of users) {
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
      body,
      data: { beaconId: beacon.id },
      _userId: user.id,
    });

    tokensToPush.push(user.expoPushToken);
  }

  console.log(`Prepared ${messages.length} messages for beacon notification.`);

  if (messages.length === 0) 
    return;

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);

      console.log(`Sent ${receipts.length} push notifications for beacon ID: ${beacon.id}`);

      // Optionally update lastNotificationSent for success cases
      for (let i = 0; i < chunk.length; i++) {
        const receipt = receipts[i];
        const message = chunk[i];

        if (receipt.status === 'ok') {
          await prisma.user.update({
            where: { id: message._userId },
            data: { lastNotificationSent: new Date() },
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
          console.error(`Failed for user ${message._userId}:`, receipt.message || receipt.details?.error);
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