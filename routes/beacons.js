const authenticateJwt = require('../auth/jwtMiddleware');
const express = require('express');
const prisma = require('../misc/prisma-client');
const { isWithinPast24Hours, formatDateTime } = require('../utils/serverUtils');
const { LogType } = require('../enums/enums');

const router = express.Router();

router.post('/create', authenticateJwt, async (req, res) => {
    const user = req.user;
    const { beacon } = req.body;
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (beacon.global) {
            const result = await prisma.globalBeacon.create({
                data: {
                    name: "",
                    message: null,
                    type: beacon.type,
                    activeUntil: tomorrow,
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
            const result = await prisma.beacon.create({
                data: {
                    name: beacon.name,
                    message: beacon.message ? beacon.message : null,
                    oneId: beacon.oneId,
                    priority: beacon.priority,
                    type: beacon.type,
                    activeUntil: tomorrow,
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
