const authenticateJwt = require('../auth/jwtMiddleware');
const prisma = require('../misc/prisma-client');
var express = require("express");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { isWithinPast24Hours, formatDateTime } = require('../utils/serverUtils');
const { LogType } = require('../enums/enums');
const { MAX_LONG_TEXT_LENGTH, MAX_NORMAL_TEXT_LENGTH } = require('../constants/constants');

var router = express.Router();

router.post("/create", async (req, res) => {
    try {
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const encryptedToken = await bcrypt.hash(refreshToken, 10);

        const newUser = await prisma.user.create({
            data: {
                name: 'Friend',
                refreshToken: encryptedToken,
                lastRefreshDate: new Date()
            },
        });

        await prisma.log.create({
            data: {
                type: LogType.UserCreated,
                userId: newUser.id,
                details: `User created`
            }
        });

        // Generate a JWT
        const accessToken = jwt.sign(
            { userId: newUser.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000, // 1 hour
        });

        res.json({ user: newUser, accessToken, refreshToken });
    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
        console.error(error);
    }
});

router.post("/user/update", async (req, res) => {
    try {
        const { user } = req.body;
        const result = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                name: user.name,
                icon: user.icon,
            }
        });

        await prisma.log.create({
            data: {
                type: LogType.UpdateUser,
                userId: req.user.id,
                details: `[Name: ${result.name}] [Icon: ${result.icon}]`
            }
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error updating user' });
        console.error(error);
    }
});

router.get('/settings', authenticateJwt, async (req, res) => {
    try {
        res.json(req.user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user settings' });
    }
});

router.get('/data/:spec', authenticateJwt, async (req, res) => {
    try {
        const spec = req.params.spec || 'all';
        const includeUser = spec === 'user' || spec === 'all';
        const includeOnes = spec === 'ones' || spec === 'all';
        const includeStories = spec === 'stories' || spec === 'all';
        const includeBeacons = spec === 'beacons' || spec === 'all';

        const userIncludeOptions = {};

        if (includeOnes) {
            userIncludeOptions.ones = {
                include: {
                    actionSteps: true,
                    oneNotes: true,
                    christians: true,
                    gospelSteps: true,
                },
            };
        }
        if (includeStories) {
            userIncludeOptions.chapters = true;
        }

        const user = (includeUser || includeOnes || includeStories)
            ? await prisma.user.findUnique({
                where: { id: req.user.id },
                include: userIncludeOptions,
            })
            : null;

        let activeBeacons = includeBeacons ? await getAllActiveBeacons() : [];
        let expiredBeacons = includeBeacons ? await getExpiredBeacons(req.user.id) : [];

        const response = {
            ...(user && { user }),
            ...(includeOnes && user?.ones && { ones: user.ones }),
            ...(includeStories && user?.chapters && { chapters: user.chapters }),
            ...(includeBeacons && { activeBeacons, expiredBeacons })
        };

        if (Object.keys(response).length) {
            res.json(response);
        } else {
            res.status(404).json({ error: 'Requested data not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});


const includeClause = {
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
            category: true
        },
    },
};

const getAllActiveBeacons = async () => {
    const currentDate = new Date();
    const beacons = await prisma.beacon.findMany({
        where: { 
            activeUntil: { gt: currentDate }, // Filter for active beacons
        },
        include: includeClause,
    });
    return mapBeaconWithAdditionalData(beacons);
}

const getExpiredBeacons = async (userId) => {
    const currentDate = new Date();
    const beacons = await prisma.beacon.findMany({
        where: { 
            userId,
            activeUntil: { lt: currentDate }, // Filter for expired beacons
        },
        include: includeClause,
    });
    return mapBeaconWithAdditionalData(beacons);
}

const mapBeaconWithAdditionalData = (beacons) => {
    return beacons.map(beacon => ({
        ...beacon,
        user: {
            name: beacon.user.name,
            icon: beacon.user.icon,
        },
        one: {
            name: beacon.one.name,
            icon: beacon.one.icon,
            stage: beacon.one.stage,
        },
        activities: beacon.activities.map(activity => ({
            ...activity,
            username: beacon.user.name,
        })),
    }));
}

// Update an existing user
router.post('/update/:id', authenticateJwt, async (req, res) => {
    try {
        const { name, email, role, description } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { name, email, role, description },
        });

        await prisma.log.create({
            data: {
                type: LogType.UpdateUser,
                userId: user.id,
                details: `[Name: ${user.name}] [Icon: ${user.icon}]`
            }
        });

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});


// Delete a user
router.post('/delete/:id', authenticateJwt, async (req, res) => {
    try {
        const result = await prisma.user.delete({
            where: { id: req.params.id },
        });

        await prisma.log.create({
            data: {
                type: LogType.DeleteUser,
                userId: req.user.id,
                details: `[Name: ${result.name}]`
            }
        });

        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;