const authenticateJwt = require('../auth/jwtMiddleware');
const express = require('express');
const prisma = require('../misc/prisma-client');
const { cleanForProfanity, hasValidTextLength, checkForProfanity } = require('../utils/serverUtils');
const { sendBeaconNotification, sendPrayerNotification } = require('../utils/notifyUtils');
const { LogType } = require('../enums/enums');
const { MAX_NAME_LENGTH, MAX_NORMAL_TEXT_LENGTH, DAYS_ACTIVE_FOR_BEACONS } = require('../constants/constants');

const router = express.Router();

router.post('/create', authenticateJwt, async (req, res) => {
    const user = req.user;
    const { beacon } = req.body;
    try {
        if (beacon.global) {
            const activeUntil = new Date();
            activeUntil.setDate(activeUntil.getDate() + 1);

            const result = await prisma.globalBeacon.create({
                data: {
                    name: "",
                    message: null,
                    type: beacon.type,
                    activeUntil: activeUntil,
                    isAutoBeacon: false,
                }
            });

            await prisma.log.create({
                data: {
                    type: LogType.CreateGlobalBeacon,
                    userId: user.id,
                    details: `[ID: ${result.id}] [Name: ${result.name}] [Type: ${result.type}]`
                }
            });

            res.status(200).json(result);
        } else {
            const activeUntil = new Date();
            activeUntil.setDate(activeUntil.getDate() + DAYS_ACTIVE_FOR_BEACONS);

            const cleanName = cleanForProfanity(beacon.name);
            if (!hasValidTextLength(cleanName, 1, MAX_NAME_LENGTH)) {
                res.status(400).json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters.` });
                return;
            }

            const cleanMessage = beacon.message ? cleanForProfanity(beacon.message) : null;
            if (beacon.message && !hasValidTextLength(cleanMessage, 1, MAX_NORMAL_TEXT_LENGTH)) {
                res.status(400).json({ error: `Message must be between 1 and ${MAX_NORMAL_TEXT_LENGTH} characters.` });
                return;
            }

            const result = await prisma.beacon.create({
                data: {
                    name: cleanName,
                    message: cleanMessage,
                    oneId: beacon.oneId,
                    priority: beacon.priority,
                    type: beacon.type,
                    activeUntil: activeUntil,
                    shareOwnName: beacon.shareOwnName,
                    userId: user.id,
                    tags: beacon.tags ? beacon.tags.join('∫') : null,
                }
            });

            await prisma.log.create({
                data: {
                    type: LogType.CreateBeacon,
                    userId: user.id,
                    details: `[ID: ${result.id}] [Name: ${result.name}]`
                }
            });

            await sendBeaconNotification(result, user);

            res.status(200).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/deactivate', authenticateJwt, async (req, res) => {
    const { beacon } = req.body;
    try {
        const result = await prisma.beacon.update({
            where: {
                id: beacon.id
            },
            data: {
                activeUntil: null,
            }
        });

        await prisma.log.create({
            data: {
                type: LogType.DeactivateBeacon,
                userId: req.user.id,
                details: `[ID: ${result.id}] [Name: ${result.name}]`
            }
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/activity/create', authenticateJwt, async (req, res) => {
    const user = req.user;
    const { activity } = req.body;
    try {
        if (!checkForProfanity(activity.note)) {
            res.status(400).json({ error: `Note must not contain any profanity.` });
            return;
        } else if (!hasValidTextLength(activity.note, 1, MAX_NORMAL_TEXT_LENGTH)) {
            res.status(400).json({ error: `Note must be between 1 and ${MAX_NORMAL_TEXT_LENGTH} characters.` });
            return;
        }

        if (activity.global) {
            const result = await prisma.globalBeaconActivity.create({
                data: {
                    note: activity.note,
                    userId: user.id,
                    beaconId: activity.beaconId
                }
            });

            await prisma.log.create({
                data: {
                    type: LogType.CreateGlobalBeaconActivity,
                    userId: user.id,
                    details: `[ID: ${result.id}] [Beacon ID: ${result.beaconId}] [Note: ${result.note}]`
                }
            });

            res.status(200).json(result);
        } else {
            const result = await prisma.beaconActivity.create({
                data: {
                    note: activity.note,
                    userId: user.id,
                    beaconId: activity.beaconId
                }
            });

            await prisma.log.create({
                data: {
                    type: LogType.CreateBeaconActivity,
                    userId: user.id,
                    details: `[ID: ${result.id}] [Beacon ID: ${result.beaconId}] [Note: ${result.note}]`
                }
            });

            await sendPrayerNotification(result, user);

            res.status(200).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/activity/update', authenticateJwt, async (req, res) => {
    const user = req.user;
    const { activity } = req.body;
    try {
        if (!checkForProfanity(activity.note)) {
            res.status(400).json({ error: `Note must not contain any profanity.` });
            return;
        } else if (!hasValidTextLength(activity.note, 1, MAX_NORMAL_TEXT_LENGTH)) {
            res.status(400).json({ error: `Note must be between 1 and ${MAX_NORMAL_TEXT_LENGTH} characters.` });
            return;
        }

        if (activity.global) {
            const result = await prisma.globalBeaconActivity.update({
                where: {
                    id: activity.id
                },
                data: {
                    note: activity.note,
                }
            });

            await prisma.log.create({
                data: {
                    type: LogType.UpdateGlobalBeaconActivity,
                    userId: user.id,
                    details: `[ID: ${result.id}] [Beacon ID: ${result.beaconId}] [Note: ${result.note}]`
                }
            });

            res.status(200).json(result);
        } else {
            const result = await prisma.beaconActivity.update({
                where: {
                    id: activity.id
                },
                data: {
                    note: activity.note,
                }
            });

            await prisma.log.create({
                data: {
                    type: LogType.UpdateBeaconActivity,
                    userId: user.id,
                    details: `[ID: ${result.id}] [Beacon ID: ${result.beaconId}] [Note: ${result.note}]`
                }
            });

            res.status(200).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;
