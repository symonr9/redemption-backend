// utils/notify.js
const { Expo } = require('expo-server-sdk');
const prisma = require('../misc/prisma-client');
const { getRandomString } = require('../utils/serverUtils');

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

  const body = getBeaconNotificationMessage(user);

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
      vibrate: false,
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

module.exports.sendPrayerNotification = async function (beaconActivity, user) {
  // { note, userId, beaconId }
  console.log(`Sending prayer notification for beacon ID: ${beaconActivity.beaconId}, user name: ${user.name}`);

  const beaconWithUser = await prisma.beacon.findFirst({
    where: {
      id: beaconActivity.beaconId,
    },
    include: { user: true },
  });

  if (!beaconWithUser || !beaconWithUser.user.expoPushToken) {
    return;
  }

  const body = getPrayerNotificationMessage(beaconWithUser.user);

  const messages = [];
  const tokensToPush = [];

  if (!Expo.isExpoPushToken(beaconWithUser.user.expoPushToken)) {
    console.error(`Invalid Expo token for user ${beaconWithUser.user.id}`);
    return;
  } else if (tokensToPush.includes(beaconWithUser.user.expoPushToken)) {
    console.error(`Token has already been added for this device.`);
    return;
  }

  messages.push({
    to: beaconWithUser.user.expoPushToken,
    sound: 'default',
    vibrate: false,
    body,
    data: { beaconId: beaconWithUser.id },
    _userId: beaconWithUser.user.id,
  });

  tokensToPush.push(beaconWithUser.user.expoPushToken);

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
}

function getBeaconNotificationMessage(user) {
  const name = user.shareOwnName ? user.name : 'Someone';
  return getRandomString([
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon. Let's pray!`,
    `${name} sent out a beacon and is asking for prayer.`,
    `${name} just shared a beacon— would you like to pray for them?`,
    `${name} sent a beacon and is reaching out for prayer support.`,
    `${name} is seeking prayer for their beacon.`,
    `${name} is inviting you to pray for their beacon!`,
    `A beacon has been sent out by ${name}. Join in prayer!`,
    `Let's remember ${name} in our prayers— they've just sent out a beacon!`,
    `${name} sent out a beacon— let's respond in prayer!`
  ]);
}

function getPrayerNotificationMessage(user) {
  const name = user.shareOwnName ? user.name : 'Someone';
  return getRandomString([
    `${name} prayed for your beacon.`,
    `${name} prayed for your beacon.`,
    `${name} prayed for your beacon.`,
    `${name} prayed for your beacon.`,
    `${name} prayed for your beacon.`,
    `${name} prayed for your beacon.`,
    `${name} prayed for your beacon.`,
    `${name} prayed for your beacon.`,
    `${name} lifted up your beacon in prayer.`,
    `${name} prayed for your beacon. Awesome!`,
    `${name} prayed for your beacon. You got this!`,
    `${name} prayed for your beacon. Keep it up!`,
    `${name} prayed for your beacon. You're doing great.`,
    `${name} was thinking of you and prayed for your beacon!`,
    `${name} just prayed for your beacon. 🙏`,
    `Your beacon was prayed for by ${name}.`,
    `${name} took a moment to pray for your beacon!`,
    `${name} sent prayers your way for your beacon.`,
    `${name} brought your beacon before God in prayer.`,
    `${name} is standing with you in prayer for your beacon.`,
    `${name} is cheering you on—and prayed for your beacon!`,
    `Good news— ${name} just prayed for your beacon!`,
  ]);
}
