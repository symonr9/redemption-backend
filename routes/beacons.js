const authenticateJwt = require('../auth/jwtMiddleware');
const express = require('express');
const prisma = require('../misc/prisma-client');

const router = express.Router();

router.get('/active', authenticateJwt, async (req, res) => {
    try {
        const beacons = await prisma.beacon.findMany({
            where: {
                activeUntil: {
                    gte: new Date(),
                },
            },
            include: {
                activities: true,
                user: {
                    select: {
                        name: true,
                        icon: true,
                    },
                },
                one: {
                    select: {
                        name: true,
                        icon: true,
                        stage: true,
                    },
                },
            },
        });

        const response = beacons.map(beacon => ({
            ...beacon,
            user: {
                name: beacon.user.name,
                icon: beacon.user.icon,
            },
            one: {
                name: beacon.one.name,
                icon: beacon.one.icon,
                stage: beacon.one.stage,
            }
        }));

        res.json(response);
    } catch (err) {
        console.error('Error fetching beacons:', err); // Log the error for debugging
        res.status(500).json({ error: 'Failed to fetch beacons' });
    }
});

router.post('/create', authenticateJwt, async (req, res) => {
    const user = req.user;
    const { beacon } = req.body;
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

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
                tags: beacon.tags ? beacon.tags.join(',') : null,
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
        const result = await prisma.beaconActivity.create({
            data: {
                note: activity.note,
                userId: user.id,
                beaconId: activity.beaconId
            }
        });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/activity/update', authenticateJwt, async (req, res) => {
    const user = req.user;
    const { activity } = req.body;
    try {
        const result = await prisma.beaconActivity.update({
            where: {
                id: activity.id
            },
            data: {
                note: activity.note,
            }
        });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



module.exports = router;
