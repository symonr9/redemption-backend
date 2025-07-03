const authenticateJwt = require('../auth/jwtMiddleware');
const prisma = require('../misc/prisma-client');
var express = require("express");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getAllActiveBeacons, getExpiredBeacons } = require('../utils/beaconUtils');
const { isWithinPast24Hours, formatDateTime, getTomorrow, cleanForProfanity, hasValidTextLength } = require('../utils/serverUtils');
const { LogType, GlobalBeaconType } = require('../enums/enums');
const { MAX_NAME_LENGTH, MAX_NUM_GLOBAL_BEACONS, MAX_NUM_AUTO_BEACONS } = require('../constants/constants');

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

        const name = cleanForProfanity(user.name);
        if (!hasValidTextLength(name, 1, MAX_NAME_LENGTH)) {
            res.status(400).json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters.` });
            return;
        }

        const result = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                name: name,
                icon: user.icon,
                enableAutoBeacons: user.enableAutoBeacons,
                autoBeaconType: user.autoBeaconType,
                autoBeaconTags: user.autoBeaconTags ? user.autoBeaconTags.join('∫') : null,
            }
        });

        await prisma.log.create({
            data: {
                type: LogType.UpdateUser,
                userId: req.user.id,
                details: `[Name: ${result.name}] 
                    [Icon: ${result.icon}] 
                    [Enable Auto Beacons: ${result.enableAutoBeacons}]
                    [Auto beacon Type: ${result.autoBeaconType}]
                    [Auto beacon Tags: ${result.autoBeaconTags}]
                `
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

        await setupGlobalBeacons(req.user);
        await setupAutoBeacons(req.user);

        let activeBeacons = includeBeacons ? await getAllActiveBeacons() : [];
        let expiredBeacons = includeBeacons ? await getExpiredBeacons(req.user.id) : [];

        const response = {
            ...(user && { user }),
            isSetupForNotifications: user?.expoPushToken !== null,
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

function getRandomGlobalBeaconTypeExcludingExisting(globalBeacons, newTypes) {
    const existingTypes = globalBeacons.map(beacon => beacon.type);

    const availableTypes = Object.values(GlobalBeaconType).filter(value =>
        typeof value === 'number' && !existingTypes.includes(value) && !newTypes.includes(value)
    );

    if (availableTypes.length === 0) {
        return GlobalBeaconType.BoldnessToShare;
    }

    // Select a random type from the available types
    const randomIndex = Math.floor(Math.random() * availableTypes.length);
    return availableTypes[randomIndex];
}

const setupGlobalBeacons = async (user) => {
    try {
        const globalBeacons = await prisma.globalBeacon.findMany({
            where: {
                activeUntil: { gt: new Date() }, // Filter for active beacons
                isAutoBeacon: false,
            },
        });

        if (globalBeacons.length > MAX_NUM_GLOBAL_BEACONS) {
            return; // Enough global beacons!
        }

        const tomorrow = getTomorrow();

        const newTypes = [];
        const numToCreate = MAX_NUM_GLOBAL_BEACONS - globalBeacons.length;
        for (let i = 0; i < numToCreate; i++) {
            const newType = getRandomGlobalBeaconTypeExcludingExisting(globalBeacons, newTypes);
            newTypes.push(newType);
            const result = await prisma.globalBeacon.create({
                data: {
                    name: "",
                    message: null,
                    type: newType,
                    activeUntil: tomorrow,
                    isAutoBeacon: false,
                }
            });

            console.log("Created new global beacon of type: ", newType, "... active until: ", tomorrow.toDateString());
            await prisma.log.create({
                data: {
                    type: LogType.CreateGlobalBeacon,
                    userId: user.id,
                    details: `[ID: ${result.id}] [Name: ${result.name}] [Type: ${result.type}]`
                }
            });
        }
    } catch (err) {
        console.error('Could not setup global beacons, something went wrong: ', err);
    }
};

const setupAutoBeacons = async (user) => {
    try {
        const autoBeacons = await prisma.globalBeacon.findMany({
            where: {
                activeUntil: { gt: new Date() }, // Filter for active beacons
                isAutoBeacon: true,
            },
        });

        if (autoBeacons.length > MAX_NUM_AUTO_BEACONS) {
            return; // Enough auto beacons!
        }

        const numToCreate = MAX_NUM_AUTO_BEACONS - autoBeacons.length;

        let enabledUsers = await prisma.user.findMany({
            where: {
                enableAutoBeacons: true,
                hasAutoBeaconBeenCreatedThisCycle: false,
            },
            take: numToCreate
        });

        if (enabledUsers.length === 0) {
            await prisma.user.updateMany({
                where: {
                    enableAutoBeacons: true,
                },
                data: {
                    hasAutoBeaconBeenCreatedThisCycle: false
                }
            });

            enabledUsers = await prisma.user.findMany({
                where: {
                    enableAutoBeacons: true,
                    hasAutoBeaconBeenCreatedThisCycle: false,
                },
                take: numToCreate
            });
        }

        const activeUntil = new Date();
        activeUntil.setDate(activeUntil.getDate() + 1);

        for (const enabledUser of enabledUsers) {
            const type = enabledUser.autoBeaconType;
            const tags = enabledUser.autoBeaconTags;

            const result = await prisma.globalBeacon.create({
                data: {
                    name: "",
                    message: null,
                    type: type,
                    activeUntil: activeUntil,
                    tags: tags || null,
                    isAutoBeacon: true,
                    userId: enabledUser.id,
                }
            });

            console.log("Created new auto beacon... active until: ", activeUntil.toDateString());
            await prisma.log.create({
                data: {
                    type: LogType.CreateAutoBeacon,
                    userId: user.id,
                    details: `[ID: ${result.id}] [Name: ${result.name}] [Type: ${result.type}]`
                }
            });

            await prisma.user.update({
                where: {
                    id: enabledUser.id
                },
                data: {
                    hasAutoBeaconBeenCreatedThisCycle: true,
                }
            });
        }
    } catch (err) {
        console.error('Could not setup auto beacons, something went wrong: ', err);
    }
}

// Update an existing user
router.post('/update/:id', authenticateJwt, async (req, res) => {
    try {
        const { name, email, role, description } = req.body;

        const cleanName = cleanForProfanity(name);
        if (!hasValidTextLength(cleanName, 1, MAX_NAME_LENGTH)) {
            res.status(400).json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters.` });
            return;
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { name: cleanName, email, role, description },
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

router.post('/push-token', async (req, res) => {
    const { expoPushToken } = req.body;
    const user = req.user;

    if (!expoPushToken) {
        return res.status(400).json({ error: 'expoPushToken is required' });
    }

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: { expoPushToken },
        });

        return res.status(200).json({ message: 'Push token saved successfully' });
    } catch (err) {
        console.error('Failed to save token:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;