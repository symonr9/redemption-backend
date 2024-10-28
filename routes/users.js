const authenticateJwt = require('../auth/jwtMiddleware');
const prisma = require('../misc/prisma-client');
var express = require("express");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { LogType } = require('../enums/enums');

var router = express.Router();

router.post("/create", async (req, res) => {
    try {
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const encryptedToken = await bcrypt.hash(refreshToken, 10);

        const newUser = await prisma.user.create({
            data: {
                name: 'Friend',
                refreshToken: encryptedToken
            },
        });

        const log = await prisma.log.create({
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

router.get('/settings', authenticateJwt, async (req, res) => {
    try {
        res.json(req.user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user settings' });
    }
});

router.get('/data', authenticateJwt, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                ones: {
                    include: {
                        actionSteps: true,
                        oneNotes: true,
                        christians: true,
                        gospelSteps: true
                    },
                },
                chapters: true,
            }
        });

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// Update an existing user
router.post('/update/:id', authenticateJwt, async (req, res) => {
    try {
        const { name, email, role, description } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { name, email, role, description },
        });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});


// Delete a user
router.post('/delete/:id', authenticateJwt, async (req, res) => {
    try {
        await prisma.user.delete({
            where: { id: req.params.id },
        });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;